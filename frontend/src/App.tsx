import { LobbyView } from './components/LobbyView';
import { GameHudOverlay } from './components/GameHudOverlay';
import { MiniGameOverlay } from './components/MiniGameOverlay';
import { LoanPhoneModal } from './components/LoanPhoneModal';
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
  } = usePokerSocket();

  if (!account || !room) {
    return (
      <LobbyView
        connected={connected}
        account={account}
        onLogin={login}
        onCreateBotRoom={() => createRoom({ botCount: 3 })}
        onCreateOnlineRoom={(roomName) => createRoom({ roomName, botCount: 0 })}
        onJoinRoom={joinRoom}
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-surface-canvas">
      {/* 2.5D Three.js / React Three Fiber Poker Table Canvas */}
      <PokerTableScene room={room} me={me} onUseItem={useItem} />

      {/* HTML/Tailwind Game HUD Overlay */}
      <GameHudOverlay
        room={room}
        account={account}
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

      {/* 60fps Skill-Check Mini-Games, Result EXP/Level-Up & Eagle Eye Peek */}
      <MiniGameOverlay
        challenge={activeChallenge}
        lastResult={lastMiniGameResult}
        eagleEyeCard={eagleEyeCard}
        onSubmit={submitMiniGame}
      />

      {/* Everyday Smartphone Loan App & Incoming Debt Call */}
      <LoanPhoneModal
        open={phoneModalOpen}
        me={me}
        debtAlert={debtAlert}
        onOpen={openPhone}
        onClose={closePhone}
        onTakeLoan={takeLoan}
        onRepayLoan={repayLoan}
      />
    </div>
  );
}

export default App;
