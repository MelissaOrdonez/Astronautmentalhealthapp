import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'playing' | 'result';

interface Ripple {
  id: number;
  x: number; // percent
  y: number; // percent
  state: 'active' | 'tapped' | 'missed';
  createdAt: number;
}

const TOTAL_RIPPLES = 14;
const RIPPLE_LIFETIME = 2800; // ms

// Pre-scheduled ripple spawn times
const SCHEDULE = [300, 1200, 2400, 3600, 4800, 6000, 7200, 8000, 9400, 10600, 11800, 12800, 13800, 14800];

export function FocusGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [tapped, setTapped] = useState(0);
  const [missed, setMissed] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const rippleIdRef = useRef(0);
  const tappedRef = useRef(0);
  const missedRef = useRef(0);
  const spawnedRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const endGame = useCallback(() => {
    const t = tappedRef.current;
    const total = spawnedRef.current;
    const score = Math.round((t / total) * 100);
    saveResult('focus', {
      score,
      feedback: score >= 70 ? 'Flow was steady' : 'Focus disrupted',
      timestamp: Date.now(),
    });
    setPhase('result');
  }, [saveResult]);

  useEffect(() => {
    if (phase !== 'playing') return;

    tappedRef.current = 0;
    missedRef.current = 0;
    spawnedRef.current = 0;
    setTapped(0);
    setMissed(0);
    setSpawned(0);
    setRipples([]);
    rippleIdRef.current = 0;

    const timers: ReturnType<typeof setTimeout>[] = [];

    SCHEDULE.forEach((delay, index) => {
      const spawnTimer = setTimeout(() => {
        const id = rippleIdRef.current++;
        const x = Math.random() * 66 + 10; // 10–76%
        const y = Math.random() * 52 + 18; // 18–70%
        spawnedRef.current += 1;
        setSpawned((s) => s + 1);
        setRipples((prev) => [...prev, { id, x, y, state: 'active', createdAt: Date.now() }]);

        // Auto-expire
        const expireTimer = setTimeout(() => {
          setRipples((prev) => {
            const r = prev.find((r) => r.id === id);
            if (r && r.state === 'active') {
              missedRef.current += 1;
              setMissed((m) => m + 1);
              return prev.map((r) => (r.id === id ? { ...r, state: 'missed' as const } : r));
            }
            return prev;
          });
          // Remove from view after a brief moment
          setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== id));
          }, 400);

          // End game after last one
          if (index === SCHEDULE.length - 1) {
            setTimeout(endGame, 1200);
          }
        }, RIPPLE_LIFETIME);

        timers.push(expireTimer);
      }, delay);

      timers.push(spawnTimer);
    });

    timersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [phase, endGame]);

  const tapRipple = useCallback((id: number) => {
    setRipples((prev) => {
      const r = prev.find((r) => r.id === id && r.state === 'active');
      if (!r) return prev;
      tappedRef.current += 1;
      setTapped((t) => t + 1);
      const updated = prev.map((rip) => (rip.id === id ? { ...rip, state: 'tapped' as const } : rip));
      // Remove after brief flash
      setTimeout(() => {
        setRipples((p) => p.filter((r) => r.id !== id));
      }, 300);
      return updated;
    });
  }, []);

  const scorePercent = Math.round((tapped / Math.max(spawned, 1)) * 100);
  const resultScore = Math.round((tappedRef.current / TOTAL_RIPPLES) * 100);
  const isGood = resultScore >= 70;

  return (
    <NatureLayout>
      <div className="flex flex-col pt-20 pb-8" style={{ overflowY: 'auto', height: '100%', flex: 1 }}>
        <AnimatePresence mode="wait">
          {/* INSTRUCTIONS */}
          {phase === 'instructions' && (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <div className="mb-6 text-center">
                <p style={{ color: '#38bdf8', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  FOCUS GAME
                </p>
                <h1 style={{ color: '#e0f2fe', fontSize: '26px', margin: '0 0 12px', fontWeight: 400 }}>
                  Flow Control
                </h1>
                <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', margin: '0 auto 20px' }} />
              </div>

              {/* Ripple preview */}
              <div
                className="relative mb-8 rounded-3xl overflow-hidden"
                style={{ width: '100%', height: 160, background: 'linear-gradient(180deg, #0a2030 0%, #061520 100%)', border: '1px solid rgba(56,189,248,0.2)' }}
              >
                {/* River waves */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, overflow: 'hidden' }}>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        position: 'absolute', left: 0, right: 0,
                        height: 2, background: 'rgba(56,189,248,0.2)',
                        top: 30 + i * 30,
                      }}
                    />
                  ))}
                </div>
                {/* Sample ripple */}
                <div
                  style={{
                    position: 'absolute', left: '40%', top: '35%',
                    width: 52, height: 52, borderRadius: '50%',
                    border: '2px solid rgba(56,189,248,0.7)',
                    boxShadow: '0 0 16px rgba(56,189,248,0.4)',
                    animation: 'previewRipple 1.8s ease-out infinite',
                  }}
                />
                <div style={{ position: 'absolute', left: '50%', top: '45%', transform: 'translate(-50%,-50%)', width: 18, height: 18, borderRadius: '50%', background: 'rgba(56,189,248,0.5)' }} />
              </div>

              <p
                style={{
                  color: 'rgba(224,242,254,0.7)', fontSize: '15px', lineHeight: 1.7,
                  textAlign: 'center', maxWidth: 290, marginBottom: 48,
                }}
              >
                Ripples appear in the river. Tap each one before it fades to maintain flow. Disruptions reflect changes in focus.
              </p>

              <div className="flex gap-4 w-full mb-8">
                {[
                  { label: 'Ripples', value: TOTAL_RIPPLES },
                  { label: 'Window', value: '2.8s' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-3 rounded-2xl"
                    style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}
                  >
                    <span style={{ color: '#38bdf8', fontSize: '18px', fontWeight: 500 }}>{value}</span>
                    <span style={{ color: 'rgba(224,242,254,0.5)', fontSize: '11px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhase('playing')}
                className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
                  color: '#e0f2fe', fontSize: '17px',
                  boxShadow: '0 0 30px rgba(56,189,248,0.2)',
                  border: '1px solid rgba(56,189,248,0.3)',
                }}
              >
                Start
              </button>

              <style>{`
                @keyframes previewRipple {
                  0% { transform: scale(0.4); opacity: 0.9; }
                  100% { transform: scale(1.8); opacity: 0; }
                }
              `}</style>
            </motion.div>
          )}

          {/* PLAYING */}
          {phase === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col flex-1"
              style={{ position: 'relative' }}
            >
              {/* Score bar */}
              <div className="flex justify-between px-5 mb-3">
                <div>
                  <span style={{ color: 'rgba(224,242,254,0.5)', fontSize: '12px' }}>Tapped</span>
                  <p style={{ color: '#38bdf8', fontSize: '22px', margin: 0, fontWeight: 500 }}>{tapped}</p>
                </div>
                <div className="text-center">
                  <span style={{ color: 'rgba(224,242,254,0.5)', fontSize: '12px' }}>Accuracy</span>
                  <p style={{ color: '#4ade80', fontSize: '22px', margin: 0, fontWeight: 500 }}>
                    {spawned > 0 ? scorePercent : 0}%
                  </p>
                </div>
                <div className="text-right">
                  <span style={{ color: 'rgba(224,242,254,0.5)', fontSize: '12px' }}>Missed</span>
                  <p style={{ color: '#f87171', fontSize: '22px', margin: 0, fontWeight: 500 }}>{missed}</p>
                </div>
              </div>

              {/* River game area */}
              <div
                className="relative flex-1 mx-4 rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, #061a2a 0%, #0a2840 50%, #061a28 100%)',
                  border: '1px solid rgba(56,189,248,0.15)',
                  minHeight: 420,
                }}
              >
                {/* River waves */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute', left: 0, right: 0, height: 1,
                      background: `rgba(56,189,248,${0.06 + i * 0.02})`,
                      top: `${18 + i * 18}%`,
                    }}
                  />
                ))}

                {/* Ripples */}
                {ripples.map((ripple) => (
                  <RippleElement
                    key={ripple.id}
                    ripple={ripple}
                    onTap={() => tapRipple(ripple.id)}
                    lifetime={RIPPLE_LIFETIME}
                  />
                ))}

                {/* Hint text */}
                {spawned === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'rgba(56,189,248,0.4)', fontSize: '15px', textAlign: 'center' }}>
                      Watch the river…
                    </p>
                  </div>
                )}
              </div>

              <p style={{ color: 'rgba(224,242,254,0.35)', fontSize: '12px', textAlign: 'center', marginTop: 12 }}>
                Tap each ripple before it fades
              </p>
            </motion.div>
          )}

          {/* RESULT */}
          {phase === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center flex-1 px-5"
            >
              <div className="mb-4 text-center">
                <p style={{ color: '#38bdf8', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  FLOW ANALYSIS
                </p>
                <h2 style={{ color: '#e0f2fe', fontSize: '24px', margin: '0 0 4px', fontWeight: 400 }}>
                  {isGood ? '🌊 Flow was steady' : '💧 Focus disrupted'}
                </h2>
              </div>

              {/* Score circle */}
              <div className="relative mb-8">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="8" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={isGood ? '#38bdf8' : '#fbbf24'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${resultScore * 4.4} 440`}
                    transform="rotate(-90 80 80)"
                    style={{ filter: `drop-shadow(0 0 8px ${isGood ? '#38bdf8' : '#fbbf24'})` }}
                  />
                  <text x="80" y="76" textAnchor="middle" fill={isGood ? '#38bdf8' : '#fbbf24'} fontSize="32" fontWeight="400">{resultScore}</text>
                  <text x="80" y="96" textAnchor="middle" fill="rgba(224,242,254,0.5)" fontSize="12">score</text>
                </svg>
              </div>

              <div className="flex gap-4 w-full mb-8">
                {[
                  { label: 'Tapped', value: tappedRef.current, color: '#38bdf8' },
                  { label: 'Missed', value: missedRef.current, color: '#f87171' },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center py-4 rounded-2xl"
                    style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}
                  >
                    <span style={{ color, fontSize: '26px', fontWeight: 400 }}>{value}</span>
                    <span style={{ color: 'rgba(224,242,254,0.5)', fontSize: '11px' }}>{label}</span>
                  </div>
                ))}
              </div>

              <div
                className="w-full p-4 rounded-2xl mb-8"
                style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.15)' }}
              >
                <p style={{ color: 'rgba(224,242,254,0.7)', fontSize: '14px', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  {isGood
                    ? 'Attention and sustained focus are within healthy mission parameters. River flow is stable.'
                    : 'Focus sustainability appears reduced. Increased cognitive fatigue may be a contributing factor.'}
                </p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPhase('instructions')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#7dd3fc', fontSize: '15px' }}
                >
                  Retry
                </button>
                <button
                  onClick={() => navigate('/ecosystem')}
                  className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#0c4a6e,#0369a1)', color: '#e0f2fe', fontSize: '15px', border: '1px solid rgba(56,189,248,0.3)' }}
                >
                  Ecosystem
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </NatureLayout>
  );
}

function RippleElement({
  ripple,
  onTap,
  lifetime,
}: {
  ripple: Ripple;
  onTap: () => void;
  lifetime: number;
}) {
  const age = Date.now() - ripple.createdAt;
  const progress = Math.min(age / lifetime, 1);

  return (
    <motion.button
      initial={{ scale: 0.2, opacity: 0 }}
      animate={
        ripple.state === 'tapped'
          ? { scale: 2.5, opacity: 0 }
          : ripple.state === 'missed'
          ? { scale: 0.5, opacity: 0 }
          : { scale: 1, opacity: 1 }
      }
      transition={{ duration: ripple.state === 'active' ? 0.3 : 0.3 }}
      onClick={onTap}
      disabled={ripple.state !== 'active'}
      style={{
        position: 'absolute',
        left: `${ripple.x}%`,
        top: `${ripple.y}%`,
        transform: 'translate(-50%, -50%)',
        width: 72,
        height: 72,
        borderRadius: '50%',
        background:
          ripple.state === 'tapped'
            ? 'rgba(74,222,128,0.3)'
            : 'rgba(56,189,248,0.12)',
        border: `2px solid ${ripple.state === 'tapped' ? 'rgba(74,222,128,0.8)' : 'rgba(56,189,248,0.6)'}`,
        boxShadow:
          ripple.state === 'tapped'
            ? '0 0 24px rgba(74,222,128,0.5)'
            : `0 0 ${16 + progress * 16}px rgba(56,189,248,${0.5 - progress * 0.3})`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Expanding ring */}
      <motion.div
        animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1.5px solid rgba(56,189,248,0.5)',
        }}
      />
      <div
        style={{
          width: 20, height: 20, borderRadius: '50%',
          background: ripple.state === 'tapped' ? '#4ade80' : 'rgba(56,189,248,0.7)',
          boxShadow: '0 0 10px currentColor',
        }}
      />
    </motion.button>
  );
}