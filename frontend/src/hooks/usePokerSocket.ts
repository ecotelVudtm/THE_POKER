import { useCallback, useEffect, useRef } from 'react';
import { authenticateAccountApi, fetchAccountByIdApi } from '../services/apiClient';
import { getSocket } from '../services/socketClient';
import { soundEngine } from '../services/soundEngine';
import { useGameStore } from '../stores/useGameStore';
import {
  Account,
  BetAction,
  Card,
  FilteredRoomState,
  ItemType,
  LoanPackage,
  MiniGameChallenge,
  MiniGameResultEvent,
  MiniGameSubmissionPayload,
  SkillType,
} from '../types/game';

/**
 * Core real-time controller hook.
 * Bridges Socket.IO events <-> Zustand store + SoundEngine and exposes clean imperative actions.
 */
export function usePokerSocket() {
  const {
    connected,
    muted,
    account,
    room,
    activeChallenge,
    lastMiniGameResult,
    eagleEyeCard,
    phoneModalOpen,
    debtAlert,
    toasts,
    setConnected,
    setMuted,
    setAccount,
    setRoom,
    setActiveChallenge,
    setLastMiniGameResult,
    setEagleEyeCard,
    setPhoneModalOpen,
    setDebtAlert,
    pushToast,
    resetMatchState,
  } = useGameStore();

  const lastLogTimestampRef = useRef<number>(0);
  const lastHandNumberRef = useRef<number>(0);
  const lastCommunityCountRef = useRef<number>(0);
  const lastPotRef = useRef<number>(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setConnected(true);
      const currentAcc = useGameStore.getState().account;
      if (currentAcc) {
        socket.emit('authenticate', {
          username: currentAcc.username,
          displayName: currentAcc.displayName,
        });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onAuthenticated = (payload: { account: Account }) => {
      setAccount(payload.account);
    };

    const onRoomStateUpdate = (nextRoom: FilteredRoomState) => {
      // Synthesized tabletop audio cues based on authoritative state diffs
      if (
        nextRoom.handNumber > lastHandNumberRef.current ||
        nextRoom.communityCards.length > lastCommunityCountRef.current
      ) {
        soundEngine.playCardDeal();
      }
      if (nextRoom.pot > lastPotRef.current && nextRoom.handNumber === lastHandNumberRef.current) {
        soundEngine.playChipClink();
      }
      lastHandNumberRef.current = nextRoom.handNumber;
      lastCommunityCountRef.current = nextRoom.communityCards.length;
      lastPotRef.current = nextRoom.pot;

      setRoom(nextRoom);

      // Push any brand-new room log messages into the live toast feed
      const newLogs = nextRoom.eventLog.filter(
        (entry) => entry.timestamp > lastLogTimestampRef.current
      );
      if (newLogs.length > 0) {
        lastLogTimestampRef.current = newLogs[newLogs.length - 1].timestamp;
        for (const entry of newLogs.slice(-2)) {
          const msg = entry.message;
          const tone =
            msg.includes('LỘ TẨY') || msg.includes('vỡ nợ') || msg.includes('TIME_OUT')
              ? 'danger'
              : msg.includes('thắng') || msg.includes('thành công') || msg.includes('Đồng xu')
                ? 'success'
                : msg.includes('chủ nợ') || msg.includes('vay nóng')
                  ? 'warning'
                  : 'info';
          pushToast(msg, tone);
        }
      }

      if (nextRoom.phase === 'SHOWDOWN' || nextRoom.phase === 'WAITING') {
        setEagleEyeCard(null);
      }
    };

    const onMiniGameChallenge = (challenge: MiniGameChallenge) => {
      setActiveChallenge(challenge);
    };

    const onMiniGameResult = (res: MiniGameResultEvent) => {
      const me = useGameStore.getState().account;
      if (me && res.accountId === me.id) {
        setActiveChallenge(null);
        setLastMiniGameResult(res);
        setTimeout(() => {
          if (useGameStore.getState().lastMiniGameResult === res) {
            setLastMiniGameResult(null);
          }
        }, 3400);

        if (res.leveledUp) {
          soundEngine.playLevelUp();
        } else if (res.success) {
          soundEngine.playMiniGameSuccess();
        } else {
          soundEngine.playMiniGameFail();
        }

        void fetchAccountByIdApi(me.id)
          .then((fresh) => setAccount(fresh))
          .catch(() => {});
      }

      if (res.success) {
        pushToast(
          `Tuyệt kỹ thành công! (+${res.expGained} EXP${res.leveledUp ? ` • Lên Lv.${res.newLevel}!` : ''})`,
          'success'
        );
      } else if (res.mangoShieldBlocked) {
        pushToast('Khiên Quả Xoài đã chặn đứng pha Lộ Tẩy!', 'warning');
      } else {
        pushToast(`Thất bại (${res.reason}) — Bị LỘ TẨY 1 lá bài!`, 'danger');
      }
    };

    const onEagleEyeReveal = (payload: { nextCommunityCard: Card | null }) => {
      setEagleEyeCard(payload.nextCommunityCard);
      if (payload.nextCommunityCard) {
        pushToast(`Tâm Nhãn thấy trước lá bài: ${payload.nextCommunityCard.code}`, 'info');
        // Auto-hide private peek after 4 seconds
        setTimeout(() => {
          setEagleEyeCard(null);
        }, 4000);
      }
    };

    const onDebtCallIncoming = (payload: { currentOwed: number; handsElapsed: number }) => {
      setDebtAlert(payload);
      soundEngine.playPhoneRing();
      pushToast(
        `Anh Chủ Nợ đang gọi! Nợ ${payload.currentOwed.toLocaleString()} chip (quá ${payload.handsElapsed} ván).`,
        'warning'
      );
    };

    const onLuckyCoin = (payload: { refundAmount: number }) => {
      soundEngine.playIncenseBell();
      pushToast(`Đồng xu hộ mệnh hoàn lại ${payload.refundAmount.toLocaleString()} chip!`, 'success');
    };

    const onError = (payload: { event: string; message: string }) => {
      pushToast(payload.message, 'danger');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('authenticated', onAuthenticated);
    socket.on('room_state_update', onRoomStateUpdate);
    socket.on('minigame_challenge', onMiniGameChallenge);
    socket.on('minigame_result', onMiniGameResult);
    socket.on('eagle_eye_reveal', onEagleEyeReveal);
    socket.on('debt_call_incoming', onDebtCallIncoming);
    socket.on('lucky_coin_triggered', onLuckyCoin);
    socket.on('error_event', onError);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('authenticated', onAuthenticated);
      socket.off('room_state_update', onRoomStateUpdate);
      socket.off('minigame_challenge', onMiniGameChallenge);
      socket.off('minigame_result', onMiniGameResult);
      socket.off('eagle_eye_reveal', onEagleEyeReveal);
      socket.off('debt_call_incoming', onDebtCallIncoming);
      socket.off('lucky_coin_triggered', onLuckyCoin);
      socket.off('error_event', onError);
    };
  }, [
    pushToast,
    setAccount,
    setActiveChallenge,
    setConnected,
    setDebtAlert,
    setEagleEyeCard,
    setLastMiniGameResult,
    setRoom,
  ]);

  const toggleMute = useCallback(() => {
    const next = !useGameStore.getState().muted;
    soundEngine.setMuted(next);
    setMuted(next);
  }, [setMuted]);

  const login = useCallback(
    async (username: string, displayName?: string) => {
      const acc = await authenticateAccountApi(username, displayName);
      setAccount(acc);
      const socket = getSocket();
      socket.emit('authenticate', { username: acc.username, displayName: acc.displayName });
      pushToast(`Chào mừng Thần Bài ${acc.displayName}!`, 'success');
      return acc;
    },
    [pushToast, setAccount]
  );

  const createRoom = useCallback((options: { roomName?: string; botCount?: number }) => {
    const socket = getSocket();
    const acc = useGameStore.getState().account;
    lastLogTimestampRef.current = 0;
    lastHandNumberRef.current = 0;
    lastCommunityCountRef.current = 0;
    lastPotRef.current = 0;
    socket.emit('create_room', { ...options, accountId: acc?.id });
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    const socket = getSocket();
    const acc = useGameStore.getState().account;
    lastLogTimestampRef.current = 0;
    lastHandNumberRef.current = 0;
    lastCommunityCountRef.current = 0;
    lastPotRef.current = 0;
    socket.emit('join_room', { roomId: roomId.trim().toUpperCase(), accountId: acc?.id });
  }, []);

  const leaveRoom = useCallback(() => {
    const currentRoom = useGameStore.getState().room;
    if (currentRoom) {
      getSocket().emit('leave_room', { roomId: currentRoom.id });
    }
    resetMatchState();
    const acc = useGameStore.getState().account;
    if (acc) {
      void fetchAccountByIdApi(acc.id)
        .then((fresh) => setAccount(fresh))
        .catch(() => {});
    }
  }, [resetMatchState, setAccount]);

  const startMatch = useCallback(() => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    getSocket().emit('start_match', { roomId: currentRoom.id });
  }, []);

  const placeBet = useCallback((action: BetAction, raiseAmount?: number) => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    if (action === 'CALL' || action === 'RAISE' || action === 'ALL_IN') {
      soundEngine.playChipClink();
    }
    getSocket().emit('place_bet', { roomId: currentRoom.id, action, raiseAmount });
  }, []);

  const triggerSkill = useCallback(
    (skillType: SkillType, options?: { targetAccountId?: string; cardIndex?: 0 | 1 }) => {
      const currentRoom = useGameStore.getState().room;
      if (!currentRoom) return;
      getSocket().emit('trigger_skill', {
        roomId: currentRoom.id,
        skillType,
        targetAccountId: options?.targetAccountId,
        cardIndex: options?.cardIndex,
      });
    },
    []
  );

  const submitMiniGame = useCallback((payload: MiniGameSubmissionPayload) => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    getSocket().emit('submit_minigame', { roomId: currentRoom.id, payload });
  }, []);

  const openPhone = useCallback(() => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    setPhoneModalOpen(true);
    getSocket().emit('open_phone', { roomId: currentRoom.id });
  }, [setPhoneModalOpen]);

  const closePhone = useCallback(() => {
    const currentRoom = useGameStore.getState().room;
    setPhoneModalOpen(false);
    setDebtAlert(null);
    if (currentRoom) {
      getSocket().emit('close_phone', { roomId: currentRoom.id });
    }
  }, [setDebtAlert, setPhoneModalOpen]);

  const useItem = useCallback(
    (itemType: ItemType) => {
      const currentRoom = useGameStore.getState().room;
      if (!currentRoom) return;
      if (itemType === 'PHONE') {
        openPhone();
        return;
      }
      if (itemType === 'LUCKY_COIN') {
        soundEngine.playIncenseBell();
        pushToast('Đồng xu hộ mệnh tự kích hoạt khi thua All-in (< 25% tỉ lệ thắng).', 'info');
        return;
      }
      if (itemType === 'INCENSE_BOWL') {
        soundEngine.playIncenseBell();
      } else {
        soundEngine.playItemRefresh();
      }
      getSocket().emit('use_item', { roomId: currentRoom.id, itemType });
    },
    [openPhone, pushToast]
  );

  const takeLoan = useCallback((packageType: LoanPackage) => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    soundEngine.playChipClink();
    getSocket().emit('take_loan', { roomId: currentRoom.id, packageType });
  }, []);

  const repayLoan = useCallback(() => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    soundEngine.playItemRefresh();
    getSocket().emit('repay_loan', { roomId: currentRoom.id });
    setDebtAlert(null);
  }, [setDebtAlert]);

  const me =
    room && account
      ? room.players.find((p) => p.accountId === account.id) ?? null
      : null;

  return {
    connected,
    muted,
    account,
    room,
    me,
    activeChallenge,
    lastMiniGameResult,
    eagleEyeCard,
    phoneModalOpen,
    debtAlert,
    toasts,
    toggleMute,
    login,
    createRoom,
    joinRoom,
    leaveRoom,
    startMatch,
    placeBet,
    triggerSkill,
    submitMiniGame,
    useItem,
    openPhone,
    closePhone,
    takeLoan,
    repayLoan,
  };
}
