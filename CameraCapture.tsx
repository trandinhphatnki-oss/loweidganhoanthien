import React, { useRef, useState, useCallback, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  onClose: () => void;
}

// Ngưỡng phát hiện ảnh mờ (Laplacian Variance)
const BLUR_THRESHOLD = 400;
// Kích thước tối đa để tránh lỗi payload quá lớn
const MAX_DIMENSION = 1024;

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'capturing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);

  // --- Dừng stream an toàn ---
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // --- Khởi động camera với timeout bảo vệ ---
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setStatus('starting');
    setErrorMessage(null);
    setCountdown(null);
    stopStream();

    // Timeout 10s nếu thiết bị không phản hồi
    const timeoutId = setTimeout(() => {
      setErrorMessage('Yêu cầu truy cập camera bị treo. Vui lòng tải lại trang và cấp quyền.');
      setStatus('error');
    }, 10000);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 4096 },
          height: { ideal: 2160 },
        },
        audio: false,
      });
      clearTimeout(timeoutId);
      streamRef.current = mediaStream;
      setFacingMode(mode);
      setStatus('ready');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Bạn chưa cấp quyền truy cập camera. Vào Cài đặt > Quyền riêng tư > Camera để bật.');
      } else if (err.name === 'NotFoundError') {
        setErrorMessage('Không tìm thấy camera trên thiết bị.');
      } else {
        setErrorMessage('Không thể khởi động camera. Vui lòng thử lại.');
      }
      setStatus('error');
    }
  }, [stopStream]);

  // Khởi động lần đầu
  useEffect(() => {
    startCamera('user');
    return () => stopStream();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gắn stream vào video element khi ready
  useEffect(() => {
    if (status === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // Thử lại sau 500ms nếu play() thất bại (iOS quirk)
        setTimeout(() => {
          if (videoRef.current && streamRef.current) {
            videoRef.current.play().catch(() => {});
          }
        }, 500);
      });
    }
  }, [status]);

  // --- Auto countdown: chờ 3s sau khi camera sẵn sàng rồi đếm ngược 5s ---
  useEffect(() => {
    if (status === 'ready') {
      const preTimer = setTimeout(() => setCountdown(5), 3000);
      return () => clearTimeout(preTimer);
    } else {
      setCountdown(null);
    }
  }, [status]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      captureImage();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  // --- Thuật toán Laplacian Variance phát hiện ảnh mờ ---
  const laplacianVariance = (imageData: ImageData): number => {
    const { data, width, height } = imageData;
    let sum = 0;
    let count = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        // Chỉ lấy kênh đỏ để tính nhanh
        const kernel =
          -4 * data[idx] +
          data[idx - 4] +
          data[idx + 4] +
          data[idx - width * 4] +
          data[idx + width * 4];
        sum += kernel * kernel;
        count++;
      }
    }
    return count === 0 ? 0 : sum / count;
  };

  const checkBlur = (canvas: HTMLCanvasElement): boolean => {
    try {
      // Tạo canvas nhỏ để tính nhanh (không cần toàn bộ ảnh)
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = Math.min(canvas.width, 320);
      sampleCanvas.height = Math.min(canvas.height, 320);
      const sCtx = sampleCanvas.getContext('2d')!;
      sCtx.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
      const imageData = sCtx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
      const variance = laplacianVariance(imageData);
      return variance < BLUR_THRESHOLD; // true = mờ
    } catch {
      return false; // Nếu không tính được, coi như không mờ
    }
  };

  // --- Chụp ảnh: xử lý xoay chiều + nén ---
  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || status === 'capturing') return;
    setStatus('capturing');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Xử lý xoay chiều: nếu dùng điện thoại dọc nhưng video là ngang
      const isPortrait = window.innerHeight > window.innerWidth;
      const videoIsLandscape = video.videoWidth > video.videoHeight;

      let rawWidth = video.videoWidth;
      let rawHeight = video.videoHeight;

      if (isPortrait && videoIsLandscape) {
        // Cần xoay 90 độ
        rawWidth = video.videoHeight;
        rawHeight = video.videoWidth;
      }

      // Nén: giới hạn cạnh dài nhất là MAX_DIMENSION
      let finalWidth = rawWidth;
      let finalHeight = rawHeight;
      if (finalWidth > finalHeight && finalWidth > MAX_DIMENSION) {
        finalHeight = Math.round((finalHeight * MAX_DIMENSION) / finalWidth);
        finalWidth = MAX_DIMENSION;
      } else if (finalHeight > MAX_DIMENSION) {
        finalWidth = Math.round((finalWidth * MAX_DIMENSION) / finalHeight);
        finalHeight = MAX_DIMENSION;
      }

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      const ctx = canvas.getContext('2d')!;

      // Lật gương cho camera trước
      if (facingMode === 'user') {
        ctx.translate(finalWidth, 0);
        ctx.scale(-1, 1);
      }

      // Xoay nếu cần
      if (isPortrait && videoIsLandscape) {
        ctx.translate(finalWidth / 2, finalHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(-finalHeight / 2, -finalWidth / 2);
        ctx.drawImage(video, 0, 0, rawHeight, rawWidth);
      } else {
        ctx.drawImage(video, 0, 0, finalWidth, finalHeight);
      }

      // Kiểm tra blur
      const isBlurry = checkBlur(canvas);
      if (isBlurry) {
        setErrorMessage('Ảnh bị mờ, vui lòng giữ yên thiết bị và thử lại.');
        setStatus('ready');
        return;
      }

      // Xuất JPEG chất lượng 0.85 (tốt cho passport photo, tiết kiệm băng thông)
      const base64 = canvas.toDataURL('image/jpeg', 0.85);

      stopStream();
      onCapture(base64);
    } catch (err) {
      console.error('[Camera] Capture error:', err);
      setErrorMessage('Chụp ảnh thất bại. Vui lòng thử lại.');
      setStatus('ready');
    }
  }, [status, facingMode, onCapture, stopStream]);

  const flipCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newMode);
  };

  // --- Màn hình lỗi ---
  if (status === 'error') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
          <p className="text-red-600 font-bold text-lg mb-2">⚠️ Không thể mở camera</p>
          <p className="text-gray-700 mb-4 text-sm leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => startCamera(facingMode)}
            className="px-5 py-3 bg-apple-blue text-white rounded-full font-bold mb-3 w-full"
          >
            Thử lại
          </button>
          <button onClick={onClose} className="text-gray-500 underline text-sm">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // --- Màn hình khởi động ---
  if (status === 'starting') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-white text-lg">Đang khởi động camera...</p>
          <button onClick={onClose} className="text-white/60 text-sm underline mt-2">
            Hủy
          </button>
        </div>
      </div>
    );
  }

  // --- Màn hình camera chính ---
  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Video feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
      />

      {/* Khung oval hướng dẫn khuôn mặt */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-72 h-96 border-4 border-white/70 rounded-full shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Thông báo lỗi blur (overlay nhỏ) */}
      {errorMessage && (
        <div className="absolute top-8 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur-sm text-white text-sm font-medium px-5 py-3 rounded-full max-w-xs text-center">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Hướng dẫn chữ */}
      <div className="absolute bottom-36 left-0 right-0 text-center pointer-events-none">
        <p className="text-white text-xl font-medium drop-shadow-md">
          {countdown !== null
            ? 'Giữ yên, đang chụp...'
            : 'Đặt khuôn mặt vào khung'}
        </p>
        {countdown === null && (
          <p className="text-white/60 text-sm mt-1">Camera sẽ tự chụp sau vài giây</p>
        )}
      </div>

      {/* Đếm ngược lớn ở giữa */}
      {countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white text-9xl font-black drop-shadow-2xl opacity-80">
            {countdown}
          </span>
        </div>
      )}

      {/* Nút điều khiển */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-10 z-10">
        {/* Nút đóng */}
        <button
          onClick={() => { stopStream(); onClose(); }}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-2xl active:scale-90 transition-transform"
          aria-label="Đóng camera"
        >
          ✕
        </button>

        {/* Nút chụp chính */}
        <button
          onClick={captureImage}
          disabled={status === 'capturing'}
          className="w-20 h-20 rounded-full bg-white border-4 border-apple-blue shadow-2xl flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
          aria-label="Chụp ảnh"
        >
          <div className="w-12 h-12 rounded-full bg-apple-blue" />
        </button>

        {/* Nút lật camera */}
        <button
          onClick={flipCamera}
          className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-2xl active:scale-90 transition-transform"
          aria-label="Đổi camera"
        >
          🔄
        </button>
      </div>

      {/* Canvas ẩn để xử lý ảnh */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CameraCapture;
