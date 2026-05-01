import Link from 'next/link';
import { Mail, MapPin } from 'lucide-react';

const defaultSocial = {
  facebook: 'https://facebook.com',
  github: 'https://github.com',
  linkedin: 'https://linkedin.com',
  youtube: 'https://youtube.com',
  twitter: 'https://twitter.com',
};

const defaultContact = {
  email: 'contact@neupc.edu',
  phone: '+880 123 456 7890',
  address: 'Netrokona University\nNetrokona, Bangladesh',
};

const defaultDescription =
  'A technical sanctum dedicated to the advancement of competitive programming and systems engineering at Netrokona University.';

// Inline SVG brand icons — no extra dependency needed
const BRAND_ICONS = {
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.4a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="black"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M4 4l16 16M4 20L20 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M3 5h4l10 14h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
};

const SOCIAL_HOVER = {
  facebook: 'hover:text-blue-400',
  github: 'hover:text-neon-lime',
  linkedin: 'hover:text-sky-400',
  youtube: 'hover:text-red-400',
  twitter: 'hover:text-zinc-200',
};

const NAV_LINKS = [
  { href: '/about', label: 'About Us' },
  { href: '/events', label: 'Events' },
  { href: '/achievements', label: 'Achievements' },
  { href: '/committee', label: 'Committee' },
  { href: '/gallery', label: 'Gallery' },
];

const RESOURCE_LINKS = [
  { href: '/blogs', label: 'Blog' },
  { href: '/roadmaps', label: 'Roadmaps' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer({
  session,
  social = {},
  contact = {},
  footer = {},
  settings = {},
}) {
  const currentYear = new Date().getFullYear();
  const isLoggedIn = !!session?.user;

  const socialLinks = { ...defaultSocial, ...social };
  const contactInfo = { ...defaultContact, ...contact };
  const footerDescription = footer.description || defaultDescription;

  const activeSocials = Object.entries(socialLinks).filter(([, url]) => url);

  const resourceLinks = [
    ...RESOURCE_LINKS,
    ...(!isLoggedIn ? [{ href: '/join', label: 'Join Us' }] : []),
  ];

  return (
    <footer className="relative pb-10 pt-16 sm:pb-12 sm:pt-20 lg:pt-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Top divider */}
        <div className="mb-12 h-px w-full bg-linear-to-r from-transparent via-neon-lime/15 to-transparent sm:mb-16 lg:mb-20" />

        {/* Main grid — stacks on mobile, 2-col on md, 4-col on lg */}
        <div className="mb-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:mb-16 sm:gap-x-10 md:grid-cols-4 lg:mb-20 lg:gap-x-16">

          {/* Brand — full width on mobile, spans 2 cols on md+ */}
          <div className="col-span-2 space-y-5 md:col-span-2 lg:col-span-1">
            <div className="font-heading text-2xl font-black italic tracking-tighter text-white sm:text-3xl">
              {settings?.site_name || 'NEUPC'}
            </div>
            <p className="max-w-xs text-sm font-light italic leading-relaxed text-zinc-500">
              {footerDescription}
            </p>
            {/* Social icons */}
            <div className="flex flex-wrap gap-3 pt-1">
              {activeSocials.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={platform}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 text-zinc-500 transition-all hover:border-white/20 hover:scale-110 ${SOCIAL_HOVER[platform] ?? 'hover:text-neon-lime'}`}
                >
                  {BRAND_ICONS[platform] ?? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1 space-y-4 sm:space-y-5">
            <p className="font-heading text-[10px] font-bold uppercase tracking-widest text-white sm:text-[11px]">
              Explore
            </p>
            <ul className="space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-all hover:translate-x-1 hover:text-neon-lime sm:text-[11px]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="col-span-1 space-y-4 sm:space-y-5">
            <p className="font-heading text-[10px] font-bold uppercase tracking-widest text-white sm:text-[11px]">
              Resources
            </p>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-block font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-all hover:translate-x-1 hover:text-neon-lime sm:text-[11px]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — full width on mobile so address/email aren't squeezed */}
          <div className="col-span-2 space-y-4 sm:space-y-5 md:col-span-1">
            <p className="font-heading text-[10px] font-bold uppercase tracking-widest text-white sm:text-[11px]">
              Contact
            </p>
            <ul className="space-y-3">
              {contactInfo.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neon-lime" />
                  <span className="text-xs font-light italic leading-relaxed text-zinc-500">
                    {contactInfo.address.split('\n').join(', ')}
                  </span>
                </li>
              )}
              {contactInfo.email && (
                <li className="flex items-center gap-2.5">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-neon-lime" />
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="text-xs font-light italic text-zinc-500 transition-colors hover:text-neon-lime"
                  >
                    {contactInfo.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-4 border-t border-white/5 pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600 sm:text-[10px]">
            © {currentYear}{' '}
            {settings?.site_name_full || 'Netrokona University Programming Club'}.
            All rights reserved.
          </p>
          <Link
            href="/developers"
            className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-600 transition-colors hover:text-neon-lime sm:text-[10px]"
          >
            {settings?.footer_developer_credit || 'Built by NEUPC Devs'}
          </Link>
        </div>

      </div>
    </footer>
  );
}
