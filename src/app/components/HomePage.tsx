import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';

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

      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/images/Earth2.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
          className="text-center mb-3"
        >
          <h1
            style={{
              color: '#f0f9ff', fontSize: '80px', letterSpacing: '0.12em',
              fontWeight: 500, textShadow: '0 0 24px rgba(56,189,248,0.35)',
              margin: 0,
            }}
          >
            Root2Stars
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
            color: '(0,0,0)', fontSize: '25px',
            textAlign: 'center', lineHeight: 1.65, marginBottom: 20,
            maxWidth: 340,
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          Stay grounded, 
            even in deep space.
        </motion.p>

        {/* Mission badge */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="mb-10 flex items-center gap-3 px-5 py-3 rounded-2xl"
          style={{
            background: 'rgba(164, 220, 245, 0.5)',
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
          <span style={{ color: '#000000', fontSize: '15px', letterSpacing: '0.06em' }}>
            Mission Day 67 · ISS Orbit
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
            color: '#fff', fontSize: '20px', letterSpacing: '0.04em',
            border: 'none', cursor: 'pointer',
          }}
        >
          Start Daily Session
        </motion.button>

        {/* Footer */}
      </div>
    </motion.div>
  );
}