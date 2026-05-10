import type { PhotoSize, BackgroundColor } from '../types';

/**
 * Chuyển đối tượng File thành chuỗi base64 (chỉ lấy phần data, bỏ prefix)
 */
const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        const mimeType = reader.result.match(/^data:(.*?);/)?.[1] || 'image/jpeg';
        resolve({ base64, mimeType });
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const generatePassportPhoto = async (
  originalImage: File,
  photoSize: PhotoSize,
  bgConfig: BackgroundColor,
  outfitDescription: string,
  enhancements?: string,
  backgroundFile?: File,
  modelName?: string // không còn dùng trực tiếp ở client nữa
): Promise<string> => {
  // 1. Chuyển ảnh gốc thành base64
  const original = await fileToBase64(originalImage);

  // 2. Nếu có ảnh nền, chuyển thành base64
  let backgroundData = null;
  if (backgroundFile && bgConfig.type === 'image') {
    backgroundData = await fileToBase64(backgroundFile);
  }

  // 3. Gọi đến serverless function an toàn (api/generate.ts)
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      originalImageBase64: original.base64,
      mimeType: original.mimeType,
      photoSize,
      bgConfig,
      outfitDescription,
      enhancements,
      backgroundFileBase64: backgroundData?.base64,
      backgroundMimeType: backgroundData?.mimeType,
      // Nếu bạn muốn truyền modelName xuống server, có thể thêm ở đây
      // model: modelName
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.imageBase64) {
    // Trả về base64 (client sẽ hiển thị hoặc tạo link download)
    return data.imageBase64;
  } else {
    throw new Error('No image returned from server');
  }
};
