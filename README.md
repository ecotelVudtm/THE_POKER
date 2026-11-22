# THE_POKER — Thần Bài Đời Thường (2.5D Online Texas Hold'em)

Game bài Poker Texas Hold'em web 2.5D phong cách **"Thần Bài Đời Thường"** với kiến trúc **Server-Authoritative** (chống gian lận tuyệt đối), quỹ thời gian giới hạn, năng lượng **Vía**, **5 Đồ vật quen thuộc**, **3 Tuyệt kỹ Mini-game 60fps**, và âm thanh tổng hợp Web Audio API.

---

## Chạy nhanh (2 lệnh)

Cài đặt dependencies (1 lần duy nhất ở thư mục gốc):
```bash
npm install
```

Mở **2 terminal** tại thư mục gốc `THE_POKER/` và chạy:

1. **Terminal 1 — Backend Authoritative Game Server** (mặc định chạy cổng `4000`, tự động fallback In-Memory nếu chưa cấu hình `MONGO_URI`):
```bash
npm run dev:backend
```

2. **Terminal 2 — Frontend 2.5D Web Client** (Vite cổng `5173`, tự proxy `/api` và `/socket.io` sang `4000`):
```bash
npm run dev:frontend
```

Mở trình duyệt tại `http://localhost:5173`, nhập tên đăng nhập bất kỳ và bấm **"Chơi ngay với Bot (1 vs 3)"** để trải nghiệm ngay!

> **Kết nối MongoDB Atlas (tuỳ chọn):** Copy `.env.example` thành `backend/.env` và điền `MONGO_URI`. Dữ liệu người chơi được lưu chuẩn vào collection `accounts`.

---

## Kiểm thử & Build

```bash
# Kiểm tra TypeScript + Build + Unit Test Backend (Hand Evaluator & Mini-Game Mastery Scaling)
npm run typecheck:backend
npm run build:backend
npm run test:backend

# Kiểm tra TypeScript + Build Frontend
npm --workspace=frontend run build
```

---

## Kiến trúc hệ thống

- **Backend (`backend/src/`) — Clean Architecture 4 lớp nghiêm ngặt:**
  - `domain/`: Entities, Value Objects, Texas Hold'em Hand Evaluator, Side/Split Pot Calculator, Mini-Game Mastery Engine, State Filter (0 import Express/Mongoose/Socket.IO).
  - `application/`: 9 Use Cases (`AuthenticateAccount`, `JoinRoom`, `StartMatch`, `PlaceBet`, `TriggerSkill`, `SubmitMiniGame`, `UseItem`, `TakeLoan`, `RepayLoan`).
  - `infrastructure/`: Mongoose `AccountModel` (`collection: 'accounts'`), In-Memory fallback repositories, Bot AI Engine, 1s Match Timer Loop.
  - `presentation/`: Express REST API & Socket.IO Gateway (lọc `room_state_update` theo từng `socketId`).
- **Frontend (`frontend/src/`) — React + TS + Tailwind Semantic Tokens + React Three Fiber:**
  - `scenes/`: Bàn Poker 2.5D gỗ ấm nỉ xanh, lá bài trống đồng 3D, chip cược, 5 đồ vật tương tác 3D, ghế đối thủ.
  - `components/`: Lobby, Game HUD, 3 Mini-game 60fps (`TimingBarMiniGame`, `BalanceCircleMiniGame`, `RhythmTapMiniGame`), `LoanPhoneModal` (App Vay Nhanh 24/7 + cuộc gọi đòi nợ).
  - `services/soundEngine.ts`: Âm thanh tổng hợp 100% Web Audio API (zero external assets).
