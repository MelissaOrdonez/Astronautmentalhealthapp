import { RouterProvider } from 'react-router';
import { router } from './routes';
import { GameProvider } from './context/GameContext';

export default function App() {
  return (
    <GameProvider>
      <div
        className="min-h-screen w-full flex justify-center items-start"
        style={{ background: '#020208', height: '100dvh', overflow: 'hidden' }}
      >
        <div
          className="w-full max-w-sm relative"
          style={{ height: '100dvh', overflow: 'hidden' }}
        >
          <RouterProvider router={router} />
        </div>
      </div>
    </GameProvider>
  );
}