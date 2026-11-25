import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Card } from '../../domain/entities/Card';
import { appendRoomLog, BetAction, GamePhase, Room } from '../../domain/entities/Room';
import { estimateHandStrength } from '../../domain/rules/HandEvaluator';
import { FilteredRoomState, PublicPlayerView } from '../../domain/rules/StateFilter';
import { getNextIncenseViaCost, ItemType } from '../../domain/value-objects/Item';

export interface BotDecision {
  itemToUse?: ItemType;
  action: BetAction;
  raiseAmount?: number;
}

export type PlayerArchetype =
  | 'UNKNOWN'
  | 'BLUFF_MANIAC'
  | 'TIGHT_ROCK'
  | 'CALLING_STATION'
  | 'SHARK';

export interface OpponentTendencyProfile {
  accountId: string;
  totalActions: number;
  roundsObserved: number;
  handsObserved: number;
  /** EMA (0..1): frequency of RAISE / ALL_IN among all actions */
  aggressionRate: number;
  /** EMA (0..1): frequency of FOLD when facing a bet (toCall > 0) */
  foldToBetRate: number;
  /** EMA (0..1): frequency of CALL when facing a bet */
  callStationRate: number;
  /** EMA (0..1): frequency of weak hands shown down after heavy betting */
  bluffRate: number;
  /** EMA (0..1): frequency of ALL_IN shoves */
  allInRate: number;
  archetype: PlayerArchetype;
  updatedAt: number;
}

interface BotSelfWeights {
  /** Negative = call looser (bluff-catcher), Positive = call tighter */
  callThresholdShift: number;
  /** Positive = bluff more, Negative = bluff less */
  bluffFrequencyShift: number;
  /** Multiplier for value raises (0.8 .. 1.6) */
  valueBetSizeMultiplier: number;
  /** Chips snapshot at start of hand for tiny reinforcement update */
  handStartChips: number;
  handNumber: number;
}

interface RoundSnapshot {
  handNumber: number;
  phase: GamePhase;
  aggressiveActors: Set<string>;
}

