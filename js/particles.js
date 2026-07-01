/**
 * VisualStealthLab — Particle System
 * Full-screen canvas particle animation with mouse interaction.
 */
(function () {
  'use strict';

  const PARTICLE_COUNT = 120;
  const CONNECTION_DISTANCE = 120;
  const MOUSE_REPEL_RADIUS = 100;
  const MOUSE_REPEL_FORCE = 0.5;
  const BASE_COLOR = [0, 255, 136]; // #00ff88
  const COLOR_VARIATION = 30;

  class ParticleSystem {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) {
        throw new Error('ParticleSystem: canvas element not found');
      }
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.mouse = { x: -9999, y: -9999 };
      this.animationId = null;
      this.running = false;

      this._resizeHandler = this._onResize.bind(this);
      this._mouseHandler = this._onMouseMove.bind(this);
      this._animate = this._animate.bind(this);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._resize();
      this._createParticles();
      window.addEventListener('resize', this._resizeHandler);
      window.addEventListener('mousemove', this._mouseHandler);
      this._animate();
    }

    stop() {
      this.running = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      window.removeEventListener('resize', this._resizeHandler);
      window.removeEventListener('mousemove', this._mouseHandler);
    }

    // --- Private ---

    _resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    _onResize() {
      this._resize();
    }

    _onMouseMove(e) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    }

    _createParticles() {
      this.particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          radius: 1 + Math.random() * 2,
          opacity: 0.3 + Math.random() * 0.5,
          hueShift: Math.floor(Math.random() * COLOR_VARIATION * 2) - COLOR_VARIATION,
        });
      }
    }

    _animate() {
      if (!this.running) return;
      this.animationId = requestAnimationFrame(this._animate);

      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Clear with slight trail effect for smoother visuals
      ctx.fillStyle = 'rgba(10, 10, 15, 0.15)';
      ctx.fillRect(0, 0, w, h);

      const particles = this.particles;
      const mouse = this.mouse;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Mouse repulsion
        const dxm = p.x - mouse.x;
        const dym = p.y - mouse.y;
        const distM = Math.sqrt(dxm * dxm + dym * dym);
        if (distM < MOUSE_REPEL_RADIUS && distM > 0) {
          const force = (MOUSE_REPEL_RADIUS - distM) / MOUSE_REPEL_RADIUS * MOUSE_REPEL_FORCE;
          p.vx += (dxm / distM) * force;
          p.vy += (dym / distM) * force;
        }

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Wrap around edges
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Draw particle
        const r = BASE_COLOR[0] + p.hueShift;
        const g = BASE_COLOR[1] + p.hueShift;
        const b = BASE_COLOR[2];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.max(0, Math.min(255, r))},${Math.max(0, Math.min(255, g))},${Math.max(0, Math.min(255, b))},${p.opacity})`;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.3;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0, 255, 136, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }
  }

  // Expose globally
  window.ParticleSystem = ParticleSystem;
})();
