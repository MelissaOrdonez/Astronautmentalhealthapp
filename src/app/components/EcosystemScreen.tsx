import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Activity, Wind } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Memory', emoji: '🌳', path: '/memory', left: '8%', top: '38%', color: '#4ade80' },
  { label: 'Focus', emoji: '🌊', path: '/focus', left: '52%', top: '67%', color: '#38bdf8' },
  { label: 'Reaction', emoji: '🐾', path: '/reaction', left: '72%', top: '50%', color: '#fb923c' },
  { label: 'Cognitive\nLoad', emoji: '🪨', path: '/cognitive', left: '10%', top: '70%', color: '#a78bfa' },
];

export function EcosystemScreen() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative w-full overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/images/ecosystem-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* ——— INTERACTIVE OVERLAY ELEMENTS ——— */}

      {/* Memory (Trees — left) */}
      <button
        onClick={() => navigate('/memory')}
        className="absolute flex flex-col items-center gap-1 active:scale-95 transition-transform"
        style={{ left: '6%', top: '34%' }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
            background: 'rgba(10,30,16,0.55)', backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(74,222,128,0.3)',
            boxShadow: '0 0 20px rgba(74,222,128,0.12)',
          }}
        >
          🌳
        </div>
        <span
          style={{
            background: 'rgba(74,222,128,0.18)', color: '#86efac',
            fontSize: '11px', padding: '2px 10px', borderRadius: 20,
            border: '1px solid rgba(74,222,128,0.25)', backdropFilter: 'blur(6px)',
          }}
        >
          Memory
        </span>
      </button>

      {/* Focus (River — center) */}
      <button
        onClick={() => navigate('/focus')}
        className="absolute flex flex-col items-center gap-1 active:scale-95 transition-transform"
        style={{ left: '50%', top: '62%', transform: 'translateX(-50%)' }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
            background: 'rgba(10,20,30,0.55)', backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(56,189,248,0.3)',
            boxShadow: '0 0 20px rgba(56,189,248,0.12)',
          }}
        >
          🌊
        </div>
        <span
          style={{
            background: 'rgba(56,189,248,0.18)', color: '#7dd3fc',
            fontSize: '11px', padding: '2px 10px', borderRadius: 20,
            border: '1px solid rgba(56,189,248,0.25)', backdropFilter: 'blur(6px)',
          }}
        >
          Focus
        </span>
      </button>

      {/* Reaction (Animal — right) */}
      <button
        onClick={() => navigate('/reaction')}
        className="absolute flex flex-col items-center gap-1 active:scale-95 transition-transform"
        style={{ right: '6%', top: '45%' }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
            background: 'rgba(30,20,10,0.55)', backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(251,146,60,0.3)',
            boxShadow: '0 0 20px rgba(251,146,60,0.1)',
          }}
        >
          🐾
        </div>
        <span
          style={{
            background: 'rgba(251,146,60,0.18)', color: '#fdba74',
            fontSize: '11px', padding: '2px 10px', borderRadius: 20,
            border: '1px solid rgba(251,146,60,0.25)', backdropFilter: 'blur(6px)',
          }}
        >
          Reaction
        </span>
      </button>

      {/* Cognitive Load (Rocks — bottom left) */}
      <button
        onClick={() => navigate('/cognitive')}
        className="absolute flex flex-col items-center gap-1 active:scale-95 transition-transform"
        style={{ left: '5%', top: '67%' }}
      >
        <div
          style={{
            width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 36,
            background: 'rgba(20,15,30,0.55)', backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(167,139,250,0.3)',
            boxShadow: '0 0 20px rgba(167,139,250,0.1)',
          }}
        >
          🪨
        </div>
        <span
          style={{
            background: 'rgba(167,139,250,0.18)', color: '#c4b5fd',
            fontSize: '11px', padding: '2px 10px', borderRadius: 20,
            border: '1px solid rgba(167,139,250,0.25)', backdropFilter: 'blur(6px)',
            whiteSpace: 'nowrap',
          }}
        >
          Cog. Load
        </span>
      </button>

      {/* Your Health (Human — center) */}
      <button
        onClick={() => navigate('/dashboard')}
        className="absolute flex flex-col items-center gap-1 active:scale-95 transition-transform"
        style={{ left: '50%', top: '44%', transform: 'translateX(-50%)' }}
      >
        <div
          style={{
            width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(14,165,233,0.12)', backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(56,189,248,0.4)',
            boxShadow: '0 0 24px rgba(56,189,248,0.2)',
          }}
        >
          <Activity size={28} color="#38bdf8" />
        </div>
        <span
          style={{
            background: 'rgba(56,189,248,0.18)', color: '#7dd3fc',
            fontSize: '11px', padding: '2px 10px', borderRadius: 20,
            border: '1px solid rgba(56,189,248,0.3)', backdropFilter: 'blur(6px)',
          }}
        >
          Your Health
        </span>
      </button>

      {/* Top header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 z-20">
        <div>
          <p style={{ color: '#4ade80', fontSize: '11px', letterSpacing: '0.08em', margin: 0 }}>ECOSYSTEM</p>
          <h2 style={{ color: '#d1fae5', fontSize: '18px', margin: 0, fontWeight: 400 }}>Your Environment</h2>
        </div>
        <button
          onClick={() => navigate('/meditation')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl active:scale-95 transition-transform"
          style={{
            background: 'rgba(7,24,18,0.7)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(74,222,128,0.2)',
          }}
        >
          <Wind size={16} color="#4ade80" />
          <span style={{ color: '#86efac', fontSize: '12px' }}>Breathe</span>
        </button>
      </div>

      {/* Day indicator */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(6,14,10,0.75)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(74,222,128,0.15)',
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
        <span style={{ color: '#86efac', fontSize: '12px', letterSpacing: '0.05em' }}>
          Day 47 · Tap an element to begin
        </span>
      </div>

      {/* Ambient light animation styles */}
      <style>{`
        @keyframes ecosystemGlow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </motion.div>
  );
}