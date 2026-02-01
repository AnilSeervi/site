import * as React from 'react';
import { useCallbackRef } from './useCallbackRef';

export const useWindowResize = (
  callback: (width: number, height: number) => void
) => {
  const callbackRef = useCallbackRef(callback);

  React.useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      callbackRef(window.innerWidth, window.innerHeight);
    };

    // Delay initial call to ensure refs are attached
    const timeoutId = setTimeout(handleResize, 0);

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, [callbackRef]);
};
