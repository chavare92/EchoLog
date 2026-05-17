import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { AppRouter } from './router/AppRouter';

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <>
      {isOffline && (
        <div role="alert" aria-live="assertive" className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-white text-sm font-medium py-2 px-4 shadow-md">
          <WifiOff className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>You are offline. Some features may be unavailable.</span>
        </div>
      )}
      <AppRouter />
    </>
  );
}

export default App;
