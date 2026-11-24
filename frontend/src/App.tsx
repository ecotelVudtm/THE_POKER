import { useState } from 'react';
import { LobbyView } from './components/LobbyView';
import { GameHudOverlay } from './components/GameHudOverlay';
import { MiniGameOverlay } from './components/MiniGameOverlay';
import { LoanPhoneModal } from './components/LoanPhoneModal';
import { DebugHudOverlay } from './components/DebugHudOverlay';
import { PokerTableScene } from './scenes/PokerTableScene';
import { usePokerSocket } from './hooks/usePokerSocket';

export function App() {
  const {
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
  } = usePokerSocket();

  const [shopOpen, setShopOpen] = useState(false);
  const inMatch = Boolean(account && room);

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-canvas">
      {/* Persistent 60fps 2.5D Voxel Poker Table (pauses GPU loop automatically when full-screen Shop covers it!) */}
      <div className={`h-full w-full ${!inMatch ? 'pointer-events-none' : ''}`}>
        <PokerTableScene
          room={room}
          me={me}
          onUseItem={useItem}
          onDiscardItem={discardItem}
          idleShowcase={!inMatch}
          paused={!inMatch && shopOpen}
        />
      </div>

      {!inMatch ? (
        <LobbyView
          account={account}
          onLogin={login}
          onRegister={register}
          onLogout={logout}
          onTakeLoan={takeLobbyLoan}
          onRepayLoan={repayLobbyLoan}
          onBuySkill={buySkill}
          onUpdateLoadout={updateLoadout}
          onBuySkin={buySkin}
          onEquipSkin={equipSkin}
          onBuyWinEffect={buyWinEffect}
          onEquipWinEffect={equipWinEffect}
          onShopOpenChange={setShopOpen}
          onCreateBotRoom={(maxBuyIn) => createRoom({ botCount: 3, maxBuyIn })}
          onCreateOnlineRoom={(maxBuyIn) => createRoom({ botCount: 0, maxBuyIn })}
          onEnterArena={(maxBuyIn) =>
            createRoom({ mode: 'ARENA', quickArenaMatch: true, botCount: 0, maxBuyIn })
          }
          onJoinRoom={joinRoom}
        />
      ) : (
        <>
          <GameHudOverlay
            room={room!}
            account={account!}
            me={me}
            muted={muted}
            toasts={toasts}
            onToggleMute={toggleMute}
            onOpenPhone={openPhone}
            onStartMatch={startMatch}
            onLeaveRoom={leaveRoom}
            onPlaceBet={placeBet}
            onTriggerSkill={triggerSkill}
          />

          <MiniGameOverlay
            challenge={activeChallenge}
            lastResult={lastMiniGameResult}
            eagleEyeCard={eagleEyeCard}
            onSubmit={submitMiniGame}
          />

          <LoanPhoneModal
            open={phoneModalOpen}
            me={me}
            debtAlert={debtAlert}
            onOpen={openPhone}
            onClose={closePhone}
            onTakeLoan={takeLoan}
            onRepayLoan={repayLoan}
          />
        </>
      )}

      {/* Minecraft-style F3 Technical Debug Overlay */}
      <DebugHudOverlay connected={connected} account={account} room={room} />
    </div>
  );
}

export default App;
