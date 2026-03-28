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
      style={{ background: 'linear-gradient(180deg, #06141a 0%, #0a1e14 30%, #081508 60%, #060e06 100%)', height: '100dvh' }}
    >
      {/* SVG Ecosystem Scene */}
      <svg
        viewBox="0 0 390 780"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c7e8d4" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#8ecfaf" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="humanGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="riverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0e4a6a" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#0a3550" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#082a40" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0a1f0a" />
            <stop offset="100%" stopColor="#060e06" />
          </linearGradient>
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Sky */}
        <rect width="390" height="780" fill="url(#groundGrad)" />

        {/* Stars (faint — nature twilight) */}
        {[
          [42, 48], [88, 32], [130, 58], [172, 28], [210, 52], [255, 36], [298, 62], [340, 42],
          [65, 80], [155, 72], [240, 88], [315, 75], [370, 55], [20, 90], [180, 95],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.2 : 0.7} fill="rgba(200,240,200,0.35)" />
        ))}

        {/* Moon */}
        <circle cx="318" cy="64" r="44" fill="url(#moonGlow)" />
        <circle cx="318" cy="64" r="24" fill="#c8e8d0" opacity="0.25" />
        <circle cx="318" cy="64" r="18" fill="#d4edda" opacity="0.18" />
        {/* Moon craters */}
        <circle cx="312" cy="60" r="3.5" fill="rgba(0,0,0,0.08)" />
        <circle cx="322" cy="68" r="2.5" fill="rgba(0,0,0,0.06)" />
        <circle cx="316" cy="70" r="1.8" fill="rgba(0,0,0,0.05)" />

        {/* Distant mountains (back) */}
        <path
          d="M0,320 L55,215 L110,255 L165,195 L220,238 L275,182 L330,220 L390,195 L390,780 L0,780 Z"
          fill="#07120a"
        />
        {/* Mid mountains */}
        <path
          d="M0,368 L70,262 L130,298 L185,252 L240,285 L295,255 L350,278 L390,262 L390,780 L0,780 Z"
          fill="#091608"
        />
        {/* Front ridge */}
        <path
          d="M0,420 Q50,405 100,418 Q150,432 200,415 Q260,398 320,416 Q360,426 390,412 L390,780 L0,780 Z"
          fill="#0a1c09"
        />

        {/* Ground plane */}
        <path
          d="M0,470 Q100,458 200,468 Q300,478 390,464 L390,780 L0,780 Z"
          fill="#081508"
        />
        <path
          d="M0,510 Q80,500 160,512 Q240,524 320,510 L390,505 L390,780 L0,780 Z"
          fill="#060e06"
        />

        {/* === TREES LEFT (Memory zone) === */}
        {/* Tree cluster left */}
        {/* Tree 1 */}
        <rect x="42" y="350" width="9" height="36" rx="2" fill="#1a1005" />
        <polygon points="20,350 46,265 72,350" fill="#0b1f06" />
        <polygon points="18,320 46,248 74,320" fill="#0d2408" />
        <polygon points="22,295 46,232 70,295" fill="#0f2809" />
        {/* Tree 2 */}
        <rect x="78" y="360" width="8" height="32" rx="2" fill="#1a1005" />
        <polygon points="58,360 82,285 106,360" fill="#0a1c05" />
        <polygon points="56,334 82,268 108,334" fill="#0c2207" />
        <polygon points="60,310 82,254 104,310" fill="#0e2608" />
        {/* Tree 3 (smaller) */}
        <rect x="28" y="390" width="7" height="25" rx="2" fill="#160e04" />
        <polygon points="12,390 31,328 50,390" fill="#091a05" />
        <polygon points="10,368 31,314 52,368" fill="#0b2006" />
        {/* Tree 4 right of cluster */}
        <rect x="110" y="370" width="7" height="28" rx="2" fill="#160e04" />
        <polygon points="96,370 113,308 130,370" fill="#0c2007" />
        <polygon points="94,348 113,294 132,348" fill="#0e2508" />

        {/* === TREES RIGHT === */}
        {/* Tree 5 */}
        <rect x="310" y="340" width="9" height="34" rx="2" fill="#1a1005" />
        <polygon points="290,340 314,260 338,340" fill="#0b1f06" />
        <polygon points="288,314 314,244 340,314" fill="#0d2408" />
        <polygon points="292,290 314,228 336,290" fill="#0f2809" />
        {/* Tree 6 */}
        <rect x="348" y="355" width="8" height="30" rx="2" fill="#1a1005" />
        <polygon points="330,355 352,278 374,355" fill="#0a1c05" />
        <polygon points="328,330 352,262 376,330" fill="#0c2207" />
        {/* Tree 7 */}
        <rect x="280" y="375" width="7" height="25" rx="2" fill="#160e04" />
        <polygon points="265,375 283,318 301,375" fill="#091a05" />
        <polygon points="263,355 283,304 303,355" fill="#0b2006" />

        {/* === CENTER CLEARING === */}
        {/* Soft glow on ground */}
        <ellipse cx="195" cy="530" rx="90" ry="28" fill="rgba(34,197,94,0.04)" />

        {/* === RIVER (Focus zone) === */}
        <path
          d="M155,590 Q185,578 220,590 Q255,602 290,585 Q325,568 360,582 Q375,588 390,583 L390,635 Q368,642 345,628 Q310,613 275,630 Q240,647 205,632 Q170,617 140,632 Q110,647 80,634 Q50,620 20,635 L0,638 L0,592 Q28,580 58,594 Q90,608 120,594 Q140,583 155,590 Z"
          fill="url(#riverGrad)"
        />
        {/* River surface shimmer */}
        <path d="M80,610 Q110,605 140,610 Q170,615 200,609" stroke="rgba(56,189,248,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M210,618 Q245,612 280,618 Q310,623 340,617" stroke="rgba(56,189,248,0.2)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M45,622 Q70,618 95,622" stroke="rgba(56,189,248,0.18)" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* === ROCKS (Cognitive Load zone) === */}
        <ellipse cx="72" cy="660" rx="36" ry="17" fill="#252018" />
        <ellipse cx="48" cy="668" rx="22" ry="13" fill="#2a2318" />
        <ellipse cx="96" cy="665" rx="26" ry="15" fill="#221e15" />
        <ellipse cx="70" cy="655" rx="18" ry="10" fill="#2e2820" />
        <ellipse cx="55" cy="658" rx="14" ry="8" fill="#302a22" />
        {/* Rock highlights */}
        <path d="M50,651 Q62,645 75,651" stroke="rgba(160,148,120,0.2)" strokeWidth="1" fill="none" />
        <path d="M80,657 Q92,652 102,657" stroke="rgba(160,148,120,0.15)" strokeWidth="1" fill="none" />

        {/* === DEER / ANIMAL (Reaction zone) === */}
        {/* Body */}
        <ellipse cx="295" cy="660" rx="22" ry="12" fill="#4a3820" />
        {/* Head */}
        <circle cx="314" cy="648" r="9" fill="#4a3820" />
        {/* Snout */}
        <ellipse cx="321" cy="651" rx="5" ry="3.5" fill="#3a2a14" />
        {/* Eye */}
        <circle cx="316" cy="646" r="1.5" fill="#120c06" />
        <circle cx="316.4" cy="645.6" r="0.5" fill="rgba(255,255,255,0.5)" />
        {/* Ears */}
        <ellipse cx="310" cy="641" rx="3.5" ry="5.5" fill="#3a2c18" transform="rotate(-20, 310, 641)" />
        <ellipse cx="317" cy="641" rx="3" ry="5" fill="#3a2c18" transform="rotate(15, 317, 641)" />
        {/* Legs */}
        <rect x="279" y="670" width="5" height="22" rx="2.5" fill="#3a2c18" />
        <rect x="288" y="671" width="5" height="22" rx="2.5" fill="#3a2c18" />
        <rect x="300" y="671" width="5" height="22" rx="2.5" fill="#3a2c18" />
        <rect x="309" y="670" width="5" height="22" rx="2.5" fill="#3a2c18" />
        {/* Antlers */}
        <path d="M311 641 L309 628 L305 620 M309 628 L313 622 M311 641 L315 626 L319 618 M315 626 L320 622" stroke="#3a2a14" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* Tail */}
        <ellipse cx="276" cy="657" rx="6" ry="4" fill="#5a4428" />

        {/* === HUMAN FIGURE (Dashboard) === */}
        {/* Glow aura */}
        <circle cx="196" cy="505" r="36" fill="url(#humanGlow)" />
        {/* Shadow */}
        <ellipse cx="196" cy="552" rx="18" ry="5" fill="rgba(0,0,0,0.3)" />
        {/* Legs */}
        <rect x="189" y="532" width="6" height="22" rx="3" fill="#2a3d50" />
        <rect x="199" y="532" width="6" height="22" rx="3" fill="#2a3d50" />
        {/* Body */}
        <rect x="185" y="510" width="22" height="24" rx="8" fill="#2d4560" />
        {/* Backpack */}
        <rect x="178" y="513" width="9" height="18" rx="4" fill="#1e3248" />
        {/* Arms */}
        <path d="M185,518 L175,530" stroke="#2a3d50" strokeWidth="5" strokeLinecap="round" />
        <path d="M207,518 L216,528" stroke="#2a3d50" strokeWidth="5" strokeLinecap="round" />
        {/* Head */}
        <circle cx="196" cy="504" r="11" fill="#2d4560" />
        {/* Helmet visor */}
        <ellipse cx="196" cy="505" rx="7" ry="8" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.5)" strokeWidth="1" />
        {/* Visor glint */}
        <path d="M191,501 Q194,499 197,501" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />

        {/* Grass tufts */}
        {[140, 160, 230, 250, 170, 215].map((x, i) => (
          <g key={i}>
            <path d={`M${x},${560 + (i % 3) * 8} Q${x - 4},${548 + (i % 3) * 8} ${x - 7},${542 + (i % 3) * 8}`} stroke="#0f2a0a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M${x},${560 + (i % 3) * 8} Q${x + 2},${548 + (i % 3) * 8} ${x + 5},${543 + (i % 3) * 8}`} stroke="#102e0b" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g>
        ))}

        {/* Fireflies */}
        {[
          [130, 440], [175, 420], [220, 450], [260, 430], [155, 460], [240, 410],
        ].map(([x, y], i) => (
          <circle
            key={`ff-${i}`}
            cx={x}
            cy={y}
            r="2"
            fill="#86efac"
            opacity="0.55"
            style={{ filter: 'blur(0.5px)' }}
          />
        ))}
      </svg>

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