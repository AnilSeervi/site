'use client';

import * as React from 'react';
import { animated, useSpringValue } from '@react-spring/web';

// Workaround for @react-spring/web not having React 19 types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedDiv = animated.div as any;

export const clamp = (min: number, max: number, v: number) =>
  Math.min(Math.max(v, min), max);
import { useWindowResize } from 'hooks/useWindowResize';
import { DockContext } from './DockContext';
import { cn } from 'utils';

interface DockProps {
  children: React.ReactNode;
  showDot?: boolean;
}

export const DOCK_ZOOM_LIMIT = [-100, 50];

export const Dock = ({ children, showDot }: DockProps) => {
  const [hovered, setHovered] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const isZooming = React.useRef(false);
  const dockRef = React.useRef<HTMLDivElement>(null);

  const setIsZooming = React.useCallback((value: boolean) => {
    isZooming.current = value;
    setHovered(!value);
  }, []);

  const zoomLevel = useSpringValue(1, {
    onChange: () => {
      if (dockRef.current) {
        setWidth(dockRef.current.clientWidth);
      }
    }
  });

  useWindowResize(() => {
    if (dockRef.current) {
      setWidth(dockRef.current.clientWidth);
    }
  });

  return (
    <DockContext.Provider value={{ hovered, setIsZooming, width, zoomLevel }}>
      <AnimatedDiv
        ref={dockRef}
        className={cn(
          'dock',
          'rounded-full border border-[#00000012] bg-slate-50/70 dark:border-[#ffffff14] dark:bg-neutral-900/80'
        )}
        onMouseOver={() => {
          if (!isZooming.current) {
            setHovered(true);
          }
        }}
        onMouseOut={() => {
          setHovered(false);
        }}
        style={{
          x: '-50%',
          y: '-50%',
          ['--scale' as any]: zoomLevel
            .to({
              range: [DOCK_ZOOM_LIMIT[0], 1, DOCK_ZOOM_LIMIT[1]],
              output: [2, 1, 0.5]
            })
            .to((value) => clamp(0.5, 2, value)),
          scale: zoomLevel
            .to({
              range: [DOCK_ZOOM_LIMIT[0], 1, DOCK_ZOOM_LIMIT[1]],
              output: [2, 1, 0.5]
            })
            .to((value) => clamp(0.5, 2, value))
        }}
      >
        <div
          className={cn(
            'absolute dark:top-[-1px] dark:z-[-1] dark:h-[1px] dark:w-[95%] dark:opacity-60',
            'dock_shimmer'
          )}
        />
        <div className="dock-inner flex w-full items-end gap-2 py-2">
          {children}
        </div>
      </AnimatedDiv>
    </DockContext.Provider>
  );
};
