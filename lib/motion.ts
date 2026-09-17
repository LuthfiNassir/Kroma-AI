/**
 * KROMA MOTION SYSTEM
 * Central Motion Configuration & Reusable Animation Language
 * Built with Motion.dev / Framer Motion 13.x
 *
 * Principles:
 * - Editorial, fluid, restrained, technical, intentional.
 * - Fast UI micro-interactions (~150-220ms).
 * - Component entrances (~300-450ms) with subtle y-translation (6-14px).
 * - Transform and opacity animations only (no layout reflow).
 * - Full support for prefers-reduced-motion.
 * - Strict Watermelon UI palette: #212222, #18191b, #FE6749, #A5329E.
 * - Zero emojis.
 */

import { Variants, Transition } from "framer-motion";

// ============================================================================
// 1. TIMING TOKENS (seconds)
// ============================================================================
export const DURATION = {
  micro: 0.16, // 160ms - buttons, toggles, chips
  ui: 0.22, // 220ms - dropdowns, tooltips, hover lifts
  entrance: 0.35, // 350ms - cards, table rows, message bubbles
  modal: 0.28, // 280ms - modal dialogs, drawers
  dashboard: 0.45, // 450ms - full dashboard sections, views
  slow: 0.65, // 650ms - atmospheric drift, background glow
} as const;

// ============================================================================
// 2. EASING CURVES & SPRING CONFIGURATIONS
// ============================================================================
export const EASING = {
  // Editorial luxury ease-out curve (fast start, gradual deceleration)
  editorial: [0.16, 1, 0.3, 1] as const,
  // Snappy deceleration for UI controls
  snappy: [0.22, 1, 0.36, 1] as const,
  // Standard smooth ease-in-out for reciprocal transitions
  easeInOut: [0.4, 0, 0.2, 1] as const,
  // Soft deceleration for large layout areas
  softOut: [0.25, 0.9, 0.3, 1] as const,
};

export const SPRINGS = {
  responsive: {
    type: "spring" as const,
    stiffness: 380,
    damping: 30,
    mass: 0.8,
  },
  gentle: {
    type: "spring" as const,
    stiffness: 240,
    damping: 26,
    mass: 1,
  },
  bouncyModal: {
    type: "spring" as const,
    stiffness: 320,
    damping: 28,
  },
};

export const TRANSITIONS = {
  micro: {
    duration: DURATION.micro,
    ease: EASING.snappy,
  } as Transition,
  ui: {
    duration: DURATION.ui,
    ease: EASING.editorial,
  } as Transition,
  entrance: {
    duration: DURATION.entrance,
    ease: EASING.editorial,
  } as Transition,
  modal: {
    duration: DURATION.modal,
    ease: EASING.editorial,
  } as Transition,
  dashboard: {
    duration: DURATION.dashboard,
    ease: EASING.editorial,
  } as Transition,
};

// ============================================================================
// 3. REUSABLE MOTION VARIANTS
// ============================================================================

/**
 * Standard container with children stagger orchestration
 */
export const staggerContainer = (
  staggerChildren = 0.05,
  delayChildren = 0.02
): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.micro,
    },
  },
});

/**
 * Fade In without translation
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: TRANSITIONS.entrance,
  },
  exit: {
    opacity: 0,
    transition: TRANSITIONS.micro,
  },
};

/**
 * Editorial Slide Up Entrance (subtle y: 12px -> 0)
 */
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.entrance,
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: TRANSITIONS.micro,
  },
};

/**
 * Bento Dashboard Card Entrance
 */
export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: TRANSITIONS.entrance,
  },
  exit: {
    opacity: 0,
    y: 6,
    scale: 0.99,
    transition: TRANSITIONS.micro,
  },
};

/**
 * Universal Composer Attachment Chip Enter/Exit
 */
export const chipEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.92, x: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      duration: DURATION.ui,
      ease: EASING.editorial,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    x: -8,
    transition: {
      duration: DURATION.micro,
      ease: EASING.snappy,
    },
  },
};

/**
 * Pasted Data Detection / Alert Banner Enter/Exit
 */
export const bannerSlideDown: Variants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: "auto",
    transition: {
      duration: DURATION.ui,
      ease: EASING.editorial,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    height: 0,
    transition: {
      duration: DURATION.micro,
      ease: EASING.snappy,
    },
  },
};

/**
 * Deep-Dive ChartModal Backdrop Fade
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.modal,
      ease: EASING.editorial,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.micro,
      ease: EASING.snappy,
    },
  },
};

/**
 * Deep-Dive ChartModal Dialog Scale & Fade
 */
export const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: DURATION.modal,
      ease: EASING.editorial,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 6,
    transition: {
      duration: DURATION.micro,
      ease: EASING.snappy,
    },
  },
};

/**
 * Deep-Dive Modal Right Narrative Section Progressive Reveal
 */
export const modalSectionReveal: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: EASING.editorial,
    },
  },
};

/**
 * Chat Message - User
 */
export const chatMessageUser: Variants = {
  hidden: { opacity: 0, y: 10, x: 6 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: {
      duration: DURATION.entrance,
      ease: EASING.editorial,
    },
  },
};

/**
 * Chat Message - Assistant & Inline Charts
 */
export const chatMessageAssistant: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.entrance,
      ease: EASING.editorial,
    },
  },
};

/**
 * Source DataTable Row Entrance
 */
export const tableRowVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18,
      ease: EASING.editorial,
    },
  },
};

/**
 * Page & View Transitions (Landing <-> Dashboard)
 */
export const pageViewVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.dashboard,
      ease: EASING.editorial,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: DURATION.ui,
      ease: EASING.snappy,
    },
  },
};

/**
 * Button Hover & Tap Micro-Interactions
 */
export const buttonTapMotion = {
  whileHover: { y: -1, scale: 1.01 },
  whileTap: { scale: 0.98, y: 0 },
  transition: { duration: DURATION.micro, ease: EASING.snappy },
};

export const subtleHoverMotion = {
  whileHover: { y: -2, transition: { duration: DURATION.ui, ease: EASING.editorial } },
};

/**
 * Atmospheric Hero Ambient Float (Drift)
 */
export const ambientFloatVariants: Variants = {
  initial: { opacity: 0.6, scale: 1 },
  animate: {
    opacity: [0.6, 0.75, 0.6],
    scale: [1, 1.02, 1],
    transition: {
      duration: 12,
      repeat: Infinity,
      repeatType: "mirror",
      ease: "easeInOut",
    },
  },
};
