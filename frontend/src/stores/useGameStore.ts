import { create } from 'zustand';
import {
  Account,
  Card,
  FilteredRoomState,
  MiniGameChallenge,
  MiniGameResultEvent,
  ToastMessage,
} from '../types/game';

interface GameStoreState {
  connected: boolean;
  muted: boolean;
  account: Account | null;
  room: FilteredRoomState | null;
  activeChallenge: MiniGameChallenge | null;
  lastMiniGameResult: MiniGameResultEvent | null;
  eagleEyeCard: Card | null;
  phoneModalOpen: boolean;
  debtAlert: { currentOwed: number; handsElapsed: number } | null;
  toasts: ToastMessage[];

  setConnected: (connected: boolean) => void;
  setMuted: (muted: boolean) => void;
  setAccount: (account: Account | null) => void;
  setRoom: (room: FilteredRoomState | null) => void;
  setActiveChallenge: (challenge: MiniGameChallenge | null) => void;
  setLastMiniGameResult: (result: MiniGameResultEvent | null) => void;
  setEagleEyeCard: (card: Card | null) => void;
  setPhoneModalOpen: (open: boolean) => void;
  setDebtAlert: (alert: { currentOwed: number; handsElapsed: number } | null) => void;
  pushToast: (text: string, tone?: ToastMessage['tone']) => void;
  dismissToast: (id: string) => void;
  resetMatchState: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  connected: false,
  muted: false,
  account: null,
  room: null,
  activeChallenge: null,
  lastMiniGameResult: null,
  eagleEyeCard: null,
  phoneModalOpen: false,
  debtAlert: null,
  toasts: [],

  setConnected: (connected) => set({ connected }),
  setMuted: (muted) => set({ muted }),
  setAccount: (account) => set({ account }),
  setRoom: (room) => set({ room }),
  setActiveChallenge: (activeChallenge) => set({ activeChallenge }),
  setLastMiniGameResult: (lastMiniGameResult) => set({ lastMiniGameResult }),
  setEagleEyeCard: (eagleEyeCard) => set({ eagleEyeCard }),
  setPhoneModalOpen: (phoneModalOpen) => set({ phoneModalOpen }),
  setDebtAlert: (debtAlert) => set({ debtAlert }),

  pushToast: (text, tone = 'info') =>
    set((state) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const next = [...state.toasts, { id, text, tone, createdAt: Date.now() }].slice(-5);
      return { toasts: next };
    }),

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  resetMatchState: () =>
    set({
      room: null,
      activeChallenge: null,
      lastMiniGameResult: null,
      eagleEyeCard: null,
      phoneModalOpen: false,
      debtAlert: null,
    }),
}));
