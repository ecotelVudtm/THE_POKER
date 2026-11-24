import { Card } from './Card';
import { Deck } from './Deck';
import { Player } from './Player';

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
export type RoomMode = 'STANDARD' | 'ARENA';

export type GamePhase =
  | 'WAITING'
  | 'PRE_FLOP'
  | 'FLOP'
  | 'TURN'
  | 'RIVER'
  | 'SHOWDOWN';

export type BetAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL_IN';

export interface SidePot {
  amount: number;
  eligibleAccountIds: string[];
}

export interface HandWinner {
  accountId: string;
  displayName: string;
  amount: number;
  handName: string;
  bestCards: Card[];
}

export interface RoomLogEntry {
  timestamp: number;
  message: string;
}

export interface RoomStakeTier {
  maxBuyIn: number;
  label: string;
  smallBlind: number;
  bigBlind: number;
}

export const ROOM_STAKE_TIERS: readonly RoomStakeTier[] = [
  { maxBuyIn: 500, label: '500', smallBlind: 10, bigBlind: 20 },
  { maxBuyIn: 1000, label: '1K', smallBlind: 20, bigBlind: 40 },
  { maxBuyIn: 5000, label: '5K', smallBlind: 100, bigBlind: 200 },
  { maxBuyIn: 10000, label: '10K', smallBlind: 200, bigBlind: 400 },
  { maxBuyIn: 50000, label: '50K', smallBlind: 1000, bigBlind: 2000 },
  { maxBuyIn: 100000, label: '100K', smallBlind: 2000, bigBlind: 4000 },
  { maxBuyIn: 500000, label: '500K', smallBlind: 10000, bigBlind: 20000 },
  { maxBuyIn: 1000000, label: '1TR', smallBlind: 20000, bigBlind: 40000 },
];

export function resolveRoomStakeTier(maxBuyIn?: number): RoomStakeTier {
  const found = ROOM_STAKE_TIERS.find((t) => t.maxBuyIn === maxBuyIn);
  return found ?? ROOM_STAKE_TIERS[3]; // Default: 10K (SB 200 / BB 400)
}

export interface Room {
  id: string;
  name: string;
  hostAccountId: string;
  mode: RoomMode;
  status: RoomStatus;
  phase: GamePhase;
  maxBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  maxPlayers: number;
  dealerIndex: number;
  currentTurnIndex: number;
  pot: number;
  sidePots: SidePot[];
  communityCards: Card[];
  deck: Deck;
  players: Player[];
  handNumber: number;
  currentBet: number;
  minRaise: number;
  lastWinners: HandWinner[];
  eventLog: RoomLogEntry[];
  createdAt: Date;
}

export function createRoom(params: {
  id: string;
  name: string;
  hostAccountId: string;
  mode?: RoomMode;
  maxBuyIn?: number;
  smallBlind?: number;
  bigBlind?: number;
  maxPlayers?: number;
}): Room {
  const tier = resolveRoomStakeTier(params.maxBuyIn);
  const smallBlind = params.smallBlind ?? tier.smallBlind;
  const bigBlind = params.bigBlind ?? tier.bigBlind;
  return {
    id: params.id,
    name: params.name,
    hostAccountId: params.hostAccountId,
    mode: params.mode ?? 'STANDARD',
    status: 'WAITING',
    phase: 'WAITING',
    maxBuyIn: tier.maxBuyIn,
    smallBlind,
    bigBlind,
    maxPlayers: params.maxPlayers ?? 6,
    dealerIndex: -1,
    currentTurnIndex: -1,
    pot: 0,
    sidePots: [],
    communityCards: [],
    deck: new Deck(),
    players: [],
    handNumber: 0,
    currentBet: 0,
    minRaise: bigBlind,
    lastWinners: [],
    eventLog: [],
    createdAt: new Date(),
  };
}

export function appendRoomLog(room: Room, message: string): void {
  room.eventLog.push({ timestamp: Date.now(), message });
  if (room.eventLog.length > 50) {
    room.eventLog.splice(0, room.eventLog.length - 50);
  }
}
