import { createBrowserRouter } from 'react-router';
import { HomePage } from './components/HomePage';
import { EcosystemScreen } from './components/EcosystemScreen';
import { MemoryGame } from './components/games/MemoryGame';
import { FocusGame } from './components/games/FocusGame';
import { ReactionGame } from './components/games/ReactionGame';
import { CognitiveGame } from './components/games/CognitiveGame';
import { MeditationScreen } from './components/MeditationScreen';
import { Dashboard } from './components/Dashboard';

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/ecosystem', Component: EcosystemScreen },
  { path: '/memory', Component: MemoryGame },
  { path: '/focus', Component: FocusGame },
  { path: '/reaction', Component: ReactionGame },
  { path: '/cognitive', Component: CognitiveGame },
  { path: '/meditation', Component: MeditationScreen },
  { path: '/dashboard', Component: Dashboard },
]);
