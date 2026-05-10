import React, {
  useState,
  useCallback,
  useMemo,
  ChangeEvent,
  useRef,
  useEffect,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileCheck,
  Briefcase,
  Upload,
  RefreshCw,
  Download,
  Share2,
  Trash2,
  ChevronRight,
  Camera,
  Sparkles,
  ArrowRightLeft,
  CreditCard,
  Check,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import type {
  PhotoSize,
  BackgroundColor,
  HistoryItem,
  Category,
  SubCategory,
} from './types';
import { generatePassportPhoto } from './services/geminiService';
import CameraCapture from './CameraCapture';

// ─────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  {
    id: 'admin',
    title: 'HÀNH CHÍNH & DI TRÚ',
    icon: 'FileCheck',
    subCategories: [
      {
        id: 'passport-vn',
        label: 'Hộ chiếu (Passport)',
        size: '4x6',
        aspectRatio: 'aspect-[4/6]',
        description: 'Yêu cầu 4x6 cm, nền trắng, không đeo kính.',
        bgColor: 'Trắng',
        displaySize: '4x6 cm',
        checklist: [
          'Kích thước chuẩn: 4x6 cm',
          'Nền trắng trơn, ánh sáng studio.',
          'Biểu cảm: Nhìn thẳng, mắt mở, không cười.',
          'Lộ rõ tai và trán, TUYỆT ĐỐI KHÔNG ĐEO KÍNH.',
        ],
      },
      {
        id: 'cccd',
        label: 'Căn cước công dân (CCCD)',
        size: '4x6',
        availableSizes: ['3x4', '4x6'],
        aspectRatio: 'aspect-[4/6]',
        description: '3x4 cm (online) hoặc 4x6 cm.',
        bgColor: 'Trắng',
        displaySize: '3x4 - 4x6 cm',
        checklist: [
          'Kích thước: 3x4 cm (online) hoặc 4x6 cm.',
          'Nền trắng trơn.',
          'Trang phục lịch sự (áo sơ mi có cổ).',
          'Tóc gọn gàng, không che khuôn mặt.',
        ],
      },
      {
        id: 'driver-license',
        label: 'Giấy phép lái xe (GPLX)',
        size: '3x4',
        availableSizes: ['3x4', '4x6'],
        aspectRatio: 'aspect-[3/4]',
        description: '3x4 cm hoặc 4x6 cm tùy mẫu đơn.',
        bgColor: 'Trắng',
        displaySize: '3x4 - 4x6 cm',
        checklist: [
          'Kích thước: 3x4 cm hoặc 4x6 cm.',
          'Nền trắng trơn.',
          'Áp dụng cho bằng lái xe quốc tế hoặc Việt Nam.',
          'Tư thế ngay ngắn, ánh sáng rõ nét.',
        ],
      },
      {
        id: 'general-visa',
        label: 'Visa (Thị thực)',
        size: '4x6',
        availableSizes: ['4x6', '5x5'],
        aspectRatio: 'aspect-[4/6]',
        description: 'Thường là 4x6 cm hoặc 5x5 cm.',
        bgColor: 'Trắng',
        displaySize: '4x6 - 5x5 cm',
        checklist: [
          'Tỉ lệ khuôn mặt chiếm 70-80% khung hình.',
          'Kích thước vuông 5x5 cm (Mỹ) hoặc 3.5x4.5 (Âu).',
          'Nền trắng chuẩn quốc tế.',
          'Tuân thủ khắt khe yêu cầu sinh trắc học.',
        ],
      },
    ],
  },
  {
    id: 'career',
    title: 'HỒ SƠ HỌC TẬP & CÔNG VIỆC',
    icon: 'Briefcase',
    subCategories: [
      {
        id: 'cv-resume',
        label: 'Hồ sơ xin việc (CV)',
        size: '3x4',
        availableSizes: ['3x4', '4x6'],
        aspectRatio: 'aspect-[3/4]',
        description: 'Phổ biến 3x4 cm hoặc 4x6 cm.',
        bgColor: 'Xanh hoặc Trắng',
        displaySize: '3x4 - 4x6 cm',
        checklist: [
          'Phong cách chuyên nghiệp, tự tin.',
          'Nền xanh (truyền thống) hoặc Trắng (hiện đại).',
          'Trang phục công sở lịch sự.',
          'Chỉnh sửa da và ánh sáng mịn màng.',
        ],
      },
      {
        id: 'exam-cert',
        label: 'Hồ sơ thi cử & Chứng chỉ',
        size: '3x4',
        aspectRatio: 'aspect-[3/4]',
        description: 'TOEIC, IELTS, THPT Quốc gia.',
        bgColor: 'Trắng',
        displaySize: '3x4 cm',
        checklist: [
          'Kích thước 3x4 cm là tiêu chuẩn phổ biến.',
          'Nền trắng trơn.',
          'Chụp mới nhất trong vòng 6 tháng.',
          'Trang phục học sinh/sinh viên lịch sự.',
        ],
      },
      {
        id: 'student-card',
        label: 'Thẻ học sinh, sinh viên, nhân viên',
        size: '3x4',
        availableSizes: ['2x3', '3x4'],
        aspectRatio: 'aspect-[3/4]',
        description: 'Kích thước 2x3 cm hoặc 3x4 cm.',
        bgColor: 'Xanh hoặc Trắng',
        displaySize: '2x3 - 3x4 cm',
        checklist: [
          'Nền xanh hoặc trắng theo quy định đơn vị.',
          'Ảnh sắc nét, màu sắc trung thực.',
          'Trang phục đồng phục hoặc sơ mi.',
          'Phù hợp làm thẻ từ, thẻ tên.',
        ],
      },
    ],
  },
];