const ARCHETYPE_LABEL_VI: Record<PlayerArchetype, string> = {
  UNKNOWN: 'chưa rõ',
  BLUFF_MANIAC: 'hay tố mạnh & hù bài',
  TIGHT_ROCK: 'đánh chắc & dễ bỏ bài trước áp lực',
  CALLING_STATION: 'hay theo cược liên tục',
  SHARK: 'cân bằng & chọn bài kỹ',
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function ema(prev: number, sample: number, alpha: number): number {
  return Number((prev * (1 - alpha) + sample * alpha).toFixed(4));
}

function createDefaultProfile(accountId: string): OpponentTendencyProfile {
  return {
    accountId,
    totalActions: 0,
    roundsObserved: 0,
    handsObserved: 0,
    aggressionRate: 0.25,
    foldToBetRate: 0.35,
    callStationRate: 0.4,
    bluffRate: 0.2,
    allInRate: 0.06,
    archetype: 'UNKNOWN',
    updatedAt: Date.now(),
  };
}

function classifyArchetype(p: OpponentTendencyProfile): PlayerArchetype {
  if (p.roundsObserved < 2 && p.totalActions < 4) return 'UNKNOWN';
  if (p.aggressionRate >= 0.45 && (p.bluffRate >= 0.34 || p.allInRate >= 0.22 || p.aggressionRate >= 0.6)) {
    return 'BLUFF_MANIAC';
  }
  if (p.foldToBetRate >= 0.55 && p.aggressionRate <= 0.32) {
    return 'TIGHT_ROCK';
  }
  if (p.callStationRate >= 0.58 && p.foldToBetRate <= 0.28 && p.aggressionRate <= 0.32) {
    return 'CALLING_STATION';
  }
  if (p.aggressionRate >= 0.35 && p.bluffRate < 0.32) {
    return 'SHARK';
  }
  return 'UNKNOWN';
}

/**
 * Strictly Fair Fog-of-War Adaptive Micro-AI Bot Engine.
 * - Accepts ONLY `FilteredRoomState` in `decide()` (NEVER peeks at `room.deck` or unexposed opponent hole cards).
 * - Continuously learns each opponent's public betting tendencies (aggression, fold-to-bet, calling station, showdown bluff rate)
 *   and updates its micro-strategy weights after every betting round & showdown!
 */
export class BotAIEngine {
  private readonly profiles = new Map<string, OpponentTendencyProfile>();
  private readonly botWeights = new Map<string, BotSelfWeights>();
  private readonly roomSnapshots = new Map<string, RoundSnapshot>();
  private readonly filePath: string | null;

  constructor(persistPath?: string | null) {
    this.filePath =
      persistPath === null
        ? null
        : persistPath ?? path.resolve(__dirname, '../../../data/bot_knowledge.json');
    if (this.filePath) {
      this.loadKnowledge();
    }
  }

  public getOpponentProfile(accountId: string): OpponentTendencyProfile | null {
    const p = this.profiles.get(accountId);
    return p ? { ...p } : null;
  }

  public getBotWeights(botAccountId: string): Readonly<BotSelfWeights> {
    return { ...this.ensureBotWeights(botAccountId) };
  }

  /**
   * Observes a publicly visible betting action by any human player to update their behavioral EMA.
   */
  public observeAction(
    room: Room,
    actorAccountId: string,
    action: BetAction,
    toCallBeforeAction: number
  ): void {
    const actor = room.players.find((p) => p.accountId === actorAccountId);
    if (!actor || actor.isBot) return;

    const profile = this.ensureProfile(actorAccountId);
    const alpha = profile.totalActions < 8 ? 0.32 : 0.18;
    profile.totalActions += 1;

    const isAggressive = action === 'RAISE' || action === 'ALL_IN';
    profile.aggressionRate = ema(profile.aggressionRate, isAggressive ? 1 : 0, alpha);
    profile.allInRate = ema(profile.allInRate, action === 'ALL_IN' ? 1 : 0, alpha);

    if (toCallBeforeAction > 0) {
      profile.foldToBetRate = ema(profile.foldToBetRate, action === 'FOLD' ? 1 : 0, alpha);
      profile.callStationRate = ema(profile.callStationRate, action === 'CALL' ? 1 : 0, alpha);
    }

    const snap = this.ensureRoomSnapshot(room);
    if (isAggressive) {
      snap.aggressiveActors.add(actorAccountId);
    }

    profile.updatedAt = Date.now();
  }

  /**
   * Called after every betting round transition (PRE_FLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN)
   * so bots consolidate what they observed, classify player archetypes, and tune their micro-weights.
   */
  public updateAfterRound(room: Room): void {
    const snap = this.ensureRoomSnapshot(room);
    const handChanged = snap.handNumber !== room.handNumber;
    const phaseChanged = snap.phase !== room.phase;

    if (handChanged) {
      // Snapshot each bot's starting chips for end-of-hand micro reinforcement
      for (const p of room.players) {
        if (p.isBot) {
          const w = this.ensureBotWeights(p.accountId);
          w.handStartChips = p.chips + p.totalBetInHand;
          w.handNumber = room.handNumber;
        }
      }
      snap.handNumber = room.handNumber;
      snap.phase = room.phase;
      snap.aggressiveActors.clear();
      return;
    }

    if (!phaseChanged) return;
    snap.phase = room.phase;

    const humansInRoom = room.players.filter((p) => !p.isBot && !p.eliminated);
    let knowledgeChanged = false;

    for (const human of humansInRoom) {
      const profile = this.ensureProfile(human.accountId);
      profile.roundsObserved += 1;

      if (room.phase === 'SHOWDOWN') {
        profile.handsObserved += 1;

        // Public Showdown learning ONLY (cards are publicly revealed when !folded at SHOWDOWN)
        if (!human.folded && human.holeCards.length === 2 && room.communityCards.length >= 3) {
          const revealedStrength = estimateHandStrength(human.holeCards, room.communityCards);
          const betHeavily =
            snap.aggressiveActors.has(human.accountId) || human.totalBetInHand >= room.bigBlind * 3;
          if (betHeavily) {
            const wasBluff = revealedStrength < 0.42 ? 1 : 0;
            profile.bluffRate = ema(profile.bluffRate, wasBluff, 0.34);
          }
        }
      }

      const prevArchetype = profile.archetype;
      const nextArchetype = classifyArchetype(profile);
      profile.archetype = nextArchetype;
      profile.updatedAt = Date.now();
      knowledgeChanged = true;

      // Announce subtly in plain text ONLY when bots detect a new player tendency archetype
      if (
        nextArchetype !== 'UNKNOWN' &&
        nextArchetype !== prevArchetype &&
        room.players.some((p) => p.isBot && !p.eliminated)
      ) {
        appendRoomLog(
          room,
          `Bot nhận thấy ${human.displayName} ${ARCHETYPE_LABEL_VI[nextArchetype]} và đang điều chỉnh lối đánh.`
        );
      }
    }

    // Recompute each bot's adaptive micro-weights from observed human profiles + hand outcome
    this.updateBotWeightsForRoom(room, humansInRoom);

    if (room.phase === 'SHOWDOWN') {
      snap.aggressiveActors.clear();
      if (knowledgeChanged) {
        this.saveKnowledge();
      }
    }
  }

  private updateBotWeightsForRoom(room: Room, humans: Room['players']): void {
    const primaryHuman = humans[0];
    const profile = primaryHuman ? this.profiles.get(primaryHuman.accountId) : undefined;
    const confidence = profile ? clamp(profile.roundsObserved / 6, 0, 1) : 0;

    for (const bot of room.players) {
      if (!bot.isBot) continue;
      const w = this.ensureBotWeights(bot.accountId);

      // 1. Target strategic counter-adjustments based on the player's learned profile
      let targetCallShift = 0;
      let targetBluffShift = 0;
      let targetValueMult = 1.0;

      if (profile && confidence > 0.15) {
        switch (profile.archetype) {
          case 'BLUFF_MANIAC':
            // Bluff-catcher mode: call looser, bluff less into a maniac, value-bet bigger when strong
            targetCallShift = -0.14 * confidence;
            targetBluffShift = -0.08 * confidence;
            targetValueMult = 1.0 + 0.45 * confidence;
            break;
          case 'TIGHT_ROCK':
            // Exploit folders: pressure/bluff more, respect their big raises (call tighter)
            targetCallShift = 0.1 * confidence;
            targetBluffShift = 0.18 * confidence;
            targetValueMult = 0.9;
            break;
          case 'CALLING_STATION':
            // Never bluff a calling station; value-bet thicker and bigger!
            targetCallShift = 0.04 * confidence;
            targetBluffShift = -0.14 * confidence;
            targetValueMult = 1.0 + 0.5 * confidence;
            break;
          case 'SHARK':
            // Stay balanced and slightly defensive against strong value bettors
            targetCallShift = 0.05 * confidence;
            targetBluffShift = 0.04 * confidence;
            targetValueMult = 1.15;
            break;
          default:
            // Mild continuous gradient adaptation even before a full archetype crystallizes
            targetCallShift = (profile.foldToBetRate - profile.aggressionRate) * 0.1 * confidence;
            targetBluffShift = (profile.foldToBetRate - 0.35) * 0.25 * confidence;
            targetValueMult = 1.0 + (profile.callStationRate - 0.4) * 0.4 * confidence;
            break;
        }
      }

      // Smooth step toward counter-strategy after each round
      w.callThresholdShift = clamp(ema(w.callThresholdShift, targetCallShift, 0.45), -0.16, 0.16);
      w.bluffFrequencyShift = clamp(ema(w.bluffFrequencyShift, targetBluffShift, 0.45), -0.15, 0.2);
      w.valueBetSizeMultiplier = clamp(ema(w.valueBetSizeMultiplier, targetValueMult, 0.45), 0.8, 1.6);

      // 2. Tiny Showdown outcome reinforcement (learn from own wins & losses!)
      if (room.phase === 'SHOWDOWN' && w.handStartChips > 0) {
        const netDelta = bot.chips - w.handStartChips;
        if (netDelta < -room.bigBlind * 3 && !bot.folded) {
          // Lost a sizeable pot calling down -> tighten slightly next hand
          w.callThresholdShift = clamp(w.callThresholdShift + 0.02, -0.16, 0.16);
        } else if (netDelta > room.bigBlind * 2) {
          // Profitable hand -> reinforce current boldness slightly
          w.bluffFrequencyShift = clamp(w.bluffFrequencyShift + 0.015, -0.15, 0.2);
        }
      }
    }
  }

  public decide(view: FilteredRoomState, bot: PublicPlayerView): BotDecision {
    const ownCards = bot.holeCards.filter((c): c is Card => c !== null);
    const strength = estimateHandStrength(ownCards, view.communityCards);
    const toCall = Math.max(0, view.currentBet - bot.currentBet);
    const potOdds = toCall > 0 ? toCall / Math.max(1, view.pot + toCall) : 0;
    const roll = crypto.randomInt(0, 100);

    // Seat baseline personality + learned micro-AI strategy weights
    const baseBoldness = bot.seatIndex % 3 === 0 ? 0.1 : bot.seatIndex % 3 === 1 ? 0.05 : 0.0;
    const weights = this.ensureBotWeights(bot.accountId);

    // Public Fog-of-War awareness: check if any active opponent publicly exposed (Lộ Tẩy) a dangerous high card!
    let exposedThreatPenalty = 0;
    for (const opp of view.players) {
      if (opp.accountId === bot.accountId || opp.folded || opp.eliminated) continue;
      for (const card of opp.holeCards) {
        if (card && card.rank >= 12) {
          // Publicly visible Q/K/A on opponent slightly increases caution
          exposedThreatPenalty = Math.max(exposedThreatPenalty, 0.05);
        }
      }
    }

    // Occasionally use owned items (ICED_TEA / INCENSE_BOWL)
    let itemToUse: ItemType | undefined;
    const nextIncenseViaCost = getNextIncenseViaCost(bot.itemsState.incenseSticks);
    if (
      bot.ownedItems.includes('ICED_TEA') &&
      bot.itemsState.icedTeaSipsLeft > 0 &&
      !bot.itemsState.icedTeaUsedThisRound &&
      bot.itemsState.lockedItem !== 'ICED_TEA' &&
      (bot.timeBankSeconds < 90 || roll < 8)
    ) {
      itemToUse = 'ICED_TEA';
    } else if (
      bot.ownedItems.includes('INCENSE_BOWL') &&
      nextIncenseViaCost !== null &&
      bot.via >= nextIncenseViaCost &&
      bot.itemsState.lockedItem !== 'INCENSE_BOWL' &&
      roll >= 10 &&
      roll < 20
    ) {
      itemToUse = 'INCENSE_BOWL';
    }

    // Apply adaptive callThresholdShift (negative shift = looser bluff-catching, positive = tighter respect)
    const effectiveStrength = clamp(
      strength + baseBoldness - weights.callThresholdShift - exposedThreatPenalty,
      0,
      1
    );
    const bluffBonusPct = Math.round(weights.bluffFrequencyShift * 100);

    // Strong hand: value-bet aggressively (sized up against calling stations & maniacs!)
    if (effectiveStrength >= 0.7) {
      if (bot.chips <= toCall + view.minRaise) {
        return { itemToUse, action: 'ALL_IN' };
      }
      const raiseChance = clamp(68 + Math.round((weights.valueBetSizeMultiplier - 1) * 35), 50, 90);
      if (roll < raiseChance) {
        const rawRaise = Math.floor(
          view.bigBlind * (2 + (roll % 3)) * weights.valueBetSizeMultiplier
        );
        const raiseBy = Math.min(bot.chips - toCall, Math.max(view.minRaise, rawRaise));
        return { itemToUse, action: 'RAISE', raiseAmount: raiseBy };
      }
      return { itemToUse, action: toCall === 0 ? 'CHECK' : 'CALL' };
    }

    // Medium hand: call down maniacs, pressure tight folders, or control pot
    if (effectiveStrength >= 0.38) {
      if (toCall === 0) {
        const semiBluffChance = clamp(24 + bluffBonusPct, 5, 55);
        if (roll < semiBluffChance && bot.chips > view.minRaise) {
          return { itemToUse, action: 'RAISE', raiseAmount: view.minRaise };
        }
        return { itemToUse, action: 'CHECK' };
      }
      const callMargin = 0.14 - weights.callThresholdShift;
      if (
        potOdds <= effectiveStrength + callMargin ||
        toCall <= view.bigBlind * (weights.callThresholdShift < -0.06 ? 6 : 4) ||
        (toCall <= bot.chips * 0.25 && roll < clamp(55 - Math.round(weights.callThresholdShift * 120), 25, 80))
      ) {
        return { itemToUse, action: toCall >= bot.chips ? 'ALL_IN' : 'CALL' };
      }
      return { itemToUse, action: 'FOLD' };
    }

    // Weak hand: check if free, adaptive bluff against tight folders (never bluff calling stations!)
    if (toCall === 0) {
      const pureBluffChance = clamp(14 + bluffBonusPct, 0, 38);
      if (roll < pureBluffChance && bot.chips > view.minRaise) {
        return { itemToUse, action: 'RAISE', raiseAmount: view.minRaise };
      }
      return { itemToUse, action: 'CHECK' };
    }

    const curiousCallChance = clamp(38 - Math.round(weights.callThresholdShift * 150), 10, 62);
    if (toCall <= view.bigBlind * 2 && roll < curiousCallChance) {
      return { itemToUse, action: toCall >= bot.chips ? 'ALL_IN' : 'CALL' };
    }

    return { itemToUse, action: 'FOLD' };
  }

  private ensureProfile(accountId: string): OpponentTendencyProfile {
    let profile = this.profiles.get(accountId);
    if (!profile) {
      profile = createDefaultProfile(accountId);
      this.profiles.set(accountId, profile);
    }
    return profile;
  }

  private ensureBotWeights(botAccountId: string): BotSelfWeights {
    let w = this.botWeights.get(botAccountId);
    if (!w) {
      w = {
        callThresholdShift: 0,
        bluffFrequencyShift: 0,
        valueBetSizeMultiplier: 1.0,
        handStartChips: 0,
        handNumber: 0,
      };
      this.botWeights.set(botAccountId, w);
    }
    return w;
  }

  private ensureRoomSnapshot(room: Room): RoundSnapshot {
    let snap = this.roomSnapshots.get(room.id);
    if (!snap) {
      snap = {
        handNumber: room.handNumber,
        phase: room.phase,
        aggressiveActors: new Set<string>(),
      };
      this.roomSnapshots.set(room.id, snap);
    }
    return snap;
  }

  private loadKnowledge(): void {
    if (!this.filePath) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as OpponentTendencyProfile[];
      if (!Array.isArray(parsed)) return;
      for (const item of parsed) {
        if (item && typeof item.accountId === 'string') {
          this.profiles.set(item.accountId, { ...createDefaultProfile(item.accountId), ...item });
        }
      }
    } catch {
      // Ignore corrupt/missing knowledge file
    }
  }

  private saveKnowledge(): void {
    if (!this.filePath) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const data = Array.from(this.profiles.values()).slice(-200);
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Non-fatal persistence failure
    }
  }
}
