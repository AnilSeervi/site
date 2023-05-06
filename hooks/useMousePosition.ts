'use client';

import { useSpring } from '@react-spring/web';
import { useEffect } from 'react';

export const useMousePosition = (
  onChange: (value: { value: { x: number; y: number } }) => void,
  springDeps?: readonly any[]
) => {
  const [{}, api] = useSpring(
    () => ({
      x: 0,
      y: 0
    }),
    springDeps
  );

  useEffect(() => {
    if (window.innerWidth < 768) return;
    const handleMouseMove = (event: MouseEvent) => {
      api.set({ x: event.clientX, y: event.clientY });
      onChange({ value: { x: event.clientX, y: event.clientY } });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [api, onChange]);
};
