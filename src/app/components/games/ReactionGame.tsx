import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

type Phase = 'instructions' | 'countdown' | 'playing' | 'result' | 'history';

// helper functions
interface ReactionSession {
  score: number;
  avgMs: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timestamp: number;
}

const STORAGE_KEY = 'reaction_sessions';

function loadSessions(): ReactionSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ReactionSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-30)));
  } catch {
    // ignore storage errors
  }
}

function fmtPercent(v: number | null) {
  return v === null ? '—' : `${v}%`;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '10px 8px',
        background: 'rgba(251,146,60,0.06)',
        border: '1px solid rgba(251,146,60,0.18)',
        borderRadius: 16
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 500, color: '#fb923c' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,237,213,0.5)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

export interface Animal {
  id: number;
  emoji: string;
  x: number;
  y: number;
  isTarget: boolean;
  appearedAt: number;
}

const ALL_ANIMALS = [
  '🦊', '🐰', '🦌', '🐦', '🦔', '🦋', '🐿️', '🦜', '🐸', '🦉'
];

const MISS_TIMEOUT = 1600;
const GAME_DURATION = 20000;
const MIN_ANIMALS = 2;
const MAX_ANIMALS = 6;
const MIN_DISTANCE = 18; // % distance between animals (tweak 15–22)

