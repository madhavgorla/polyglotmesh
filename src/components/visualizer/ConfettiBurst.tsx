import React, { useEffect, useRef } from 'react';

interface ConfettiBurstProps {
  /** Increment to trigger a new confetti burst. Value 0 means idle. */
  triggerKey: number;
  /** Resets active animation cleanly when switching problems. */
  resetKey?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  aspect: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tiltAngle: number;
  tiltSpeed: number;
  shape: 'rect' | 'circle';
  alpha: number;
}

const CONFETTI_COLORS = [
  '#34d399', // emerald-400
  '#10b981', // emerald-500
  '#fbbf24', // amber-400
  '#60a5fa', // blue-400
  '#fb7185', // rose-400
  '#f4f4f5', // zinc-100
];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ triggerKey, resetKey }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [resetKey]);

  useEffect(() => {
    if (triggerKey <= 0) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const particles: Particle[] = [];

    const spawnBurst = (originX: number, originY: number, angleCenter: number, count: number) => {
      for (let i = 0; i < count; i += 1) {
        const spread = (Math.random() - 0.5) * 1.15;
        const angle = angleCenter + spread;
        const speed = 6 + Math.random() * 11;
        particles.push({
          x: originX + (Math.random() - 0.5) * 24,
          y: originY + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 6 + Math.random() * 5,
          aspect: 0.45 + Math.random() * 0.45,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.22,
          tiltAngle: Math.random() * Math.PI * 2,
          tiltSpeed: 0.08 + Math.random() * 0.12,
          shape: Math.random() < 0.22 ? 'circle' : 'rect',
          alpha: 1,
        });
      }
    };

    // Twin side cannons + upper center shower
    spawnBurst(width * 0.22, height * 0.62, -Math.PI / 2 + 0.35, 42);
    spawnBurst(width * 0.78, height * 0.62, -Math.PI / 2 - 0.35, 42);
    spawnBurst(width * 0.5, height * 0.22, Math.PI / 2, 36);

    const startTime = performance.now();
    const durationMs = 2600;
    let lastTime = startTime;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.6667, 2.5);
      lastTime = now;
      const elapsed = now - startTime;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let alive = 0;
      for (const p of particles) {
        p.vx *= Math.pow(0.985, dt);
        p.vy = p.vy * Math.pow(0.988, dt) + 0.34 * dt;
        p.x += p.vx * dt + Math.sin(p.tiltAngle) * 0.65 * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotationSpeed * dt;
        p.tiltAngle += p.tiltSpeed * dt;

        if (elapsed > durationMs * 0.62) {
          p.alpha = Math.max(0, 1 - (elapsed - durationMs * 0.62) / (durationMs * 0.38));
        }

        if (p.alpha <= 0.01 || p.y > window.innerHeight + 40) {
          continue;
        }
        alive += 1;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(1, Math.max(0.25, Math.abs(Math.cos(p.tiltAngle))));
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const w = p.size;
          const h = p.size * p.aspect;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        }
        ctx.restore();
      }

      if (alive > 0 && elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        rafRef.current = null;
      }
    };

    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [triggerKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 w-full h-full"
    />
  );
};
