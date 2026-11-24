import React from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX, Zap, Magnet, Flame, Footprints } from 'lucide-react';
import {
  GameHudState,
  HUJUR_PHOTO_URL,
  PowerUpType,
  RUHUL_PHOTO_URL,
} from '../game/types';

interface GameHudProps {
  hud: GameHudState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onTitle: () => void;
  onToggleMute: () => void;
  onReplayClip: () => void;
}

const POWERUP_META: Record<PowerUpType, { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }> = {
  magnet: { label: 'MAGNET', color: '#ef4444', Icon: Magnet },
  jetpack: { label: 'JETPACK', color: '#f97316', Icon: Flame },
  multiplier: { label: '2X SCORE', color: '#3b82f6', Icon: Zap },
  sneakers: { label: 'SUPER JUMP', color: '#10b981', Icon: Footprints },
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onStart,
  onPause,
  onResume,
  onTitle,
  onToggleMute,
  onReplayClip,
}) => {
  const {
    phase,
    score,
    bestScore,
    coins,
    distance,
    speedKmh,
    multiplier,
    chaseDanger,
    stumbleActive,
    activePowerUps,
    caughtReason,
    muted,
  } = hud;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none text-slate-100">
      {/* TITLE SCREEN */}
      {phase === 'title' && (
        <div className="flex h-full w-full flex-col justify-between p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div
              className="pointer-events-auto max-w-md rounded-2xl border border-amber-300/35 p-5 shadow-2xl"
              style={{ backgroundColor: 'rgba(13, 18, 28, 0.88)' }}
            >
              {/* Bespoke SVG Title Lockup */}
              <svg
                viewBox="0 0 420 112"
                className="mb-3 h-auto w-full max-w-[340px]"
                aria-label="Ruhul vs Hujur: Track Chase"
              >
                <defs>
                  <linearGradient id="titleGold" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fde047" />
                    <stop offset="55%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                </defs>
                <rect x="2" y="8" width="416" height="4" rx="2" fill="#f59e0b" opacity="0.45" />
                <text
                  x="6"
                  y="44"
                  fill="url(#titleGold)"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="900"
                  fontSize="34"
                  letterSpacing="1.5"
                >
                  RUHUL vs HUJUR
                </text>
                <text
                  x="8"
                  y="76"
                  fill="#f8fafc"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  fontWeight="800"
                  fontSize="22"
                  letterSpacing="5"
                >
                  TRACK CHASE
                </text>
                <rect x="6" y="92" width="170" height="5" rx="2.5" fill="#facc15" />
                <rect x="184" y="92" width="60" height="5" rx="2.5" fill="#ef4444" />
                <rect x="252" y="92" width="28" height="5" rx="2.5" fill="#38bdf8" />
              </svg>

              {/* Character Matchup Strip with real portraits */}
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <img
                    src={RUHUL_PHOTO_URL}
                    alt="Ruhul"
                    className="h-11 w-11 rounded-full border-2 border-red-400 object-cover"
                    style={{ objectPosition: '50% 11%' }}
                  />
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-red-400 uppercase">
                      Chaser
                    </div>
                    <div className="text-sm font-extrabold text-white">Ruhul</div>
                  </div>
                </div>

                <div className="mx-auto text-xs font-black tracking-widest text-amber-400">
                  CHASES
                </div>

                <div className="flex items-center gap-2 text-right">
                  <div>
                    <div className="text-[10px] font-bold tracking-wider text-sky-400 uppercase">
                      Runner
                    </div>
                    <div className="text-sm font-extrabold text-white">Hujur</div>
                  </div>
                  <img
                    src={HUJUR_PHOTO_URL}
                    alt="Hujur"
                    className="h-11 w-11 rounded-full border-2 border-sky-400 object-cover"
                    style={{ objectPosition: '48% 38%' }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onStart}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-base font-black tracking-wide text-slate-950 shadow-lg transition-transform hover:bg-amber-300 active:scale-95"
                >
                  <Play className="h-5 w-5 fill-slate-950" />
                  START CHASE
                </button>
                {bestScore > 0 && (
                  <div className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-right">
                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                      Best
                    </div>
                    <div className="font-mono text-base font-bold tabular-nums text-amber-300">
                      {bestScore.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="pointer-events-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 text-slate-100 transition-colors hover:bg-slate-800"
              style={{ backgroundColor: 'rgba(13, 18, 28, 0.86)' }}
            >
              {muted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex justify-center">
            <div
              className="rounded-xl border border-slate-700/80 px-4 py-2 text-center text-xs font-semibold tracking-wide text-slate-200 sm:text-sm"
              style={{ backgroundColor: 'rgba(13, 18, 28, 0.85)' }}
            >
              A / D or ← / → Lane · W / ↑ / Space Jump · S / ↓ Roll · Esc Pause · M Mute
            </div>
          </div>
        </div>
      )}

      {/* PLAYING HUD (>= 85% Unobstructed Viewport) */}
      {(phase === 'playing' || phase === 'paused') && (
        <div className="flex h-full w-full flex-col justify-between p-4 sm:p-5">
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-3">
            {/* Score & Distance Cluster */}
            <div
              className="rounded-xl border border-slate-700/75 px-3.5 py-2"
              style={{ backgroundColor: 'rgba(13, 18, 28, 0.84)' }}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black tracking-tight tabular-nums text-white sm:text-3xl">
                  {score.toLocaleString()}
                </span>
                {multiplier > 1 && (
                  <span className="rounded bg-blue-500 px-1.5 py-0.5 text-[11px] font-black text-white">
                    2X
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs font-semibold tabular-nums text-slate-300">
                <span>{distance} m</span>
                <span className="text-amber-300">{speedKmh} km/h</span>
              </div>
            </div>

            {/* Chase Proximity Meter */}
            <div
              className="hidden max-w-xs flex-1 flex-col items-center rounded-xl border border-slate-700/75 px-3 py-2 sm:flex"
              style={{ backgroundColor: 'rgba(13, 18, 28, 0.84)' }}
            >
              <div className="mb-1 flex w-full items-center justify-between text-[10px] font-bold tracking-wider uppercase">
                <span className={stumbleActive ? 'text-red-400' : 'text-slate-300'}>
                  {stumbleActive ? 'RUHUL RIGHT BEHIND!' : 'CHASE GAP'}
                </span>
                <span className="tabular-nums text-slate-400">
                  {stumbleActive ? 'DANGER' : 'SAFE'}
                </span>
              </div>
              <div className="relative h-5 w-full rounded-full bg-slate-800 px-2">
                <div
                  className="absolute top-1/2 left-2 h-1.5 -translate-y-1/2 rounded-full transition-all duration-150"
                  style={{
                    width: `${Math.round(chaseDanger * 72 + 10)}%`,
                    backgroundColor: stumbleActive ? '#ef4444' : '#f59e0b',
                  }}
                />
                {/* Ruhul portrait slides right toward Hujur as danger rises */}
                <img
                  src={RUHUL_PHOTO_URL}
                  alt="Ruhul"
                  className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-red-400 object-cover transition-all duration-150"
                  style={{
                    left: `${Math.round(chaseDanger * 66 + 2)}%`,
                    objectPosition: '50% 11%',
                  }}
                />
                <img
                  src={HUJUR_PHOTO_URL}
                  alt="Hujur"
                  className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-sky-400 object-cover"
                  style={{ objectPosition: '48% 38%' }}
                />
              </div>
            </div>

            {/* Coins + Audio/Pause Controls */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 rounded-xl border border-amber-400/40 px-3 py-2"
                style={{ backgroundColor: 'rgba(13, 18, 28, 0.84)' }}
              >
                <span className="inline-block h-4 w-4 rounded-full border-2 border-amber-200 bg-amber-400" />
                <span className="font-mono text-lg font-black tabular-nums text-amber-300">
                  {coins}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 text-slate-100 hover:bg-slate-800"
                style={{ backgroundColor: 'rgba(13, 18, 28, 0.84)' }}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 text-red-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={phase === 'paused' ? onResume : onPause}
                aria-label={phase === 'paused' ? 'Resume game' : 'Pause game'}
                className="pointer-events-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-700/80 text-slate-100 hover:bg-slate-800"
                style={{ backgroundColor: 'rgba(13, 18, 28, 0.84)' }}
              >
                {phase === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Active Power-Up Timers (Bottom-Left) */}
          <div className="flex flex-col items-start gap-2">
            {activePowerUps.map((pu) => {
              const meta = POWERUP_META[pu.type];
              const Icon = meta.Icon;
              const pct = Math.max(0, Math.min(100, (pu.remaining / pu.duration) * 100));
              return (
                <div
                  key={pu.type}
                  className="flex w-44 items-center gap-2.5 rounded-xl border border-slate-700/80 px-3 py-2"
                  style={{ backgroundColor: 'rgba(13, 18, 28, 0.86)' }}
                >
                  <Icon className="h-4 w-4 shrink-0 text-white" />
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] font-extrabold tracking-wider text-slate-200">
                      <span>{meta.label}</span>
                      <span className="tabular-nums">{pu.remaining.toFixed(1)}s</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {phase === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/55 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-700 p-6 text-center shadow-2xl"
            style={{ backgroundColor: 'rgba(13, 18, 28, 0.96)' }}
          >
            <h2 className="text-2xl font-black tracking-wide text-white">CHASE PAUSED</h2>
            <p className="mt-1 text-sm text-slate-400">
              Ruhul is {stumbleActive ? 'right behind Hujur!' : 'hot on the trail.'}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-black text-slate-950 hover:bg-amber-300"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                RESUME
              </button>
              <button
                type="button"
                onClick={onStart}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-bold text-slate-100 hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                RESTART
              </button>
              <button
                type="button"
                onClick={onTitle}
                className="w-full cursor-pointer rounded-xl py-2 text-sm font-semibold text-slate-400 hover:text-white"
              >
                Back to Title
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {phase === 'gameover' && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-black/45 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-red-400/45 p-6 shadow-2xl"
            style={{ backgroundColor: 'rgba(13, 18, 28, 0.95)' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex items-center">
                <img
                  src={RUHUL_PHOTO_URL}
                  alt="Ruhul"
                  className="h-14 w-14 rounded-full border-2 border-red-400 object-cover"
                  style={{ objectPosition: '50% 11%' }}
                />
                <img
                  src={HUJUR_PHOTO_URL}
                  alt="Hujur"
                  className="-ml-3 h-12 w-12 rounded-full border-2 border-sky-400 object-cover"
                  style={{ objectPosition: '48% 38%' }}
                />
              </div>
              <div className="flex-1">
                <div className="text-xs font-extrabold tracking-widest text-red-400 uppercase">
                  BUSTED ON THE TRACKS
                </div>
                <h2 className="text-2xl font-black text-white">Ruhul Caught Hujur!</h2>
              </div>
              <button
                type="button"
                onClick={onReplayClip}
                title="Replay audio clip"
                aria-label="Replay audio clip"
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-amber-300 hover:bg-slate-700"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>

            {caughtReason && (
              <p className="mb-4 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-300">
                {caughtReason}
              </p>
            )}

            <div className="mb-5 grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Score
                </div>
                <div className="mt-0.5 font-mono text-lg font-black tabular-nums text-white">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Best
                </div>
                <div className="mt-0.5 font-mono text-lg font-black tabular-nums text-amber-300">
                  {bestScore.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-center">
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Coins
                </div>
                <div className="mt-0.5 font-mono text-lg font-black tabular-nums text-amber-400">
                  {coins}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onStart}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 font-black text-slate-950 shadow-lg hover:bg-amber-300 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                RUN AGAIN
              </button>
              <button
                type="button"
                onClick={onTitle}
                className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-bold text-slate-200 hover:bg-slate-700"
              >
                TITLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
