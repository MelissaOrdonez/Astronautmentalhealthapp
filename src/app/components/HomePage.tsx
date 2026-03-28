import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { StarField } from './StarField';

export function HomePage() {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);

  const handleStart = () => {
    setLaunching(true);
    setTimeout(() => navigate('/ecosystem'), 1100);
  };

  return (
    <motion.div
      className="relative w-full overflow-hidden flex flex-col"
      style={{ background: 'linear-gradient(180deg, #020210 0%, #05051e 35%, #080828 65%, #030316 100%)', height: '100dvh' }}
      animate={{ opacity: launching ? 0 : 1 }}
      transition={{ duration: launching ? 1.1 : 0 }}
    >
      <StarField />

      {/* Nebula blobs */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '18%', left: '10%', width: 220, height: 180,
          background: 'radial-gradient(ellipse, rgba(109,40,217,0.14) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '28%', right: '5%', width: 180, height: 160,
          background: 'radial-gradient(ellipse, rgba(6,182,212,0.1) 0%, transparent 70%)',
          filter: 'blur(28px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '5%', left: '50%', transform: 'translateX(-50%)', width: 260, height: 120,
          background: 'radial-gradient(ellipse, rgba(34,197,94,0.12) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Distant planet */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 56, right: 28, width: 52, height: 52, borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 32%, #3730a3 0%, #1e1b4b 60%, #0d0b24 100%)',
          boxShadow: '0 0 24px rgba(99,102,241,0.25), inset -6px -4px 12px rgba(0,0,0,0.5)',
          opacity: 0.55,
        }}
      />
      {/* Planet ring */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 74, right: 14, width: 80, height: 16,
          border: '1.5px solid rgba(99,102,241,0.2)',
          borderRadius: '50%',
          transform: 'rotate(-15deg)',
          opacity: 0.35,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* Helmet icon */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 90 }}
          className="mb-10"
        >
          <div
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, #1e3a5f 0%, #080828 100%)',
              border: '1.5px solid rgba(56,189,248,0.35)',
              boxShadow: '0 0 36px rgba(56,189,248,0.18), inset 0 0 20px rgba(56,189,248,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="19" fill="rgba(56,189,248,0.08)" stroke="rgba(56,189,248,0.5)" strokeWidth="1.5" />
              <ellipse cx="24" cy="26" rx="11" ry="13" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.35)" strokeWidth="1" />
              <path d="M17 26 Q24 22 31 26" stroke="rgba(148,223,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              <circle cx="24" cy="17" r="2.5" fill="rgba(200,240,255,0.55)" />
              <path d="M5 24 Q5 8 24 8 Q43 8 43 24" stroke="rgba(56,189,248,0.3)" strokeWidth="1" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="text-center mb-3"
        >
          <h1
            style={{
              color: '#f0f9ff', fontSize: '30px', letterSpacing: '0.12em',
              fontWeight: 300, textShadow: '0 0 24px rgba(56,189,248,0.35)',
              margin: 0,
            }}
          >
            TERRA MIND
          </h1>
          <div
            style={{
              width: 56, height: 1, margin: '10px auto 0',
              background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.7), transparent)',
            }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          style={{
            color: 'rgba(186,230,253,0.65)', fontSize: '15px',
            textAlign: 'center', lineHeight: 1.65, marginBottom: 48,
            maxWidth: 240,
          }}
        >
          Understand your mind through nature
        </motion.p>

        {/* Mission badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mb-10 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: 'rgba(56,189,248,0.07)',
            border: '1px solid rgba(56,189,248,0.18)',
          }}
        >
          <div
            style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 10px #4ade80',
            }}
          />
          <span style={{ color: '#bae6fd', fontSize: '12px', letterSpacing: '0.06em' }}>
            Mission Day 47 · ISS Orbit
          </span>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          style={{
            width: '100%', maxWidth: 300, padding: '20px 0',
            borderRadius: 20,
            background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            boxShadow: '0 0 36px rgba(14,165,233,0.28), 0 6px 24px rgba(0,0,0,0.5)',
            color: '#fff', fontSize: '17px', letterSpacing: '0.04em',
            border: 'none', cursor: 'pointer',
          }}
        >
          🚀 Start Daily Session
        </motion.button>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.7 }}
          className="mt-12 flex gap-8"
        >
          {[
            { label: 'Memory', icon: '🌳' },
            { label: 'Focus', icon: '🌊' },
            { label: 'Reaction', icon: '🐾' },
            { label: 'Load', icon: '🪨' },
          ].map(({ label, icon }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ color: 'rgba(186,230,253,0.35)', fontSize: '10px', letterSpacing: '0.04em' }}>
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          style={{ color: '#7dd3fc', fontSize: '11px', marginTop: 36, textAlign: 'center', letterSpacing: '0.05em' }}
        >
          NASA Mental Performance Program · Confidential
        </motion.p>
      </div>
    </motion.div>
  );
}