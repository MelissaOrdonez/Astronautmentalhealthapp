import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Wind } from 'lucide-react';

function HotspotButton({ label, onClick, style, icon }: {
  label: string;
  onClick: () => void;
  style: React.CSSProperties;
  icon?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="absolute flex flex-col items-center active:scale-95 transition-transform"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...style }}
    >
      <div style={{
        width: 80, height: 80,
        background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
        // borderRadius: 14,
        // border: '1.5px solid rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'visible',
      }}>
        {icon && (
          <img
            src={icon}
            alt={label}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}
      </div>
      <span style={{
        marginTop: 5,
        background: 'rgba(0,0,0,0.52)',
        backdropFilter: 'blur(6px)',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: 20,
        letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </button>
  );
}

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

      {/* Memory — over the left tree cluster */}
      <HotspotButton
        label="Memory"
        onClick={() => navigate('/memory')}
        style={{ left: '7%', top: '32%' }}
        icon="/images/plant.png"
      />

      {/* Reaction — over the moose drinking at the water's edge */}
      <HotspotButton
        label="Reaction"
        onClick={() => navigate('/reaction')}
        style={{ left: '30%', top: '52%' }}
        icon="/images/deer.png"
      />

      {/* Focus — over the river / lake */}
      <HotspotButton
        label="Focus"
        onClick={() => navigate('/focus')}
        style={{ left: '50%', top: '64%', transform: 'translateX(-50%)' }}
        icon="/images/stone.png"
      />

      {/* Your Health — over the human figure (center clearing) */}
      <HotspotButton
        label="Your Health"
        onClick={() => navigate('/dashboard')}
        style={{ left: '50%', top: '44%', transform: 'translateX(-50%)' }}
        icon="/images/dashboard.png"
      />

      {/* Cognitive Load — over the right-side rocks / boulder area */}
      <HotspotButton
        label="Cog. Load"
        onClick={() => navigate('/cognitive')}
        style={{ right: '7%', top: '52%' }}
        icon="/images/bird.png"
      />

      {/* Top header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5 z-20">
        <button
          onClick={() => navigate('/meditation')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-2xl active:scale-95 transition-transform"
          style={{
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <Wind size={16} color="#fff" />
          <span style={{ color: '#fff', fontSize: '12px' }}>Breathe</span>
        </button>
      </div>

      {/* Day indicator */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
        <span style={{ color: '#fff', fontSize: '12px', letterSpacing: '0.05em' }}>
          Day 47 · Tap an element to begin
        </span>
      </div>
    </motion.div>
  );
}