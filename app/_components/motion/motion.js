/**
 * @file Central animation presets and reusable Framer Motion variants.
 * Import these across all pages for consistent animation behavior.
 *
 * @module motion
 */

// ─── Spring Configs ───────────────────────────────────────────────────────────

/** Gentle spring — smooth, no bounce. Great for page-level fades. */
export const gentleSpring = { type: 'spring', stiffness: 100, damping: 20 };

/** Smooth spring — slightly faster, minimal bounce. Good for cards. */
export const smoothSpring = { type: 'spring', stiffness: 150, damping: 25 };

/** Bouncy spring — playful micro-interaction. Use for buttons/icons. */
export const bouncySpring = { type: 'spring', stiffness: 300, damping: 15 };

/** Default ease for quick fades. */
export const defaultEase = { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] };

// ─── Viewport / Trigger Config ────────────────────────────────────────────────

/** Default whileInView trigger config — fires once, with generous margin. */
export const viewportConfig = {
  once: true,
  margin: '-60px 0px',
  amount: 0.15,
};

// ─── Entry Variants ───────────────────────────────────────────────────────────

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: defaultEase },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { ...defaultEase, duration: 0.6 } },
};

export const fadeDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: defaultEase },
};

export const fadeLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: defaultEase },
};

export const fadeRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: defaultEase },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: smoothSpring },
};

export const springPop = {
  hidden: { opacity: 0, scale: 0.6 },
  visible: { opacity: 1, scale: 1, transition: bouncySpring },
};

// ─── Stagger Container ───────────────────────────────────────────────────────

/**
 * Creates a stagger container variant.
 * @param {number} stagger — delay between children (default 0.08s)
 * @param {number} delay   — initial delay before stagger starts
 */
export function staggerContainer(stagger = 0.08, delay = 0) {
  return {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };
}

// ─── Page Transition Variants ─────────────────────────────────────────────────

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─── Hover & Tap Presets ──────────────────────────────────────────────────────

/** Subtle card hover — lift + scale */
export const cardHover = {
  y: -4,
  scale: 1.015,
  transition: smoothSpring,
};

/** Button hover — slight scale */
export const buttonHover = {
  scale: 1.04,
  transition: { type: 'spring', stiffness: 400, damping: 17 },
};

/** Button tap — press down */
export const buttonTap = {
  scale: 0.97,
};
