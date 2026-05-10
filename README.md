# THE LOWE – Premium Photo Lab

Phòng Lab ảnh thẻ kỹ thuật số tích hợp AI. Tạo ảnh thẻ chuẩn pháp lý, giữ nguyên danh tính sinh trắc học 100%.

## Tính năng

- Xử lý ảnh thẻ chuẩn ICAO/ISO (hộ chiếu, CCCD, GPLX, Visa, CV...)
- Camera trực tiếp: full-screen, lật camera trước/sau, tự chụp đếm ngược, kiểm tra ảnh mờ
- Biometric Lock: khóa cấu trúc sinh trắc học, chỉ thay đổi trang phục & nền
- Bảo vệ ảnh: chặn chuột phải / kéo thả / screenshot khi chưa thanh toán
- Lịch sử ảnh (lưu localStorage, tối đa 8 ảnh)
- Premium mode: hỗ trợ API Key cá nhân qua AI Studio

## Cài đặt

```bash
npm install
cp .env.example .env
# Điền GEMINI_API_KEY vào .env
npm run dev
```

## Deploy (Vercel)

```bash
vercel --prod
# Thêm biến môi trường GEMINI_API_KEY và ALLOWED_ORIGIN trong Vercel dashboard
```

## Cấu trúc

```
├── App.tsx                  # UI chính (merge V5 + V1)
├── CameraCapture.tsx        # Camera (V1 UI + V5 blur detection)
├── services/
│   └── geminiService.ts     # Gọi Gemini trực tiếp (client-side)
├── api/
│   └── generate.ts          # Vercel serverless handler (server-side, có rate limit)
├── types.ts
├── index.tsx / index.html / index.css
└── .env.example
```

## Bảo mật đã tích hợp

| Hạng mục | Chi tiết |
|---|---|
| Input validation | Giới hạn kích thước file (10MB), whitelist MIME type |
| Prompt sanitization | Lọc control chars và HTML trước khi truyền vào AI |
| Rate limiting | 10 req/phút/IP (api/generate.ts) |
| CORS | Giới hạn theo `ALLOWED_ORIGIN` env khi production |
| Ảnh bảo vệ | `draggable=false`, block right-click, `pointer-events:none` khi chưa thanh toán |
| Memory leak | `URL.revokeObjectURL` khi component unmount |
| localStorage | Giới hạn 8 ảnh, try-catch khi đầy |
