import { Card } from './Card';
import { Deck } from './Deck';
import { Player } from './Player';

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';

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

export interface Room {
  id: string;
  name: string;
  hostAccountId: string;
  status: RoomStatus;
  phase: GamePhase;
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
  smallBlind?: number;
  bigBlind?: number;
  maxPlayers?: number;
}): Room {
  return {
    id: params.id,
    name: params.name,
    hostAccountId: params.hostAccountId,
    status: 'WAITING',
    phase: 'WAITING',
    smallBlind: params.smallBlind ?? 50,
    bigBlind: params.bigBlind ?? 100,
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
    minRaise: params.bigBlind ?? 100,
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
