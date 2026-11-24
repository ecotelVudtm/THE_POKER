import { Card } from '../entities/Card';
import { Player, PlayerStatusEffects } from '../entities/Player';
import { GamePhase, HandWinner, Room, RoomLogEntry, RoomMode, RoomStatus, SidePot } from '../entities/Room';
import { ItemType, PlayerItemsState } from '../value-objects/Item';
import { ActiveLoan } from '../value-objects/Loan';
import { SkillMastery } from '../entities/Account';
import { SkinId, WinEffectId } from '../value-objects/Cosmetic';
import { SkillType } from '../value-objects/Skill';

export interface PublicPlayerView {
  accountId: string;
  displayName: string;
  isBot: boolean;
  seatIndex: number;
  chips: number;
  currentBet: number;
  totalBetInHand: number;
  /** Hidden cards are represented as `null` for non-owners unless exposed (Lộ Tẩy) or Showdown */
  holeCards: (Card | null)[];
  exposedCardIndices: number[];
  folded: boolean;
  allIn: boolean;
  eliminated: boolean;
  timedOut: boolean;
  timeBankSeconds: number;
  turnRemainingSeconds: number;
  via: number;
  winStreak: number;
  arenaBuyIn: number;
  arenaBillsEarned: number;
  ownedItems: ItemType[];
  equippedSkills: SkillType[];
  equippedSkin: SkinId;
  equippedWinEffect: WinEffectId;
  itemsState: PlayerItemsState;
  statusEffects: PlayerStatusEffects;
  activeLoan: ActiveLoan | null;
  phoneOpen: boolean;
  hasActiveChallenge: boolean;
  skillMastery?: SkillMastery;
}

export interface FilteredRoomState {
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
  currentTurnAccountId: string | null;
  pot: number;
  sidePots: SidePot[];
  communityCards: Card[];
  handNumber: number;
  currentBet: number;
  minRaise: number;
  players: PublicPlayerView[];
  lastWinners: HandWinner[];
  eventLog: RoomLogEntry[];
}

function filterPlayerForViewer(
  player: Player,
  viewerAccountId: string | null,
  phase: GamePhase
): PublicPlayerView {
  const isOwner = viewerAccountId !== null && player.accountId === viewerAccountId;
  const isShowdownReveal = phase === 'SHOWDOWN' && !player.folded;

  const visibleHoleCards: (Card | null)[] = player.holeCards.map((card, index) => {
    if (isOwner || isShowdownReveal || player.exposedCardIndices.includes(index)) {
      return card;
    }
    return null;
  });

  return {
    accountId: player.accountId,
    displayName: player.displayName,
    isBot: player.isBot,
    seatIndex: player.seatIndex,
    chips: player.chips,
    currentBet: player.currentBet,
    totalBetInHand: player.totalBetInHand,
    holeCards: visibleHoleCards,
    exposedCardIndices: [...player.exposedCardIndices],
    folded: player.folded,
    allIn: player.allIn,
    eliminated: player.eliminated,
    timedOut: player.timedOut,
    timeBankSeconds: player.timeBankSeconds,
    turnRemainingSeconds: player.turnRemainingSeconds,
    via: player.via,
    winStreak: player.winStreak,
    arenaBuyIn: player.arenaBuyIn,
    arenaBillsEarned: player.arenaBillsEarned,
    ownedItems: [...player.ownedItems],
    equippedSkills: [...player.equippedSkills],
    equippedSkin: player.equippedSkin,
    equippedWinEffect: player.equippedWinEffect,
    itemsState: { ...player.itemsState },
    statusEffects: { ...player.statusEffects },
    activeLoan: player.activeLoan ? { ...player.activeLoan } : null,
    phoneOpen: player.phoneOpen,
    hasActiveChallenge: player.activeChallenge !== null,
    skillMastery: isOwner ? player.skillMastery : undefined,
  };
}

/**
 * Strictly filters room state for a specific viewer (by accountId).
 * Guarantees opponents' unexposed hole cards and deck contents are never leaked.
 */
export function filterRoomStateForViewer(
  room: Room,
  viewerAccountId: string | null
): FilteredRoomState {
  const currentActor =
    room.currentTurnIndex >= 0 && room.currentTurnIndex < room.players.length
      ? room.players[room.currentTurnIndex]
      : null;

  return {
    id: room.id,
    name: room.name,
    hostAccountId: room.hostAccountId,
    mode: room.mode,
    status: room.status,
    phase: room.phase,
    maxBuyIn: room.maxBuyIn,
    smallBlind: room.smallBlind,
    bigBlind: room.bigBlind,
    maxPlayers: room.maxPlayers,
    dealerIndex: room.dealerIndex,
    currentTurnIndex: room.currentTurnIndex,
    currentTurnAccountId: currentActor ? currentActor.accountId : null,
    pot: room.pot,
    sidePots: room.sidePots.map((sp) => ({
      amount: sp.amount,
      eligibleAccountIds: [...sp.eligibleAccountIds],
    })),
    communityCards: [...room.communityCards],
    handNumber: room.handNumber,
    currentBet: room.currentBet,
    minRaise: room.minRaise,
    players: room.players.map((p) =>
      filterPlayerForViewer(p, viewerAccountId, room.phase)
    ),
    lastWinners: room.lastWinners,
    eventLog: room.eventLog.slice(-12),
  };
}
