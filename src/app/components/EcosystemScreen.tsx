import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Wind } from 'lucide-react';
import { useRef, useEffect } from 'react';

function GameNode({
  label,
  imageSrc,
  onClick,
  color,
  style,
}: {
  label: string;
  imageSrc: string;
  onClick: () => void;
  color: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      className="flex flex-col items-center absolute"
      style={{ width: 140, ...style }}
    >
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 999,
          background: `${color}20`,
          border: `3px solid ${color}50`,
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 15px ${color}40`,
          overflow: 'hidden',
        }}
      >
        <img
          src={imageSrc}
          alt={label}
          style={{ width: '80%', height: '80%', objectFit: 'contain' }}
        />
      </div>
      <span
        style={{
          marginTop: 12,
          color: '#fefcf6',
          fontSize: '22px',
          fontWeight: 700,
          textAlign: 'center',
        }}
      >
        {label}
      </span>
    </motion.button>
  );
}

export function EcosystemScreen() {
  const navigate = useNavigate();

  // Ref for drifting stars animation
  const starFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!starFieldRef.current) return;

    const starLayer = starFieldRef.current;
    let posX = 0;
    let posY = 0;

    const animate = () => {
      posX += 0.02; // slow horizontal drift
      posY += 0.01; // slow vertical drift
      starLayer.style.transform = `translate(${posX}px, ${posY}px)`;
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  // Generate random stars
  const stars = Array.from({ length: 550 }).map((_, i) => {
    const top = Math.random() * 100;
    const left = Math.random() * 100;
    const size = Math.random() * 2 + 1; // 1px to 3px
    const opacity = Math.random() * 0.8 + 0.2; // 0.2 to 1
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: `${top}%`,
          left: `${left}%`,
          width: size,
          height: size,
          borderRadius: '50%',
          background: `rgba(255,255,255,${opacity})`,
        }}
      />
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-screen overflow-hidden flex flex-col items-center"
    >
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #0a0a0a, #1a0f2b)' }}
      />

      {/* Glowing canopy circles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${5 + i * 9}%`,
              left: `${10 + i * 8}%`,
              width: 50 + i * 15,
              height: 50 + i * 15,
              borderRadius: '50%',
              background: i % 2 === 0 ? 'rgba(57,255,20,0.08)' : 'rgba(0,255,255,0.06)',
              filter: 'blur(20px)',
            }}
          />
        ))}
      </div>

      {/* Randomized starfield */}
      <motion.div
        ref={starFieldRef}
        className="absolute inset-0 pointer-events-none"
      >
        {stars}
      </motion.div>

      {/* Breathe button top-right */}
      <motion.button
        onClick={() => navigate('/meditation')}
        whileTap={{ scale: 0.94 }}
        animate={{
          boxShadow: ['0 0 10px #80FF80', '0 0 20px #80FF80', '0 0 10px #80FF80'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-3 px-6 py-5 rounded-3xl absolute top-6 right-6"
        style={{ background: '#0A3D0A', border: '2px solid #80FF80' }}
      >
        <Wind size={28} color="#80FF80" />
        <span style={{ color: '#80FF80', fontSize: '18px', fontWeight: 800 }}>Breathe</span>
      </motion.button>

      {/* Game Nodes */}
      <GameNode
        label="Mind Garden"
        imageSrc="/images/plant.png" 
        onClick={() => navigate('/memory')}
        color="#fbffa1" // soft yellow
        style={{ bottom: '35%', left: '25%' }}
      />
      <GameNode
        label="Habitat Match"
        imageSrc="/images/deer.png"
        onClick={() => navigate('/reaction')}
        color="#FF5C00" // soft orange
        style={{ bottom: '35%', right: '25%' }}
      />
      <GameNode
        label="Stone Stacking"
        imageSrc="/images/earth.png"
        onClick={() => navigate('/focus')}
        color="#35a0e7"
        style={{ bottom: '50%', left: '38%' }}
      />
      <GameNode
        label="Maze Navigator"
        imageSrc="/images/spaceman.png"
        onClick={() => navigate('/cognitive')}
        color="#CC99FF"
        style={{ bottom: '50%', right: '38%' }}
      />

      {/* Root: Health Dashboard */}
      <motion.button
        onClick={() => navigate('/dashboard')}
        whileTap={{ scale: 0.96 }}
        className="w-2/3 flex flex-col items-center justify-center rounded-3xl absolute bottom-8"
        style={{
          height: 160,
          width: 400,
          background: '#220022', // dark purple
          border: '3px solid #CC99FF',
          boxShadow: '0 0 15px #CC99FF',
          fontSize: 24,
        }}
      >
        <img
          src="/images/dashboard.png"
          alt="Health Dashboard"
          style={{ width: 80, height: 80, marginBottom: 12 }}
        />
        <span style={{ color: '#FFCCFF', fontSize: '22px', fontWeight: 800 }}>
          Health Dashboard
        </span>
      </motion.button>
    </motion.div>
  );
}