import { useEffect, useState } from 'react';
import { getSocket } from '../../services/socketClient';
import { liveRendererStats } from '../../scenes/PokerTableScene/PokerTableScene';
import { Account, FilteredRoomState } from '../../types/game';

export interface DebugHudOverlayProps {
  connected: boolean;
  account: Account | null;
  room: FilteredRoomState | null;
}

/**
 * Minecraft-style F3 Technical Debug Overlay.
 * All connection, ping, server, and WebGL renderer metrics live here — never cluttering the game HUD.
 */
export function DebugHudOverlay({ connected, account, room }: DebugHudOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      const socket = getSocket();
      if (socket.connected) {
        const start = performance.now();
        socket.emit('ping_check', start, () => {
          setPingMs(Math.round(performance.now() - start));
        });
      } else {
        setPingMs(null);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  const socket = getSocket();
  const inMatch = Boolean(room);
  const lineCls =
    'inline-block bg-surface-canvas/80 px-1.5 py-0.5 font-mono text-[11px] leading-tight text-content-primary';

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-50 flex justify-between p-2 ${
        inMatch ? 'items-start' : 'items-end'
      }`}
    >
      {/* Left column: Engine & Network */}
      <div className="flex flex-col items-start gap-0.5">
        <span className={lineCls}>THE_POKER 2.5D (Three.js / WebGL2) [F3 to hide]</span>
        <span className={lineCls}>
          {liveRendererStats.fps} fps | DPR: {liveRendererStats.dpr.toFixed(2)} | Draws:{' '}
          {liveRendererStats.drawCalls} | Tris: {liveRendererStats.triangles} | Geos:{' '}
          {liveRendererStats.geometries}
        </span>
        <span className={lineCls}>
          Server: {connected ? 'ONLINE' : 'OFFLINE'} | Socket: {socket.id ?? 'none'} | Ping:{' '}
          {pingMs !== null ? `${pingMs}ms` : '--'}
        </span>
        <span className={lineCls}>
          Account: {account ? `${account.username} (${account.id.slice(0, 8)})` : 'guest'}
        </span>
      </div>

      {/* Right column: Authoritative Room State */}
      <div className="flex flex-col items-end gap-0.5">
        <span className={lineCls}>
          Room: {room ? `${room.id} (${room.status})` : 'LOBBY'}
        </span>
        <span className={lineCls}>
          Phase: {room?.phase ?? 'NONE'} | Hand: #{room?.handNumber ?? 0} | Pot:{' '}
          {room?.pot ?? 0}
        </span>
        <span className={lineCls}>
          Players: {room ? `${room.players.length}/${room.maxPlayers}` : '0/0'} | Blinds:{' '}
          {room ? `${room.smallBlind}/${room.bigBlind}` : '--'}
        </span>
      </div>
    </div>
  );
}
