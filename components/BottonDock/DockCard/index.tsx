'use client';

import * as React from 'react';
import {
  animated,
  useIsomorphicLayoutEffect,
  useSpringValue
} from '@react-spring/web';

import { useWindowResize } from 'hooks/useWindowResize';
import { useMousePosition } from 'hooks/useMousePosition';
import { useDock } from '../Dock/DockContext';
import { cn } from 'utils';
import { Tooltip } from '@reach/tooltip';

interface DockCardProps {
  children: React.ReactNode;
  showDot: boolean;
  label: string;
}

const INITIAL_WIDTH = 40;

export const DockCard = ({ children, showDot, label }: DockCardProps) => {
  const cardRef = React.useRef<HTMLButtonElement>(null!);
  /**
   * This doesn't need to be real time, think of it as a static
   * value of where the card should go to at the end.
   */
  const [elCenterX, setElCenterX] = React.useState<number>(0);

  const size = useSpringValue(INITIAL_WIDTH, {
    config: {
      mass: 0.1,
      tension: 320
    }
  });

  const opacity = useSpringValue(0);
  const y = useSpringValue(0, {
    config: {
      friction: 1,
      tension: 0,
      damping: 1,
      mass: 0.1
    }
  });
  const toolTipY = useSpringValue(0, {
    config: {
      friction: 1,
      tension: 0,
      damping: 1,
      mass: 0.1
    }
  });

  const dock = useDock();
  /**
   * This is just an abstraction around a `useSpring` hook, if you wanted you could do this
   * in the hook above, but these abstractions are useful to demonstrate!
   */
  useMousePosition(
    ({ value }) => {
      const mouseX = value.x;
      if (dock.width > 0) {
        const transformedValue =
          INITIAL_WIDTH +
          36 *
            Math.cos((((mouseX - elCenterX) / dock.width) * Math.PI) / 2) ** 33;
        if (dock.hovered) {
          size.start(transformedValue);
        }
      }
    },
    [elCenterX, dock]
  );

  useIsomorphicLayoutEffect(() => {
    if (!dock.hovered) {
      size.start(INITIAL_WIDTH);
    }
  }, [dock.hovered]);

  useWindowResize(() => {
    const { x } = cardRef.current.getBoundingClientRect();

    setElCenterX(x + INITIAL_WIDTH / 2);
  });

  const timesLooped = React.useRef(0);
  const timeoutRef = React.useRef<number>();
  const isAnimating = React.useRef(false);

  const handleClick = () => {
    if (!isAnimating.current) {
      isAnimating.current = true;
      opacity.start(0.5);

      timesLooped.current = 0;

      y.start(-(INITIAL_WIDTH + 10) / 2, {
        loop: () => {
          if (1 === timesLooped.current++) {
            timeoutRef.current = window.setTimeout(() => {
              opacity.start(0);
              y.set(0);
              isAnimating.current = false;
              timeoutRef.current = undefined;
            }, 0);

            y.stop();
          }

          return {
            reverse: true,
            config: {
              friction: 1,
              tension: 0,
              damping: 1,
              bounce: 0,
              mass: 0.3
            }
          };
        }
      });
    } else {
      /**
       * Allow premature exit of animation
       * on a second click if we're currently animating
       */
      clearTimeout(timeoutRef.current);
      opacity.start(0);
      y.start(0);
      isAnimating.current = false;
    }
  };

  React.useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return (
    <Tooltip
      label={label}
      className="dock-card-tooltip reach-tooltip"
      position={(triggerRect, tooltipRect) => ({
        top: triggerRect.top - tooltipRect.height - 10,
        left: triggerRect.left - tooltipRect.width / 2 + triggerRect.width / 2
      })}
    >
      <animated.button
        ref={cardRef}
        className={'dock-card'}
        onClick={handleClick}
        onMouseDown={(e) => {
          y.start(5, {
            config: {
              friction: 28,
              tension: 500,
              mass: 0.3
            }
          });
        }}
        style={{
          width: size,
          height: size,
          top: y
        }}
      >
        <div aria-hidden="true" className={'dock-card-shimmer'} />
        {children}
        <div
          className={cn(
            'absolute bottom-[-6px] z-[1] h-1 w-1 rounded-full bg-[#dbdbdb] opacity-0 transition-opacity duration-1000 dark:bg-[#3e3e3e]',
            showDot && 'opacity-100'
          )}
        ></div>
      </animated.button>
    </Tooltip>
  );
};
