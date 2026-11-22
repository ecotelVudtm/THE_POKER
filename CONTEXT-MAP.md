# CONTEXT-MAP.md — THE_POKER System Reference

> Quick-reference map of Domain Entities, REST APIs, and Socket.IO Contracts for Frontend (Prompt 2 & 3) and Backend development.

---

## 1. Directory Map
```
THE_POKER/
├── backend/
│   └── src/
│       ├── domain/
│       │   ├── entities/        # Account, Card, Deck, Player, Room
│       │   ├── value-objects/   # Item, Loan, Skill
│       │   ├── rules/           # HandEvaluator, PotCalculator, MiniGameEngine, StateFilter
│       │   └── repositories/    # IAccountRepository, IRoomRepository
│       ├── application/
│       │   ├── dtos/            # GameEvents
│       │   └── use-cases/       # AuthenticateAccount, JoinRoom, StartMatch, PlaceBet,
│       │                        # TriggerSkill, SubmitMiniGame, UseItem, TakeLoan, RepayLoan
│       ├── infrastructure/
│       │   ├── database/        # mongooseConnection, models/AccountModel (collection: 'accounts')
│       │   ├── repositories/    # MongoAccountRepository, InMemoryAccountRepository, InMemoryRoomRepository
│       │   ├── ai/              # BotAIEngine
│       │   └── timer/           # MatchTimerLoop (1s tick)
│       ├── presentation/
│       │   ├── http/            # Express app, routes, controllers
│       │   └── socket/          # SocketGateway
│       ├── __tests__/           # HandEvaluator.test.ts, MiniGameScaling.test.ts
│       └── index.ts             # Composition root (default PORT=4000)
└── frontend/                    # React + TS + Vite + Tailwind + React Three Fiber (2.5D)
    └── src/
        ├── styles/              # theme.css (Semantic CSS Tokens), themeTokens.ts (3D tokens)
        ├── types/               # game.ts (shared frontend types matching backend contract)
        ├── services/            # apiClient.ts, socketClient.ts, soundEngine.ts (Web Audio API)
        ├── stores/              # useGameStore.ts (Zustand real-time state)
        ├── hooks/               # usePokerSocket.ts (Socket.IO <-> Store <-> SoundEngine bridge)
        ├── scenes/              # PokerTableScene, PlayingCard3D, ChipStack3D, TableItems3D, OpponentSeat3D, CardTextureFactory
        └── components/          # LobbyView, GameHudOverlay, TimeBankWidget, BetControlsBar,
                                 # SkillActionBar, EventToastFeed, MiniGameOverlay, TimingBarMiniGame,
                                 # BalanceCircleMiniGame, RhythmTapMiniGame, LoanPhoneModal
```

---

## 2. Domain Entities Summary

### `Account` (MongoDB collection: `accounts`)
```ts
{
  id: string;
  username: string;
  displayName: string;
  chips: number; // default: 10000
  skillMastery: {
    sleightOfHand: { level: number; exp: number }; // 1..10
    eagleEye: { level: number; exp: number };
    pressureAura: { level: number; exp: number };
  };
  debtHistory: Array<{
    loanId: string;
    packageType: 'CHIPS_2000' | 'CHIPS_5000' | 'TIME_60S';
    principal: number;
    repaidAmount: number;
    status: 'ACTIVE' | 'REPAID' | 'DEFAULTED';
    createdAt: string;
    resolvedAt?: string;
  }>;
  stats: { wins: number; matchesPlayed: number; caughtCount: number };
}
```

### `FilteredRoomState` (Emitted in `room_state_update`)
```ts
{
  id: string;
  name: string;
  hostAccountId: string;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  phase: 'WAITING' | 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  dealerIndex: number;
  currentTurnIndex: number;
  currentTurnAccountId: string | null;
  pot: number;
  sidePots: Array<{ amount: number; eligibleAccountIds: string[] }>;
  communityCards: Card[]; // Card = { rank: 2..14, suit: 'SPADES'|'HEARTS'|'DIAMONDS'|'CLUBS', code: string }
  handNumber: number;
  currentBet: number;
  minRaise: number;
  players: PublicPlayerView[]; // holeCards are `null` for non-owners unless exposedCardIndices or SHOWDOWN
  lastWinners: Array<{ accountId: string; displayName: string; amount: number; handName: string; bestCards: Card[] }>;
  eventLog: Array<{ timestamp: number; message: string }>;
}
```

