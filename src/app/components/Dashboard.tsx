import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  Tooltip, ReferenceLine,
} from 'recharts';
import { useGameContext } from '../context/GameContext';
import { NatureLayout } from './NatureLayout';

const BASELINE = 82;

const METRIC_CONFIG = [
  {
    key: 'memory' as const,
    label: 'Memory',
    emoji: '🌳',
    color: '#4ade80',
    dimColor: 'rgba(74,222,128,0.3)',
    bg: 'rgba(74,222,128,0.07)',
    border: 'rgba(74,222,128,0.2)',
    insight: 'Slight memory decline over 5 days. Pattern recall affected.',
  },
  {
    key: 'focus' as const,
    label: 'Focus',
    emoji: '🌊',
    color: '#38bdf8',
    dimColor: 'rgba(56,189,248,0.3)',
    bg: 'rgba(56,189,248,0.07)',
    border: 'rgba(56,189,248,0.2)',
    insight: 'Your focus has decreased over the past 3 days.',
  },
  {
    key: 'reaction' as const,
    label: 'Reaction',
    emoji: '🐾',
    color: '#fb923c',
    dimColor: 'rgba(251,146,60,0.3)',
    bg: 'rgba(251,146,60,0.07)',
    border: 'rgba(251,146,60,0.2)',
    insight: 'Reaction time is slightly slower than baseline.',
  },
  {
    key: 'cognitive' as const,
    label: 'Cognitive Load',
    emoji: '🪨',
    color: '#a78bfa',
    dimColor: 'rgba(167,139,250,0.3)',
    bg: 'rgba(167,139,250,0.07)',
    border: 'rgba(167,139,250,0.2)',
    insight: 'Cognitive load is increasing. Consider recovery protocols.',
  },
];

