import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type StoneDef   = { w: number; h: number; rx: number; label: string; mass: number };
type Stone      = StoneDef & { id: number; colorIdx: number };
type PlacedStone = Stone & { cx: number; cy: number };
type Phase      = 'instructions' | 'pick' | 'drag' | 'shake' | 'end' | 'result';

// ─── Constants ─────────────────────────────────────────────────────────────────

const TARGET_H          = 180;
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

function makeStones(): Stone[] {
  return [...STONE_DEFS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .map((d, i) => ({ ...d, id: i, colorIdx: i }));
}

function pileY(i: number): number {
  // stones sit at bottom of pile area, stacked upward
  return GROUND_Y - 30 - i * PILE_SPACING;
}

function getStackHeight(stack: PlacedStone[]): number {
  return stack.reduce((s, st) => s + st.h + 3, 0);
}

function computeBalance(stack: PlacedStone[]) {
  if (stack.length === 0) return { ok: true, drift: 0, com: STACK_CENTER };
  let totalMass = 0, weightedX = 0;
  for (const st of stack) { totalMass += st.mass; weightedX += st.cx * st.mass; }
  const com = weightedX / totalMass;
  return { ok: Math.abs(com - STACK_CENTER) < BALANCE_TOLERANCE, drift: com - STACK_CENTER, com };
}

function hitTest(mx: number, my: number, cx: number, cy: number, w: number, h: number): boolean {
  return Math.abs(mx - cx) <= w / 2 + HIT_PAD && Math.abs(my - cy) <= h / 2 + HIT_PAD;
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
  (ctx as any).roundRect(x - w / 2, y - h / 2, w, h, rx);
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
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const phaseRef   = useRef<Phase>('instructions');
  const stonesRef  = useRef<Stone[]>([]);
  const stackRef   = useRef<PlacedStone[]>([]);
  const dragRef    = useRef<{ stone: Stone; mx: number; my: number } | null>(null);
  const shakeRef   = useRef<{ t: number } | null>(null);
  const hoverRef   = useRef<number>(-1);

  const [phase, setPhase]             = useState<Phase>('instructions');
  const [sessions, setSessions]       = useState(0);
  const [totalScore, setTotalScore]   = useState(0);
  const [bestScore, setBestScore]     = useState<number | null>(null);
  const [hintText, setHintText]       = useState('Drag a stone onto the stack');
  const [heightText, setHeightText]   = useState(`0 / ${TARGET_H}px`);
  const [result, setResult]           = useState<{ win: boolean; score: number; reason: string } | null>(null);

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
    ctx.fillStyle = 'rgba(56,189,248,0.04)';
    ctx.beginPath();
    (ctx as any).roundRect(10, 60, 140, GROUND_Y - 64, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56,189,248,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

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

    // Pile label
    ctx.fillStyle = 'rgba(125,211,252,0.5)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STONES', PILE_X + 10, 76);

    // ── Pile stones ──
    stonesRef.current.forEach((s, i) => {
      if (dragRef.current?.stone.id === s.id) return; // drawn on top while dragging
      const py    = pileY(i);
      const hover = hoverRef.current === i;
      const col   = STONE_COLORS[s.colorIdx % STONE_COLORS.length];
      ctx.save();
      ctx.translate(PILE_X, py);
      if (hover) { ctx.scale(1.08, 1.08); }
      drawStone(ctx, 0, 0, s.w, s.h, s.rx, col, 1, hover);
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
      const danger = Math.abs(bal.drift) > BALANCE_TOLERANCE * 0.65;
      ctx.beginPath();
      ctx.arc(bal.com + sx, comY, 5, 0, Math.PI * 2);
      ctx.fillStyle   = danger ? '#f87171' : '#4ade80';
      ctx.shadowColor = danger ? '#f87171' : '#4ade80';
      ctx.shadowBlur  = 10;
      ctx.fill();
      ctx.shadowBlur  = 0;
    }

    // ── Drag: ghost + floating stone ──
    if (dragRef.current) {
      const { stone, mx, my } = dragRef.current;
      const col      = STONE_COLORS[stone.colorIdx % STONE_COLORS.length];
      const overStack = mx >= zL && mx <= zR;

      if (overStack) {
        const ghostY = GROUND_Y - getStackHeight(stackRef.current) - stone.h / 2 - 2;
        const clampedX = Math.max(zL + stone.w / 2, Math.min(zR - stone.w / 2, mx));
        drawStone(ctx, clampedX, ghostY, stone.w, stone.h, stone.rx, col, 0.28);
      }
      // stone follows cursor
      drawStone(ctx, mx, my, stone.w, stone.h, stone.rx, col, 0.93, true);
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
    dragRef.current    = null;
    shakeRef.current   = null;
    hoverRef.current   = -1;
    phaseRef.current   = 'pick';
    setPhase('pick');
    setHintText('Drag a stone onto the stack');
    setHeightText(`0 / ${TARGET_H}px`);
    animRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ── Finish game ────────────────────────────────────────────────────────────

  const finishGame = useCallback((reason: 'topple' | 'win' | 'out') => {
    const stackH = getStackHeight(stackRef.current);
    const score  = Math.min(100, Math.round((stackH / TARGET_H) * 100));
    phaseRef.current = 'end';
    setPhase('end');
    setSessions(p => p + 1);
    setTotalScore(p => p + score);
    setBestScore(p => p === null || score > p ? score : p);
    setResult({
      win: reason === 'win',
      score,
      reason:
        reason === 'win'    ? `Stacked ${Math.round(stackH)}px — target reached!` :
        reason === 'topple' ? `Center of mass drifted too far — collapsed at ${Math.round(stackH)}px.` :
                              `No stones left — reached ${Math.round(stackH)}px of ${TARGET_H}px.`,
    });
    setTimeout(() => setPhase('result'), reason === 'topple' ? 900 : 250);
  }, []);

  // ── Pointer events ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      if (phaseRef.current !== 'pick') return;
      const { x, y } = toCanvas(e.clientX, e.clientY);

      // Find which pile stone was hit — check top stone first
      for (let i = stonesRef.current.length - 1; i >= 0; i--) {
        const s  = stonesRef.current[i];
        const py = pileY(i);
        if (hitTest(x, y, PILE_X, py, s.w, s.h)) {
          dragRef.current  = { stone: s, mx: x, my: y };
          phaseRef.current = 'drag';
          setPhase('drag');
          setHintText(`Dragging: ${s.label} — drop onto the stack zone`);
          canvas.setPointerCapture(e.pointerId);
          return;
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      const { x, y } = toCanvas(e.clientX, e.clientY);

      if (phaseRef.current === 'pick') {
        hoverRef.current = -1;
        for (let i = 0; i < stonesRef.current.length; i++) {
          const s  = stonesRef.current[i];
          const py = pileY(i);
          if (hitTest(x, y, PILE_X, py, s.w, s.h)) { hoverRef.current = i; break; }
        }
        return;
      }

      if (phaseRef.current === 'drag' && dragRef.current) {
        dragRef.current = { ...dragRef.current, mx: x, my: y };
      }
    };

    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      if (phaseRef.current !== 'drag' || !dragRef.current) return;

      const { stone, mx } = dragRef.current;
      const zL = STACK_CENTER - 105, zR = STACK_CENTER + 105;
      dragRef.current = null;

      if (mx >= zL && mx <= zR) {
        const clampedX = Math.max(zL + stone.w / 2, Math.min(zR - stone.w / 2, mx));
        const stackH   = getStackHeight(stackRef.current);
        const cy       = GROUND_Y - stackH - stone.h / 2 - 2; // align on top of stack
        const placed: PlacedStone = { ...stone, cx: clampedX, cy };

        stackRef.current = [...stackRef.current, placed];
        stonesRef.current = stonesRef.current.filter(s => s.id !== stone.id);

        setHeightText(`${Math.round(stackH + stone.h)} / ${TARGET_H}px`);

        const bal = computeBalance(stackRef.current);
        if (!bal.ok) {
          phaseRef.current = 'shake';
          setPhase('shake');
          shakeRef.current = { t: 0 };
          setTimeout(() => finishGame('topple'), 900);
          return;
        }
        if (stackH + stone.h >= TARGET_H) { finishGame('win'); return; }
        if (stonesRef.current.length === 0) { finishGame('out'); return; }
      }
      // whether dropped on stack or not, return to pick
      phaseRef.current = 'pick';
      setPhase('pick');
      setHintText('Drag a stone onto the stack');
    };

    canvas.addEventListener('pointerdown',  onDown,  { passive: false });
    canvas.addEventListener('pointermove',  onMove,  { passive: false });
    canvas.addEventListener('pointerup',    onUp,    { passive: false });
    canvas.addEventListener('pointercancel', onUp,   { passive: false });
    canvas.addEventListener('pointerleave', () => { if (phaseRef.current === 'pick') hoverRef.current = -1; });

    return () => {
      canvas.removeEventListener('pointerdown',  onDown);
      canvas.removeEventListener('pointermove',  onMove);
      canvas.removeEventListener('pointerup',    onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [toCanvas, finishGame]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const avgScore = sessions > 0 ? Math.round(totalScore / sessions) : null;
  const fmt      = (v: number | null) => v === null ? '—' : `${v}%`;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #061a2a 0%, #0a2840 50%, #061a28 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2rem 1rem 2.5rem',
      fontFamily: "'Georgia', 'Palatino', serif",
      color: '#e0f2fe',
    }}>

      {/* ── Instructions ────────────────────────────────────────────────────── */}
      {phase === 'instructions' && (
        <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: 18 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <ellipse cx="26" cy="46" rx="18" ry="4" fill="rgba(56,189,248,0.1)" />
              <rect x="6"  y="38" width="40" height="9"  rx="4" fill="#0ea5e9" opacity="0.8"  />
              <rect x="10" y="29" width="32" height="10" rx="5" fill="#38bdf8" opacity="0.9"  />
              <rect x="14" y="21" width="24" height="9"  rx="4" fill="#22d3ee" opacity="0.95" />
              <rect x="18" y="14" width="16" height="8"  rx="4" fill="#7dd3fc" />
              <rect x="21" y="8"  width="10" height="7"  rx="3" fill="#bae6fd" />
            </svg>
          </div>

          <p style={{ fontSize: 11, letterSpacing: '0.14em', color: '#38bdf8', marginBottom: 10, fontFamily: 'sans-serif' }}>FOCUS GAME</p>

          <h1 style={{ fontSize: 34, fontWeight: 400, margin: '0 0 6px', textAlign: 'center', color: '#e0f2fe', letterSpacing: '-0.01em' }}>
            Stone Stack
          </h1>

          <div style={{ width: 64, height: 1.5, background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)', margin: '14px auto 22px' }} />

          <p style={{ fontSize: 15, lineHeight: 1.75, textAlign: 'center', color: 'rgba(224,242,254,0.75)', marginBottom: 12 }}>
            A mindful stacking game. Drag irregular river stones and build your tower one by one — reaching the glowing green target line.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.7, textAlign: 'center', color: 'rgba(224,242,254,0.5)', marginBottom: 24, fontFamily: 'sans-serif' }}>
            Every stone has a different shape and weight. Stack them off-center and the tower will sway, then fall. A glowing dot tracks your center of mass —{' '}
            <span style={{ color: '#4ade80' }}>green</span> is balanced,{' '}
            <span style={{ color: '#f87171' }}>red</span> means you're close to the edge.
          </p>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 26 }}>
            {[
              ['①', 'Drag a stone from the left panel'],
              ['②', 'Drop it into the dashed stack zone'],
              ['③', 'Watch the balance dot — stay green'],
              ['④', 'Reach the green line to win'],
            ].map(([n, t]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.13)', borderRadius: 12 }}>
                <span style={{ fontSize: 13, color: '#38bdf8', fontFamily: 'sans-serif', minWidth: 18 }}>{n}</span>
                <span style={{ fontSize: 13, color: 'rgba(224,242,254,0.62)', fontFamily: 'sans-serif' }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, width: '100%', marginBottom: 26 }}>
            <StatBox label="best"     value={fmt(bestScore)} />
            <StatBox label="average"  value={fmt(avgScore)}  />
            <StatBox label="sessions" value={String(sessions)} />
          </div>

          <button onClick={startGame} style={{
            width: '100%', padding: '15px 0', borderRadius: 18,
            background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: '#e0f2fe', fontSize: 17, fontFamily: 'sans-serif', fontWeight: 500,
            cursor: 'pointer', boxShadow: '0 0 30px rgba(56,189,248,0.2)',
          }}>
            Start Stacking
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
              cursor: phase === 'drag' ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none',
            }}
          />
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
            <StatBox label="best"     value={fmt(bestScore)} />
            <StatBox label="average"  value={fmt(avgScore)}  />
            <StatBox label="sessions" value={String(sessions)} />
          </div>
          <button onClick={startGame} style={{
            width: '100%', padding: '14px 0', borderRadius: 18, marginBottom: 10,
            background: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: '#e0f2fe', fontSize: 16, fontFamily: 'sans-serif', fontWeight: 500,
            cursor: 'pointer', boxShadow: '0 0 28px rgba(56,189,248,0.15)',
          }}>
            Try Again
          </button>
          <button onClick={() => setPhase('instructions')} style={{
            width: '100%', padding: '12px 0', borderRadius: 18,
            background: 'transparent', border: '1px solid rgba(56,189,248,0.2)',
            color: 'rgba(125,211,252,0.7)', fontSize: 15, fontFamily: 'sans-serif', cursor: 'pointer',
          }}>
            Back to menu
          </button>
        </div>
      )}
    </div>
  );
}