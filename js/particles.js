/**
 * VisualStealthLab — Particle System
 * Full-screen canvas particle animation with mouse attraction,
 * boundary bouncing, connection lines, and color-scheme support.
 *
 * @license MIT
 * @version 2.0.0
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------------------

  /** Base particle count (scaled by viewport area). */
  var DEFAULT_PARTICLE_COUNT = 150;

  /** Maximum distance (px) between two particles to draw a connection line. */
  var CONNECTION_DISTANCE = 120;

  /** Radius (px) around the mouse cursor where particles feel attraction. */
  var MOUSE_ATTRACT_RADIUS = 150;

  /** Strength multiplier for the attraction force. */
  var MOUSE_ATTRACT_FORCE = 0.08;

  /** Bounce coefficient applied on boundary collision (0.0–1.0). */
  var BOUNCE_COEFFICIENT = 0.8;

  /** Number of particles spawned by burstEffect(). */
  var BURST_MIN = 20;
  var BURST_MAX = 30;

  /** Burst particles live in "burst mode" for roughly this many seconds. */
  var BURST_DURATION_S = 2.5;

  /** Burst initial velocity range. */
  var BURST_VELOCITY_MIN = 3;
  var BURST_VELOCITY_MAX = 7;

  /** Burst particle extra radius (added on top of base). */
  var BURST_EXTRA_RADIUS = 2;

  /** Mobile breakpoint — below this width we halve the particle count. */
  var MOBILE_BREAKPOINT = 768;

  /** Velocity damping per frame (friction). */
  var DAMPING = 0.995;

  /** Base velocity range for normal particles. */
  var VELOCITY_MIN = -0.8;
  var VELOCITY_MAX = 0.8;

  /** Particle radius range. */
  var RADIUS_MIN = 1.2;
  var RADIUS_MAX = 2.8;

  /** Trail clear alpha (lower = longer trails). */
  var TRAIL_ALPHA = 0.12;

  /** Line-width for connection lines. */
  var LINE_WIDTH = 0.5;

  // ---------------------------------------------------------------------------
  // Color-scheme definitions
  // ---------------------------------------------------------------------------

  /**
   * Internal color-scheme store.
   * Each scheme has:
   *   - colors: array of [r, g, b] tuples for particle base colours
   *   - connection: [r, g, b] base for connection lines
   *   - connectionAlphaMax: peak alpha (at zero distance) for connection lines
   */
  var COLOR_SCHEMES = {
    dark: {
      colors: [
        [108,  99, 255],  // #6C63FF
        [139,  92, 246],  // #8B5CF6
        [167, 139, 250],  // #A78BFA
      ],
      connection: [200, 190, 255],      // purple-white
      connectionAlphaMax: 0.3
    },
    light: {
      colors: [
        [ 30,  41,  59],  // #1E293B
        [ 51,  65,  85],  // #334155
        [ 71,  85, 105],  // #475569
      ],
      connection: [80, 90, 110],        // dark gray
      connectionAlphaMax: 0.2
    },
    gold: {
      colors: [
        [255, 215,   0],  // #FFD700
        [255, 165,   0],  // #FFA500
        [255,  99,  71],  // #FF6347
      ],
      connection: [255, 215, 0],        // gold
      connectionAlphaMax: 0.35
    }
  };

  // ---------------------------------------------------------------------------
  // Helper utilities
  // ---------------------------------------------------------------------------

  /**
   * Clamp a number between min and max (inclusive).
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  /**
   * Linear interpolation.
   * @param {number} a
   * @param {number} b
   * @param {number} t
   * @returns {number}
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Random float in [min, max).
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Pick a random element from an array.
   * @param {Array} arr
   * @returns {*}
   */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ---------------------------------------------------------------------------
  // ParticleSystem class
  // ---------------------------------------------------------------------------

  /**
   * Create a new full-screen particle system tied to a <canvas> element.
   *
   * @param {string} canvasId — the `id` attribute of the target canvas.
   * @constructor
   */
  function ParticleSystem(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      throw new Error('ParticleSystem: canvas element "' + canvasId + '" not found.');
    }

    /** @type {CanvasRenderingContext2D} */
    this.ctx = this.canvas.getContext('2d');

    /** @type {Array} */
    this.particles = [];

    /** @type {{ x: number, y: number }} */
    this.mouse = { x: -9999, y: -9999 };

    /** @type {number|null} */
    this.animationId = null;

    /** @type {boolean} */
    this.running = false;

    /** @type {number} Requested particle count (may be adjusted for viewport). */
    this._requestedCount = DEFAULT_PARTICLE_COUNT;

    /** @type {string} Current color scheme key. */
    this._scheme = 'dark';

    // ---- Cache internal field for current scheme's data to avoid lookups ----
    /** @type {{ colors: number[][], connection: number[], connectionAlphaMax: number }} */
    this._schemeData = COLOR_SCHEMES[this._scheme];

    // ---- Bound handlers (for clean add/remove listener lifecycle) ----
    this._resizeHandler = this._onResize.bind(this);
    this._mouseHandler = this._onMouseMove.bind(this);
    this._animate = this._animate.bind(this);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Start the animation loop.  Idempotent — does nothing if already running.
   */
  ParticleSystem.prototype.start = function () {
    if (this.running) return;
    this.running = true;

    this._resize();
    this._createParticles();

    window.addEventListener('resize', this._resizeHandler);
    window.addEventListener('mousemove', this._mouseHandler);

    this._animate();
  };

  /**
   * Stop the animation loop and remove event listeners.
   */
  ParticleSystem.prototype.stop = function () {
    this.running = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    window.removeEventListener('resize', this._resizeHandler);
    window.removeEventListener('mousemove', this._mouseHandler);
  };

  /**
   * Get the current colour scheme name.
   * @returns {string} 'dark', 'light', or 'gold'
   */
  ParticleSystem.prototype.getColorScheme = function () {
    return this._scheme;
  };

  /**
   * Switch the colour scheme at runtime.
   *
   * @param {'dark'|'light'|'gold'} scheme
   */
  ParticleSystem.prototype.setColorScheme = function (scheme) {
    if (!COLOR_SCHEMES[scheme]) {
      console.warn('ParticleSystem.setColorScheme: unknown scheme "' + scheme + '". Use "dark", "light", or "gold".');
      return;
    }

    this._scheme = scheme;
    this._schemeData = COLOR_SCHEMES[scheme];

    // Update each particle's base colour to a random colour from the new scheme.
    for (var i = 0; i < this.particles.length; i++) {
      this.particles[i].baseColor = pick(this._schemeData.colors);
    }
  };

  /**
   * Dynamically set the number of particles.
   * If increasing, new particles are spawned at random positions.
   * If decreasing, excess particles are removed from the end.
   *
   * @param {number} n — desired particle count (will be adjusted for viewport).
   */
  ParticleSystem.prototype.setParticleCount = function (n) {
    this._requestedCount = Math.max(1, Math.floor(n));
    this._reconcileParticleCount();
  };

  /**
   * Spawn a burst of particles at (x, y).  These particles start with high
   * velocity and larger radius, then gradually return to normal behaviour
   * after ~BURST_DURATION_S seconds.
   *
   * @param {number} x
   * @param {number} y
   */
  ParticleSystem.prototype.burstEffect = function (x, y) {
    var count = Math.floor(rand(BURST_MIN, BURST_MAX + 1));
    var now = performance.now() / 1000;  // seconds
    var schemeData = this._schemeData;

    for (var i = 0; i < count; i++) {
      var angle = rand(0, Math.PI * 2);
      var speed = rand(BURST_VELOCITY_MIN, BURST_VELOCITY_MAX);

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: rand(RADIUS_MIN, RADIUS_MAX) + BURST_EXTRA_RADIUS,
        opacity: rand(0.4, 0.9),
        baseColor: pick(schemeData.colors),
        // Burst-specific fields
        burstUntil: now + BURST_DURATION_S,
        burstStartSpeed: speed,
        burstStartRadius: rand(RADIUS_MIN, RADIUS_MAX) + BURST_EXTRA_RADIUS,
        burstBaseRadius: rand(RADIUS_MIN, RADIUS_MAX)
      });
    }
  };

  // -------------------------------------------------------------------------
  // Private — lifecycle
  // -------------------------------------------------------------------------

  /**
   * Resize the canvas to fill the viewport.
   */
  ParticleSystem.prototype._resize = function () {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  /** @private */
  ParticleSystem.prototype._onResize = function () {
    this._resize();
    this._reconcileParticleCount();
  };

  /** @private */
  ParticleSystem.prototype._onMouseMove = function (e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };

  // -------------------------------------------------------------------------
  // Private — particle management
  // -------------------------------------------------------------------------

  /**
   * Compute the effective particle count for the current viewport size.
   * @returns {number}
   */
  ParticleSystem.prototype._effectiveCount = function () {
    var count = this._requestedCount;

    // Scale by viewport area relative to a 1920x1080 baseline.
    var area = this.canvas.width * this.canvas.height;
    var baselineArea = 1920 * 1080;
    var areaRatio = area / baselineArea;
    count = Math.round(count * areaRatio);

    // Floor at 10 particles so tiny viewports still get something.
    count = Math.max(10, count);

    // Halve on mobile.
    if (this.canvas.width < MOBILE_BREAKPOINT) {
      count = Math.max(5, Math.round(count / 2));
    }

    return count;
  };

  /**
   * Create all particles from scratch.
   * @private
   */
  ParticleSystem.prototype._createParticles = function () {
    var count = this._effectiveCount();
    this.particles = [];
    this._spawnParticles(count);
  };

  /**
   * Spawn `count` particles at random positions across the canvas.
   * @param {number} count
   * @private
   */
  ParticleSystem.prototype._spawnParticles = function (count) {
    var w = this.canvas.width;
    var h = this.canvas.height;

    for (var i = 0; i < count; i++) {
      this.particles.push(this._makeParticle(w, h));
    }
  };

  /**
   * Create a single particle object.
   * @param {number} w — canvas width
   * @param {number} h — canvas height
   * @returns {Object}
   * @private
   */
  ParticleSystem.prototype._makeParticle = function (w, h) {
    return {
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(VELOCITY_MIN, VELOCITY_MAX),
      vy: rand(VELOCITY_MIN, VELOCITY_MAX),
      radius: rand(RADIUS_MIN, RADIUS_MAX),
      opacity: rand(0.3, 0.7),
      baseColor: pick(this._schemeData.colors),
      // Burst fields — null when not a burst particle
      burstUntil: null
    };
  };

  /**
   * Add or remove particles so the internal array length matches the
   * effective count.
   * @private
   */
  ParticleSystem.prototype._reconcileParticleCount = function () {
    var target = this._effectiveCount();
    var current = this.particles.length;

    if (target > current) {
      // Add new particles.
      this._spawnParticles(target - current);
    } else if (target < current) {
      // Remove excess (from end, but skip active burst particles).
      var toRemove = current - target;
      for (var i = this.particles.length - 1; i >= 0 && toRemove > 0; i--) {
        if (this.particles[i].burstUntil === null || this.particles[i].burstUntil < performance.now() / 1000) {
          this.particles.splice(i, 1);
          toRemove--;
        }
      }
      // If we still need to remove some, force-remove from end.
      if (toRemove > 0) {
        this.particles.splice(this.particles.length - toRemove, toRemove);
      }
    }
  };

  // -------------------------------------------------------------------------
  // Private — animation
  // -------------------------------------------------------------------------

  /** @private */
  ParticleSystem.prototype._animate = function () {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(this._animate);

    var ctx = this.ctx;
    var w = this.canvas.width;
    var h = this.canvas.height;
    var particles = this.particles;
    var mouse = this.mouse;
    var schemeData = this._schemeData;
    var now = performance.now() / 1000;  // seconds

    // ---- Trail effect: semi-transparent clear ----
    ctx.fillStyle = 'rgba(10, 10, 15, ' + TRAIL_ALPHA + ')';
    ctx.fillRect(0, 0, w, h);

    // ---- Update & draw particles ----
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // -- Mouse attraction (within radius) --
      var dxm = mouse.x - p.x;
      var dym = mouse.y - p.y;
      var distM = Math.sqrt(dxm * dxm + dym * dym);

      if (distM < MOUSE_ATTRACT_RADIUS && distM > 0.5) {
        // Force strength is inversely proportional to distance —
        // closer particles feel a stronger pull.
        var force = (1 - distM / MOUSE_ATTRACT_RADIUS) * MOUSE_ATTRACT_FORCE;
        p.vx += (dxm / distM) * force;
        p.vy += (dym / distM) * force;
      }

      // -- Burst transition: fade back to normal --
      if (p.burstUntil !== null) {
        if (now >= p.burstUntil) {
          // Burst finished; reset to normal values.
          p.burstUntil = null;
          p.radius = p.burstBaseRadius;
          // Keep velocity as-is (it will be damped naturally).
        } else {
          // Interpolate radius from burst-start back to base.
          var t = (p.burstUntil - now) / BURST_DURATION_S;  // 1 → 0
          p.radius = lerp(p.burstBaseRadius, p.burstStartRadius, t);
        }
      }

      // -- Move --
      p.x += p.vx;
      p.y += p.vy;

      // -- Damping --
      p.vx *= DAMPING;
      p.vy *= DAMPING;

      // -- Boundary bounce (coefficient 0.8) --
      if (p.x < p.radius) {
        p.x = p.radius;
        p.vx = -p.vx * BOUNCE_COEFFICIENT;
      } else if (p.x > w - p.radius) {
        p.x = w - p.radius;
        p.vx = -p.vx * BOUNCE_COEFFICIENT;
      }

      if (p.y < p.radius) {
        p.y = p.radius;
        p.vy = -p.vy * BOUNCE_COEFFICIENT;
      } else if (p.y > h - p.radius) {
        p.y = h - p.radius;
        p.vy = -p.vy * BOUNCE_COEFFICIENT;
      }

      // -- Draw particle --
      var bc = p.baseColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + bc[0] + ',' + bc[1] + ',' + bc[2] + ',' + p.opacity + ')';
      ctx.fill();
    }

    // ---- Draw connection lines ----
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var a = particles[i];
        var b = particles[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DISTANCE) {
          // Opacity proportional to proximity: 0 at edge, max at touching.
          var alpha = (1 - dist / CONNECTION_DISTANCE) * schemeData.connectionAlphaMax;
          var conn = schemeData.connection;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(' + conn[0] + ',' + conn[1] + ',' + conn[2] + ',' + alpha + ')';
          ctx.lineWidth = LINE_WIDTH;
          ctx.stroke();
        }
      }
    }
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  window.ParticleSystem = ParticleSystem;
})();
