import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

type Sound = {
  label: 'Rainfall' | 'Forest' | 'Ocean' | 'Jungle';
  icon: string;
};

const sounds: Record<Sound['label'], string> = {
  Forest: '/sounds/bird.mp3',
  Rainfall: '/sounds/rain.mp3',
  Ocean: '/sounds/ocean.mp3',
  Jungle: '/sounds/jungle.mp3',
};

type BreathPhase = 'idle' | 'in' | 'hold-in' | 'out' | 'hold-out';

interface PhaseConfig {
  name: BreathPhase;
  duration: number;
  label: string;
  scale: number;
}

const PHASES: PhaseConfig[] = [
  { name: 'in', duration: 4000, label: 'Breathe in', scale: 1.55 },
  { name: 'hold-in', duration: 4000, label: 'Hold', scale: 1.55 },
  { name: 'out', duration: 6000, label: 'Breathe out', scale: 1 },
  { name: 'hold-out', duration: 2000, label: 'Hold', scale: 1 },
];

export function MeditationScreen() {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPhase = PHASES[phaseIdx];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundList: Sound[] = [
    { label: 'Rainfall', icon: '🌧️' },
    { label: 'Forest', icon: '🌳' },
    { label: 'Ocean', icon: '🌊' },
    { label: 'Jungle', icon: '🐒' },
  ];

  const [active, setActive] = useState<Sound['label'] | null>(soundList[0].label);
  useEffect(() => {
    if (!audioRef.current) return;          
    audioRef.current.src = sounds[soundList[0].label];  
    audioRef.current.loop = true;           
    audioRef.current.play();                
  }, []);                                   
  const playSound = (label: Sound['label']) => {
    if (!audioRef.current) return;

    if (active === label) return; 

    audioRef.current.src = sounds[label];
    audioRef.current.loop = true;
    audioRef.current.play();

    setActive(label);
  };

  useEffect(() => {
    if (!started) return;

    setProgress(0);
    const startTime = Date.now();
    const dur = currentPhase.duration;

    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / dur, 1));
    }, 50);

    timerRef.current = setTimeout(() => {
      const nextIdx = (phaseIdx + 1) % PHASES.length;
      if (nextIdx === 0) setCycles((c) => c + 1);
      setPhaseIdx(nextIdx);
    }, dur);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [started, phaseIdx, currentPhase.duration]);

  const getScaleValue = () => {
    if (!started) return 1;
    return currentPhase.scale;
  };

  const getTransitionDuration = () => {
    if (currentPhase.name === 'in') return 4;
    if (currentPhase.name === 'out') return 6;
    return 0.5;
  };

  const getRingColor = () => {
    if (!started) return 'rgba(74,222,128,0.3)';
    if (currentPhase.name === 'in' || currentPhase.name === 'hold-in') return 'rgba(56,189,248,0.6)';
    return 'rgba(74,222,128,0.5)';
  };

  const getGlowColor = () => {
    if (!started) return 'rgba(74,222,128,0.15)';
    if (currentPhase.name === 'in' || currentPhase.name === 'hold-in') return 'rgba(56,189,248,0.2)';
    return 'rgba(74,222,128,0.2)';
  };

  return (
    <div
      className="relative w-full overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #040e0a 0%, #071812 35%, #060f09 60%, #040e07 100%)',
        height: '100dvh',
      }}
    >

      {/* Top: back button */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 z-30">
        <button
          onClick={() => navigate('/ecosystem')}
          className="flex items-center gap-2 px-4 py-3 rounded-2xl active:scale-95 transition-transform"
          style={{ background: 'rgba(4,14,10,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(74,222,128,0.18)' }}
        >
          <span style={{ color: '#86efac', fontSize: '14px' }}>← Back</span>
        </button>
        {cycles > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-2xl"
            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <span style={{ color: '#4ade80', fontSize: '12px' }}>🔄 {cycles}</span>
          </div>
        )}
      </div>

      <div className="absolute top-40 left-0 right-0 flex items-center justify-between px-5 pt-5 z-30">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.7 }}
          className="mt-12 flex flex-col gap-3"
        >
          <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="text-lg font-semibold text-blue-200"
          >
          <p style={{ color: '#4ade80', letterSpacing: '0.1em', margin: '0 0 6px' }}>Explore Different Sounds </p>
          </motion.h2>
          <audio ref={audioRef} />

          {soundList.map(({ label, icon }) => {
            const isActive = active === label;

            return (
              <motion.button
                key={label}
                onClick={() => playSound(label)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition
                  ${isActive
                    ? 'bg-green-400/20 ring-1 ring-green-300 text-green-200'
                    : 'hover:bg-gray-200/10 text-gray-100/70'}
                `}
              >
                <span style={{ fontSize: 20 }}>{icon}</span>
                <span style={{ fontSize: '10px', letterSpacing: '0.04em' }}>
                  {label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>   
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4"
        >
          <p style={{ color: '#4ade80', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 6px' }}>
            MINDFULNESS
          </p>
          <h1 style={{ color: '#d1fae5', fontSize: '32px', fontWeight: 300, margin: 0 }}>
            Breathe
          </h1>
        </motion.div>

        {/* Breathing circle */}
        <div className="relative flex items-center justify-center my-12" style={{ width: 260, height: 260 }}>
          {/* Outer glow ring */}
          <motion.div
            animate={{ scale: getScaleValue(), opacity: started ? 0.4 : 0.2 }}
            transition={{ duration: getTransitionDuration(), ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: 220, height: 220, borderRadius: '50%',
              background: getGlowColor(),
              filter: 'blur(20px)',
            }}
          />

          {/* Pulsing ring 1 */}
          <motion.div
            animate={{ scale: getScaleValue() * 1.15, opacity: started ? 0.25 : 0.1 }}
            transition={{ duration: getTransitionDuration(), ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: 200, height: 200, borderRadius: '50%',
              border: `1px solid ${getRingColor()}`,
            }}
          />

          {/* Pulsing ring 2 */}
          <motion.div
            animate={{ scale: getScaleValue() }}
            transition={{ duration: getTransitionDuration(), ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: 180, height: 180, borderRadius: '50%',
              border: `1.5px solid ${getRingColor()}`,
            }}
          />

          {/* Main circle */}
          <motion.div
            animate={{ scale: getScaleValue() }}
            transition={{ duration: getTransitionDuration(), ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: 140, height: 140, borderRadius: '50%',
              background: started
                ? (currentPhase.name === 'in' || currentPhase.name === 'hold-in'
                  ? 'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(56,189,248,0.08) 70%)'
                  : 'radial-gradient(circle, rgba(74,222,128,0.25) 0%, rgba(74,222,128,0.08) 70%)')
                : 'radial-gradient(circle, rgba(74,222,128,0.15) 0%, rgba(74,222,128,0.04) 70%)',
              border: `2px solid ${getRingColor()}`,
              boxShadow: started ? `0 0 40px ${getGlowColor()}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {/* Inner dot */}
            <motion.div
              animate={{ scale: getScaleValue() }}
              transition={{ duration: getTransitionDuration(), ease: 'easeInOut' }}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: started
                  ? (currentPhase.name === 'in' || currentPhase.name === 'hold-in'
                    ? 'rgba(56,189,248,0.6)' : 'rgba(74,222,128,0.6)')
                  : 'rgba(74,222,128,0.3)',
                boxShadow: started ? '0 0 16px currentColor' : 'none',
              }}
            />
          </motion.div>
        </div>

        {/* Phase label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={started ? currentPhase.name : 'idle'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <p
              style={{
                color: started
                  ? (currentPhase.name === 'in' || currentPhase.name === 'hold-in' ? '#7dd3fc' : '#86efac')
                  : 'rgba(209,250,229,0.5)',
                fontSize: '22px', fontWeight: 300, margin: 0, letterSpacing: '0.04em',
              }}
            >
              {started ? currentPhase.label : 'Ready when you are'}
            </p>
            {started && (
              <div
                className="mt-3 rounded-full overflow-hidden"
                style={{ width: 120, height: 3, background: 'rgba(255,255,255,0.08)', margin: '12px auto 0' }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    background: currentPhase.name === 'in' || currentPhase.name === 'hold-in'
                      ? 'rgba(56,189,248,0.7)' : 'rgba(74,222,128,0.7)',
                    borderRadius: 99,
                    transition: 'width 0.1s linear',
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Pattern info */}
        <div
          className="flex gap-4 mb-10"
          style={{ opacity: started ? 0.5 : 0.7 }}
        >
          {[
            { label: 'In', val: '4s', color: '#7dd3fc' },
            { label: 'Hold', val: '4s', color: '#e2e8f0' },
            { label: 'Out', val: '6s', color: '#86efac' },
            { label: 'Hold', val: '2s', color: '#e2e8f0' },
          ].map(({ label, val, color }, i) => (
            <div key={i} className="flex flex-col items-center">
              <span style={{ color, fontSize: '14px', fontWeight: 400 }}>{val}</span>
              <span style={{ color: 'rgba(209,250,229,0.4)', fontSize: '10px' }}>{label}</span>
            </div>
          ))}
        </div>

        {!started ? (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setStarted(true)}
            style={{
              width: 280, padding: '20px 0',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(20,83,45,0.4) 100%)',
              color: '#d1fae5', fontSize: '17px',
              border: '1.5px solid rgba(74,222,128,0.35)',
              boxShadow: '0 0 30px rgba(74,222,128,0.15)',
              cursor: 'pointer',
            }}
          >
            Begin Session
          </motion.button>
        ) : (
          <button
            onClick={() => { setStarted(false); setPhaseIdx(0); setCycles(0); }}
            style={{
              padding: '14px 32px',
              borderRadius: 16,
              background: 'rgba(74,222,128,0.08)',
              color: 'rgba(134,239,172,0.6)', fontSize: '14px',
              border: '1px solid rgba(74,222,128,0.15)',
              cursor: 'pointer',
            }}
          >
            End Session
          </button>
        )}

        <p
          style={{
            color: 'rgba(209,250,229,0.25)', fontSize: '12px',
            marginTop: 24, textAlign: 'center', lineHeight: 1.6, maxWidth: 240,
          }}
        >
          {cycles > 0 ? `${cycles} breath cycle${cycles > 1 ? 's' : ''} completed` : 'Breathing regulates the nervous system and supports cognitive clarity'}
        </p>
      </div>
    </div>
  );
}