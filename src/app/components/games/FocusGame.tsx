import { useState, useRef, useEffect, useCallback } from 'react';
import { NatureLayout } from '../NatureLayout';
import { useGameContext } from '../../context/GameContext';

// ─── Types ─────────────────────────────────────────────────────────────────────

type StoneDef   = { w: number; h: number; rx: number; label: string; mass: number };
type Stone      = StoneDef & { id: number; colorIdx: number };
type PlacedStone = Stone & { cx: number; cy: number };
type Phase = 'instructions' | 'pick' | 'drag' | 'shake' | 'end' | 'result' | 'history';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TARGET_H          = 400;
const GROUND_Y          = 460;   // moved up to give pile more room
const PILE_X            = 80;    // wider from edge so stones are fully visible
const PILE_SPACING      = 58;    // vertical gap between pile stones
const STACK_CENTER      = 310;
const BALANCE_TOLERANCE = 40;
const CANVAS_W          = 480;
const CANVAS_H          = 520;
const HIT_PAD           = 16;    // generous hit zone padding

const STONE_DEFS: StoneDef[] = [
  { w: 70, h: 22, rx: 10, label: 'flat slab',    mass: 3   },
  { w: 52, h: 30, rx: 14, label: 'round pebble', mass: 2   },
  { w: 80, h: 18, rx:  8, label: 'long plate',   mass: 4   },
  { w: 44, h: 36, rx: 18, label: 'tall chunk',   mass: 2   },
  { w: 60, h: 24, rx: 12, label: 'oval stone',   mass: 2.5 },
  { w: 68, h: 20, rx:  9, label: 'wide stone',   mass: 3   },
];

const STONE_COLORS = ['#38bdf8','#0ea5e9','#22d3ee','#7dd3fc','#38bdf8','#0ea5e9'];

// ─── Pure helpers ──────────────────────────────────────────────────────────────

function makeStones(count = 10): Stone[] {
  return Array.from({ length: count }, (_, i) => {
    const d = STONE_DEFS[Math.floor(Math.random() * STONE_DEFS.length)];
    return {
      ...d,
      id: i,
      colorIdx: i % STONE_COLORS.length,
    };
  });
}

function pileY(i: number): number {
  // stones sit at bottom of pile area, stacked upward
  return GROUND_Y - 30 - i * PILE_SPACING;
}

function getStackHeight(stack: PlacedStone[]): number {
  return stack.reduce((s, st) => s + st.h + 3, 0);
}

function computeBalance(stack: PlacedStone[]) {
  if (stack.length === 0) {
    return { ok: true, drift: 0, com: STACK_CENTER, baseCenter: STACK_CENTER };
  }

  let totalMass = 0;
  let weightedX = 0;

  for (const st of stack) {
    totalMass += st.mass;
    weightedX += st.cx * st.mass;
  }

  const com = weightedX / totalMass;

  const baseStone = stack[0];
  const baseCenter = baseStone.cx;
  const allowedDrift = Math.min(BALANCE_TOLERANCE, baseStone.w * 0.35);
  const drift = com - baseCenter;

  return {
    ok: Math.abs(drift) < allowedDrift,
    drift,
    com,
    baseCenter,
  };
}

function isGettingUnbalanced(stack: PlacedStone[]) {
  const bal = computeBalance(stack);
  return bal.ok && Math.abs(bal.drift) > BALANCE_TOLERANCE * 0.35;
}

function hitTest(mx: number, my: number, cx: number, cy: number, w: number, h: number): boolean {
  return Math.abs(mx - cx) <= w / 2 + HIT_PAD && Math.abs(my - cy) <= h / 2 + HIT_PAD;
}

function clampDropX(stone: Stone, proposedX: number) {
  const zL = STACK_CENTER - 105;
  const zR = STACK_CENTER + 105;

  const minZoneX = zL + stone.w / 2;
  const maxZoneX = zR - stone.w / 2;

  return Math.max(minZoneX, Math.min(maxZoneX, proposedX));
}

