import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality } from '@google/genai';

// ──────────────────────────────────────────
// Cấu hình bảo mật
// ──────────────────────────────────────────

// Chỉ cho phép request từ các domain này
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Giới hạn kích thước payload tối đa (10MB)
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

// Rate limiting đơn giản bằng in-memory map (thay bằng Redis khi scale)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;       // tối đa 10 request
const RATE_WINDOW_MS = 60_000; // trong 1 phút

// Sanitize chuỗi đầu vào
const sanitizeString = (input: unknown, maxLen = 1000): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Loại bỏ ký tự điều khiển (ASCII 0x00–0x1F, 0x7F–0x9F)
    .replace(/<[^>]*>/g, '')             // Loại bỏ tag HTML
    .replace(/&/g, '&amp;')               // Escape các ký tự đặc biệt
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim()
    .slice(0, maxLen);
};

// ──────────────────────────────────────────
// CORS helper – giới hạn theo ALLOWED_ORIGINS
// ──────────────────────────────────────────
const setCorsHeaders = (req: VercelRequest, res: VercelResponse) => {
  const origin = req.headers.origin || '';

  let allowedOrigin = ALLOWED_ORIGINS[0] || '*';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  if (isAllowed) {
    allowedOrigin = origin;
  }

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Requested-With'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
  }
};

// ──────────────────────────────────────────
// Rate limiter
// ──────────────────────────────────────────
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count++;
  return true;
};

// ──────────────────────────────────────────
// Handler chính
// ──────────────────────────────────────────
const handler = async (req: VercelRequest, res: VercelResponse) => {
  // 1. CORS
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return;

  // 2. Chỉ cho phép POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 3. Rate limiting
  const clientIp =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';

  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
    });
  }

  // 4. API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý' });
  }

  // 5. Kiểm tra kích thước payload (Content-Length)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý' });
  }

  try {
    const body = req.body || {};

    const {
      originalImageBase64,
      bgConfig = { type: 'solid', value: '#FFFFFF' },
      backgroundFileBase64 = null,
    } = body;

    // 6. Sanitize and Validate text fields
    const mimeType = sanitizeString(body.mimeType || 'image/jpeg', 50);
    const photoSize = sanitizeString(body.photoSize || '4x6', 50);
    const outfitDescription = sanitizeString(body.outfitDescription || 'áo sơ mi trắng lịch sự', 500);
    const enhancements = sanitizeString(body.enhancements || '', 500);
    const backgroundMimeType = sanitizeString(body.backgroundMimeType || 'image/jpeg', 50);
    const safeBgValue = sanitizeString(bgConfig?.value || '#FFFFFF', 50);
    const safeBgExtraValue = sanitizeString(bgConfig?.extraValue || '', 50);

    // 7. Validate image payload
    if (!originalImageBase64 || typeof originalImageBase64 !== 'string') {
      return res.status(400).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý' });
    }

    // Kiểm tra kích thước base64 (max 10MB * 1.5 = 15MB)
    if (originalImageBase64.length > MAX_PAYLOAD_BYTES * 1.5) {
      return res.status(413).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý' });
    }

    // 8. Xây dựng parts
    const parts: any[] = [
      { inlineData: { data: originalImageBase64, mimeType } },
    ];

    let backgroundDescription = 'Nền trắng tinh khiết.';
    if (bgConfig?.type === 'solid') {
      backgroundDescription = `Phông nền màu trơn, mã màu: ${safeBgValue}.`;
    } else if (bgConfig?.type === 'gradient' && safeBgExtraValue) {
      backgroundDescription = `Phông nền Gradient từ ${safeBgValue} sang ${safeBgExtraValue}.`;
    } else if (bgConfig?.type === 'image' && backgroundFileBase64) {
      parts.push({
        inlineData: {
          data: backgroundFileBase64,
          mimeType: allowedMimes.includes(backgroundMimeType) ? backgroundMimeType : 'image/jpeg',
        },
      });
      backgroundDescription = 'Sử dụng ảnh thứ hai làm nền.';
    }

    const prompt = `[NHIỆM VỤ]: Xử lý ảnh thẻ chuyên nghiệp chuẩn ICAO/ISO.

[QUY TẮC SỐNG CÒN - BIOMETRIC LOCK]
- TUYỆT ĐỐI GIỮ NGUYÊN các đặc điểm sinh trắc học: cấu trúc xương mặt, tỉ lệ mắt-mũi-miệng, hình dáng cằm, tai.
- CẤM thay đổi đặc điểm vĩnh viễn: nốt ruồi, sẹo, tàn nhang, vết nám.
- Kết quả cuối cùng PHẢI LÀ CÙNG MỘT CON NGƯỜI, khớp 100% khi quét sinh trắc học.

[YÊU CẦU CHỈNH SỬA]
- Trang phục: ${outfitDescription}.
- Phông nền: ${backgroundDescription}
- Ánh sáng studio 3 điểm (Key, Fill, Rim) với tỉ lệ 2:1.
- Làm sáng và đều màu da một cách tự nhiên, xóa mụn và quầng thâm tạm thời.
- Khuôn mặt chiếm 75-80% chiều cao khung hình.
${enhancements ? `- Tinh chỉnh bổ sung: ${enhancements}.` : ''}
- Kích thước ảnh chuẩn: ${photoSize}.

[XÁC NHẬN CUỐI CÙNG]
Trước khi xuất ảnh, tự kiểm tra: "Tất cả đặc điểm nhận dạng chính có được bảo toàn không?".`;

    parts.push({ text: prompt });

    // 9. Gọi Gemini
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: { parts },
      config: {
        temperature: 0.2,
        topP: 0.8,
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return res.status(200).json({
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType || 'image/jpeg',
        });
      }
    }

    return res.status(500).json({ error: 'Đã xảy ra lỗi trong quá trình xử lý' });
  } catch (error: any) {
    console.error('[generate] Error:', error?.message || error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi trong quá trình xử lý',
    });
  }
};

export default handler;
