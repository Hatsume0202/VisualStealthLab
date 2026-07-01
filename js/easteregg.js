/**
 * VisualStealthLab — Easter Egg System
 * "visualstealth" keyboard trigger with particle effects and glowing secret message.
 *
 * Assumptions about the ParticleSystem API (the ParticleSystem instance is passed
 * to init(); this module does NOT import or instantiate it):
 *   - particleSystem.setColorScheme(scheme)
 *       scheme: 'dark' | 'light' | 'gold'
 *       The 'gold' scheme uses colors #FFD700, #FFA500, #FF6347 and gold
 *       connection lines.
 *   - particleSystem.getColorScheme()
 *       Returns the current scheme name string.
 *   - particleSystem.burstEffect(x, y)
 *       Spawns a burst of particles (20-30) at the given viewport coordinates.
 *   - particleSystem.canvas
 *       Reference to the <canvas> element the particle system renders into.
 */
(function () {
  'use strict';

  // --- Constants ---

  var SECRET_PHRASE = 'visualstealth';
  var INPUT_TIMEOUT_MS = 3000;    // buffer reset after 3 s of inactivity
  var COOLDOWN_MS = 10000;        // cannot re-trigger for 10 s
  var TEXT_DURATION_MS = 5000;    // overlay text visible for 5 s
  var BURST_COUNT = 3;            // total burst effects
  var BURST_INTERVAL_MS = 800;    // ms between bursts (0, 800, 1600)

  var OVERLAY_STYLE_ID = 'easteregg-overlay-style';
  var styleInjected = false;

  // --- CSS Injection (one-time) ---

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;

    var css = [
      '@keyframes easteregg-pulse {',
      '  0%, 100% { text-shadow: 0 0 10px #FFD700, 0 0 20px #FFA500, 0 0 30px #FFD700; }',
      '  50%      { text-shadow: 0 0 30px #FFD700, 0 0 40px #FFA500, 0 0 50px #FF6347; }',
      '}',
      '',
      '#easteregg-secret-text {',
      '  position: fixed;',
      '  top: 50%;',
      '  left: 50%;',
      '  transform: translate(-50%, -50%);',
      '  font-size: 2.5rem;',
      '  font-weight: bold;',
      '  color: #FFD700;',
      '  font-family: "Segoe UI", system-ui, sans-serif;',
      '  text-align: center;',
      '  pointer-events: none;',
      '  z-index: 9999;',
      '  animation: easteregg-pulse 1s ease-in-out infinite;',
      '  white-space: nowrap;',
      '}',
    ].join('\n');

    var style = document.createElement('style');
    style.id = OVERLAY_STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // --- EasterEgg Object ---

  var EasterEgg = {
    // Internal state
    _ps: null,
    _buffer: '',
    _bufferTimer: null,
    _cooldownUntil: 0,
    _previousScheme: '',
    _overlayEl: null,
    _burstTimers: [],
    _restoreTimer: null,
    _initialized: false,
    _onKeyDown: null,

    // ------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------

    /**
     * Initialise the easter egg and attach it to a ParticleSystem instance.
     *
     * @param {Object} particleSystem
     *   Must expose setColorScheme(), getColorScheme(), burstEffect(), and a canvas property.
     */
    init: function (particleSystem) {
      if (this._initialized) return;

      this._ps = particleSystem || null;
      this._initialized = true;

      injectStyles();

      this._onKeyDown = this._handleKeyDown.bind(this);
      document.addEventListener('keydown', this._onKeyDown);
    },

    /**
     * Tear down the easter egg: remove the keyboard listener, cancel all
     * pending timers, remove any visible overlay, and (if the effect is
     * currently active) restore the original colour scheme.
     */
    destroy: function () {
      if (!this._initialized) return;
      this._initialized = false;

      if (this._onKeyDown) {
        document.removeEventListener('keydown', this._onKeyDown);
        this._onKeyDown = null;
      }

      this._clearAllTimers();
      this._removeOverlay();

      // If we are mid-effect, restore the colour scheme so the user is not
      // left stuck on 'gold'.
      if (this._ps && this._previousScheme) {
        try {
          this._ps.setColorScheme(this._previousScheme);
        } catch (_) { /* best-effort */ }
      }

      this._ps = null;
      this._buffer = '';
      this._cooldownUntil = 0;
    },

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    /**
     * Keyboard handler. Accumulates keystrokes, enforces the 3 s timeout
     * and 10 s cooldown, and fires _trigger() on a full match.
     */
    _handleKeyDown: function (e) {
      // Ignore when the user is typing in form fields.
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      // Honour cooldown.
      if (Date.now() < this._cooldownUntil) return;

      // Reset the inactivity timer on every keystroke.
      if (this._bufferTimer) {
        clearTimeout(this._bufferTimer);
        this._bufferTimer = null;
      }

      // Append the key (case-insensitive).
      var key = e.key;
      this._buffer += key.toLowerCase();

      // If the buffer no longer matches *any* prefix of the secret phrase,
      // check whether the *last* key alone starts a new match; otherwise
      // wipe the buffer.
      if (SECRET_PHRASE.indexOf(this._buffer) !== 0) {
        var lastLower = key.toLowerCase();
        this._buffer = (SECRET_PHRASE.indexOf(lastLower) === 0) ? lastLower : '';
      }

      // Full match.
      if (this._buffer === SECRET_PHRASE) {
        this._buffer = '';
        this._cooldownUntil = Date.now() + COOLDOWN_MS;
        this._trigger();
        return;
      }

      // Arm the inactivity timeout.
      var self = this;
      this._bufferTimer = setTimeout(function () {
        self._buffer = '';
        self._bufferTimer = null;
      }, INPUT_TIMEOUT_MS);
    },

    /**
     * Execute the easter-egg effects:
     *   1. Save & switch colour scheme → 'gold'
     *   2. Show the glowing overlay text
     *   3. Schedule 3 bursts at 0 / 800 / 1600 ms
     *   4. Schedule restore at TEXT_DURATION_MS
     */
    _trigger: function () {
      if (!this._ps) return;

      // 1. Gold scheme — save current scheme via public API
      if (typeof this._ps.getColorScheme === 'function') {
        this._previousScheme = this._ps.getColorScheme();
      } else {
        this._previousScheme = 'dark';
      }
      try {
        this._ps.setColorScheme('gold');
      } catch (_) { /* best-effort */ }

      // 2. Glowing text overlay
      this._showOverlay();

      // 3. Burst effects
      for (var i = 0; i < BURST_COUNT; i++) {
        var timer = setTimeout(this._doBurst.bind(this), i * BURST_INTERVAL_MS);
        this._burstTimers.push(timer);
      }

      // 4. Restore after 5 s
      var self = this;
      this._restoreTimer = setTimeout(function () {
        self._restore();
      }, TEXT_DURATION_MS);
    },

    /**
     * Fire a single particle burst at a random viewport position.
     */
    _doBurst: function () {
      if (!this._ps) return;
      var x = Math.random() * window.innerWidth;
      var y = Math.random() * window.innerHeight;
      try {
        this._ps.burstEffect(x, y);
      } catch (_) { /* best-effort */ }
    },

    /**
     * Create and show the floating glowing-text overlay.
     */
    _showOverlay: function () {
      this._removeOverlay();

      var div = document.createElement('div');
      div.id = 'easteregg-secret-text';
      div.textContent = '🔮 You Found the Secret! 🔮';
      document.body.appendChild(div);
      this._overlayEl = div;
    },

    /**
     * Remove the floating text overlay from the DOM.
     */
    _removeOverlay: function () {
      if (this._overlayEl) {
        this._overlayEl.remove();
        this._overlayEl = null;
      }
    },

    /**
     * Restore the original colour scheme and remove the overlay.
     */
    _restore: function () {
      if (this._ps && this._previousScheme) {
        try {
          this._ps.setColorScheme(this._previousScheme);
        } catch (_) { /* best-effort */ }
      }
      this._removeOverlay();
    },

    /**
     * Cancel every outstanding timer and empty the tracking arrays.
     */
    _clearAllTimers: function () {
      if (this._bufferTimer) {
        clearTimeout(this._bufferTimer);
        this._bufferTimer = null;
      }
      for (var i = 0; i < this._burstTimers.length; i++) {
        clearTimeout(this._burstTimers[i]);
      }
      this._burstTimers.length = 0;

      if (this._restoreTimer) {
        clearTimeout(this._restoreTimer);
        this._restoreTimer = null;
      }
    },
  };

  // --- Global export ---
  window.EasterEgg = EasterEgg;
})();
