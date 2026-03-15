/**
 * @file Header
 * @module Header
 */

import { Suspense } from 'react';
import Navigation from './Navigation';
import Logo from '../ui/Logo';

/** Site header — logo and navigation bar. */
function Header() {
  return (
    <header className="border-primary-900 border-b px-4 py-4 sm:px-6 sm:py-5 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Logo />
        <Suspense fallback={<div className="h-10 w-48" />}>
          <Navigation />
        </Suspense>
      </div>
    </header>
  );
}

export default Header;