### Game Mechanics Constants
- **Time Bank**: `300s` total per player + `20s/turn`. Total bank ticks ONLY on player's turn OR while `phoneOpen` / `activeChallenge` is open. `0s` -> `TIME_OUT` (auto-fold & eliminated).
- **Vía Energy**: `0..100` (starts at 30). `+10` after each betting round, `+20` on hand win.
- **5 Items (`ItemType`)**:
  - `PHONE`: Borrow `CHIPS_2000`, `CHIPS_5000`, or `TIME_60S` (+60s, principal 1500). Interest `+15%/hand`. Overdue `> 3 hands` -> `debtPressure: true` (+20% mini-game difficulty) + `debt_call_incoming` event. Out of chips with unpaid loan -> locks 1 random item for 2 hands (`item_locked`).
  - `INCENSE_BOWL`: Cost `20 Vía`, cooldown `2 hands`. Sets `blessed: true` (+20% mini-game success zone, slight draw boost).
  - `LUCKY_MANGO`: `2 uses/match`. Clears `pressured` & suppresses `debtPressure` for current hand, grants `mangoShield: true` (blocks 1 Lộ Tẩy).
  - `ICED_TEA`: Cooldown `2 hands`. Adds `+20s` time bank and slows mini-game speed by `15%` (`icedTeaActive: true`).
  - `LUCKY_COIN` (Passive): Auto-triggers on All-In loss when initial win prob `< 25%` -> refunds `15%` of total bet in hand (`lucky_coin_triggered`).
- **3 Skills (`SkillType`)** (6s server challenge timeout; fail -> Lộ Tẩy exposes 1 hole card unless `mangoShield`):
  - `SLEIGHT_OF_HAND` (`30 Vía`, `TIMING_BAR`): Swaps `cardIndex` (`0 | 1`) with new deck card.
  - `EAGLE_EYE` (`25 Vía`, `BALANCE_CIRCLE`): Privately sends next community card via `eagle_eye_reveal`.
  - `PRESSURE_AURA` (`25 Vía`, `RHYTHM_TAP`): Deducts `10s` from `targetAccountId`'s time bank & sets `pressured: true`.

---

## 3. REST API Endpoints (`http://localhost:4000`)
| Method | Path | Body / Query | Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | — | `{ status, service, storageMode, timestamp }` |
| `POST` | `/api/accounts/auth` | `{ username, displayName? }` | `{ account }` |
| `GET` | `/api/accounts/leaderboard` | `?limit=10` | `{ accounts }` |
| `GET` | `/api/accounts/:id` | — | `{ account }` |
| `GET` | `/api/rooms` | — | `{ rooms: RoomSummary[] }` |
| `GET` | `/api/rooms/:id` | — | `{ room: FilteredRoomState }` (all private hole cards masked) |

---

## 4. Socket.IO Events Contract

### Client -> Server
| Event | Payload | Description |
| :--- | :--- | :--- |
| `authenticate` | `{ username: string, displayName?: string }` | Authenticates/creates `Account` and binds `socket.data.accountId` |
| `create_room` | `{ roomName?, botCount?: 0..3, smallBlind?, bigBlind?, accountId? }` | Creates a new room with optional 1–3 Bots |
| `join_room` | `{ roomId: string, accountId? }` | Joins an existing room or reconnects |
| `leave_room` | `{ roomId: string }` | Leaves the room |
| `start_match` | `{ roomId: string }` | Starts match / deals first hand (host only when WAITING) |
| `place_bet` | `{ roomId: string, action: 'FOLD'\|'CHECK'\|'CALL'\|'RAISE'\|'ALL_IN', raiseAmount? }` | Executes betting action on player's turn |
| `trigger_skill` | `{ roomId: string, skillType, targetAccountId?, cardIndex?: 0\|1 }` | Spends Vía and requests a 6s server `MiniGameChallenge` |
| `submit_minigame` | `{ roomId: string, payload: { challengeId, cursorPosition?, balanceSamples?, balanceHoldRatio?, tapTimestampsMs? } }` | Submits mini-game result for authoritative verification |
| `use_item` | `{ roomId: string, itemType: 'INCENSE_BOWL'\|'LUCKY_MANGO'\|'ICED_TEA' }` | Activates an everyday item |
| `take_loan` | `{ roomId: string, packageType: 'CHIPS_2000'\|'CHIPS_5000'\|'TIME_60S' }` | Takes a hot loan via `PHONE` |
| `repay_loan` | `{ roomId: string }` | Repays active loan with chips |
| `open_phone` | `{ roomId: string }` | Marks phone UI open (time bank ticks while open) |
| `close_phone` | `{ roomId: string }` | Marks phone UI closed |

### Server -> Client
| Event | Target | Payload |
| :--- | :--- | :--- |
| `authenticated` | Sender | `{ account: Account }` |
| `room_state_update` | Per-socket (filtered) | `FilteredRoomState` |
| `minigame_challenge` | Private (skill owner) | `MiniGameChallenge` |
| `eagle_eye_reveal` | Private (skill owner) | `{ nextCommunityCard: Card \| null }` |
| `debt_call_incoming` | Private (debtor) | `{ currentOwed: number, handsElapsed: number }` |
| `minigame_result` | Room broadcast | `{ roomId, accountId, skillType, success, reason, accuracy, exposedCardIndex, mangoShieldBlocked, expGained, leveledUp, newLevel }` |
| `item_locked` | Room broadcast | `{ roomId, accountId, item, handsLeft }` |
| `lucky_coin_triggered` | Room broadcast | `{ roomId, accountId, refundAmount, winProbability }` |
| `player_timed_out` | Room broadcast | `{ roomId, accountId, displayName }` |
| `error_event` | Sender | `{ event: string, message: string }` |
