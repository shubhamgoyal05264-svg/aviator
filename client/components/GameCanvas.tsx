
import React, { useEffect, useRef } from 'react';
import { GameStatus } from '../types';

interface Props {
  status: GameStatus;
  multiplier: number;
  timeElapsed: number;
}

const GameCanvas: React.FC<Props> = ({ status, multiplier, timeElapsed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use refs to prevent tearing down the requestAnimationFrame loop every 100ms
  const stateRef = useRef({ status, multiplier, timeElapsed });
  stateRef.current = { status, multiplier, timeElapsed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimization
    if (!ctx) return;

    let animationFrame: number;
    let tOffset = 0; // for scrolling grid

    const render = () => {
      const { status: currentStatus, multiplier: currentMultiplier, timeElapsed: currentTimeElapsed } = stateRef.current;

      const w = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      const h = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      const dw = canvas.offsetWidth;
      const dh = canvas.offsetHeight;

      // Draw solid background
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, dw, dh);

      // Draw Sunburst Background
      const cx = 0;
      const cy = dh;
      const numRays = 16;
      const angleStep = (Math.PI / 2) / numRays;
      
      tOffset = (tOffset + 0.002) % (angleStep * 2);

      for (let i = -1; i <= numRays * 2 + 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const startAngle = -Math.PI/2 + (i * angleStep) + tOffset;
        const endAngle = startAngle + angleStep;
        
        ctx.arc(cx, cy, Math.max(dw, dh) * 2, startAngle, endAngle);
        ctx.lineTo(cx, cy);
        ctx.fillStyle = i % 2 === 0 ? '#111111' : '#1c1c1c';
        ctx.fill();
      }

      if (currentStatus === GameStatus.BETTING) {
        // Loading / Waiting Animation
        ctx.fillStyle = '#fff';
        ctx.font = '800 32px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('WAITING FOR NEXT ROUND', dw / 2, dh / 2 - 10);
        
        // Progress bar
        const barW = 240;
        const progress = (currentTimeElapsed % 1000) / 1000;
        ctx.fillStyle = '#2d2d2d';
        fillRoundRect(ctx, dw / 2 - barW / 2, dh / 2 + 30, barW, 8, 4);
        ctx.fillStyle = '#e51e25';
        fillRoundRect(ctx, dw / 2 - barW / 2, dh / 2 + 30, barW * progress, 8, 4);
      } else if (currentStatus === GameStatus.FLYING || currentStatus === GameStatus.CRASHED) {
        // Calculate curve position
        const maxMult = 10;
        const progressX = Math.min((currentMultiplier - 1) / 3, 1);
        
        const curveWidth = (dw - 100) * progressX;
        const curveHeight = (dh - 150) * Math.min((currentMultiplier - 1) / 5, 1);

        // Draw the curve fill
        ctx.beginPath();
        ctx.moveTo(0, dh);

        const points = 50;
        for (let i = 0; i <= points; i++) {
          const t = i / points;
          const x = t * curveWidth;
          const y = dh - (Math.pow(t, 2) * curveHeight);
          ctx.lineTo(x, y);
        }
        
        // Drop down to bottom
        ctx.lineTo(curveWidth, dh);
        ctx.lineTo(0, dh);
        
        const gradient = ctx.createLinearGradient(0, dh - curveHeight, 0, dh);
        gradient.addColorStop(0, 'rgba(229, 30, 37, 0.7)');
        gradient.addColorStop(1, 'rgba(80, 10, 15, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw the curve line on top
        ctx.beginPath();
        ctx.moveTo(0, dh);
        for (let i = 0; i <= points; i++) {
          const t = i / points;
          const x = t * curveWidth;
          const y = dh - (Math.pow(t, 2) * curveHeight);
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#e51e25';
        ctx.lineWidth = 5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw multiplier text
        ctx.fillStyle = currentStatus === GameStatus.CRASHED ? '#e51e25' : '#fff';
        ctx.font = '900 84px Inter';
        ctx.textAlign = 'center';
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.fillText(`${currentMultiplier.toFixed(2)}x`, dw / 2, dh / 2 - 20);
        ctx.shadowBlur = 0;
        
        if (currentStatus === GameStatus.CRASHED) {
          ctx.fillStyle = '#e51e25';
          ctx.font = '800 28px Inter';
          ctx.fillText('FLEW AWAY!', dw / 2, dh / 2 + 50);
        }

        // Draw Plane Logo
        const planeX = curveWidth;
        const planeY = dh - curveHeight;
        
        ctx.save();
        ctx.translate(planeX, planeY);
        // Add 90 degrees to point the jet right, then subtract angle for climb
        const climbAngle = progressX < 1 ? -0.3 : 0;
        ctx.rotate((Math.PI / 2) + climbAngle); 
        ctx.fillStyle = '#e51e25';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(229, 30, 37, 0.8)';
        
        // Sleek Jet SVG (Google Flight Icon)
        const planePath = new Path2D("M21,16 v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z");
        ctx.scale(2.5, 2.5);
        ctx.translate(-12, -12); // Center 24x24 viewBox
        ctx.fill(planePath);
        ctx.restore();
      }

      animationFrame = requestAnimationFrame(render);
    };

    // Helper for rounded rects
    const fillRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, []); // Empty dependency array prevents tearing down the canvas context and causing lag!

  return <canvas ref={canvasRef} className="w-full h-full bg-[#0a0a0c]" />;
};

export default GameCanvas;