function isSupported(stack: PlacedStone[]) {
  if (stack.length <= 1) return true;

  const top = stack[stack.length - 1];
  const below = stack[stack.length - 2];

  const topLeft = top.cx - top.w / 2;
  const topRight = top.cx + top.w / 2;

  const belowLeft = below.cx - below.w / 2;
  const belowRight = below.cx + below.w / 2;

  // check horizontal overlap
  const overlap = Math.min(topRight, belowRight) - Math.max(topLeft, belowLeft);

  return overlap > 5; // require at least small overlap
}

const STORAGE_KEY = 'stone_stack_sessions';

type SessionResult = {
  score: number;
  height: number;
  won: boolean;
  timestamp: number;
};

function loadSessions(): SessionResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionResult[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-30)));
  } catch {
    // ignore storage errors
  }
}
// ─── Canvas drawing ────────────────────────────────────────────────────────────

function drawStone(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number, rx: number,
  color: string,
  alpha = 1,
  glowing = false,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glowing) {
    ctx.shadowColor = color; ctx.shadowBlur = 20;
  } else {
    ctx.shadowColor = 'rgba(56,189,248,0.4)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.rect(x - w / 2, y - h / 2, w, h);
  ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // rim highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // crack lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 2; i++) {
    const lx = x - w / 4 + i * (w / 2.5);
    ctx.beginPath(); ctx.moveTo(lx, y - h / 2 + 4); ctx.lineTo(lx + 4, y + h / 2 - 4); ctx.stroke();
  }
  ctx.restore();
}

