/**
 * @file App page
 * @module AppPage
 */

import Image from 'next/image';

import bg_img from '@/public/bg.webp';
import Hero from './_components/sections/Hero';
import About from './_components/sections/About';
import Events from './_components/sections/Events';
import Achievements from './_components/sections/Achievements';
import Blogs from './_components/sections/Blogs';
import Join from './_components/sections/Join';
import Wave from './_components/ui/Wave';
import ScrollToTop from './_components/ui/ScrollToTop';
import ScrollReveal from './_components/ui/ScrollReveal';
import { OrganizationJsonLd, WebsiteJsonLd } from './_components/ui/JsonLd';
import { getHomePageData } from './_lib/public-actions';
import { buildMetadata } from './_lib/seo';

export const metadata = buildMetadata({
  title: 'NEUPC - Netrokona University Programming Club',
  description:
    'NEUPC — Netrokona University Programming Club. Join our community for competitive programming, workshops, mentorship, and ICPC preparation at Netrokona University, Bangladesh.',
  pathname: '/',
  keywords: [
    'programming community',
    'workshops',
    'mentorship',
    'ICPC preparation',
    'Netrokona University Programming Club',
  ],
});

// ─── Background Overlay Stack ───────────────────────────────────────────────
// Multiple fixed layers for depth, texture, and readability on the hero image.
function BackgroundOverlays() {
  return (
    <>
      {/* Deep dark base layer */}
      <div className="fixed inset-0 -z-10 bg-black/75" />

      {/* Vertical gradient for depth */}
      <div className="fixed inset-0 -z-10 bg-linear-to-b from-black/85 via-black/60 to-black/90" />

      {/* Radial vignette — cinematic focus */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* Subtle color grading — deep teal/blue tint */}
      <div className="fixed inset-0 -z-10 bg-linear-to-br from-blue-950/20 via-black/10 to-teal-950/15" />

      {/* Corner vignette shadow */}
      <div className="fixed inset-0 -z-10 shadow-[inset_0_0_200px_rgba(0,0,0,0.6)]" />

      {/* Subtle dot grid — refined */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.08]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Film grain — barely visible for texture */}
      <div
        className="fixed inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        }}
      />
    </>
  );
}

// ─── Homepage ───────────────────────────────────────────────────────────────
export default async function HomePage() {
  const {
    hero,
    about,
    events,
    featuredEvents,
    recentEvents,
    achievements,
    participations,
    featuredBlogs,
    recentBlogs,
    stats,
    joinBenefits,
    settings,
  } = await getHomePageData();

  return (
    <main className="relative min-h-screen">
      {/* Structured Data */}
      <OrganizationJsonLd />
      <WebsiteJsonLd />

      {/* Full-screen background image */}
      <Image
        src={bg_img}
        placeholder="blur"
        quality={75}
        sizes="100vw"
        className="fixed inset-0 -z-10 h-full w-full object-cover object-top"
        alt={settings?.site_name || 'NEUPC'}
        priority
      />
      <BackgroundOverlays />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <Hero data={hero} settings={settings} />
      <Wave />

      {/* ── About ───────────────────────────────────────────────────── */}
      <About data={about} settings={settings} />
      <Wave />

      {/* ── Events ──────────────────────────────────────────────────── */}
      <ScrollReveal animation="fade-up" duration={900}>
        <Events
          events={events}
          featuredEvents={featuredEvents}
          recentEvents={recentEvents}
          settings={settings}
        />
      </ScrollReveal>
      <Wave />

      {/* ── Achievements ────────────────────────────────────────────── */}
      <ScrollReveal animation="fade-up" duration={900}>
        <Achievements
          achievements={achievements}
          participations={participations}
          stats={stats}
          settings={settings}
        />
      </ScrollReveal>
      <Wave />

      {/* ── Blogs ───────────────────────────────────────────────────── */}
      <ScrollReveal animation="fade-up" duration={900}>
        <Blogs
          featuredBlogs={featuredBlogs}
          recentBlogs={recentBlogs}
          settings={settings}
        />
      </ScrollReveal>
      <Wave />

      {/* ── Join ────────────────────────────────────────────────────── */}
      <ScrollReveal animation="scale-up" duration={900}>
        <Join benefits={joinBenefits} settings={settings} />
      </ScrollReveal>
      <Wave />

      <ScrollToTop />
    </main>
  );
}
