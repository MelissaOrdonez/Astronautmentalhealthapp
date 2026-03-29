import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Wind } from 'lucide-react';

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full flex flex-col items-center"
      style={{
        height: '100dvh',
        background: `radial-gradient(circle at 20% 30%, rgba(57,255,20,0.03), transparent 50%),
                     radial-gradient(circle at 80% 70%, rgba(0,255,255,0.03), transparent 50%),
                     linear-gradient(135deg, #0a0a0a, #1a0f2b)`,
      }}
    >
      {/* Breathe button top-right */}
      <motion.button
        onClick={() => navigate('/meditation')}
        whileTap={{ scale: 0.94 }}
        animate={{
          boxShadow: ['0 0 10px #80FF80', '0 0 20px #80FF80', '0 0 10px #80FF80'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="flex items-center gap-3 px-6 py-5 rounded-3xl absolute top-6 right-6"
        style={{
          background: '#0A3D0A',
          border: '2px solid #80FF80',
        }}
      >
        <Wind size={28} color="#80FF80" />
        <span style={{ color: '#80FF80', fontSize: '18px', fontWeight: 800 }}>Breathe</span>
      </motion.button>

      {/* Canopy effect: glowing circles */}
      <div className="absolute w-full h-full top-0 left-0 pointer-events-none">
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

      {/* Game Nodes */}
      <GameNode
        label="Mind Garden"
        imageSrc="/images/plant.png"
        onClick={() => navigate('/memory')}
        color="#80FF80" // soft lime
        style={{ bottom: '35%', left: '25%' }}
      />
      <GameNode
        label="Habitat Match"
        imageSrc="/images/deer.png"
        onClick={() => navigate('/reaction')}
        color="#FF99CC" // soft pink
        style={{ bottom: '35%', right: '25%' }}
      />
      <GameNode
        label="Stone Stacking"
        imageSrc="/images/stone.png"
        onClick={() => navigate('/focus')}
        color="#66FFFF" // soft cyan
        style={{ bottom: '50%', left: '38%' }}
      />
      <GameNode
        label="Maze Navigator"
        imageSrc="/images/bird.png"
        onClick={() => navigate('/cognitive')}
        color="#CC99FF" // soft violet
        style={{ bottom: '50%', right: '38%' }}
      />

      {/* Root: Health Dashboard */}
      <motion.button
        onClick={() => navigate('/dashboard')}
        whileTap={{ scale: 0.96 }}
        className="w-2/3 flex flex-col items-center justify-center rounded-3xl absolute bottom-8"
        style={{
          height: 160,
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