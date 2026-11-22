# CLAUDE.md — THE_POKER Engineering Rules

## 1. Project Identity
**THE_POKER** is an online 2.5D Texas Hold'em Poker game ("Thần Bài Đời Thường") with server-authoritative game state, Match Time Bank, "Vía" energy, 5 everyday items, and 3 server-verified mini-game skills.

## 2. Mandatory Architecture Rules
- **Monorepo Layout**: `backend/` (Node.js + TypeScript + Express + Socket.IO + Mongoose) and `frontend/` (Vite + TypeScript).
- **Strict 4-Layer Clean Architecture inside `backend/src/`**:
  1. `domain/`: Pure TypeScript Entities, Value Objects, Game Rules, Repository Interfaces. **NEVER** import `express`, `mongoose`, or `socket.io` here.
  2. `application/`: Use Cases & Domain Event DTOs. Orchestrates domain rules via repository interfaces. **NEVER** import `express`, `mongoose`, or `socket.io` here.
  3. `infrastructure/`: Mongoose Models/Repositories, In-Memory Repositories (fallback when `MONGO_URI` is empty), Bot AI Engine, 1s Match Timer Loop.
  4. `presentation/`: Express REST Routes/Controllers and Socket.IO Gateway.
- **Database Collection Rule**: Player profiles MUST be stored in MongoDB collection `accounts` (Mongoose model `Account`). **NEVER** create or reference `user` or `users`.
- **Server-Authoritative & Anti-Cheat**:
  - All card draws, hand evaluation, side pots, time bank ticks, Vía regeneration, loan interest, and mini-game evaluations run exclusively on the server.
  - Every `room_state_update` MUST be filtered per `socketId` via `filterRoomStateForViewer()` so opponents' unexposed hole cards are replaced with `null` unless exposed ("Lộ Tẩy") or in `SHOWDOWN`.
  - `EAGLE_EYE` card peeks MUST be emitted privately (`eagle_eye_reveal`) ONLY to the skill owner's `socketId`.

## 3. Development Commands
- Install all dependencies: `npm install`
- Run backend in dev mode: `npm run dev:backend`
- Type-check backend: `npm run typecheck:backend`
- Build backend: `npm run build:backend`
- Run unit tests: `npm run test:backend`
- Follow `docs/agents/karpathy-guidelines.md` for all changes.
