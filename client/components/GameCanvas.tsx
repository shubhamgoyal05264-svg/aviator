
import React, { useEffect, useRef } from 'react';
import { GameStatus } from '../types';
import { FLIGHT_GROWTH_RATE } from '../constants';
import {
  curvePoint,
  curveTangentAngle,
  curveYAt,
  getPlot,
  multiplierToProgress,
} from '../utils/flightCurve';

interface Props {
  status: GameStatus;
  multiplier: number;
  timeElapsed: number;
}

const PLANE_SRC = '/plane.png';
/** Tail / rear wheel sits on the curve tip (Spribe-style) */
const PLANE_ANCHOR_X = 0.14;
const PLANE_ANCHOR_Y = 0.72;

function planeSpriteFromImage(src: HTMLImageElement, onReady: (img: HTMLImageElement) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = src.naturalWidth;
  canvas.height = src.naturalHeight;
  const c = canvas.getContext('2d');
  if (!c) {
    onReady(src);
    return;
  }
  c.drawImage(src, 0, 0);
  const data = c.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    if (r < 40 && g < 40 && b < 40) data.data[i + 3] = 0;
  }
  c.putImageData(data, 0, 0);
  const out = new Image();
  out.onload = () => onReady(out);
  out.src = canvas.toDataURL('image/png');
}

