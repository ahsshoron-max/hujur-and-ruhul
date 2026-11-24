import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { TrackChaseEngine } from './game/TrackChaseEngine';
import { GameHudState } from './game/types';

const INITIAL_HUD: GameHudState = {
  phase: 'title',
  score: 0,
  bestScore: 0,
  coins: 0,
  distance: 0,
  speedKmh: 70,
  multiplier: 1,
  chaseDanger: 0.7,
  stumbleActive: false,
  activePowerUps: [],
  caughtReason: '',
  muted: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TrackChaseEngine | null>(null);
  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new TrackChaseEngine(container, (nextHud) => {
      setHud(nextHud);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startNewRun();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleReplayClip = useCallback(() => {
    engineRef.current?.replayCaughtClip();
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#1a1614]">
      <div ref={mountRef} className="fixed inset-0 h-full w-full" />
      <GameHud
        hud={hud}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onTitle={handleTitle}
        onToggleMute={handleToggleMute}
        onReplayClip={handleReplayClip}
      />
    </main>
  );
}
