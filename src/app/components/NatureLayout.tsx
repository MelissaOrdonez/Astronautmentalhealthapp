import React from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface NatureLayoutProps {
  children: React.ReactNode;
  backTo?: string;
  showBack?: boolean;
}

export function NatureLayout({ children, backTo = '/ecosystem', showBack = true }: NatureLayoutProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
      className="relative w-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #071812 0%, #0a1e14 25%, #081508 55%, #0a1a0c 100%)',
        height: '100dvh',
        overflow: 'hidden',
      }}
    >
      {/* Ambient forest glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-52 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      {/* Ground glow bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-40 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(20,83,45,0.18) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Subtle leaf particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none rounded-full opacity-20"
          style={{
            width: 4,
            height: 4,
            background: '#4ade80',
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 15}%`,
            animation: `floatParticle ${4 + i * 0.8}s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {showBack && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center p-4">
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl active:scale-95 transition-transform"
            style={{
              background: 'rgba(7, 24, 18, 0.75)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(74,222,128,0.18)',
            }}
          >
            <ChevronLeft size={20} color="#4ade80" />
            <span style={{ color: '#86efac', fontSize: '14px' }}>Back</span>
          </button>
        </div>
      )}

      {children}
    </motion.div>
  );
}