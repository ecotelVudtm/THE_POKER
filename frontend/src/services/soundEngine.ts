import { WinEffectId } from '../types/game';

/**
 * Rich Zero-Asset Procedural Web Audio API SoundEngine for THE_POKER.
 * Synthesizes crisp tabletop poker, everyday Vietnamese items, mini-game, UI, and 3D win VFX audio.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** Crisp subtle wooden block click for UI & shop tabs */
  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  /** Soft parchment page flutter when hovering/opening the Guide Book */
  public playBookOpen(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.14);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
    filter.Q.setValueAtTime(1.2, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  /** Crisp double coin chime when purchasing in Shop */
  public playPurchaseCash(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [1318.5, 1760, 2093].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.1, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.2);
    });
  }

  /** Short filtered noise rustle for dealing a card */
  public playCardDeal(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1700, now);
    filter.Q.setValueAtTime(1.4, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  /** Multi-card rapid riffle shuffle at start of a new hand */
  public playCardShuffle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playCardDeal(), i * 55);
    }
  }

  /** Crisp snap when community cards flip on Flop/Turn/River */
  public playCardFlip(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.065);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1900, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  /** Double wooden knuckle knock on the poker table for CHECK */
  public playCheckTap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.11].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(195, now + offset);
      osc.frequency.exponentialRampToValueAtTime(75, now + offset + 0.06);
      gain.gain.setValueAtTime(0.22, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.075);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  }

  /** Soft downward card whoosh for FOLD */
  public playFoldWhoosh(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.16);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(380, now + 0.15);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  /** Dramatic deep boom + chip cascade for ALL-IN */
  public playAllInDramatic(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.42);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
    this.playPotSweep();
  }

  /** Crisp ceramic chip clink */
  public playChipClink(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [2200, 3350].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.025);
      gain.gain.setValueAtTime(0.09, now + i * 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.025 + 0.06);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.025);
      osc.stop(now + i * 0.025 + 0.065);
    });
  }

  /** Cascading chip pile sweep when chips slide into pot or to winner */
  public playPotSweep(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playChipClink(), i * 50);
    }
  }

  /** Subtle warm 2-note chime alerting the player it's their turn */
  public playYourTurnChime(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.075, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.24);
    });
  }

  /** Mystical ascending shimmer when casting a Magic Spell Card */
  public playSkillCast(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 660, 990, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.08, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.2);
    });
  }

  /** Gentle bronze bell chime ("keng") for lighting mini incense bowl */
  public playIncenseBell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1760, 2640].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      const amp = idx === 0 ? 0.14 : idx === 1 ? 0.07 : 0.03;
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
    });
  }

  /** Clinking ice cubes + sip for Iced Tea */
  public playIceClink(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [2900, 3850, 4400].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.085, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.11);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.12);
    });
  }

  /** Playful rising slurp pop when eating a bite of Instant Noodles */
  public playNoodleSlurp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(860, now + 0.18);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /** Refreshing bubbly pop for lucky mango / UI refresh */
  public playItemRefresh(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** Classic vibrating phone ringtone for incoming debt call */
  public playPhoneRing(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [0, 0.24, 0.48].forEach((offset) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(640, now + offset);
      osc2.frequency.setValueAtTime(800, now + offset);
      gain.gain.setValueAtTime(0.08, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + 0.19);
      osc2.stop(now + offset + 0.19);
    });
  }

  /** Crisp tactile snap when locking the Timing Bar needle */
  public playTimingLock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.05);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  /** Hit/Miss drum feedback inside Rhythm Tap mini-game */
  public playRhythmTap(isHit: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHit ? 'triangle' : 'sawtooth';
    osc.frequency.setValueAtTime(isHit ? 880 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(isHit ? 1320 : 95, now + 0.09);
    gain.gain.setValueAtTime(isHit ? 0.13 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /** Uplifting arpeggio on mini-game success */
  public playMiniGameSuccess(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.065);
      gain.gain.setValueAtTime(0.12, now + i * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.065 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.065);
      osc.stop(now + i * 0.065 + 0.24);
    });
  }

  /** Tense low buzz on mini-game failure (Lộ Tẩy) */
  public playMiniGameFail(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.34);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  /** Triumphant chord fanfare when YOU win a hand */
  public playVictoryFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.075);
      gain.gain.setValueAtTime(0.12, now + i * 0.075);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.075 + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.48);
    });
  }

  /** Tailored procedural audio for each 3D Showdown Win Effect */
  public playWinEffectSound(effectId: WinEffectId): void {
    const ctx = this.ensureContext();
    if (!ctx || effectId === 'NONE') return;
    const now = ctx.currentTime;

    if (effectId === 'CONFETTI') {
      // Festive pop + sparkling chimes
      const pop = ctx.createOscillator();
      const popG = ctx.createGain();
      pop.type = 'sine';
      pop.frequency.setValueAtTime(260, now);
      pop.frequency.exponentialRampToValueAtTime(60, now + 0.09);
      popG.gain.setValueAtTime(0.24, now);
      popG.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      pop.connect(popG).connect(ctx.destination);
      pop.start(now);
      pop.stop(now + 0.11);
      [1568, 2093, 2637, 3136].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + 0.08 + i * 0.06);
        g.gain.setValueAtTime(0.06, now + 0.08 + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + i * 0.06 + 0.22);
        o.connect(g).connect(ctx.destination);
        o.start(now + 0.08 + i * 0.06);
        o.stop(now + 0.08 + i * 0.06 + 0.24);
      });
    } else if (effectId === 'DOVES') {
      // Rapid soft wing flaps
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.11;
        const n = ctx.createBufferSource();
        n.buffer = this.createNoiseBuffer(ctx, 0.09);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(900 + i * 120, t);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        n.connect(f).connect(g).connect(ctx.destination);
        n.start(t);
      }
    } else if (effectId === 'TORNADO') {
      // Swirling rising wind whoosh
      const n = ctx.createBufferSource();
      n.buffer = this.createNoiseBuffer(ctx, 1.3);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.setValueAtTime(3.2, now);
      f.frequency.setValueAtTime(240, now);
      f.frequency.exponentialRampToValueAtTime(1450, now + 0.85);
      f.frequency.exponentialRampToValueAtTime(320, now + 1.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.4);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
      n.connect(f).connect(g).connect(ctx.destination);
      n.start(now);
    } else if (effectId === 'FIRE_BURST') {
      // Roaring low-pass flame burst
      const n = ctx.createBufferSource();
      n.buffer = this.createNoiseBuffer(ctx, 0.95);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(950, now);
      f.frequency.exponentialRampToValueAtTime(180, now + 0.95);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.32, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
      n.connect(f).connect(g).connect(ctx.destination);
      n.start(now);
    } else if (effectId === 'LIGHTNING') {
      // Sharp electric crack + deep thunder rumble
      const crack = ctx.createBufferSource();
      crack.buffer = this.createNoiseBuffer(ctx, 0.25);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(2200, now);
      const cg = ctx.createGain();
      cg.gain.setValueAtTime(0.34, now);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      crack.connect(hp).connect(cg).connect(ctx.destination);
      crack.start(now);

      const thunder = ctx.createBufferSource();
      thunder.buffer = this.createNoiseBuffer(ctx, 1.1);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(160, now + 0.05);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.32, now + 0.05);
      tg.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      thunder.connect(lp).connect(tg).connect(ctx.destination);
      thunder.start(now + 0.05);
    }
  }

  /** Bright fanfare on Skill Mastery Level Up */
  public playLevelUp(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 739.99, 880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.13, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.38);
    });
  }

  /** Crisp clock tick-tock when time bank < 15s */
  public playTick(isAccent = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(isAccent ? 1200 : 900, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

export const soundEngine = new SoundEngine();
