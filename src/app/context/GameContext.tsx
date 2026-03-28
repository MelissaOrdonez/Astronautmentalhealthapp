import React, { createContext, useContext, useState, useCallback } from 'react';

export interface GameResult {
  score: number;
  feedback: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface HistoryEntry {
  date: string;
  memory: number;
  focus: number;
  reaction: number;
  cognitive: number;
}

interface GameContextType {
  memory: GameResult | null;
  focus: GameResult | null;
  reaction: GameResult | null;
  cognitive: GameResult | null;
  history: HistoryEntry[];
  saveResult: (game: 'memory' | 'focus' | 'reaction' | 'cognitive', result: GameResult) => void;
  getOverallScore: () => number;
}

const MOCK_HISTORY: HistoryEntry[] = [
  { date: 'Mar 22', memory: 84, focus: 80, reaction: 87, cognitive: 82 },
  { date: 'Mar 23', memory: 80, focus: 76, reaction: 83, cognitive: 79 },
  { date: 'Mar 24', memory: 76, focus: 71, reaction: 80, cognitive: 74 },
  { date: 'Mar 25', memory: 72, focus: 66, reaction: 76, cognitive: 70 },
  { date: 'Mar 26', memory: 68, focus: 62, reaction: 71, cognitive: 66 },
  { date: 'Mar 27', memory: 64, focus: 58, reaction: 68, cognitive: 61 },
  { date: 'Mar 28', memory: 70, focus: 63, reaction: 69, cognitive: 65 },
];

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [memory, setMemory] = useState<GameResult | null>(null);
  const [focus, setFocus] = useState<GameResult | null>(null);
  const [reaction, setReaction] = useState<GameResult | null>(null);
  const [cognitive, setCognitive] = useState<GameResult | null>(null);
  const [history] = useState<HistoryEntry[]>(MOCK_HISTORY);

  const saveResult = useCallback(
    (game: 'memory' | 'focus' | 'reaction' | 'cognitive', result: GameResult) => {
      if (game === 'memory') setMemory(result);
      if (game === 'focus') setFocus(result);
      if (game === 'reaction') setReaction(result);
      if (game === 'cognitive') setCognitive(result);
    },
    []
  );

  const getOverallScore = useCallback(() => {
    const scores = [memory?.score, focus?.score, reaction?.score, cognitive?.score].filter(
      (s) => s != null
    ) as number[];
    if (scores.length === 0) return 67;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [memory, focus, reaction, cognitive]);

  return (
    <GameContext.Provider
      value={{ memory, focus, reaction, cognitive, history, saveResult, getOverallScore }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameContext must be used within GameProvider');
  return ctx;
}
