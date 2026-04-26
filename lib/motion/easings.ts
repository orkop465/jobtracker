/**
 * Easing functions for the motion layer.
 * See spec §4.4 for the motion principles these enforce.
 */

/** Ease-out-quart: entrances, standard reveals. */
export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** Ease-in-out-cubic: loops, transitions that start and end at rest. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** CSS cubic-bezier string matching easeOutQuart for use in style attributes. */
export const CSS_EASE_OUT_QUART = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** CSS cubic-bezier string matching easeInOutCubic. */
export const CSS_EASE_IN_OUT_CUBIC = 'cubic-bezier(0.65, 0, 0.35, 1)';
