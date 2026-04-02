'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  variant?: 'up' | 'slide-left' | 'slide-right' | 'scale' | 'blur';
  stagger?: boolean;
  className?: string;
  delay?: number;
  threshold?: number;
}

export function ScrollReveal({
  children,
  variant = 'up',
  stagger = false,
  className = '',
  delay = 0,
  threshold = 0.15,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            setTimeout(() => el.classList.add('revealed'), delay);
          } else {
            el.classList.add('revealed');
          }
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, threshold]);

  const revealAttr = variant === 'up' ? '' : variant;

  return (
    <div
      ref={ref}
      data-reveal={revealAttr || undefined}
      {...(stagger ? { 'data-reveal-stagger': '' } : {})}
      className={className}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
