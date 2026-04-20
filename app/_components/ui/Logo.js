/**
 * @file Logo
 * @module Logo
 */

import Link from 'next/link';
import Image from 'next/image';
import { CodeXml } from 'lucide-react';

function Logo() {
  return (
    <Link
      href="/"
      className="group focus-visible:ring-primary-500/50 relative flex items-center gap-2.5 rounded-xl transition-all duration-300 focus-visible:ring-2 focus-visible:outline-none sm:gap-3"
      aria-label="Home"
    >
      {/* Left: Logo Icon Block */}
      <div className="relative flex shrink-0 items-center justify-center">
        {/* Ambient dynamic glow */}
        <div className="bg-primary-500/0 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-500/25 absolute inset-0 z-0 scale-[1.5] rounded-full blur-xl transition-all duration-500" />

        {/* Glassmorphic Logo Container */}
        <div className="group-hover:border-primary-500/30 group-hover:shadow-glow dark:bg-surface-2/60 dark:group-hover:border-primary-400/30 dark:group-hover:bg-surface-2 relative z-10 flex h-9 w-9 overflow-hidden rounded-xl border border-slate-200/50 bg-white/60 shadow-sm backdrop-blur-md transition-all duration-500 group-hover:scale-[1.05] group-hover:bg-white sm:h-10 sm:w-10 dark:border-white/10">
          <Image
            src="/logo.png"
            alt="NEUPC Logo"
            fill
            sizes="(max-width: 640px) 36px, 40px"
            className="object-cover p-0 transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>

      {/* Middle: Brand Name (Responsive handling) */}
      <div className="flex flex-col justify-center">
        <span className="font-heading group-hover:text-primary-600 dark:group-hover:text-primary-400 text-[1.1rem] leading-none font-bold tracking-tight text-slate-900 transition-colors duration-300 sm:text-xl dark:text-white">
          {/* N<span className="lowercase text-[0.8em]">e</span>UPC */}
          NEUPC
        </span>
        <span className="mt-0.5 hidden text-[0.6875rem] font-medium tracking-widest text-slate-500 transition-colors duration-300 group-hover:text-slate-700 md:block dark:text-slate-400 dark:group-hover:text-slate-300">
          NeU Programming Club
        </span>
      </div>

      {/* Right: Decorative element (Desktop only) */}
      <div className="hidden items-center gap-3 pl-2 opacity-40 transition-all duration-500 group-hover:opacity-100 lg:flex">
        <div className="h-6 w-[1.5px] rounded-full bg-slate-200 dark:bg-white/10" />
        <CodeXml
          className="text-primary-600 dark:text-primary-400 h-4 w-4 transition-transform duration-500 group-hover:scale-110"
          strokeWidth={2.5}
          aria-hidden
        />
      </div>
    </Link>
  );
}

export default Logo;