function ScoreCircle({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const isHealthy = score >= 70;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={isHealthy ? color : '#fbbf24'}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: `drop-shadow(0 0 5px ${isHealthy ? color : '#fbbf24'})` }}
      />
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle"
        fill={isHealthy ? color : '#fbbf24'}
        fontSize={size === 72 ? '18' : '24'}
        fontWeight="400"
      >
        {score}
      </text>
    </svg>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(6,14,10,0.92)', border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: 12, padding: '8px 12px', backdropFilter: 'blur(10px)',
      }}
    >
      <p style={{ color: 'rgba(209,250,229,0.5)', fontSize: '11px', margin: '0 0 4px' }}>{label}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <p key={p.name} style={{ color: p.color, fontSize: '13px', margin: '2px 0' }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { memory, focus, reaction, cognitive, history, getOverallScore } = useGameContext();

  const overallScore = getOverallScore();
  const isHealthy = overallScore >= 70;

  const todayScores = {
    memory: memory?.score ?? history[history.length - 1].memory,
    focus: focus?.score ?? history[history.length - 1].focus,
    reaction: reaction?.score ?? history[history.length - 1].reaction,
    cognitive: cognitive?.score ?? history[history.length - 1].cognitive,
  };

  const trendData = history.map((h) => ({
    date: h.date.replace('Mar ', ''),
    Memory: h.memory,
    Focus: h.focus,
    Reaction: h.reaction,
    'Cog. Load': h.cognitive,
  }));

  const insights = [
    memory && memory.score < 70 ? 'Memory function below baseline — pattern recall may be affected.' : null,
    focus && focus.score < 70 ? 'Your focus has decreased over the past 3 days.' : null,
    reaction && reaction.score < 70 ? 'Reaction time is slightly slower than baseline.' : null,
    cognitive && cognitive.score < 70 ? 'Cognitive load is increasing — consider recovery protocols.' : null,
    !memory && !focus && !reaction && !cognitive ? 'Complete daily sessions to generate health insights.' : null,
  ].filter(Boolean) as string[];

  return (
    <NatureLayout backTo="/ecosystem">
      <div
        className="flex flex-col pt-20 pb-10 px-5"
        style={{ overflowY: 'auto', height: '100%', flex: 1, WebkitOverflowScrolling: 'touch' }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p style={{ color: '#4ade80', fontSize: '12px', letterSpacing: '0.1em', margin: '0 0 4px' }}>
            MISSION HEALTH
          </p>
          <h1 style={{ color: '#d1fae5', fontSize: '24px', margin: 0, fontWeight: 400 }}>
            Ecosystem Health
          </h1>
          <p style={{ color: 'rgba(209,250,229,0.45)', fontSize: '13px', margin: '4px 0 0' }}>
            Day 47 · Updated today
          </p>
        </motion.div>

        {/* Overall Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-5 mb-5"
          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)' }}
        >
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center">
              <ScoreCircle score={overallScore} color="#4ade80" size={88} />
              <p style={{ color: 'rgba(209,250,229,0.5)', fontSize: '10px', marginTop: 4, textAlign: 'center' }}>
                Overall
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: isHealthy ? '#4ade80' : '#fbbf24',
                    boxShadow: `0 0 8px ${isHealthy ? '#4ade80' : '#fbbf24'}`,
                  }}
                />
                <span style={{ color: isHealthy ? '#4ade80' : '#fbbf24', fontSize: '14px' }}>
                  {isHealthy ? 'Ecosystem Stable' : 'Attention Needed'}
                </span>
              </div>
              <p style={{ color: 'rgba(209,250,229,0.6)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                {isHealthy
                  ? 'Your cognitive environment is in balance. Continue daily sessions.'
                  : 'Some metrics are below pre-mission baseline. Monitor closely.'}
              </p>
              <div className="flex gap-4 mt-3">
                <div>
                  <p style={{ color: 'rgba(209,250,229,0.4)', fontSize: '10px', margin: 0 }}>Today</p>
                  <p style={{ color: '#4ade80', fontSize: '16px', margin: 0, fontWeight: 500 }}>{overallScore}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(209,250,229,0.4)', fontSize: '10px', margin: 0 }}>Baseline</p>
                  <p style={{ color: 'rgba(209,250,229,0.6)', fontSize: '16px', margin: 0 }}>{BASELINE}</p>
                </div>
                <div>
                  <p style={{ color: 'rgba(209,250,229,0.4)', fontSize: '10px', margin: 0 }}>Change</p>
                  <p style={{ color: overallScore >= BASELINE ? '#4ade80' : '#f87171', fontSize: '16px', margin: 0 }}>
                    {overallScore >= BASELINE ? '+' : ''}{overallScore - BASELINE}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Individual Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          {METRIC_CONFIG.map((m) => {
            const score = todayScores[m.key];
            const isOk = score >= 70;
            return (
              <button
                key={m.key}
                onClick={() => navigate(`/${m.key}`)}
                className="rounded-2xl p-4 text-left active:scale-95 transition-transform"
                style={{ background: m.bg, border: `1px solid ${m.border}` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span style={{ fontSize: 22 }}>{m.emoji}</span>
                  <ScoreCircle score={score} color={m.color} size={44} />
                </div>
                <p style={{ color: m.color, fontSize: '13px', margin: '0 0 2px' }}>{m.label}</p>
                <p style={{ color: isOk ? 'rgba(209,250,229,0.5)' : '#fbbf24', fontSize: '11px', margin: 0 }}>
                  {isOk ? '✓ Normal' : '↓ Below baseline'}
                </p>
              </button>
            );
          })}
        </motion.div>

        {/* 7-Day Trend Chart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl p-4 mb-5"
          style={{ background: 'rgba(10,25,15,0.6)', border: '1px solid rgba(74,222,128,0.12)' }}
        >
          <p style={{ color: '#d1fae5', fontSize: '14px', margin: '0 0 2px' }}>7-Day Trend</p>
          <p style={{ color: 'rgba(209,250,229,0.4)', fontSize: '11px', margin: '0 0 16px' }}>
            Pre-mission baseline: {BASELINE}
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="rgba(74,222,128,0.05)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(209,250,229,0.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[50, 100]}
                tick={{ fill: 'rgba(209,250,229,0.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={BASELINE} stroke="rgba(255,255,255,0.12)" strokeDasharray="6 4" />
              <Line dataKey="Memory" stroke="#4ade80" strokeWidth={1.5} dot={false} />
              <Line dataKey="Focus" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
              <Line dataKey="Reaction" stroke="#fb923c" strokeWidth={1.5} dot={false} />
              <Line dataKey="Cog. Load" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-4 mt-2 flex-wrap">
            {[
              { label: 'Memory', color: '#4ade80' },
              { label: 'Focus', color: '#38bdf8' },
              { label: 'Reaction', color: '#fb923c' },
              { label: 'Load', color: '#a78bfa' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div style={{ width: 16, height: 2, background: color, borderRadius: 2 }} />
                <span style={{ color: 'rgba(209,250,229,0.5)', fontSize: '11px' }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Insights */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="rounded-3xl p-4 mb-5"
            style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.15)' }}
          >
            <p style={{ color: '#fb923c', fontSize: '13px', margin: '0 0 12px', letterSpacing: '0.04em' }}>
              ⚠️ Insights
            </p>
            {insights.map((insight, i) => (
              <div key={i} className="flex gap-3 mb-3 last:mb-0">
                <div
                  style={{
                    width: 4, borderRadius: 2, flexShrink: 0, alignSelf: 'stretch',
                    background: 'rgba(251,146,60,0.5)',
                  }}
                />
                <p style={{ color: 'rgba(255,237,213,0.7)', fontSize: '13px', lineHeight: 1.55, margin: 0 }}>
                  {insight}
                </p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Ecosystem Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl p-4 mb-5"
          style={{ background: 'rgba(10,25,15,0.6)', border: '1px solid rgba(74,222,128,0.12)' }}
        >
          <p style={{ color: '#d1fae5', fontSize: '14px', margin: '0 0 12px' }}>Ecosystem Vitals</p>
          {METRIC_CONFIG.map((m) => {
            const score = todayScores[m.key];
            return (
              <div key={m.key} className="flex items-center gap-3 mb-3 last:mb-0">
                <span style={{ fontSize: 16, width: 24 }}>{m.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span style={{ color: 'rgba(209,250,229,0.6)', fontSize: '12px' }}>{m.label}</span>
                    <span style={{ color: m.color, fontSize: '12px' }}>{score}</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%', width: `${score}%`,
                        background: score >= 70 ? m.color : '#fbbf24',
                        borderRadius: 2, transition: 'width 1s ease',
                        boxShadow: `0 0 6px ${score >= 70 ? m.color : '#fbbf24'}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3"
        >
          <button
            onClick={() => navigate('/meditation')}
            className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
            style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#86efac', fontSize: '14px' }}
          >
            🌿 Breathe
          </button>
          <button
            onClick={() => navigate('/ecosystem')}
            className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(20,83,45,0.25))', border: '1px solid rgba(74,222,128,0.25)', color: '#d1fae5', fontSize: '14px' }}
          >
            🌍 Ecosystem
          </button>
        </motion.div>

        {/* Footer note */}
        <p style={{ color: 'rgba(209,250,229,0.2)', fontSize: '11px', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          Data is for mission health monitoring only. Not a medical diagnosis.
        </p>
      </div>
    </NatureLayout>
  );
}