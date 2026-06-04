/**
 * Spribe Aviator–style flight path: starts flat from bottom-left, then climbs on a power curve.
 * Progress uses log(multiplier) so motion matches exponential server growth.
 */

export const CURVE_POWER = 1.72;
/** Multiplier at which the plane reaches the top-right of the plot area */
export const MAX_MULT_ON_SCREEN = 50;

export interface FlightPlot {
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  plotW: number;
  plotH: number;
}

export function getPlot(dw: number, dh: number): FlightPlot {
  const padL = 6;
  const padR = Math.min(72, dw * 0.12);
  const padT = Math.min(48, dh * 0.1);
  const padB = 6;
  return {
    padL,
    padR,
    padT,
    padB,
    plotW: Math.max(40, dw - padL - padR),
    plotH: Math.max(40, dh - padT - padB),
  };
}

export function multiplierToProgress(mult: number): number {
  if (mult <= 1) return 0;
  return Math.min(1, Math.log(mult) / Math.log(MAX_MULT_ON_SCREEN));
}

export function curvePoint(plot: FlightPlot, dh: number, progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return {
    x: plot.padL + plot.plotW * p,
    y: dh - plot.padB - plot.plotH * Math.pow(p, CURVE_POWER),
  };
}

export function curveYAt(plot: FlightPlot, dh: number, u: number) {
  const p = Math.max(0, Math.min(1, u));
  return dh - plot.padB - plot.plotH * Math.pow(p, CURVE_POWER);
}

/** Tangent angle (radians) at progress p — shallow at takeoff, steeper later */
export function curveTangentAngle(plot: FlightPlot, dh: number, progress: number): number {
  const p = Math.max(0.001, Math.min(1, progress));
  const dx = plot.plotW;
  const dy = -plot.plotH * CURVE_POWER * Math.pow(p, CURVE_POWER - 1);
  return Math.atan2(dy, dx);
}
