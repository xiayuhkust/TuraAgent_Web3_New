import { useEffect, useState } from 'react';

export function useSessionTimeout(expirationMs: number, onTimeout: () => void) {
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  useEffect(() => {
    const handleActivity = () => setLastInteraction(Date.now());
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      if (Date.now() - lastInteraction > expirationMs) {
        onTimeout();
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [expirationMs, onTimeout, lastInteraction]);

  return { lastInteraction };
}
