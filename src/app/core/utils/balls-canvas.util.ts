interface Ball {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  r: number; g: number; b: number;
  alpha: number;
}

const PALETTE = [
  { r: 2,   g: 132, b: 199 },
  { r: 56,  g: 189, b: 248 },
  { r: 125, g: 211, b: 252 },
  { r: 3,   g: 105, b: 161 },
  { r: 186, g: 230, b: 253 },
  { r: 255, g: 255, b: 255 },
];

function makeBalls(w: number, h: number, count: number): Ball[] {
  return Array.from({ length: count }, () => {
    const c      = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const radius = 18 + Math.random() * 70;
    const speed  = 0.4 + Math.random() * 0.9;
    const angle  = Math.random() * Math.PI * 2;
    return {
      x: radius + Math.random() * (w - radius * 2),
      y: radius + Math.random() * (h - radius * 2),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      r: c.r, g: c.g, b: c.b,
      alpha: 0.30 + Math.random() * 0.35,
    };
  });
}

/**
 * Starts the balls canvas animation on a given canvas element.
 * The canvas must already be in the DOM with a parent element.
 * Returns a cleanup function that stops the animation and disconnects the observer.
 */
export function startBallsAnimation(canvas: HTMLCanvasElement, count: number): () => void {
  const container = canvas.parentElement!;

  const resize = (): void => {
    const rect    = container.getBoundingClientRect();
    canvas.width  = rect.width;
    canvas.height = rect.height;
  };
  resize();

  const ctx = canvas.getContext('2d');
  if (!ctx) return () => { /* noop */ };

  let balls = makeBalls(canvas.width, canvas.height, count);

  const observer = new ResizeObserver(() => {
    resize();
    // Keep balls in bounds after resize
    balls = balls.map(b => ({
      ...b,
      x: Math.min(b.x, canvas.width  - b.radius),
      y: Math.min(b.y, canvas.height - b.radius),
    }));
  });
  observer.observe(container);

  let frameId: number;

  const frame = (): void => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    for (const b of balls) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x - b.radius < 0 || b.x + b.radius > w) {
        b.vx *= -1;
        b.x = Math.max(b.radius, Math.min(w - b.radius, b.x));
      }
      if (b.y - b.radius < 0 || b.y + b.radius > h) {
        b.vy *= -1;
        b.y = Math.max(b.radius, Math.min(h - b.radius, b.y));
      }

      const grad = ctx.createRadialGradient(
        b.x - b.radius * 0.3, b.y - b.radius * 0.3, 0,
        b.x, b.y, b.radius
      );
      grad.addColorStop(0,    `rgba(${b.r},${b.g},${b.b},${b.alpha})`);
      grad.addColorStop(0.55, `rgba(${b.r},${b.g},${b.b},${(b.alpha * 0.4).toFixed(3)})`);
      grad.addColorStop(1,    `rgba(${b.r},${b.g},${b.b},0)`);

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    frameId = requestAnimationFrame(frame);
  };

  frame();

  return (): void => {
    cancelAnimationFrame(frameId);
    observer.disconnect();
  };
}