const GameCanvas: React.FC<Props> = ({ status, multiplier, timeElapsed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ status, multiplier, timeElapsed });
  stateRef.current = { status, multiplier, timeElapsed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const planeSprite = { img: null as HTMLImageElement | null, ready: false };
    let PLANE_ASPECT = 95 / 200;

    const rawPlane = new Image();
    rawPlane.onload = () => {
      PLANE_ASPECT = rawPlane.naturalHeight / rawPlane.naturalWidth;
      planeSpriteFromImage(rawPlane, (img) => {
        planeSprite.img = img;
        planeSprite.ready = true;
      });
    };
    rawPlane.src = PLANE_SRC;

    let animationFrame: number;
    let tOffset = 0;
    let propPhase = 0;

    let flyStartMs = 0;
    let lastSyncedElapsed = -1;
    let smoothMult = 1;
    let smoothProgress = 0;
    let smoothAngle = -0.04;
    let smoothPlaneX = 0;
    let smoothPlaneY = 0;
    let flightInitialized = false;
    let lastStatus = GameStatus.BETTING;
    let lastFrameMs = performance.now();

    const drawSunburst = (dw: number, dh: number) => {
      const cx = 0;
      const cy = dh;
      const numRays = 24;
      const angleStep = Math.PI / 2 / numRays;
      tOffset = (tOffset + 0.0012) % (angleStep * 2);

      for (let i = -1; i <= numRays * 2 + 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const startAngle = -Math.PI / 2 + i * angleStep + tOffset;
        const endAngle = startAngle + angleStep;
        ctx.arc(cx, cy, Math.max(dw, dh) * 2.5, startAngle, endAngle);
        ctx.lineTo(cx, cy);
        ctx.fillStyle = i % 2 === 0 ? '#0a0a0a' : '#1a1a1a';
        ctx.fill();
      }
    };

    const drawPlane = (cx: number, cy: number, angle: number, targetW: number) => {
      const w = targetW;
      const h = w * PLANE_ASPECT;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      if (planeSprite.ready && planeSprite.img) {
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(229, 5, 57, 0.35)';
        ctx.drawImage(planeSprite.img, -w * PLANE_ANCHOR_X, -h * PLANE_ANCHOR_Y, w, h);
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    };

    const drawFlightTrail = (dw: number, dh: number, progress: number, plot: ReturnType<typeof getPlot>) => {
      const t = Math.max(0.001, progress);
      const segments = 72;

      ctx.beginPath();
      ctx.moveTo(plot.padL, dh - plot.padB);
      for (let i = 1; i <= segments; i++) {
        const u = (i / segments) * t;
        const x = plot.padL + plot.plotW * u;
        const y = curveYAt(plot, dh, u);
        ctx.lineTo(x, y);
      }
      const tip = curvePoint(plot, dh, t);
      ctx.lineTo(tip.x, dh - plot.padB);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(plot.padL, dh - plot.plotH, plot.padL, dh);
      fillGrad.addColorStop(0, 'rgba(180, 10, 45, 0.92)');
      fillGrad.addColorStop(0.55, 'rgba(120, 6, 30, 0.96)');
      fillGrad.addColorStop(1, 'rgba(70, 4, 18, 0.98)');
      ctx.fillStyle = fillGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(plot.padL, dh - plot.padB);
      for (let i = 1; i <= segments; i++) {
        const u = (i / segments) * t;
        ctx.lineTo(plot.padL + plot.plotW * u, curveYAt(plot, dh, u));
      }
      ctx.strokeStyle = '#ff2d55';
      ctx.lineWidth = Math.max(2.5, dw * 0.004);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 45, 85, 0.55)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      return tip;
    };

    const predictMultiplier = (elapsedSec: number) =>
      Math.exp(FLIGHT_GROWTH_RATE * Math.max(0, elapsedSec));

    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastFrameMs) / 1000, 0.05);
      lastFrameMs = now;

      const { status: s, multiplier: serverMult, timeElapsed } = stateRef.current;
      propPhase += 0.5;

      if (s !== lastStatus) {
        if (s === GameStatus.FLYING) {
          flyStartMs = now - timeElapsed * 1000;
          lastSyncedElapsed = timeElapsed;
          smoothMult = serverMult;
          smoothProgress = multiplierToProgress(serverMult);
          flightInitialized = false;
        } else if (s === GameStatus.BETTING) {
          flightInitialized = false;
          smoothMult = 1;
          smoothProgress = 0;
        }
        lastStatus = s;
      }

      if (s === GameStatus.FLYING && timeElapsed !== lastSyncedElapsed) {
        flyStartMs = now - timeElapsed * 1000;
        lastSyncedElapsed = timeElapsed;
      }

      const dpr = window.devicePixelRatio || 1;
      const dw = canvas.offsetWidth;
      const dh = canvas.offsetHeight;
      if (dw < 2 || dh < 2) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      canvas.width = dw * dpr;
      canvas.height = dh * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#0b0e11';
      ctx.fillRect(0, 0, dw, dh);
      drawSunburst(dw, dh);

      const plot = getPlot(dw, dh);
      const planeW = Math.min(128, Math.max(76, dw * 0.13));
      const multFontSize = Math.min(88, Math.max(36, dw * 0.11));

      if (s === GameStatus.BETTING) {
        const runway = curvePoint(plot, dh, 0);
        const bob = Math.sin(propPhase * 0.18) * 2;
        const idleX = runway.x;
        const idleY = runway.y + bob;
        const idleAngle = curveTangentAngle(plot, dh, 0.02);

        if (!flightInitialized) {
          smoothPlaneX = idleX;
          smoothPlaneY = idleY;
          smoothAngle = idleAngle;
          flightInitialized = true;
        } else {
          const k = 1 - Math.exp(-14 * dt);
          smoothPlaneX += (idleX - smoothPlaneX) * k;
          smoothPlaneY += (idleY - smoothPlaneY) * k;
          smoothAngle += (idleAngle - smoothAngle) * k;
        }
        drawPlane(smoothPlaneX, smoothPlaneY, smoothAngle, planeW * 0.88);
      } else if (s === GameStatus.FLYING || s === GameStatus.CRASHED) {
        const crashed = s === GameStatus.CRASHED;
        const elapsedSec = (now - flyStartMs) / 1000;
        const predicted = predictMultiplier(elapsedSec);
        const targetMult = crashed ? serverMult : Math.min(predicted, serverMult * 1.012);

        const multK = 1 - Math.exp(-(crashed ? 26 : 20) * dt);
        smoothMult += (targetMult - smoothMult) * multK;

        const targetProgress = multiplierToProgress(smoothMult);
        const progK = 1 - Math.exp(-(crashed ? 12 : 24) * dt);
        smoothProgress += (targetProgress - smoothProgress) * progK;

        const tip = drawFlightTrail(dw, dh, smoothProgress, plot);
        const targetAngle = curveTangentAngle(plot, dh, Math.max(0.02, smoothProgress));

        if (!flightInitialized) {
          smoothPlaneX = tip.x;
          smoothPlaneY = tip.y;
          smoothAngle = targetAngle;
          flightInitialized = true;
        } else {
          const posK = 1 - Math.exp(-(crashed ? 8 : 26) * dt);
          const angleK = 1 - Math.exp(-(crashed ? 6 : 20) * dt);
          smoothPlaneX += (tip.x - smoothPlaneX) * posK;
          smoothPlaneY += (tip.y - smoothPlaneY) * posK;
          smoothAngle += (targetAngle - smoothAngle) * angleK;
        }

        const bob = crashed ? 0 : Math.sin(propPhase * 0.22) * 0.8;

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillStyle = crashed ? '#e50539' : '#ffffff';
        ctx.font = `900 ${multFontSize}px Inter, system-ui, sans-serif`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.fillText(`${smoothMult.toFixed(2)}x`, dw / 2, dh * 0.42);
        ctx.shadowBlur = 0;

        if (crashed) {
          ctx.fillStyle = '#e50539';
          ctx.font = `800 ${Math.max(14, multFontSize * 0.28)}px Inter, system-ui, sans-serif`;
          ctx.fillText('FLEW AWAY!', dw / 2, dh * 0.42 + multFontSize * 0.55);
        }

        drawPlane(smoothPlaneX, smoothPlaneY + bob, smoothAngle, planeW);
      }

      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full block touch-none"
      aria-label="Aviator game stage"
    />
  );
};

export default GameCanvas;