export function ReactionGame() {
  const navigate = useNavigate();
  const { saveResult } = useGameContext();
  const [allSessions, setAllSessions] = useState<ReactionSession[]>(loadSessions);
  const persistedSessions = allSessions.length;
  const persistedBestScore =
    allSessions.length > 0 ? Math.max(...allSessions.map(s => s.score)) : null;
  const persistedAvgScore =
    allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.score, 0) / allSessions.length)
      : null;

  // --- GAME STATE ---
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rtListRef = useRef<number[]>([]);
  const successfulRtListRef = useRef<number[]>([]);
  const wrongClicksRef = useRef(0);
  const missedTargetsRef = useRef(0);

  const [phase, setPhase] = useState<Phase>('instructions');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' >('easy');
  const [countdown, setCountdown] = useState(3);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const spawnLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalTargetsRef = useRef(0);
  const hitTargetsRef = useRef(0);
  // --- NEW STATE FOR RESULTS ---
  const [avgRT, setAvgRT] = useState<number>(0);        // for PLAYING header
  const [finalAvg, setFinalAvg] = useState<number>(0);  // for RESULT screen
  const [finalScore, setFinalScore] = useState<number>(0);
  const [isGood, setIsGood] = useState<boolean>(true);

  // --- TIMER UTILITIES ---
  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const isFarEnough = (x: number, y: number, existing: Animal[]) => {
    return existing.every(a => {
      const dx = a.x - x;
      const dy = a.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance > MIN_DISTANCE;
    });
  };

  const addTimer = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timersRef.current.push(id);
    return id;
  };

  const getValidPosition = (existing: Animal[]) => {
    let attempts = 0;

    while (attempts < 10) {
      const x = Math.random() * 60 + 10;
      const y = Math.random() * 50 + 20;

      if (isFarEnough(x, y, existing)) {
        return { x, y };
      }

      attempts++;
    }

    // fallback (prevents infinite loop)
    return {
      x: Math.random() * 60 + 10,
      y: Math.random() * 50 + 20,
    };
  };

  const startSpawning = useCallback(() => {
    const spawnOne = () => {
      const targetProbability =
        difficulty === 'hard' ? 0.45 :
        difficulty === 'medium' ? 0.55 : 0.65;
      
      const isTarget = Math.random() < targetProbability;
      if (isTarget) totalTargetsRef.current += 1;

      const emoji = isTarget
        ? '🐦'
        : ALL_ANIMALS[Math.floor(Math.random() * ALL_ANIMALS.length)];

      const newAnimal: Animal = {
        id: Date.now() + Math.random(),
        emoji,
        x: Math.random() * 60 + 10,
        y: Math.random() * 50 + 20,
        isTarget,
        appearedAt: Date.now(),
      };

      setAnimals(prev => [...prev, newAnimal]);

      // ✅ Always remove after MISS_TIMEOUT
      addTimer(() => {
        setAnimals(prev => {
          const stillExists = prev.some(a => a.id === newAnimal.id);

          if (stillExists && isTarget) {
            missedTargetsRef.current += 1;
            rtListRef.current.push(MISS_TIMEOUT);
          }

          return prev.filter(a => a.id !== newAnimal.id);
        });
      }, MISS_TIMEOUT);
    };

    const ensureMinimumAnimals = () => {
        setAnimals(prev => {
          if (prev.length >= MIN_ANIMALS) return prev;

          const needed = MIN_ANIMALS - prev.length;
          const newOnes: Animal[] = [];

          for (let i = 0; i < needed; i++) {
            const isTarget =
              difficulty === 'hard' ? Math.random() < 0.45 :
              difficulty === 'medium' ? Math.random() < 0.55 :
              Math.random() < 0.65;

            if (isTarget) totalTargetsRef.current += 1;

            newOnes.push({
              id: Date.now() + Math.random(),
              emoji: isTarget
                ? '🐦'
                : ALL_ANIMALS[Math.floor(Math.random() * ALL_ANIMALS.length)],
              x: Math.random() * 60 + 10,
              y: Math.random() * 50 + 20,
              isTarget,
              appearedAt: Date.now(),
            });
          }
          return [...prev, ...newOnes];
        });
    };

    const loop = () => {
      ensureMinimumAnimals();

      if (Math.random() < 0.6) {
        spawnOne();
      }

      const nextDelay =
        difficulty === 'hard'
          ? Math.random() * 300 + 200
          : difficulty === 'medium'
          ? Math.random() * 400 + 300
          : Math.random() * 500 + 400;

      const id = setTimeout(loop, nextDelay);
      timersRef.current.push(id);
    };

    loop();
  }, [difficulty]);

  // --- HANDLE TAP ---
  const handleTap = useCallback((id: number) => {
    const tapped = animals.find((a) => a.id === id);
    if (!tapped || phase !== 'playing') return;

    setAnimals(prev => prev.filter(a => a.id !== id));

    const rt = Date.now() - tapped.appearedAt;

    if (tapped.isTarget) {
      hitTargetsRef.current += 1;
      rtListRef.current.push(rt);
      successfulRtListRef.current.push(rt);
      setLastRT(rt);
    } else {
      wrongClicksRef.current += 1;
      setLastRT(null);
    }

    if (successfulRtListRef.current.length > 0) {
      const avg =
        successfulRtListRef.current.reduce((a, b) => a + b, 0) /
        successfulRtListRef.current.length;

      setAvgRT(Math.round(avg));
    } else {
      setAvgRT(0);
    }

    setShowFeedback(true);

    addTimer(() => {
      setShowFeedback(false);
    }, 400);
  }, [animals, phase]);

  // --- COUNTDOWN BEFORE GAME ---
  useEffect(() => {
    if (phase !== 'countdown') return;

    setCountdown(3);
    rtListRef.current = [];
    successfulRtListRef.current = [];
    wrongClicksRef.current = 0;
    missedTargetsRef.current = 0;
    totalTargetsRef.current = 0;
    hitTargetsRef.current = 0;
    setAnimals([]);
    setAvgRT(0);  

    const t1 = setTimeout(() => setCountdown(2), 1000);
    const t2 = setTimeout(() => setCountdown(1), 2000);

    const t3 = setTimeout(() => {
      setPhase('playing');
      startSpawning();

      // END GAME AFTER TIME
      const endTimer = setTimeout(() => {
        clearTimers();
        if (spawnLoopRef.current) clearTimeout(spawnLoopRef.current);

        const hits = hitTargetsRef.current;
        const total = totalTargetsRef.current;

        const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
        const avg = successfulRtListRef.current.length
          ? Math.round(
              successfulRtListRef.current.reduce((a, b) => a + b, 0) /
              successfulRtListRef.current.length
            )
          : 0;
        
        const newSession: ReactionSession = {
            score: accuracy,
            avgMs: avg,
            difficulty,
            timestamp: Date.now(),
          };

        const updatedSessions = [...allSessions, newSession];
        setAllSessions(updatedSessions);
        saveSessions(updatedSessions);

        const isGood = accuracy > 70;

        setFinalScore(accuracy);
        setFinalAvg(avg);
        setIsGood(isGood);

        saveResult('reaction', {
          score: accuracy,
          feedback: isGood ? 'Alertness normal' : 'Reaction slower than baseline',
          timestamp: Date.now(),
          details: { avgMs: avg , difficulty},
        });

        setPhase('result');
      }, GAME_DURATION);

      timersRef.current.push(endTimer);

    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase, startSpawning, saveResult]);

  // --- CLEANUP ON UNMOUNT ---
  useEffect(() => {
    return () => {
      clearTimers();
      if (spawnLoopRef.current) clearTimeout(spawnLoopRef.current);
    };
  }, []);
  
  return (
  <NatureLayout>
    <div className="flex flex-col pt-20 pb-8" style={{ overflowY: 'auto', height: '100%', flex: 1 }}>
      <AnimatePresence mode="wait">
        {/* INSTRUCTIONS + DIFFICULTY SELECTION */}
        {phase === 'instructions' && (
          <motion.div
            key="instructions"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center flex-1 px-5"
          >
            <div className="mb-6 text-center">
              <p style={{ color: '#fb923c', fontSize: '25px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                REACTION GAME
              </p>
              <h1 style={{ color: '#fff7ed', fontSize: '60px', margin: '0 0 12px', fontWeight: 400 }}>
                Habitat Match
              </h1>
              <div style={{ width: 48, height: 2, background: 'linear-gradient(90deg, transparent, #fb923c, transparent)', margin: '0 auto 20px' }} />
            </div>

            {/* Game Description */}
            <p style={{ color: 'rgba(255,237,213,0.7)', fontSize: '20px', lineHeight: 1.7, textAlign: 'center', maxWidth: 300, marginBottom: 20 }}>
              Animals will appear in the habitat. Only tap the <strong>target animals (birds 🐦)</strong> quickly when you see them.
              Other animals are distractions. Faster reactions and correct taps indicate higher alertness.
            </p>

            {/* Example preview */}
            <div className="flex gap-3 mb-8 flex-wrap justify-center">
              {['🐦', '🦊', '🐰', '🦉', '🦌', '🦔'].map((a) => (
                <div key={a} style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: 'rgba(251,146,60,0.08)',
                  border: '1.5px solid rgba(251,146,60,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26,
                }}>
                  {a}
                </div>
              ))}
            </div>

            {/* Difficulty selection */}
            <div className="flex gap-4 w-full mb-8">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level as 'easy' | 'medium' | 'hard')}
                  className={`flex-1 py-3 rounded-2xl border ${
                    difficulty === level
                      ? 'border-orange-400 bg-orange-100 text-orange-600'
                      : 'border-orange-200 text-orange-400'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 26 }}>
              <StatBox label="best" value={fmtPercent(persistedBestScore)} />
              <StatBox label="average" value={fmtPercent(persistedAvgScore)} />
              <StatBox label="sessions" value={String(persistedSessions)} />
            </div>

            <button
              onClick={() => {
                if (difficulty) setPhase('countdown');
              }}
              className="w-full py-5 rounded-2xl active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)',
                color: '#fff7ed', fontSize: '17px',
                boxShadow: '0 0 30px rgba(251,146,60,0.2)',
                border: '1px solid rgba(251,146,60,0.3)',
              }}
            >
              Start
            </button>
          </motion.div>
        )}

        {/* COUNTDOWN */}
        {phase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center flex-1"
          >
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(251,146,60,0.1)',
                border: '2px solid rgba(251,146,60,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 40px rgba(251,146,60,0.2)',
              }}
            >
              <span style={{ color: '#fb923c', fontSize: '56px', fontWeight: 300 }}>{countdown}</span>
            </motion.div>
          </motion.div>
        )}

        {/* PLAYING */}
        {phase === 'playing' && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1">
            {/* Header */}
            <div className="flex justify-between items-center px-5 mb-4">
              {/* Stop button */}
              <button onClick={() => {
                clearTimers();

                const hits = hitTargetsRef.current;
                const total = totalTargetsRef.current;

                const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;
                const avg = successfulRtListRef.current.length
                  ? Math.round(
                      successfulRtListRef.current.reduce((a, b) => a + b, 0) /
                      successfulRtListRef.current.length
                    )
                  : 0;

                const good = accuracy > 70;

                setFinalScore(accuracy);
                setFinalAvg(avg);
                setIsGood(good);

                saveResult('reaction', {
                  score: accuracy,
                  feedback: good ? 'Alertness normal' : 'Reaction slower than baseline',
                  timestamp: Date.now(),
                  details: { avgMs: avg, difficulty },
                });

                setPhase('result');
              }}
              className="px-4 py-2 rounded-xl"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: '#f87171',
                fontSize: '13px'
              }}>
                Stop & Results
              </button>

              {/* Difficulty */}
              <span style={{
                color: '#fb923c',
                fontSize: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                {difficulty}
              </span>

              {/* Avg RT */}
              <div className="text-right">
                <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>Avg RT</span>
                <p style={{
                  color: avgRT > 0 && avgRT < 500 ? '#4ade80' : '#fbbf24',
                  fontSize: '22px',
                  margin: 0,
                  fontWeight: 500
                }}>
                  {avgRT > 0 ? `${avgRT}ms` : '—'}
                </p>
              </div>

            </div>

            {/* Game area */}
            <div className="relative flex-1 mx-4 rounded-3xl overflow-hidden" style={{
              background: 'linear-gradient(180deg, #0a1508 0%, #0d1c0a 50%, #091208 100%)',
              border: '1px solid rgba(251,146,60,0.12)',
              minHeight: 380,
            }}>
              {[30, 55, 72].map((y, i) => (
                <div key={i} style={{ position: 'absolute', left: 0, right: 0, height: 1, background: `rgba(74,222,128,0.04)`, top: `${y}%` }} />
              ))}

              {/* Feedback flash */}
              <AnimatePresence>
                {showFeedback && lastRT !== null && (
                  <motion.div initial={{ opacity: 0, scale: 0.8, y: '30%' }} animate={{ opacity: 1, scale: 1, y: '25%' }} exit={{ opacity: 0, y: '20%' }} style={{
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    background: lastRT <= 900 ? 'rgba(74,222,128,0.2)' : 'rgba(251,146,60,0.2)',
                    border: `1px solid ${lastRT <= 900 ? 'rgba(74,222,128,0.5)' : 'rgba(251,146,60,0.5)'}`,
                    borderRadius: 16, padding: '8px 20px',
                    color: lastRT <= 900 ? '#4ade80' : '#fb923c',
                    fontSize: '18px', fontWeight: 500, whiteSpace: 'nowrap',
                  }}>
                    {lastRT}ms {lastRT <= 700 ? '⚡' : lastRT <= 900 ? '✓' : '↓'}                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animals */}
              <AnimatePresence>
                {animals.map((animal) => (
                  <motion.button key={animal.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.22, type: 'spring', stiffness: 280 }}
                    onClick={() => handleTap(animal.id)}
                    style={{
                      position: 'absolute',
                      left: `${animal.x}%`,
                      top: `${animal.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 90,
                      height: 90,
                      borderRadius: 22,
                      fontSize: 46,
                      background: 'rgba(30,20,10,0.65)',
                      backdropFilter: 'blur(6px)',
                      border: '2px solid rgba(251,146,60,0.5)',
                      boxShadow: '0 0 28px rgba(251,146,60,0.3), 0 0 60px rgba(251,146,60,0.1)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                      {animal.emoji}
                    </motion.span>
                  </motion.button>
                ))}
              </AnimatePresence>

              {/* Waiting */}
              {!animals.length && phase !== 'playing' && !showFeedback && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: 'rgba(251,146,60,0.3)', fontSize: '14px' }}>Watching…</p>
                </div>
              )}
            </div>

            <p style={{ color: 'rgba(255,237,213,0.35)', fontSize: '12px', textAlign: 'center', marginTop: 12, paddingBottom: 8 }}>
              Tap the target animal the moment it appears
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
                <p style={{ color: '#fb923c', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                  REACTION ANALYSIS
                </p>
                <h2 style={{ color: '#fff7ed', fontSize: '24px', margin: '0 0 4px', fontWeight: 400 }}>
                  {isGood ? '⚡ Alertness normal' : '🐢 Reaction slower than baseline'}
                </h2>
              </div>

              {/* Score circle */}
              <div className="relative mb-6">
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(251,146,60,0.12)" strokeWidth="8" />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="none"
                    stroke={isGood ? '#4ade80' : '#fb923c'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${finalScore * 4.4} 440`}
                    transform="rotate(-90 80 80)"
                    style={{ filter: `drop-shadow(0 0 8px ${isGood ? '#4ade80' : '#fb923c'})` }}
                  />
                  <text x="80" y="68" textAnchor="middle" fill={isGood ? '#4ade80' : '#fb923c'} fontSize="14">avg RT</text>
                  <text x="80" y="90" textAnchor="middle" fill={isGood ? '#4ade80' : '#fb923c'} fontSize="28" fontWeight="400">{finalAvg}ms</text>
                </svg>
              </div>

              {/* RT breakdown */}
              <div className="w-full mb-6">
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>Reaction Times</span>
                  <span style={{ color: 'rgba(255,237,213,0.5)', fontSize: '12px' }}>ms</span>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {rtListRef.current.map((rt, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: '12px',
                        background:
                          rt === MISS_TIMEOUT ? 'rgba(239,68,68,0.15)' :
                          rt <= 900 ? 'rgba(74,222,128,0.15)' :
                          rt <= 1300 ? 'rgba(251,146,60,0.15)' :
                          'rgba(239,68,68,0.15)',
                        color:
                          rt === MISS_TIMEOUT ? '#f87171' :
                          rt <= 900 ? '#4ade80' :
                          rt <= 1300 ? '#fb923c' :
                          '#f87171',
                        border: `1px solid ${
                          rt === MISS_TIMEOUT ? 'rgba(239,68,68,0.3)' :
                          rt <= 900 ? 'rgba(74,222,128,0.3)' :
                          rt <= 1300 ? 'rgba(251,146,60,0.3)' :
                          'rgba(239,68,68,0.3)'}`                      
                        }}
                    >
                      {rt === MISS_TIMEOUT ? 'miss' : rt}
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="w-full p-4 rounded-2xl mb-8"
                style={{ background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.15)' }}
              >
                <p style={{ color: 'rgba(255,237,213,0.7)', fontSize: '14px', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                  {isGood
                    ? 'Reaction time and alertness are within healthy mission parameters.'
                    : 'Reaction time is slightly slower than baseline. Consider rest and hydration before next assessment.'}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full">
                {/* Back to Menu (small) */}
                <button
                  onClick={() => {
                    setPhase('instructions');
                    setDifficulty('easy');
                    setAnimals([]);
                    rtListRef.current = [];
                    successfulRtListRef.current = [];
                    wrongClicksRef.current = 0;
                    missedTargetsRef.current = 0;
                  }}
                  className="px-4 py-3 rounded-2xl flex-shrink-0"
                  style={{
                    background: 'rgba(251,146,60,0.1)',
                    border: '1px solid rgba(251,146,60,0.25)',
                    color: '#fdba74',
                    fontSize: '13px'
                  }}
                >
                  Back
                </button>

                {/* Retry (BIG CENTER) */}
                <button
                  onClick={() => {
                    setPhase('countdown');
                    setAnimals([]);
                    rtListRef.current = [];
                    successfulRtListRef.current = [];
                    wrongClicksRef.current = 0;
                    missedTargetsRef.current = 0;
                  }}
                  className="flex-1 py-3 rounded-2xl active:scale-95 transition-transform"
                  style={{
                    background: 'linear-gradient(135deg, #15803d, #16a34a)',
                    border: '1px solid rgba(74,222,128,0.4)',
                    color: '#ecfdf5',
                    fontSize: '14px',
                    fontWeight: 500,
                    boxShadow: '0 0 25px rgba(74,222,128,0.25)'
                  }}
                >
                  Retry
                </button>

                {/* History (small) */}
                <button
                  onClick={() => setPhase('history')}
                  className="px-4 py-3 rounded-2xl flex-shrink-0"
                  style={{
                    background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.3)',
                    color: '#4ade80',
                    fontSize: '13px'
                  }}
                >
                  Performance History
                </button>

              </div>
            </motion.div>
          )}
        {phase === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 px-5"
          >
            <div className="mb-5 text-center">
              <p style={{ color: '#fb923c', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                PERFORMANCE HISTORY
              </p>
              <h1 style={{ color: '#fff7ed', fontSize: '22px', margin: '0 0 4px', fontWeight: 400 }}>
                Reaction Trend
              </h1>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: 'Sessions', value: allSessions.length, color: '#fb923c' },
                {
                  label: 'Best Score',
                  value: allSessions.length ? Math.max(...allSessions.map(s => s.score)) : 0,
                  color: '#4ade80'
                },
                {
                  label: 'Avg RT',
                  value: allSessions.length
                    ? `${Math.round(allSessions.reduce((sum, s) => sum + s.avgMs, 0) / allSessions.length)}ms`
                    : '0ms',
                  color: '#fbbf24'
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center py-3 rounded-2xl"
                  style={{
                    background: 'rgba(251,146,60,0.06)',
                    border: '1px solid rgba(251,146,60,0.12)'
                  }}
                >
                  <span style={{ color, fontSize: '20px', fontWeight: 500 }}>{value}</span>
                  <span style={{ color: 'rgba(255,237,213,0.45)', fontSize: '10px' }}>{label}</span>
                </div>
              ))}
            </div>

            {(() => {
              const chartSessions = allSessions.slice(-20);
              const scores = chartSessions.map(s => s.score);
              const maxScore = scores.length > 0 ? Math.max(...scores) : 100;
              const minScore = scores.length > 0 ? Math.min(...scores) : 0;
              const range = maxScore - minScore;

              const normalize = (score: number) =>
                scores.length < 2 || range === 0
                  ? 75
                  : 15 + ((score - minScore) / range) * 85;

              return (
                <div
                  className="rounded-2xl p-4 mb-5"
                  style={{
                    background: 'rgba(251,146,60,0.06)',
                    border: '1px solid rgba(251,146,60,0.12)'
                  }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <p style={{ color: 'rgba(255,237,213,0.5)', fontSize: '11px', margin: 0 }}>
                      Accuracy per session
                    </p>
                    {chartSessions.length > 1 && (
                      <span style={{ color: 'rgba(255,237,213,0.3)', fontSize: '9px' }}>
                        {minScore}–{maxScore} range
                      </span>
                    )}
                  </div>

                  {chartSessions.length === 0 ? (
                    <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'rgba(255,237,213,0.2)', fontSize: '12px' }}>No sessions yet</span>
                    </div>
                  ) : (
                    <div className="flex items-end gap-1.5" style={{ height: 90 }}>
                      {chartSessions.map((s, i) => {
                        const barH = normalize(s.score);
                        const isLatest = i === chartSessions.length - 1;
                        const barColor =
                          s.score >= 70 ? '#4ade80' :
                          s.score >= 45 ? '#fbbf24' :
                          '#f87171';

                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center justify-end"
                            style={{ height: '100%', position: 'relative' }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                top: -16,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                color: barColor,
                                fontSize: '9px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {s.score}
                            </span>

                            <div
                              style={{
                                width: '100%',
                                maxWidth: 14,
                                height: `${barH}%`,
                                minHeight: 4,
                                borderRadius: 4,
                                background: barColor,
                                opacity: isLatest ? 1 : 0.65,
                                boxShadow: isLatest ? `0 0 6px ${barColor}88` : 'none',
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between mt-2">
                    <span style={{ color: 'rgba(255,237,213,0.25)', fontSize: '9px' }}>Oldest</span>
                    <span style={{ color: 'rgba(255,237,213,0.25)', fontSize: '9px' }}>Latest</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex-1 overflow-y-auto" style={{ maxHeight: 200 }}>
              {allSessions.slice().reverse().slice(0, 15).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 mb-1.5 rounded-xl"
                  style={{
                    background: 'rgba(251,146,60,0.04)',
                    border: '1px solid rgba(251,146,60,0.08)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background:
                          s.score >= 70 ? 'rgba(74,222,128,0.15)' :
                          s.score >= 45 ? 'rgba(251,191,36,0.15)' :
                          'rgba(248,113,113,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          s.score >= 70 ? '#4ade80' :
                          s.score >= 45 ? '#fbbf24' :
                          '#f87171',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                    >
                      {s.score}
                    </div>

                    <div>
                      <p style={{ color: 'rgba(255,237,213,0.7)', fontSize: '12px', margin: 0 }}>
                        {s.difficulty} · {s.avgMs}ms avg RT
                      </p>
                      <p style={{ color: 'rgba(255,237,213,0.4)', fontSize: '10px', margin: 0 }}>
                        {new Date(s.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setPhase('result')}
                className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(135deg,#7c2d12,#c2410c)',
                  color: '#fff7ed',
                  fontSize: '15px',
                  border: '1px solid rgba(251,146,60,0.3)'
                }}
              >
                Back
              </button>

              <button
                onClick={() => {
                  setAllSessions([]);
                  saveSessions([]);
                  setPhase('result');
                }}
                className="py-4 px-5 rounded-2xl active:scale-95 transition-transform"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171',
                  fontSize: '13px'
                }}
              >
                Clear
              </button>
            </div>
  </motion.div>
)}
          
        </AnimatePresence>
      </div>
    </NatureLayout>
  );
}