/**
 * VisualStealthLab — Easter Egg System
 * Konami code detection and hidden message display.
 */
(function () {
  'use strict';

  const KONAMI_SEQUENCE = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ];

  const SECRET_MESSAGES = [
    { title: '🐱 Access Granted', message: 'The cat watched as the bits flowed through the wires, silent and unseen.' },
    { title: '🔑 Keymaster', message: 'In a world of plain sight, the hidden truth travels in the least significant places.' },
    { title: '👁️ Observer', message: 'They look but do not see. They hear but do not listen. But you — you found the cracks.' },
    { title: '💾 Ghost in the Machine', message: 'Every image tells two stories. One on the surface, one beneath the noise.' },
    { title: '🌑 Shadow Walker', message: 'Steganography: the art of hiding in plain sight. XOR: the art of reversible confusion.' },
    { title: '🔮 Oracle', message: 'The pixels remember everything. Each channel whispers a secret to those who know how to listen.' },
    { title: '⚡ Phantom', message: 'Zeroes and ones dance in the noise floor. To the untrained eye — just an image. To you — a message.' },
  ];

  const DEBOUNCE_MS = 3000;

  const EasterEgg = {
    _sequencePos: 0,
    _lastActivation: 0,
    _overlay: null,
    _titleEl: null,
    _messageEl: null,
    _initialized: false,

    /**
     * Initialize the easter egg system.
     * Starts listening for Konami code and sets up overlay dismissal.
     */
    init: function () {
      if (this._initialized) return;
      this._initialized = true;

      this._overlay = document.getElementById('easteregg-overlay');
      this._titleEl = document.getElementById('easteregg-title');
      this._messageEl = document.getElementById('easteregg-message');

      if (!this._overlay) return;

      // Keydown listener for Konami code
      document.addEventListener('keydown', this._onKeyDown.bind(this));

      // Dismiss overlay on click
      this._overlay.addEventListener('click', this.hide.bind(this));

      // Dismiss on Escape
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          EasterEgg.hide();
        }
      });
    },

    /**
     * Show the easter egg with a random message.
     */
    show: function () {
      if (!this._overlay) return;

      const now = Date.now();
      if (now - this._lastActivation < DEBOUNCE_MS) return;
      this._lastActivation = now;

      const msg = SECRET_MESSAGES[Math.floor(Math.random() * SECRET_MESSAGES.length)];
      this._titleEl.textContent = msg.title;
      this._messageEl.textContent = msg.message;
      this._overlay.classList.remove('hidden');
    },

    /**
     * Hide the easter egg overlay.
     */
    hide: function () {
      if (this._overlay) {
        this._overlay.classList.add('hidden');
      }
    },

    // --- Private ---

    _onKeyDown: function (e) {
      // Ignore if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const expected = KONAMI_SEQUENCE[this._sequencePos];

      if (e.key === expected) {
        this._sequencePos++;
        if (this._sequencePos === KONAMI_SEQUENCE.length) {
          this._sequencePos = 0;
          this.show();
        }
      } else {
        // Reset on wrong key (but check if the wrong key is the start of a new sequence)
        this._sequencePos = (e.key === KONAMI_SEQUENCE[0]) ? 1 : 0;
      }
    },
  };

  // Expose globally
  window.EasterEgg = EasterEgg;
})();
