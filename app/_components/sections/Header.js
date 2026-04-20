/**
 * @file Header
 * @module Header
 */

import Navigation from './Navigation';
import Logo from '../ui/Logo';
import ScrollHeader from '../ui/ScrollHeader';

export default function Header({ session }) {
  return (
    <ScrollHeader>
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <Logo />
        <Navigation session={session} />
      </div>
    </ScrollHeader>
  );
}
