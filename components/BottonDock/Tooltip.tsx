'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  children: React.ReactNode;
  className?: string;
  position?: (
    triggerRect: DOMRect,
    tooltipRect: DOMRect
  ) => { left: number; top: number };
}

export function Tooltip({
  label,
  children,
  className,
  position
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [coords, setCoords] = React.useState({ left: 0, top: 0 });
  const [mounted, setMounted] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!wrapperRef.current || !tooltipRef.current) return;

    // Get the first child element for positioning
    const triggerEl = wrapperRef.current.children[0] as HTMLElement;
    if (!triggerEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    if (position) {
      // Custom position function - but don't add scroll for fixed positioning
      const customCoords = position(triggerRect, tooltipRect);
      setCoords({
        left: customCoords.left - window.scrollX,
        top: customCoords.top - window.scrollY
      });
    } else {
      const triggerCenter = triggerRect.left + triggerRect.width / 2;
      const left = triggerCenter - tooltipRect.width / 2;
      const maxLeft = window.innerWidth - tooltipRect.width - 2;
      // Don't add scroll offsets since tooltip is position: fixed
      setCoords({
        left: Math.min(Math.max(2, left), maxLeft),
        top: triggerRect.top - tooltipRect.height - 8
      });
    }
  }, [position]);

  React.useEffect(() => {
    if (!isVisible || !mounted) return;

    // Continuously update position while visible (for animated elements)
    let rafId: number;
    const tick = () => {
      updatePosition();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [isVisible, mounted, updatePosition]);

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      style={{ display: 'inline-flex' }}
    >
      {children}
      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          className={className}
          style={{
            position: 'fixed',
            left: coords.left,
            top: coords.top,
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
          {label}
        </div>,
        document.body
      )}
    </div>
  );
}