const ALL_SUB_CATEGORIES = CATEGORIES.flatMap(cat => cat.subCategories);

const OUTFITS = [
  'Áo sơ mi trắng lịch sự',
  'Sơ mi trắng và Suit đen lịch sự',
  'Áo dài trắng',
  'Áo thun Photo có cổ lịch sự',
];

const SHIRT_COLORS = [
  { name: 'Trắng', value: '#ffffff' },
  { name: 'Xanh nhạt', value: '#e0f2fe' },
  { name: 'Xanh đậm', value: '#1e3a8a' },
  { name: 'Đen', value: '#1d1d1f' },
  { name: 'Xám', value: '#86868b' },
  { name: 'Hồng nhạt', value: '#fce7f3' },
];

const ENHANCEMENTS = [
  { id: 'brighten', label: 'Da mặt sáng', prompt: 'brighten facial skin' },
  {
    id: 'contour',
    label: 'Tạo khối chuyên nghiệp',
    prompt: 'professional facial contouring, dodge and burn',
  },
  {
    id: 'smooth',
    label: 'Làm mịn da',
    prompt: 'professional skin smoothing and retouching',
  },
];

const MAX_HISTORY_ITEMS = 8;

// ─────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────

const IconWrapper = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  switch (name) {
    case 'FileCheck':
      return <FileCheck className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

const SubCategoryItem: React.FC<{
  sub: SubCategory;
  isActive: boolean;
  onClick: () => void;
}> = ({ sub, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all duration-300 ${
      isActive
        ? 'bg-apple-blue border-apple-blue text-white shadow-lg'
        : 'bg-white border-apple-bg text-apple-text hover:border-slate-300 hover:shadow-sm'
    }`}
  >
    <div className="flex flex-col items-start gap-1">
      <span className="font-bold text-base tracking-tight">{sub.label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border transition-colors ${
            isActive
              ? 'bg-white/20 border-white/30 text-white'
              : 'bg-apple-bg border-slate-200 text-apple-secondary'
          }`}
        >
          {sub.displaySize}
        </span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold border transition-colors ${
            isActive
              ? 'bg-white/20 border-white/30 text-white'
              : 'bg-apple-bg border-slate-200 text-apple-secondary'
          }`}
        >
          {sub.bgColor}
        </span>
      </div>
      <span
        className={`text-xs mt-1 line-clamp-1 transition-colors ${
          isActive ? 'text-white/80' : 'text-apple-secondary'
        }`}
      >
        {sub.description}
      </span>
    </div>
    <ChevronRight
      className={`w-5 h-5 transition-transform flex-shrink-0 ${
        isActive ? 'rotate-90' : ''
      }`}
    />
  </button>
);

const VisualGuide = ({ sub }: { sub: SubCategory }) => (
  <div className="bg-apple-card border border-apple-bg rounded-3xl p-8 animate-fade-in space-y-8 shadow-sm">
    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-apple-secondary uppercase tracking-widest">
          Màu phông nền
        </p>
        <p className="text-lg font-bold text-apple-text tracking-tight">
          {sub.bgColor}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-apple-secondary uppercase tracking-widest">
          Khổ ảnh
        </p>
        <p className="text-lg font-bold text-apple-text tracking-tight">
          {sub.displaySize}
        </p>
      </div>
    </div>
  </div>
);

const Watermark = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10 select-none z-20">
    <div className="flex flex-wrap gap-x-12 gap-y-12 rotate-[-30deg] scale-150 origin-center justify-center items-center h-full w-full">
      {Array.from({ length: 40 }).map((_, i) => (
        <span
          key={i}
          className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap text-white"
        >
          LOWE LOWE LOWE LOWE LOWE
        </span>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// IMAGE PREVIEW – tích hợp bảo vệ ảnh
// ─────────────────────────────────────────────────────
const ImagePreview = ({
  original,
  generated,
  aspectRatio,
  isLoading,
  loadingMessage,
  showComparison,
  isPaid,
}: {
  original: string | null;
  generated: string | null;
  aspectRatio: string;
  isLoading: boolean;
  loadingMessage: string;
  showComparison: boolean;
  isPaid: boolean;
}) => {
  const preventDownload = (e: React.SyntheticEvent) => {
    if (isPaid) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <motion.div
        layout
        className={`relative w-full bg-apple-card rounded-[32px] overflow-hidden border-[12px] border-white shadow-2xl ${aspectRatio}`}
      >
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-30"
            >
              <div className="w-12 h-12 border-4 border-apple-blue border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-apple-blue text-xs font-bold animate-pulse">
                {loadingMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {generated ? (
          <div className="w-full h-full relative group">
            <Watermark />

            <div className="absolute top-6 left-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-apple-text/80 backdrop-blur-md rounded-full border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Biometric-Lock Active
              </span>
            </div>

            <div className="absolute top-6 right-6 z-40 flex items-center gap-2 px-3 py-1.5 bg-apple-blue/80 backdrop-blur-md rounded-full border border-white/20">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Studio Quality
              </span>
            </div>

            {!isPaid && (
              <div
                className="absolute inset-0 z-30"
                style={{ pointerEvents: 'all', touchAction: 'none' }}
                onContextMenu={preventDownload}
                onTouchStart={preventDownload}
                onTouchEnd={preventDownload}
                onDragStart={preventDownload}
                onMouseDown={preventDownload}
                ref={el => {
                  if (el) {
                    el.addEventListener(
                      'touchstart',
                      e => e.preventDefault(),
                      { passive: false }
                    );
                    el.addEventListener('contextmenu', e =>
                      e.preventDefault()
                    );
                  }
                }}
              />
            )}

            {showComparison ? (
              <div className="w-full h-full flex">
                <div className="w-1/2 h-full relative overflow-hidden border-r border-white/20">
                  <img
                    src={original!}
                    alt="Trước"
                    className="absolute inset-0 w-full h-full object-cover grayscale opacity-30"
                    draggable={false}
                    style={{
                      pointerEvents: isPaid ? 'auto' : 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                  />
                  <div className="absolute bottom-4 left-4 px-3 py-1 bg-apple-text/80 text-[10px] text-white rounded-full uppercase font-bold backdrop-blur-sm">
                    Trước
                  </div>
                </div>
                <div className="w-1/2 h-full relative overflow-hidden">
                  <img
                    src={generated}
                    alt="Sau"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                    style={{
                      pointerEvents: isPaid ? 'auto' : 'none',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                    }}
                  />
                  <div className="absolute bottom-4 right-4 px-3 py-1 bg-apple-blue/90 text-[10px] text-white rounded-full uppercase font-bold backdrop-blur-sm">
                    Sau
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={generated}
                alt="Ảnh đã xử lý"
                className="w-full h-full object-cover animate-fade-in"
                draggable={false}
                style={{
                  pointerEvents: isPaid ? 'auto' : 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
            )}
          </div>
        ) : original ? (
          <img
            src={original}
            alt="Ảnh gốc"
            className="w-full h-full object-cover opacity-50 grayscale"
            draggable={false}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-apple-secondary p-8 text-center bg-apple-bg">
            <Camera className="w-16 h-16 mb-6 opacity-20" />
            <p className="text-sm font-medium">Tải ảnh lên để xem trước</p>
          </div>
        )}
      </motion.div>

      {generated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-apple-card border border-slate-200 rounded-2xl flex items-center gap-3 shadow-sm"
        >
          <Info className="w-4 h-4 text-apple-blue shrink-0" />
          <p className="text-[11px] text-apple-secondary leading-tight">
            <span className="font-bold text-apple-text">Biometric Lock:</span>{' '}
            Hệ thống đã khóa các điểm mốc trên khuôn mặt. Mọi thay đổi trang
            phục và ánh sáng được áp dụng mà không làm biến dạng cấu trúc
            xương và tỉ lệ nhân trắc học.
          </p>
        </motion.div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────
export default function App() {
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<PhotoSize | null>(null);
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [outfit, setOutfit] = useState(OUTFITS[0]);
  const [shirtColor, setShirtColor] = useState(SHIRT_COLORS[0]);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [hasPremiumKey, setHasPremiumKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSub = useMemo(
    () => ALL_SUB_CATEGORIES.find(s => s.id === activeSubId) || null,
    [activeSubId]
  );

  const originalImageUrl = useMemo(() => {
    if (!originalImage) return null;
    const url = URL.createObjectURL(originalImage);
    return url;
  }, [originalImage]);

  useEffect(() => {
    return () => {
      if (originalImageUrl) URL.revokeObjectURL(originalImageUrl);
    };
  }, [originalImageUrl]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('photo-studio-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // localStorage corrupted, ignore
    }
  }, []);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await (window as any).aistudio?.hasSelectedApiKey?.();
        setHasPremiumKey(!!hasKey);
      } catch {
        setHasPremiumKey(false);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    try {
      await (window as any).aistudio?.openSelectKey?.();
      setHasPremiumKey(true);
    } catch (err) {
      console.error('Lỗi khi mở trình chọn key:', err);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Định dạng không hỗ trợ. Vui lòng dùng JPG, PNG, hoặc WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh quá lớn (tối đa 10MB). Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    setOriginalImage(file);
    setGeneratedImageUrl(null);
    setIsConfirmed(false);
    setIsPaid(false);
    setError(null);
    e.target.value = '';
  };

  const handleCameraCapture = async (base64DataUrl: string) => {
    try {
      const res = await fetch(base64DataUrl);
      const blob = await res.blob();

      if (blob.size > 10 * 1024 * 1024) {
        setError('Ảnh từ camera quá lớn. Vui lòng thử lại.');
        setShowCamera(false);
        return;
      }

      const file = new File([blob], `camera-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      setOriginalImage(file);
      setGeneratedImageUrl(null);
      setIsConfirmed(false);
      setIsPaid(false);
      setError(null);
    } catch {
      setError('Không thể xử lý ảnh từ camera. Vui lòng thử lại.');
    }
    setShowCamera(false);
  };

  const handleGenerate = async () => {
    if (!originalImage || !activeSub) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);
    setIsConfirmed(false);
    setIsPaid(false);

    const messages = [
      'Đang khởi tạo hệ thống bảo mật sinh trắc học...',
      'Phân tích Facial Landmarks (Điểm mốc khuôn mặt)...',
      'Xác lập Biometric Lock (Khóa tỉ lệ nhân trắc học)...',
      'Quét nốt ruồi, sẹo và đặc điểm nhận dạng duy nhất...',
      'Áp dụng ánh sáng Studio 3 điểm (Key, Fill, Rim)...',
      'Đồng nhất màu da & Bảo toàn cấu trúc da tự nhiên...',
      'Phục trang kỹ thuật số: Áo sơ mi chuyên nghiệp...',
      'Kiểm định đối soát: Đảm bảo độ khớp danh tính...',
    ];
    let msgIdx = 0;
    const interval = setInterval(() => {
      setLoadingMessage(messages[msgIdx % messages.length]);
      msgIdx++;
    }, 2000);

    try {
      const bgConfig: BackgroundColor = {
        type: 'solid',
        name: 'White',
        value: '#ffffff',
      };
      const finalSize = selectedSize || activeSub.size;
      const enhancementPrompts = selectedEnhancements
        .map(id => ENHANCEMENTS.find(e => e.id === id)?.prompt)
        .filter(Boolean)
        .join(', ');

      const fullOutfit = `${outfit} màu ${shirtColor.name}`;

      const model = hasPremiumKey
        ? 'gemini-3.1-flash-image-preview'
        : 'gemini-2.5-flash-preview-05-20';

      const result = await generatePassportPhoto(
        originalImage,
        finalSize,
        bgConfig,
        fullOutfit,
        enhancementPrompts,
        undefined,
        model
      );

      const url = `data:image/jpeg;base64,${result}`;
      setGeneratedImageUrl(url);

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        imageUrl: url,
        photoSize: finalSize,
        timestamp: Date.now(),
        outfit: fullOutfit,
      };
      const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
      setHistory(updated);
      try {
        localStorage.setItem('photo-studio-history', JSON.stringify(updated));
      } catch {
        // localStorage đầy – bỏ qua, không crash app
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi xử lý ảnh. Vui lòng thử lại.');
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl || !activeSub) return;
    const link = document.createElement('a');
    link.href = generatedImageUrl;
    link.download = `the-lowe-${activeSub.id}-${Date.now()}.jpg`;
    link.click();
  };

  // ─── RENDER ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-apple-bg text-apple-text font-sans selection:bg-apple-blue/10">

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <header className="container mx-auto max-w-5xl px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-apple-card border border-slate-200 text-apple-secondary text-xs font-bold uppercase tracking-widest mb-4 animate-fade-in shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-apple-blue" />
          Digital Photo Lab Specialist
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-apple-text tracking-tight mb-6">
          THE <span className="text-apple-blue">LOWE</span>
        </h1>
        <p className="text-apple-secondary text-xl md:text-2xl max-w-3xl mx-auto font-medium leading-relaxed">
          Phòng Lab kỹ thuật số chuyên nghiệp. Tạo ảnh thẻ chuẩn pháp lý,
          giữ nguyên danh tính sinh trắc học 100% với chất lượng Studio.
        </p>

        <div className="flex justify-center pt-4">
          {!hasPremiumKey ? (
            <button
              onClick={handleOpenKeySelector}
              className="group flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full hover:border-apple-blue transition-all shadow-sm"
            >
              <div className="p-1.5 rounded-full bg-apple-bg text-apple-blue group-hover:bg-apple-blue group-hover:text-white transition-all">
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-apple-text uppercase tracking-tight">
                  Thử chất lượng 4K Studio
                </p>
                <p className="text-[10px] text-apple-secondary">
                  Sử dụng API Key cá nhân của bạn
                </p>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 border border-blue-200 rounded-full shadow-sm">
              <ShieldCheck className="w-5 h-5 text-apple-blue" />
              <span className="text-xs font-bold text-apple-blue uppercase tracking-tight">
                Premium 4K Active
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-6 pb-32">
        <div className="space-y-20">

          <section className="space-y-10 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-apple-text">
                  Chọn loại ảnh
                </h2>
                <p className="text-apple-secondary text-base">
                  Hơn 10+ định dạng chuẩn quốc tế
                </p>
              </div>
              {activeSubId && (
                <button
                  onClick={() => {
                    setActiveSubId(null);
                    setOriginalImage(null);
                    setGeneratedImageUrl(null);
                  }}
                  className="text-apple-blue font-bold text-sm hover:underline"
                >
                  Thay đổi lựa chọn
                </button>
              )}
            </div>

            {!activeSubId ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {ALL_SUB_CATEGORIES.map(sub => (
                  <SubCategoryItem
                    key={sub.id}
                    sub={sub}
                    isActive={false}
                    onClick={() => {
                      setActiveSubId(sub.id);
                      setSelectedSize(sub.size);
                      setOriginalImage(null);
                      setGeneratedImageUrl(null);
                      setError(null);
                    }}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
              >
                <VisualGuide
                  sub={{
                    ...activeSub!,
                    size: selectedSize || activeSub!.size,
                    aspectRatio:
                      (selectedSize || activeSub!.size) === '5x5'
                        ? 'aspect-square'
                        : activeSub!.aspectRatio,
                  }}
                />

                <div className="space-y-10">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                    <FileCheck className="w-5 h-5 text-apple-blue shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-apple-blue uppercase tracking-tight">
                        Cam kết bảo toàn danh tính
                      </p>
                      <p className="text-[11px] text-blue-700/80 leading-snug mt-1">
                        Lớp nền sinh trắc học (xương mặt, nốt ruồi, sẹo) được
                        giữ nguyên tuyệt đối. Chỉ tinh chỉnh bề mặt da và bối
                        cảnh để đảm bảo tính chuyên nghiệp.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold tracking-tight">Tải ảnh lên</h3>

                    {!originalImage && !showCamera ? (
                      <div className="space-y-4">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="group w-full aspect-[4/3] rounded-3xl bg-apple-card border-2 border-dashed border-slate-200 hover:border-apple-blue transition-all flex flex-col items-center justify-center gap-6 shadow-sm"
                        >
                          <div className="p-5 rounded-full bg-apple-bg text-apple-secondary group-hover:bg-apple-blue group-hover:text-white transition-all shadow-inner">
                            <Upload className="w-10 h-10" />
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-apple-text">
                              Tải ảnh chân dung
                            </p>
                            <p className="text-sm text-apple-secondary mt-1">
                              Hỗ trợ JPG, PNG, WebP (tối đa 10MB)
                            </p>
                          </div>
                        </button>
                        <button
                          onClick={() => setShowCamera(true)}
                          className="w-full py-4 bg-apple-card border-2 border-apple-blue/20 hover:border-apple-blue text-apple-blue font-bold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-sm"
                        >
                          <Camera className="w-5 h-5" />
                          Chụp ảnh trực tiếp
                        </button>
                      </div>
                    ) : originalImage ? (
                      <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
                        <img
                          src={originalImageUrl!}
                          alt="Ảnh gốc"
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                        <button
                          onClick={() => {
                            setOriginalImage(null);
                            setGeneratedImageUrl(null);
                            setError(null);
                          }}
                          className="absolute top-6 right-6 p-3 bg-white/90 hover:bg-red-50 text-red-600 rounded-full transition-all shadow-xl backdrop-blur-sm"
                          aria-label="Xóa ảnh"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold tracking-tight text-apple-text">
                        Trang phục
                      </h3>
                      <textarea
                        value={outfit}
                        onChange={e => {
                          if (e.target.value.length <= 300)
                            setOutfit(e.target.value);
                        }}
                        className="w-full p-5 bg-apple-card border border-slate-200 rounded-2xl text-sm focus:border-apple-blue focus:ring-4 focus:ring-apple-blue/10 outline-none transition-all min-h-[100px] shadow-sm"
                        placeholder="Mô tả trang phục..."
                        maxLength={300}
                      />
                      <div className="flex flex-wrap gap-2">
                        {OUTFITS.map(o => (
                          <button
                            key={o}
                            onClick={() => setOutfit(o)}
                            className={`px-4 py-2.5 rounded-full text-[10px] font-bold transition-all border ${
                              outfit === o
                                ? 'bg-apple-text border-apple-text text-white'
                                : 'bg-white border-slate-200 text-apple-secondary hover:border-slate-400'
                            }`}
                          >
                            {o}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-4 pt-4 border-t border-apple-bg">
                        <h4 className="text-sm font-bold tracking-tight text-apple-secondary uppercase">
                          Màu áo
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {SHIRT_COLORS.map(c => (
                            <button
                              key={c.name}
                              onClick={() => setShirtColor(c)}
                              className={`group relative p-1 rounded-full border-2 transition-all ${
                                shirtColor.name === c.name
                                  ? 'border-apple-blue scale-110'
                                  : 'border-transparent hover:border-slate-300'
                              }`}
                              title={c.name}
                              aria-label={`Màu ${c.name}`}
                            >
                              <div
                                className="w-8 h-8 rounded-full shadow-inner border border-black/5"
                                style={{ backgroundColor: c.value }}
                              />
                              {shirtColor.name === c.name && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-apple-blue uppercase tracking-tighter">
                                  {c.name}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-apple-bg">
                        <h4 className="text-sm font-bold tracking-tight text-apple-secondary uppercase">
                          Chỉnh sửa & Làm đẹp
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {ENHANCEMENTS.map(e => (
                            <button
                              key={e.id}
                              onClick={() =>
                                setSelectedEnhancements(prev =>
                                  prev.includes(e.id)
                                    ? prev.filter(id => id !== e.id)
                                    : [...prev, e.id]
                                )
                              }
                              className={`px-4 py-2 text-[10px] font-bold transition-all border flex items-center gap-2 rounded-full ${
                                selectedEnhancements.includes(e.id)
                                  ? 'bg-apple-blue border-apple-blue text-white shadow-md'
                                  : 'bg-white border-slate-200 text-apple-secondary hover:border-slate-400'
                              }`}
                            >
                              <div
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                                  selectedEnhancements.includes(e.id)
                                    ? 'bg-white border-white'
                                    : 'bg-slate-100 border-slate-200'
                                }`}
                              >
                                {selectedEnhancements.includes(e.id) && (
                                  <Check className="w-2.5 h-2.5 text-apple-blue" />
                                )}
                              </div>
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {activeSub?.availableSizes &&
                      activeSub.availableSizes.length > 1 && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-bold tracking-tight">
                            Chọn kích thước
                          </h3>
                          <div className="grid grid-cols-1 gap-4">
                            {activeSub.availableSizes.map(s => (
                              <button
                                key={s}
                                onClick={() => setSelectedSize(s)}
                                className={`flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 ${
                                  selectedSize === s
                                    ? 'bg-apple-blue border-apple-blue text-white shadow-lg'
                                    : 'bg-apple-card border-slate-200 text-apple-text hover:border-apple-secondary'
                                }`}
                              >
                                <div className="flex flex-col items-start">
                                  <span className="text-lg font-bold">
                                    {s} cm
                                  </span>
                                  <span
                                    className={`text-[10px] font-medium uppercase tracking-wider ${
                                      selectedSize === s
                                        ? 'text-white/70'
                                        : 'text-apple-secondary'
                                    }`}
                                  >
                                    {s === '5x5'
                                      ? 'Khổ vuông quốc tế'
                                      : 'Kích thước chuẩn'}
                                  </span>
                                </div>
                                <div
                                  className={`p-2 rounded-full transition-all ${
                                    selectedSize === s
                                      ? 'bg-white text-apple-blue'
                                      : 'bg-apple-bg text-transparent'
                                  }`}
                                >
                                  <Check className="w-4 h-4" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                      <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={!originalImage || isLoading}
                    className="w-full py-5 bg-apple-blue hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-lg font-bold rounded-2xl shadow-xl shadow-apple-blue/20 transition-all flex items-center justify-center gap-4"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <Sparkles className="w-6 h-6" />
                    )}
                    {generatedImageUrl ? 'Thử phiên bản khác' : 'Xử lý hình ảnh'}
                  </button>
                </div>
              </motion.div>
            )}
          </section>

          {generatedImageUrl && !isLoading && (
            <section className="space-y-12 animate-fade-in border-t border-slate-200 pt-20">
              <div className="text-center space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">
                  Kết quả xử lý
                </h2>
                <p className="text-apple-secondary">
                  Đã được tinh chỉnh bởi thuật toán nhiếp ảnh độc quyền
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <ImagePreview
                  original={originalImageUrl}
                  generated={generatedImageUrl}
                  aspectRatio={activeSub!.aspectRatio}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                  showComparison={showComparison}
                  isPaid={isPaid}
                />

                <div className="space-y-10">
                  <button
                    onClick={() => setShowComparison(!showComparison)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-full text-sm font-bold transition-all border ${
                      showComparison
                        ? 'bg-apple-text text-white border-apple-text shadow-lg'
                        : 'bg-white text-apple-secondary border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    {showComparison ? 'Xem ảnh đã xử lý' : 'So sánh trước/sau'}
                  </button>

                  {!isConfirmed ? (
                    <div className="p-10 bg-apple-card border border-slate-200 rounded-3xl space-y-8 shadow-sm">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight">
                          Xác nhận ảnh
                        </h3>
                        <p className="text-sm text-apple-secondary">
                          Nếu bạn hài lòng với kết quả, hãy nhấn tiếp tục.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsConfirmed(true)}
                        className="w-full py-5 bg-apple-blue hover:bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-apple-blue/10 transition-all flex items-center justify-center gap-4"
                      >
                        <Check className="w-6 h-6" />
                        Sử dụng ảnh này
                      </button>
                    </div>
                  ) : (
                    <div className="p-10 bg-apple-card border border-apple-blue rounded-[32px] space-y-10 animate-scale-up shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 opacity-[0.03]">
                        <CreditCard className="w-60 h-60 text-apple-blue" />
                      </div>

                      <div className="space-y-3 relative z-10 text-center lg:text-left">
                        <h3 className="text-3xl font-bold tracking-tight">
                          Sẵn sàng tải về
                        </h3>
                        <p className="text-base text-apple-secondary">
                          Thanh toán để loại bỏ watermark và nhận bản HD chất
                          lượng cao.
                        </p>
                      </div>

                      <div className="p-8 bg-apple-bg rounded-2xl border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                          <div className="p-5 rounded-2xl bg-white shadow-sm text-apple-blue">
                            <CreditCard className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-xs text-apple-secondary font-bold uppercase tracking-widest mb-1">
                              Dịch vụ trọn gói
                            </p>
                            <p className="text-3xl font-black text-apple-text">
                              20.000đ
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsPaid(true)}
                          className="w-full sm:w-auto px-10 py-4 bg-apple-blue hover:bg-blue-600 text-white text-base font-bold rounded-xl transition-all shadow-lg"
                        >
                          Thanh toán ngay
                        </button>
                      </div>

                      {isPaid && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in relative z-10">
                          <button
                            onClick={handleDownload}
                            className="py-4 bg-apple-text hover:bg-black text-white font-bold rounded-2xl text-base flex items-center justify-center gap-3 transition-all"
                          >
                            <Download className="w-5 h-5" />
                            Tải xuống bản HD
                          </button>
                          <button
                            onClick={async () => {
                              if (navigator.share && generatedImageUrl) {
                                try {
                                  const res = await fetch(generatedImageUrl);
                                  const blob = await res.blob();
                                  const file = new File(
                                    [blob],
                                    `the-lowe-${activeSub!.id}.jpg`,
                                    { type: 'image/jpeg' }
                                  );
                                  await navigator.share({ files: [file] });
                                } catch {
                                  handleDownload();
                                }
                              } else {
                                handleDownload();
                              }
                            }}
                            className="py-4 bg-white hover:bg-apple-bg text-apple-text border border-slate-200 font-bold rounded-2xl text-base flex items-center justify-center gap-3 transition-all"
                          >
                            <Share2 className="w-5 h-5" />
                            Chia sẻ
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {history.length > 0 && (
        <section className="bg-white border-t border-slate-100 py-24">
          <div className="container mx-auto max-w-5xl px-6 space-y-12">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight">
                  Tác phẩm gần đây
                </h2>
                <p className="text-apple-secondary text-sm">
                  Xem lại các phiên bản bạn đã tạo
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Xóa vĩnh viễn lịch sử sáng tạo?')) {
                    setHistory([]);
                    try {
                      localStorage.removeItem('photo-studio-history');
                    } catch {}
                  }
                }}
                className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                aria-label="Xóa lịch sử"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-6">
              {history.map(item => (
                <div
                  key={item.id}
                  className="group relative aspect-[3/4] bg-apple-bg rounded-2xl overflow-hidden border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-2 duration-500"
                >
                  <img
                    src={item.imageUrl}
                    alt="Lịch sử"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-apple-text/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = item.imageUrl;
                        link.download = `history-${item.id}.jpg`;
                        link.click();
                      }}
                      className="p-4 bg-white text-apple-text rounded-full hover:scale-110 transition-all shadow-2xl"
                      aria-label="Tải ảnh"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <footer className="container mx-auto max-w-5xl px-6 py-20 text-center space-y-4">
        <p className="text-apple-secondary text-xs font-medium max-w-lg mx-auto leading-relaxed opacity-60">
          Ứng dụng sử dụng mô hình AI tiên tiến để xử lý hình ảnh theo tiêu
          chuẩn nhiếp ảnh chuyên nghiệp toàn cầu.
        </p>
        <p className="text-apple-text text-sm font-bold tracking-tight">
          © 2024 THE LOWE • PREMIUM EDITORIAL LAB
        </p>
      </footer>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
      />
    </div>
  );
}
