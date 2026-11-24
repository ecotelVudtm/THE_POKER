import { useCallback, useEffect, useRef } from 'react';
import {
  buySkillApi,
  buySkinApi,
  buyWinEffectApi,
  clearAuthToken,
  equipSkinApi,
  equipWinEffectApi,
  fetchAccountByIdApi,
  getAuthToken,
  loginAccountApi,
  registerAccountApi,
  repayAccountLoanApi,
  takeAccountLoanApi,
  updateLoadoutApi,
} from '../services/apiClient';
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
  RoomMode,
  SkillType,
  SkinId,
  WinEffectId,
} from '../types/game';

const SESSION_STORAGE_KEY = 'the_poker_account_id';

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
  const lastTurnAccountRef = useRef<string | null>(null);
  const lastShowdownHandRef = useRef<number>(0);

  // Restore saved session on load if still valid on server (requires valid signed token)
  useEffect(() => {
    const savedId = localStorage.getItem(SESSION_STORAGE_KEY);
    const savedToken = getAuthToken();
    if (!savedId || !savedToken || useGameStore.getState().account) return;
    void fetchAccountByIdApi(savedId)
      .then((acc) => {
        setAccount(acc);
        const socket = getSocket();
        if (socket.connected) {
          socket.emit('authenticate', { token: savedToken });
        }
      })
      .catch(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        clearAuthToken();
      });
  }, [setAccount]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setConnected(true);
      const token = getAuthToken();
      if (token && useGameStore.getState().account) {
        socket.emit('authenticate', { token });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onAuthenticated = (payload: { account: Account }) => {
      setAccount(payload.account);
    };

    const onAuthError = (payload: { message: string }) => {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      clearAuthToken();
      resetMatchState();
      setAccount(null);
      pushToast(payload?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'danger');
    };

    const onRoomStateUpdate = (nextRoom: FilteredRoomState) => {
      const prevHand = lastHandNumberRef.current;
      const myAcc = useGameStore.getState().account;

      if (nextRoom.handNumber > prevHand) {
        soundEngine.playCardShuffle();
      } else if (nextRoom.communityCards.length > lastCommunityCountRef.current) {
        soundEngine.playCardFlip();
      }

      if (nextRoom.pot > lastPotRef.current && nextRoom.handNumber === prevHand) {
        soundEngine.playChipClink();
      }

      // Alert chime when turn transitions to the local player
      if (
        myAcc &&
        nextRoom.status === 'PLAYING' &&
        nextRoom.phase !== 'SHOWDOWN' &&
        nextRoom.currentTurnAccountId === myAcc.id &&
        lastTurnAccountRef.current !== myAcc.id
      ) {
        soundEngine.playYourTurnChime();
      }
      lastTurnAccountRef.current = nextRoom.currentTurnAccountId;

      // Victory fanfare when local player wins Showdown
      if (
        nextRoom.phase === 'SHOWDOWN' &&
        nextRoom.lastWinners.length > 0 &&
        lastShowdownHandRef.current !== nextRoom.handNumber
      ) {
        lastShowdownHandRef.current = nextRoom.handNumber;
        if (myAcc && nextRoom.lastWinners.some((w) => w.accountId === myAcc.id)) {
          soundEngine.playVictoryFanfare();
        }
      }

      lastHandNumberRef.current = nextRoom.handNumber;
      lastCommunityCountRef.current = nextRoom.communityCards.length;
      lastPotRef.current = nextRoom.pot;

      setRoom(nextRoom);

      // Refresh account when a fresh match starts so consumed skill charges sync immediately
      if (prevHand === 0 && nextRoom.handNumber === 1) {
        const meAcc = useGameStore.getState().account;
        if (meAcc) {
          void fetchAccountByIdApi(meAcc.id)
            .then((fresh) => setAccount(fresh))
            .catch(() => { });
        }
      }

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
        }, 3200);

        if (res.leveledUp) {
          soundEngine.playLevelUp();
        } else if (res.success) {
          soundEngine.playMiniGameSuccess();
        } else {
          soundEngine.playMiniGameFail();
        }

        void fetchAccountByIdApi(me.id)
          .then((fresh) => setAccount(fresh))
          .catch(() => { });
      }
    };

    const onEagleEyeReveal = (payload: { nextCommunityCard: Card | null }) => {
      setEagleEyeCard(payload.nextCommunityCard);
      if (payload.nextCommunityCard) {
        setTimeout(() => {
          setEagleEyeCard(null);
        }, 4000);
      }
    };

    const onDebtCallIncoming = (payload: { currentOwed: number; handsElapsed: number }) => {
      setDebtAlert(payload);
      soundEngine.playPhoneRing();
    };

    const onLuckyCoin = (payload: { refundAmount: number }) => {
      soundEngine.playIncenseBell();
      pushToast(`Đồng xu hộ mệnh hoàn ${payload.refundAmount.toLocaleString()} chip`, 'success');
    };

    const onItemUnlocked = (payload: {
      accountId: string;
      displayName: string;
      item: ItemType;
      totalWins: number;
    }) => {
      const meAcc = useGameStore.getState().account;
      if (meAcc && payload.accountId === meAcc.id) {
        soundEngine.playLevelUp();
        void fetchAccountByIdApi(meAcc.id)
          .then((fresh) => setAccount(fresh))
          .catch(() => { });
      }
      pushToast(
        `${payload.displayName} đạt ${payload.totalWins} thắng — nhận đồ vật ${payload.item}!`,
        'success'
      );
    };

    const onWinStreakBonus = (payload: {
      accountId: string;
      displayName: string;
      streak: number;
      chipBonus: number;
      viaBonus: number;
    }) => {
      const meAcc = useGameStore.getState().account;
      if (meAcc && payload.accountId === meAcc.id) {
        soundEngine.playLevelUp();
      }
      pushToast(
        `Chuỗi ${payload.streak} thắng liên tiếp: ${payload.displayName} nhận +${payload.viaBonus} vía.`,
        'info'
      );
    };

    const onArenaBillEarned = (payload: {
      accountId: string;
      displayName: string;
      billsEarned: number;
      totalBillsInMatch: number;
    }) => {
      const meAcc = useGameStore.getState().account;
      if (meAcc && payload.accountId === meAcc.id) {
        soundEngine.playPurchaseCash();
        soundEngine.playLevelUp();
        void fetchAccountByIdApi(meAcc.id)
          .then((fresh) => setAccount(fresh))
          .catch(() => { });
      }
      pushToast(
        `${payload.displayName} nhận thêm +${payload.billsEarned} tờ 500.000 VNĐ trong Đấu Trường Thật.`,
        'info'
      );
    };

    const onError = (payload: { event: string; message: string }) => {
      pushToast(payload.message, 'danger');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('authenticated', onAuthenticated);
    socket.on('auth_error', onAuthError);
    socket.on('room_state_update', onRoomStateUpdate);
    socket.on('minigame_challenge', onMiniGameChallenge);
    socket.on('minigame_result', onMiniGameResult);
    socket.on('eagle_eye_reveal', onEagleEyeReveal);
    socket.on('debt_call_incoming', onDebtCallIncoming);
    socket.on('lucky_coin_triggered', onLuckyCoin);
    socket.on('item_unlocked', onItemUnlocked);
    socket.on('win_streak_bonus', onWinStreakBonus);
    socket.on('arena_bill_earned', onArenaBillEarned);
    socket.on('error_event', onError);

    if (socket.connected) {
      setConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('authenticated', onAuthenticated);
      socket.off('auth_error', onAuthError);
      socket.off('room_state_update', onRoomStateUpdate);
      socket.off('minigame_challenge', onMiniGameChallenge);
      socket.off('minigame_result', onMiniGameResult);
      socket.off('eagle_eye_reveal', onEagleEyeReveal);
      socket.off('debt_call_incoming', onDebtCallIncoming);
      socket.off('lucky_coin_triggered', onLuckyCoin);
      socket.off('item_unlocked', onItemUnlocked);
      socket.off('win_streak_bonus', onWinStreakBonus);
      socket.off('arena_bill_earned', onArenaBillEarned);
      socket.off('error_event', onError);
    };
  }, [
    pushToast,
    resetMatchState,
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

  const bindAccountSession = useCallback(
    (acc: Account, token: string) => {
      localStorage.setItem(SESSION_STORAGE_KEY, acc.id);
      setAccount(acc);
      getSocket().emit('authenticate', { token });
    },
    [setAccount]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const { account: acc, token } = await loginAccountApi(username, password);
      bindAccountSession(acc, token);
      return acc;
    },
    [bindAccountSession]
  );

  const register = useCallback(
    async (username: string, password: string, displayName?: string) => {
      const { account: acc, token } = await registerAccountApi(username, password, displayName);
      bindAccountSession(acc, token);
      return acc;
    },
    [bindAccountSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    clearAuthToken();
    resetMatchState();
    setAccount(null);
  }, [resetMatchState, setAccount]);

  const createRoom = useCallback(
    (options: {
      roomName?: string;
      mode?: RoomMode;
      quickArenaMatch?: boolean;
      botCount?: number;
      maxBuyIn?: number;
    }) => {
      lastLogTimestampRef.current = 0;
      lastHandNumberRef.current = 0;
      lastCommunityCountRef.current = 0;
      lastPotRef.current = 0;
      getSocket().emit('create_room', { ...options });
    },
    []
  );

  const joinRoom = useCallback((roomId: string) => {
    lastLogTimestampRef.current = 0;
    lastHandNumberRef.current = 0;
    lastCommunityCountRef.current = 0;
    lastPotRef.current = 0;
    getSocket().emit('join_room', { roomId: roomId.trim().toUpperCase() });
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
        .catch(() => { });
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
    if (action === 'ALL_IN') {
      soundEngine.playAllInDramatic();
    } else if (action === 'CALL' || action === 'RAISE') {
      soundEngine.playChipClink();
    } else if (action === 'CHECK') {
      soundEngine.playCheckTap();
    } else if (action === 'FOLD') {
      soundEngine.playFoldWhoosh();
    }
    getSocket().emit('place_bet', { roomId: currentRoom.id, action, raiseAmount });
  }, []);

  const triggerSkill = useCallback(
    (skillType: SkillType, options?: { targetAccountId?: string; cardIndex?: 0 | 1 }) => {
      const currentRoom = useGameStore.getState().room;
      if (!currentRoom) return;
      soundEngine.playSkillCast();
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
        pushToast('Đồng xu hộ mệnh tự động kích hoạt khi thua All-in (<25%)', 'info');
        return;
      }
      if (itemType === 'INSTANT_NOODLES') {
        soundEngine.playNoodleSlurp();
        pushToast('Bát Mì Tôm tự động nâng Max Vía lên 120 (mỗi lần thắng ăn 1 miếng, 3 lần sẽ hết)', 'info');
        return;
      }
      if (itemType === 'INCENSE_BOWL') {
        soundEngine.playIncenseBell();
      } else if (itemType === 'ICED_TEA') {
        soundEngine.playIceClink();
      } else {
        soundEngine.playItemRefresh();
      }
      getSocket().emit('use_item', { roomId: currentRoom.id, itemType });
    },
    [openPhone, pushToast]
  );

  const discardItem = useCallback((itemType: ItemType) => {
    const currentRoom = useGameStore.getState().room;
    if (!currentRoom) return;
    soundEngine.playFoldWhoosh();
    getSocket().emit('discard_item', { roomId: currentRoom.id, itemType });
  }, []);

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

  const takeLobbyLoan = useCallback(
    async (packageType: LoanPackage) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await takeAccountLoanApi(acc.id, packageType);
      soundEngine.playChipClink();
      setAccount(updated);
      pushToast('Đã vay chip thành công ngoài sảnh.', 'info');
    },
    [pushToast, setAccount]
  );

  const repayLobbyLoan = useCallback(async () => {
    const acc = useGameStore.getState().account;
    if (!acc) return;
    const updated = await repayAccountLoanApi(acc.id);
    soundEngine.playItemRefresh();
    setAccount(updated);
    pushToast('Đã trả hết khoản vay thành công!', 'success');
  }, [pushToast, setAccount]);

  const buySkill = useCallback(
    async (skillType: SkillType, quantity = 1) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await buySkillApi(acc.id, skillType, quantity);
      soundEngine.playPurchaseCash();
      setAccount(updated);
      pushToast(`Đã mua +${quantity} lượt tuyệt kỹ!`, 'success');
    },
    [pushToast, setAccount]
  );

  const updateLoadout = useCallback(
    async (equippedSkills: SkillType[]) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await updateLoadoutApi(acc.id, equippedSkills);
      soundEngine.playItemRefresh();
      setAccount(updated);
    },
    [setAccount]
  );

  const buySkin = useCallback(
    async (skinId: SkinId) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await buySkinApi(acc.id, skinId);
      soundEngine.playLevelUp();
      setAccount(updated);
      pushToast('Đã mở khóa & mặc Skin mới!', 'success');
    },
    [pushToast, setAccount]
  );

  const equipSkin = useCallback(
    async (skinId: SkinId) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await equipSkinApi(acc.id, skinId);
      soundEngine.playItemRefresh();
      setAccount(updated);
    },
    [setAccount]
  );

  const buyWinEffect = useCallback(
    async (effectId: WinEffectId) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await buyWinEffectApi(acc.id, effectId);
      soundEngine.playLevelUp();
      setAccount(updated);
      pushToast('Đã mở khóa & trang bị Hiệu Ứng Thắng!', 'success');
    },
    [pushToast, setAccount]
  );

  const equipWinEffect = useCallback(
    async (effectId: WinEffectId) => {
      const acc = useGameStore.getState().account;
      if (!acc) return;
      const updated = await equipWinEffectApi(acc.id, effectId);
      soundEngine.playItemRefresh();
      setAccount(updated);
    },
    [setAccount]
  );

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
    register,
    logout,
    createRoom,
    joinRoom,
    leaveRoom,
    startMatch,
    placeBet,
    triggerSkill,
    submitMiniGame,
    useItem,
    discardItem,
    openPhone,
    closePhone,
    takeLoan,
    repayLoan,
    takeLobbyLoan,
    repayLobbyLoan,
    buySkill,
    updateLoadout,
    buySkin,
    equipSkin,
    buyWinEffect,
    equipWinEffect,
  };
}
