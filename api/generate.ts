import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality } from '@google/genai';

// ──────────────────────────────────────────
// Cấu hình bảo mật
// ──────────────────────────────────────────

// Chỉ cho phép request từ domain này (thay bằng domain thực tế khi deploy)
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

// Giới hạn kích thước payload tối đa (~12MB base64 ≈ 9MB ảnh gốc)
const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;

// Rate limiting đơn giản bằng in-memory map (thay bằng Redis khi scale)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;       // tối đa 10 request
const RATE_WINDOW_MS = 60_000; // trong 1 phút

// Sanitize chuỗi đầu vào
const sanitizeString = (input: unknown, maxLen = 500): string => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
};

// ──────────────────────────────────────────
// CORS helper – giới hạn theo ALLOWED_ORIGIN
// ──────────────────────────────────────────
const setCorsHeaders = (req: VercelRequest, res: VercelResponse): boolean => {
  const origin = req.headers.origin || '';

  // Nếu ALLOWED_ORIGIN chưa set (dev), tạm chấp nhận tất cả
  const isAllowed =
    !ALLOWED_ORIGIN || origin === ALLOWED_ORIGIN;

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
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
    return false; // báo cho handler dừng lại
  }

  return isAllowed;
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
  const corsOk = setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return;
  if (!corsOk) return res.status(403).json({ error: 'Origin không được phép' });

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
    return res.status(500).json({ error: 'API key chưa được cấu hình trên server' });
  }

  // 5. Kiểm tra kích thước payload
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: 'Ảnh quá lớn. Vui lòng dùng ảnh dưới 9MB.' });
  }

  try {
    const body = req.body || {};

    const {
      originalImageBase64,
      mimeType = 'image/jpeg',
      photoSize = '4x6',
      bgConfig = { type: 'solid', value: '#FFFFFF' },
      outfitDescription = 'áo sơ mi trắng lịch sự',
      enhancements = '',
      backgroundFileBase64 = null,
      backgroundMimeType = 'image/jpeg',
    } = body;

    // 6. Validate
    if (!originalImageBase64 || typeof originalImageBase64 !== 'string') {
      return res.status(400).json({ error: 'Thiếu dữ liệu ảnh gốc' });
    }

    // Kiểm tra kích thước base64 (~4/3 kích thước thực)
    if (originalImageBase64.length > MAX_PAYLOAD_BYTES * 1.4) {
      return res.status(413).json({ error: 'Dữ liệu ảnh quá lớn' });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: 'Định dạng ảnh không được hỗ trợ' });
    }

    // 7. Sanitize input
    const safeOutfit = sanitizeString(outfitDescription);
    const safeEnhancements = sanitizeString(enhancements);
    const safeBgValue = sanitizeString(
      typeof bgConfig?.value === 'string' ? bgConfig.value : '#FFFFFF',
      50
    );

    // 8. Xây dựng parts
    const parts: any[] = [
      { inlineData: { data: originalImageBase64, mimeType } },
    ];

    let backgroundDescription = 'Nền trắng tinh khiết.';
    if (bgConfig?.type === 'solid') {
      backgroundDescription = `Phông nền màu trơn, mã màu: ${safeBgValue}.`;
    } else if (bgConfig?.type === 'gradient' && bgConfig.extraValue) {
      backgroundDescription = `Phông nền Gradient từ ${safeBgValue} sang ${sanitizeString(bgConfig.extraValue, 50)}.`;
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
- Trang phục: ${safeOutfit}.
- Phông nền: ${backgroundDescription}
- Ánh sáng studio 3 điểm (Key, Fill, Rim) với tỉ lệ 2:1.
- Làm sáng và đều màu da một cách tự nhiên, xóa mụn và quầng thâm tạm thời.
- Khuôn mặt chiếm 75-80% chiều cao khung hình.
${safeEnhancements ? `- Tinh chỉnh bổ sung: ${safeEnhancements}.` : ''}
- Kích thước ảnh chuẩn: ${sanitizeString(String(photoSize), 20)}.

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

    return res.status(500).json({ error: 'Không thể tạo ảnh. Vui lòng thử lại.' });
  } catch (error: any) {
    console.error('[generate] Error:', error?.message || error);

    // Không lộ chi tiết lỗi nội bộ ra client
    const isKnownError =
      error?.message?.includes('kích thước') ||
      error?.message?.includes('định dạng') ||
      error?.message?.includes('Biometric');

    return res.status(500).json({
      error: isKnownError
        ? error.message
        : 'Đã xảy ra lỗi khi xử lý ảnh. Vui lòng thử lại sau.',
    });
  }
};

export default handler;