// ─── Stat box ──────────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '10px 8px', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 500, color: '#38bdf8' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(224,242,254,0.5)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function FocusGame() {
  const { saveResult } = useGameContext();
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const phaseRef   = useRef<Phase>('instructions');
  const stonesRef  = useRef<Stone[]>([]);
  const stackRef   = useRef<PlacedStone[]>([]);
  const selectedStoneRef = useRef<Stone | null>(null);
  const shakeRef   = useRef<{ t: number } | null>(null);
  const hoverRef   = useRef<number>(-1);
  const fallingStoneRef = useRef<{
    stone: Stone;
    x: number;
    y: number;
    targetY: number;
    vy: number;
  } | null>(null);

  const [phase, setPhase]             = useState<Phase>('instructions');
  const [sessions, setSessions]       = useState(0);
  const [totalScore, setTotalScore]   = useState(0);
  const [bestScore, setBestScore]     = useState<number | null>(null);
  const [hintText, setHintText]       = useState('Click a stone to select it');
  const [heightText, setHeightText]   = useState(`0 / ${TARGET_H}px`);
  const [result, setResult]           = useState<{ win: boolean; score: number; reason: string } | null>(null);
  const [warningText, setWarningText] = useState('');
  const [allSessions, setAllSessions] = useState<SessionResult[]>(loadSessions);

  // ── Key fix: canvas coordinate conversion accounting for CSS scaling ─────────
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    // The canvas internal resolution is CANVAS_W x CANVAS_H
    // but it may be displayed at a different CSS size — scale accordingly
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }, []);

  // ── Draw loop ──────────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#061a2a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const vig = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 80, CANVAS_W / 2, CANVAS_H / 2, 340);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Shake offset
    let sx = 0;
    if (shakeRef.current) {
      shakeRef.current.t += 0.13;
      const decay = Math.max(0, 1 - shakeRef.current.t);
      sx = Math.sin(shakeRef.current.t * 20) * 15 * decay;
      if (decay <= 0) shakeRef.current = null;
    }

    // Ground
    ctx.fillStyle = '#0a2840';
    ctx.fillRect(0, GROUND_Y + 2, CANVAS_W, CANVAS_H);
    ctx.strokeStyle = 'rgba(56,189,248,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 2); ctx.lineTo(CANVAS_W, GROUND_Y + 2); ctx.stroke();

    // Pile zone — subtle background panel
    const pileTopY =
      stonesRef.current.length > 0
        ? Math.max(20, pileY(stonesRef.current.length - 1) - 36)
        : 60;

    ctx.fillStyle = 'rgba(56,189,248,0.04)';
    ctx.beginPath();
    ctx.rect(10, pileTopY, 140, GROUND_Y + 2 - pileTopY);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // ── Falling stone ──
    if (fallingStoneRef.current) {
      const falling = fallingStoneRef.current;
      const col = STONE_COLORS[falling.stone.colorIdx % STONE_COLORS.length];

      falling.vy += 0.9;
      falling.y += falling.vy;

      if (falling.y >= falling.targetY) {
        falling.y = falling.targetY;

        const placed: PlacedStone = {
          ...falling.stone,
          cx: falling.x,
          cy: falling.targetY,
        };

        stackRef.current = [...stackRef.current, placed];
        fallingStoneRef.current = null;
        
        // 🚨 SUPPORT CHECK (NEW)
        if (!isSupported(stackRef.current)) {
          setWarningText('');
          phaseRef.current = 'shake';
          setPhase('shake');
          shakeRef.current = { t: 0 };
          setTimeout(() => finishGame('topple'), 900);
          return;
        }

       if (stackRef.current.length === 1) {
          setWarningText('');
        } else {
          const bal = computeBalance(stackRef.current);

          if (!bal.ok) {
            setWarningText('');
            phaseRef.current = 'shake';
            setPhase('shake');
            shakeRef.current = { t: 0 };
            setTimeout(() => finishGame('topple'), 900);
            return;
          }

          if (isGettingUnbalanced(stackRef.current)) {
            setWarningText('Getting unbalanced, be careful');
          } else {
            setWarningText('');
          }
        }

        const newHeight = Math.round(getStackHeight(stackRef.current));
        setHeightText(`${newHeight} / ${TARGET_H}px`);

        if (newHeight >= TARGET_H) {
          finishGame('win');
          return;
        }

        if (stonesRef.current.length < 3) {
          const nextIdStart = Math.max(
            0,
            ...stackRef.current.map(s => s.id),
            ...stonesRef.current.map(s => s.id)
          ) + 1;

          const extraStones = Array.from({ length: 10 }, (_, i) => {
            const d = STONE_DEFS[Math.floor(Math.random() * STONE_DEFS.length)];
            return {
              ...d,
              id: nextIdStart + i,
              colorIdx: (nextIdStart + i) % STONE_COLORS.length,
            };
          });

          stonesRef.current = [...stonesRef.current, ...extraStones];
        }

        setHintText('Click a stone to select it');
      }

      ctx.save();
      ctx.translate(falling.x, falling.y);
      drawStone(ctx, 0, 0, falling.stone.w, falling.stone.h, falling.stone.rx, col, 1, true);
      ctx.restore();
    }

    // Stack zone guides
    const zL = STACK_CENTER - 105, zR = STACK_CENTER + 105;
    ctx.strokeStyle = 'rgba(56,189,248,0.22)';
    ctx.setLineDash([4, 7]);
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(zL, 40); ctx.lineTo(zL, GROUND_Y + 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(zR, 40); ctx.lineTo(zR, GROUND_Y + 2); ctx.stroke();
    ctx.setLineDash([]);

    // Target line
    const targetY = GROUND_Y - TARGET_H;
    ctx.strokeStyle = 'rgba(74,222,128,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(zL - 10, targetY); ctx.lineTo(zR + 10, targetY); ctx.stroke();
    ctx.fillStyle = 'rgba(74,222,128,0.75)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('target', zL - 14, targetY + 4);

    // ── Pile stones ──
    stonesRef.current.forEach((s, i) => {
      const py    = pileY(i);
      const hover = hoverRef.current === i;
      const selected = selectedStoneRef.current?.id === s.id;
      const col   = STONE_COLORS[s.colorIdx % STONE_COLORS.length];
      ctx.save();
      ctx.translate(PILE_X, py);
      if (hover) { ctx.scale(1.08, 1.08); }
      drawStone(ctx, 0, 0, s.w, s.h, s.rx, col, 1, selected);
      ctx.restore();
    });

    // ── Stacked stones ──
    stackRef.current.forEach((s, i) => {
      const col = STONE_COLORS[s.colorIdx % STONE_COLORS.length];
      ctx.save();
      ctx.translate(s.cx + sx, s.cy);
      if (shakeRef.current && i > 0) {
        ctx.rotate((sx / 15) * (i / stackRef.current.length) * 0.22);
      }
      drawStone(ctx, 0, 0, s.w, s.h, s.rx, col);
      ctx.restore();
    });

    // ── Center-of-mass dot ──
    if (stackRef.current.length > 1) {
      const bal    = computeBalance(stackRef.current);
      const comY   = GROUND_Y - getStackHeight(stackRef.current) / 2;
      const unbalanced = Math.abs(bal.drift) > BALANCE_TOLERANCE * 0.35;
      ctx.beginPath();
      ctx.arc(bal.com + sx, comY, 5, 0, Math.PI * 2);
      ctx.fillStyle   = unbalanced ? '#f87171' : '#4ade80';
      ctx.shadowColor = unbalanced ? '#f87171' : '#4ade80';
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }

    if (phaseRef.current !== 'end') {
      animRef.current = requestAnimationFrame(loop);
    }
  }, []);

  // ── Start game ─────────────────────────────────────────────────────────────

  const startGame = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    stonesRef.current  = makeStones();
    stackRef.current   = [];
    fallingStoneRef.current = null;
    selectedStoneRef.current = null;
    shakeRef.current   = null;
    hoverRef.current   = -1;
    phaseRef.current   = 'pick';
    setPhase('pick');
    setHintText('Click a stone to select it');
    setWarningText('');
    setHeightText(`0 / ${TARGET_H}px`);
    animRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ── Finish game ────────────────────────────────────────────────────────────

  const finishGame = useCallback((reason: 'topple' | 'win' | 'out') => {
  const stackH = getStackHeight(stackRef.current);
  const score = Math.min(100, Math.round((stackH / TARGET_H) * 100));

  const session: SessionResult = {
    score,
    height: Math.round(stackH),
    won: reason === 'win',
    timestamp: Date.now(),
  };

  setAllSessions(prev => {
    const updated = [...prev, session];
    saveSessions(updated);
    return updated;
  });

  saveResult('focus', {
    score,
    feedback:
      score >= 70
        ? 'Focus and balance stable'
        : 'Sustained attention showing strain',
    timestamp: session.timestamp,
    details: {
      height: session.height,
      won: session.won,
      endReason: reason,
    },
  });

  setSessions(p => p + 1);
  setTotalScore(p => p + score);
  setBestScore(p => (p === null || score > p ? score : p));

  setResult({
    win: reason === 'win',
    score,
    reason:
      reason === 'win'
        ? `Stacked ${Math.round(stackH)}px, target reached!`
        : reason === 'topple'
        ? `Center of mass drifted too far, collapsed at ${Math.round(stackH)}px.`
        : `No stones left, reached ${Math.round(stackH)}px of ${TARGET_H}px.`,
  });

  if (reason === 'topple') {
    phaseRef.current = 'result';
    setPhase('result');
  } else {
    phaseRef.current = 'end';
    setPhase('end');
    setTimeout(() => {
      phaseRef.current = 'result';
      setPhase('result');
    }, 250);
  }
}, [saveResult]);
  // ── Pointer events ─────────────────────────────────────────────────────────

useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const onDown = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (phaseRef.current !== 'pick' || fallingStoneRef.current) return;

    const clientX = e.type.startsWith('touch')
      ? (e as TouchEvent).touches[0].clientX
      : (e as MouseEvent).clientX;

    const clientY = e.type.startsWith('touch')
      ? (e as TouchEvent).touches[0].clientY
      : (e as MouseEvent).clientY;

    const { x, y } = toCanvas(clientX, clientY);

    if (selectedStoneRef.current) {
      const zL = STACK_CENTER - 105, zR = STACK_CENTER + 105;
      if (x >= zL && x <= zR) {
        const stone = selectedStoneRef.current;
        const dropX = clampDropX(stone, x);
        const stackH = getStackHeight(stackRef.current);
        const targetY = GROUND_Y - stackH - stone.h / 2 - 2;

        stonesRef.current = stonesRef.current.filter(s => s.id !== stone.id);
        selectedStoneRef.current = null;
        setHintText('Stone dropped');
        setWarningText('');

        fallingStoneRef.current = {
          stone,
          x: dropX,
          y: y,
          targetY,
          vy: 0,
        };
      } else {
        selectedStoneRef.current = null;
        setHintText('Click a stone to select it');
      }
    } else {
      for (let i = stonesRef.current.length - 1; i >= 0; i--) {
        const s = stonesRef.current[i];
        const py = pileY(i);
        if (hitTest(x, y, PILE_X, py, s.w, s.h)) {
          selectedStoneRef.current = s;
          setHintText(`Selected: ${s.label} — click in the stack zone to place`);
          return;
        }
      }
    }
  };

  const onMove = (e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const clientX = e.type.startsWith('touch')
      ? (e as TouchEvent).touches[0].clientX
      : (e as MouseEvent).clientX;

    const clientY = e.type.startsWith('touch')
      ? (e as TouchEvent).touches[0].clientY
      : (e as MouseEvent).clientY;

    const { x, y } = toCanvas(clientX, clientY);

    if (phaseRef.current === 'pick') {
      hoverRef.current = -1;
      for (let i = 0; i < stonesRef.current.length; i++) {
        const s = stonesRef.current[i];
        const py = pileY(i);
        if (hitTest(x, y, PILE_X, py, s.w, s.h)) {
          hoverRef.current = i;
          break;
        }
      }
    }
  };

  canvas.addEventListener('mousedown', onDown, { passive: false });
  canvas.addEventListener('mousemove', onMove, { passive: false });
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });

  return () => {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onMove);
  };
}, [phase, toCanvas, finishGame]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const persistedSessions = allSessions.length;
  const persistedAvgScore =
    allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.score, 0) / allSessions.length)
      : null;
  const persistedBestScore =
    allSessions.length > 0
      ? Math.max(...allSessions.map(s => s.score))
      : null;

  const fmt = (v: number | null) => v === null ? '—' : `${v}%`;

  const bestHeight = allSessions.length > 0 ? Math.max(...allSessions.map(s => s.height)) : 0;
  const avgHistoryScore =
    allSessions.length > 0
      ? Math.round(allSessions.reduce((sum, s) => sum + s.score, 0) / allSessions.length)
      : 0;
  const wins = allSessions.filter(s => s.won).length;
  // ─────────────────────────────────────────────────────────────────────────────
  return (
  <NatureLayout showBack={true} backTo="/ecosystem">
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem 2.5rem',
      fontFamily: "'Georgia', 'Palatino', serif",
      color: '#e0f2fe',
      width: '100%',
      minHeight: '100%',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>

      {/* ── Instructions ────────────────────────────────────────────────────── */}
      {phase === 'instructions' && (
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* <div style={{ marginBottom: 18 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <ellipse cx="26" cy="46" rx="18" ry="4" fill="rgba(56,189,248,0.1)" />
              <rect x="6"  y="38" width="40" height="9"  rx="4" fill="#0ea5e9" opacity="0.8"  />
              <rect x="10" y="29" width="32" height="10" rx="5" fill="#38bdf8" opacity="0.9"  />
              <rect x="14" y="21" width="24" height="9"  rx="4" fill="#22d3ee" opacity="0.95" />
              <rect x="18" y="14" width="16" height="8"  rx="4" fill="#7dd3fc" />
              <rect x="21" y="8"  width="10" height="7"  rx="3" fill="#bae6fd" />
            </svg>
          </div> */}

          <p style={{ fontSize: 25, letterSpacing: '0.14em', color: '#38bdf8', marginBottom: 10, fontFamily: 'sans-serif' }}>FOCUS GAME</p>

          <h1 style={{ fontSize: 60, fontWeight: 400, margin: '0 0 6px', textAlign: 'center', color: '#e0f2fe', letterSpacing: '-0.01em' }}>
            Stone Stack
          </h1>

          <div style={{ width: 64, height: 1.5, background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', margin: '14px auto 22px' }} />
          
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
            {[
              ['①', 'Click a stone to select it'],
              ['②', 'Click in the dashed stack zone to place it'],
              ['③', 'Watch the balance dot — stay green'],
              ['④', 'Reach the green line to win'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.13)', borderRadius: 12 }}>
                <span style={{ fontSize: 15, color: '#38bdf8', fontFamily: 'sans-serif', minWidth: 18 }}>{n}</span>
                <span style={{ fontSize: 15, color: 'rgba(237, 240, 242, 0.62)', fontFamily: 'sans-serif' }}>{t}</span>
              </div>
            ))}
          </div>
          
          <p style={{ fontSize: 17, lineHeight: 1.75, textAlign: 'center', color: 'rgba(224,242,254,0.75)', marginBottom: 12 }}>
            Every stone has a different shape and weight. Stack them off-center and the tower will sway, then fall. A glowing dot tracks your center of mass —{' '}
            <span style={{ color: '#4ade80' }}>green</span> is balanced,{' '}
            <span style={{ color: '#f87171' }}>red</span> means you're close to the edge.
          </p>

          

          <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 26 }}>
            <StatBox label="best"     value={fmt(persistedBestScore)} />
            <StatBox label="average"  value={fmt(persistedAvgScore)} />
            <StatBox label="sessions" value={String(persistedSessions)} />
          </div>

          <button onClick={startGame} style={{
            width: '100%', padding: '30px', borderRadius: 18, 
            background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: '#e0f2fe', fontSize: 17, fontFamily: 'sans-serif', fontWeight: 500,
            cursor: 'pointer', boxShadow: '0 0 30px rgba(56,189,248,0.2)',
          }}>
            Start
          </button>
        </div>
      )}

      {/* ── Game ────────────────────────────────────────────────────────────── */}
      {(phase === 'pick' || phase === 'drag' || phase === 'shake') && (
        <div style={{ width: '100%', maxWidth: 500 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'rgba(125,211,252,0.65)', fontFamily: 'sans-serif' }}>{hintText}</span>
            <span style={{ fontSize: 13, color: 'rgba(125,211,252,0.65)', fontFamily: 'sans-serif' }}>{heightText}</span>
          </div>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{
              display: 'block',
              width: '100%',       // CSS display size — may differ from internal resolution
              borderRadius: 16,
              border: '1px solid rgba(56,189,248,0.2)',
              boxShadow: '0 0 40px rgba(56,189,248,0.08)',
              cursor: 'pointer',
              touchAction: 'none',
              userSelect: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button
              onClick={() => setPhase('instructions')}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                color: '#7dd3fc',
                fontSize: 14,
                fontFamily: 'sans-serif',
                cursor: 'pointer',
              }}
            >
              Back to menu
            </button>

            <button
              onClick={() => setPhase('history')}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                background: 'rgba(14,165,233,0.12)',
                border: '1px solid rgba(56,189,248,0.25)',
                color: '#bae6fd',
                fontSize: 14,
                fontFamily: 'sans-serif',
                cursor: 'pointer',
              }}
            >
              Performance history
            </button>
          </div>
          {warningText && (
            <div style={{
              marginBottom: 10,
              padding: '8px 12px',
              borderRadius: 12,
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.28)',
              color: '#fca5a5',
              fontSize: 13,
              fontFamily: 'sans-serif',
              textAlign: 'center',
            }}>
              {warningText}
            </div>
          )}

        </div>
      )}
      {phase === 'history' && (
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: '#38bdf8', marginBottom: 8, fontFamily: 'sans-serif', textAlign: 'center' }}>
            PERFORMANCE HISTORY
          </p>

          <h1 style={{ fontSize: 28, fontWeight: 400, margin: '0 0 16px', color: '#e0f2fe', textAlign: 'center' }}>
            Stone Stack Stats
          </h1>

          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <StatBox label="sessions" value={String(allSessions.length)} />
            <StatBox label="avg score" value={`${avgHistoryScore}%`} />
            <StatBox label="best height" value={`${bestHeight}px`} />
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <StatBox label="wins" value={String(wins)} />
            <StatBox label="best" value={fmt(persistedBestScore)} />
            <StatBox label="current avg" value={fmt(persistedAvgScore)} />
          </div>

          <div style={{
            background: 'rgba(56,189,248,0.05)',
            border: '1px solid rgba(56,189,248,0.14)',
            borderRadius: 16,
            padding: 12,
            marginBottom: 18,
            maxHeight: 260,
            overflowY: 'auto',
          }}>
            {allSessions.length === 0 ? (
              <p style={{ color: 'rgba(224,242,254,0.5)', fontSize: 13, textAlign: 'center', margin: 8 }}>
                No sessions yet
              </p>
            ) : (
              allSessions.slice().reverse().map((session, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 8px',
                    borderBottom: i === allSessions.length - 1 ? 'none' : '1px solid rgba(56,189,248,0.08)',
                  }}
                >
                  <div>
                    <div style={{ color: '#e0f2fe', fontSize: 13, fontFamily: 'sans-serif' }}>
                      {session.won ? 'Win' : 'Ended early/collapsed'}
                    </div>
                    <div style={{ color: 'rgba(224,242,254,0.45)', fontSize: 11, fontFamily: 'sans-serif' }}>
                      {new Date(session.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#38bdf8', fontSize: 13, fontFamily: 'sans-serif' }}>
                      {session.score}%
                    </div>
                    <div style={{ color: 'rgba(224,242,254,0.45)', fontSize: 11, fontFamily: 'sans-serif' }}>
                      {session.height}px
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={startGame}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                background: 'rgba(56,189,248,0.08)',
                border: '1px solid rgba(56,189,248,0.2)',
                color: '#7dd3fc',
                fontSize: 14,
                fontFamily: 'sans-serif',
                cursor: 'pointer',
              }}
            >
              Start new game
            </button>

            <button
              onClick={() => setPhase('instructions')}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: 14,
                background: 'transparent',
                border: '1px solid rgba(56,189,248,0.2)',
                color: 'rgba(125,211,252,0.75)',
                fontSize: 14,
                fontFamily: 'sans-serif',
                cursor: 'pointer',
              }}
            >
              Menu
            </button>
          </div>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────────── */}
      {phase === 'result' && result && (
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: '#38bdf8', marginBottom: 8, fontFamily: 'sans-serif' }}>
            {result.win ? 'LEVEL COMPLETE' : 'GAME OVER'}
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 400, margin: '0 0 4px', color: '#e0f2fe' }}>
            {result.win ? 'Target reached!' : 'Stack collapsed!'}
          </h1>
          <div style={{ width: 64, height: 1.5, background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', margin: '12px auto 18px' }} />
          <div style={{ fontSize: 56, fontWeight: 400, color: '#38bdf8', letterSpacing: '-0.02em', margin: '4px 0 10px' }}>
            {result.score}%
          </div>
          <p style={{ fontSize: 13, color: 'rgba(224,242,254,0.5)', textAlign: 'center', marginBottom: 24, fontFamily: 'sans-serif' }}>
            {result.reason}
          </p>
          <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 24 }}>
            <StatBox label="best"     value={fmt(persistedBestScore)} />
            <StatBox label="average"  value={fmt(persistedAvgScore)} />
            <StatBox label="sessions" value={String(persistedSessions)} />
          </div>
        <button onClick={startGame} style={{
          width: '100%',
          padding: '14px 0',
          borderRadius: 18,
          marginBottom: 10,
          background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
          border: '1px solid rgba(56,189,248,0.3)',
          color: '#e0f2fe',
          fontSize: 16,
          fontFamily: 'sans-serif',
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 0 28px rgba(56,189,248,0.15)',
        }}>
          Try Again
        </button>

        <button onClick={() => setPhase('history')} style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 18,
          marginBottom: 10,
          background: 'rgba(14,165,233,0.12)',
          border: '1px solid rgba(56,189,248,0.25)',
          color: '#bae6fd',
          fontSize: 15,
          fontFamily: 'sans-serif',
          cursor: 'pointer',
        }}>
          Performance history
        </button>

        <button onClick={() => setPhase('instructions')} style={{
          width: '100%',
          padding: '12px 0',
          borderRadius: 18,
          background: 'transparent',
          border: '1px solid rgba(56,189,248,0.2)',
          color: 'rgba(125,211,252,0.7)',
          fontSize: 15,
          fontFamily: 'sans-serif',
          cursor: 'pointer',
        }}>
          Back to menu
        </button>
        </div>
      )}
    </div>
    </NatureLayout>
  );
}

