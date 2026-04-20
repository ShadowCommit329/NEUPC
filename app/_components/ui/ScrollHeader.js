'use client';

import { useState, useEffect, useRef } from 'react';

export default function ScrollHeader({ children }) {
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!headerRef.current) return;
    const update = () => {
      document.documentElement.style.setProperty(
        '--header-h',
        `${headerRef.current.offsetHeight}px`
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 isolate z-[200] w-full border-b backdrop-blur-2xl transition-all duration-300 ${
        scrolled
          ? 'border-slate-200/80 bg-white/80 py-3 dark:border-white/5 dark:bg-[#05060b]/80'
          : 'border-slate-200/60 bg-white/85 py-3 sm:py-4 lg:border-transparent lg:bg-transparent lg:py-5 dark:border-white/10 dark:bg-[#05060b]/85'
      }`}
    >
      {children}
    </header>
  );
}
