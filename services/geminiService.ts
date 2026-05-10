import { GoogleGenAI, Modality } from "@google/genai";
import type { PhotoSize, BackgroundColor } from '../types';

// Giới hạn kích thước file ảnh tối đa (10MB)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Danh sách MIME type được phép
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Sanitize chuỗi đầu vào để tránh prompt injection
const sanitizeInput = (input: string, maxLength = 500): string => {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Xóa control characters
    .replace(/[<>]/g, '')             // Xóa ký tự HTML cơ bản
    .trim()
    .slice(0, maxLength);
};

const fileToGenerativePart = async (file: File) => {
  // Kiểm tra kích thước file
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Kích thước ảnh quá lớn (tối đa 10MB). File hiện tại: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
  }

  // Kiểm tra loại file
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Định dạng ảnh không được hỗ trợ. Vui lòng dùng JPG, PNG, hoặc WebP.`);
  }

  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        resolve((reader.result as string).split(',')[1]);
      } else {
        reject(new Error("Không thể đọc file ảnh"));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi đọc file"));
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export const generatePassportPhoto = async (
  originalImage: File,
  photoSize: PhotoSize,
  bgConfig: BackgroundColor,
  outfitDescription: string,
  enhancements?: string,
  backgroundFile?: File,
  modelName: string = 'gemini-2.5-flash-preview-05-20'
): Promise<string> => {
  const apiKey = (process.env as any).API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Không tìm thấy API Key. Vui lòng thiết lập GEMINI_API_KEY trong file .env của dự án."
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const imagePart = await fileToGenerativePart(originalImage);
  const parts: any[] = [imagePart];

  // Sanitize đầu vào từ người dùng trước khi đưa vào prompt
  const safeOutfit = sanitizeInput(outfitDescription);
  const safeEnhancements = enhancements ? sanitizeInput(enhancements) : '';

  let backgroundDescription = "";
  if (bgConfig.type === 'solid') {
    backgroundDescription = `Thay thế bằng phông nền màu trơn (solid color) [NỀN TRẮNG TINH KHIẾT], mã màu: ${bgConfig.value}. Đảm bảo nền đồng nhất, không có bóng đổ của chủ thể lên nền.`;
  } else if (bgConfig.type === 'gradient') {
    backgroundDescription = `Thay thế bằng phông nền hiệu ứng Gradient chuyển màu mượt mà từ ${bgConfig.value} sang ${bgConfig.extraValue}. Hướng chuyển màu từ trên xuống dưới.`;
  } else if (bgConfig.type === 'image' && backgroundFile) {
    const bgImagePart = await fileToGenerativePart(backgroundFile);
    parts.push(bgImagePart);
    backgroundDescription = `Sử dụng ảnh thứ hai được cung cấp làm bối cảnh nền. Hãy tách người từ ảnh đầu tiên và ghép vào nền của ảnh thứ hai một cách tự nhiên nhất.`;
  }

  const prompt = `[VAI TRÒ: CHUYÊN GIA NHÂN TRẮC HỌC & PHÁP Y KỸ THUẬT SỐ]
Nhiệm vụ của bạn là tạo ra một bức ảnh thẻ chuẩn mực nhưng phải BẢO TOÀN DANH TÍNH SINH TRẮC HỌC (Biometric Identity) ở mức độ tuyệt đối.

[BỐ CỤC CHUẨN QUỐC TẾ (ICAO/ISO)]
- Tỉ lệ: Khuôn mặt PHẢI chiếm 75-80% tổng chiều cao của khung hình. Khoảng cách từ đỉnh đầu đến mép trên của ảnh phải rất nhỏ, tập trung tối đa vào chân dung.
- Tư thế: Đảm bảo vai cân bằng, đầu thẳng chính diện.

[XỬ LÝ HẬU KỲ CHUYÊN NGHIỆP]
- Tóc: Loại bỏ hoàn toàn các sợi tóc xơ, tóc thừa (stray hairs) xung quanh đầu và trán để tạo đường viền tóc gọn gàng nhất.
- Khuyết điểm tạm thời: Xóa sạch mụn, quầng thâm và các vết đỏ do ánh sáng.
- [QUY TẮC BẤT BIẾN]: CẤM xóa nốt ruồi, sẹo đặc trưng hay các dấu hiệu nhận dạng vĩnh viễn. Chỉ xử lý bề mặt da cho mịn màng tự nhiên.
- Trang phục: Tỉ lệ cổ áo và vai phải cân đối, hài hòa với khuôn mặt lớn trong khung hình.

[QUY TẮC "BIOMETRIC LOCK" - KHÓA SINH TRẮC]
Đây là những hằng số bất biến: Khoảng cách đồng tử, hình dáng mũi, độ dày môi, cấu trúc xương mặt. KHÔNG ĐƯỢC làm thon mặt hay thay đổi cấu trúc. AI phải đảm bảo đây là cùng 1 người với độ chính xác 100% khi quét hộ chiếu.

[TRANG PHỤC]: ${safeOutfit} - ngay ngắn, chuyên nghiệp.
[NỀN]: ${backgroundDescription} - đồng nhất tuyệt đối, không bóng đổ.
[ÁNH SÁNG]: Studio 3 điểm (Key, Fill, Rim). Ánh sáng Rim phải rõ nét để tách bạch tóc với nền.
${safeEnhancements ? `[TINH CHỈNH BỔ SUNG]: ${safeEnhancements}.` : ''}

[XÁC THỰC CUỐI CÙNG]
Tự kiểm tra: "Nếu ảnh này được đưa vào hệ thống quét hộ chiếu tự động, liệu nó có khớp với chủ thể trong ảnh gốc không?". Chỉ xuất ảnh nếu câu trả lời là "CÓ" với độ tin cậy tuyệt đối. Bất kỳ sự thay đổi cấu trúc nào để làm chủ thể "đẹp hơn" nhưng "khác đi" đều bị coi là lỗi kỹ thuật nghiêm trọng.`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts,
    },
    config: {
      responseModalities: [Modality.IMAGE],
      // Chỉ thêm imageConfig cho model premium hỗ trợ 4K
      ...(modelName.includes('3.1') ? { imageConfig: { imageSize: "4K" } } : {}),
    },
  });

  const candidates = response?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Mô hình AI không trả về kết quả. Vui lòng thử lại.");
  }

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error(
    "Không thể tạo ảnh từ mô hình AI. Vui lòng thử lại với ảnh chân dung rõ nét, ánh sáng tốt."
  );
};
