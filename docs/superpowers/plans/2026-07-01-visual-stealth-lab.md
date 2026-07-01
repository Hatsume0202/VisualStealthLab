# VisualStealthLab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based LSB steganography tool with repeating-key XOR encryption, particle system background, and hidden easter eggs.

**Architecture:** Single-page web application with modular JavaScript files loaded via `<script>` tags. The particle system renders on a full-screen canvas behind the UI. The steganography core handles LSB bit-level encoding/decoding with repeating-key XOR encryption, using a 0x00 byte as end-of-message marker. The main controller wires UI events to the core logic.

**Tech Stack:** Vanilla HTML5/CSS3/JavaScript ES6+, Canvas API for both particles and image pixel manipulation. No frameworks, no bundlers, no dependencies.

## Global Constraints

- No external dependencies — vanilla HTML/CSS/JS only
- All JS files loaded via `<script>` tags in `index.html` (no ES modules)
- Repeating-key XOR: password string bytes cycle repeatedly through the message bytes
- End-of-message marker: a single `0x00` byte, XOR-encrypted during encode, XOR-decrypted back to `0x00` during decode
- LSB encoding: embed one bit per color channel (R, G, B) of each pixel, skipping Alpha
- All string encoding/decoding must use `TextEncoder`/`TextDecoder` (UTF-8)
- Particle system: full-screen `<canvas>` behind UI, 100+ particles, mouse-interactive
- Easter egg: triggered by Konami code (↑ ↑ ↓ ↓ ← → ← → B A), displays a hidden message/animation
- Cross-browser: must work in latest Chrome, Firefox, Safari
- Error handling: all user-facing errors must show a visible message, not just console.log

---

### Task 1: Project Scaffolding and HTML Structure

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/main.js` (skeleton only — just the file with a placeholder)

**Interfaces:**
- Produces: `index.html` with all `<script>` and `<link>` tags loading every JS/CSS file in correct order; all DOM elements with unique `id` attributes that Task 5 (`main.js`) will reference

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisualStealthLab</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Particle canvas (background) -->
  <canvas id="particle-canvas"></canvas>

  <!-- Easter egg overlay (hidden by default) -->
  <div id="easteregg-overlay" class="hidden">
    <div id="easteregg-content">
      <h1 id="easteregg-title"></h1>
      <p id="easteregg-message"></p>
    </div>
  </div>

  <!-- Main application container -->
  <div id="app-container">
    <header>
      <h1>VisualStealthLab</h1>
      <p class="subtitle">LSB Image Steganography</p>
    </header>

    <main>
      <!-- Mode tabs -->
      <div class="tabs">
        <button id="tab-encode" class="tab active">Encode</button>
        <button id="tab-decode" class="tab">Decode</button>
      </div>

      <!-- Shared password field -->
      <div class="form-group">
        <label for="password-input">Password:</label>
        <input type="password" id="password-input" placeholder="Enter encryption key">
      </div>

      <!-- Encode panel -->
      <div id="encode-panel" class="panel active">
        <div class="form-group">
          <label for="encode-image-input">Cover Image:</label>
          <input type="file" id="encode-image-input" accept="image/png,image/jpeg,image/bmp">
        </div>
        <div class="form-group">
          <label for="message-input">Secret Message:</label>
          <textarea id="message-input" placeholder="Enter the message to hide..." rows="4"></textarea>
          <p id="encode-capacity" class="hint"></p>
        </div>
        <button id="encode-button" disabled>Encode & Download</button>
        <div id="encode-preview" class="preview hidden">
          <canvas id="encode-preview-canvas"></canvas>
        </div>
      </div>

      <!-- Decode panel -->
      <div id="decode-panel" class="panel">
        <div class="form-group">
          <label for="decode-image-input">Stego Image:</label>
          <input type="file" id="decode-image-input" accept="image/png,image/bmp">
        </div>
        <button id="decode-button" disabled>Decode</button>
        <div id="decode-result" class="result hidden">
          <h3>Decoded Message:</h3>
          <pre id="decoded-message"></pre>
        </div>
        <div id="decode-preview" class="preview hidden">
          <canvas id="decode-preview-canvas"></canvas>
        </div>
      </div>

      <!-- Status/error message area -->
      <div id="status-message" class="status hidden"></div>
    </main>

    <footer>
      <p>VisualStealthLab — LSB Steganography Tool</p>
    </footer>
  </div>

  <!-- Scripts loaded in dependency order -->
  <script src="js/particles.js"></script>
  <script src="js/steganography.js"></script>
  <script src="js/easteregg.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css (base styles only)**

```css
/* === Reset & Base === */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #0a0a0f;
  color: #e0e0e0;
  min-height: 100vh;
  overflow-x: hidden;
}

/* === Particle Canvas (full-screen background) === */
#particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* === Easter Egg Overlay === */
#easteregg-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
}

#easteregg-overlay.hidden {
  display: none;
}

#easteregg-content {
  text-align: center;
  animation: easteregg-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes easteregg-pulse {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

#easteregg-title {
  font-size: 3rem;
  color: #00ff88;
  text-shadow: 0 0 20px #00ff88;
}

#easteregg-message {
  font-size: 1.5rem;
  color: #ffcc00;
  margin-top: 1rem;
}

/* === App Container === */
#app-container {
  position: relative;
  z-index: 1;
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

/* === Header === */
header {
  text-align: center;
  margin-bottom: 2rem;
}

header h1 {
  font-size: 2.2rem;
  color: #00ff88;
  text-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
  letter-spacing: 2px;
}

.subtitle {
  color: #888;
  font-size: 0.95rem;
  margin-top: 0.3rem;
}

/* === Tabs === */
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  overflow: hidden;
}

.tab {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #1a1a2e;
  color: #aaa;
  border: 1px solid #333;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s, color 0.2s;
}

.tab.active {
  background: #00ff88;
  color: #0a0a0f;
  border-color: #00ff88;
  font-weight: bold;
}

/* === Form Elements === */
.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: #aaa;
  font-weight: 600;
}

.form-group input[type="file"],
.form-group input[type="password"],
.form-group textarea {
  width: 100%;
  padding: 0.7rem 0.9rem;
  background: #1a1a2e;
  border: 1px solid #333;
  border-radius: 6px;
  color: #e0e0e0;
  font-size: 0.95rem;
  font-family: inherit;
}

.form-group textarea {
  resize: vertical;
}

.form-group input[type="file"]::file-selector-button {
  background: #2a2a4a;
  color: #e0e0e0;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.5rem;
}

.hint {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.3rem;
}

/* === Panels === */
.panel {
  display: none;
}

.panel.active {
  display: block;
}

/* === Buttons === */
button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s, opacity 0.2s;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

#encode-button,
#decode-button {
  width: 100%;
  background: #00ff88;
  color: #0a0a0f;
  margin-top: 0.5rem;
}

#encode-button:hover:not(:disabled),
#decode-button:hover:not(:disabled) {
  background: #00cc6a;
}

/* === Preview & Result === */
.preview canvas {
  max-width: 100%;
  border-radius: 6px;
  margin-top: 1rem;
  border: 1px solid #333;
}

.result {
  margin-top: 1rem;
}

.result h3 {
  color: #00ff88;
  margin-bottom: 0.5rem;
}

.result pre {
  background: #1a1a2e;
  padding: 1rem;
  border-radius: 6px;
  border: 1px solid #333;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  max-height: 300px;
  overflow-y: auto;
}

/* === Status / Error === */
.status {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 600;
  text-align: center;
}

.status.error {
  background: rgba(255, 50, 50, 0.15);
  color: #ff5555;
  border: 1px solid #ff5555;
}

.status.success {
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  border: 1px solid #00ff88;
}

.status.hidden {
  display: none;
}

/* === Footer === */
footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid #222;
  color: #555;
  font-size: 0.8rem;
}
```

- [ ] **Step 3: Create js/main.js skeleton**

```javascript
/**
 * VisualStealthLab — Main Controller
 * Wires UI events to steganography core, manages app state.
 * This is a skeleton; full logic added in Task 5.
 */
(function () {
  'use strict';

  // Initialization placeholder — will be filled in Task 5
  document.addEventListener('DOMContentLoaded', function () {
    console.log('VisualStealthLab initialized');
  });
})();
```

- [ ] **Step 4: Commit**

```bash
git add index.html css/style.css js/main.js
git commit -m "feat: add project scaffolding, HTML structure, and base CSS"
```

---

### Task 2: Particle System (particles.js)

**Files:**
- Create: `js/particles.js`

**Interfaces:**
- Produces: global `ParticleSystem` class attached to `window`
  - Constructor: `new ParticleSystem(canvasId)` — takes the `id` of the `<canvas>` element
  - `start()` — begins animation loop
  - `stop()` — stops animation loop
  - Internal: renders 120 particles on a full-screen canvas, particles connect with lines when within 120px of each other, mouse repels nearby particles within 100px radius

**Requirements:**
- 120 particles minimum
- Particles have random initial positions, velocities, sizes (1–3px radius), and opacity (0.3–0.8)
- Each particle slowly drifts; when it exits the canvas, it wraps to the opposite side
- Lines drawn between particles within 120px distance, line opacity proportional to closeness
- Mouse interaction: particles within 100px of mouse cursor are gently pushed away
- Color scheme: green-tinted (#00ff88 base with slight hue variation)
- Use `requestAnimationFrame` for the animation loop
- Resize handler: canvas resizes on `window.resize`

- [ ] **Step 1: Create js/particles.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/particles.js
git commit -m "feat: add particle system with mouse interaction"
```

---

### Task 3: Steganography Core (steganography.js)

**Files:**
- Create: `js/steganography.js`

**Interfaces:**
- Produces: global `Steganography` object attached to `window`
  - `Steganography.encode(imageData, message, password)` → `{ imageData: ImageData, capacity: number, used: number }`
    - `imageData`: `ImageData` from a canvas context (cover image pixels)
    - `message`: `string` — the plaintext to hide
    - `password`: `string` — the XOR encryption key
    - Returns the modified `imageData` with message embedded, plus capacity info
    - Throws `Error` if message is too large for the image
  - `Steganography.decode(imageData, password)` → `string`
    - `imageData`: `ImageData` from a canvas context (stego image pixels)
    - `password`: `string` — the XOR decryption key
    - Returns the decoded plaintext string
    - Throws `Error` if no valid terminator found (corrupt data or wrong password)
  - Internal: `_xorEncrypt(bytes, password)` — applies repeating-key XOR
  - Internal: `_xorDecrypt(bytes, password)` — identical to `_xorEncrypt` (XOR is its own inverse)

**Algorithm:**
1. **Encoding:**
   - Convert message to UTF-8 bytes via `TextEncoder`
   - XOR each byte with the repeating password key (password bytes cycle: `password[i % password.length]`)
   - Append a single `0x00` byte (which gets XOR'd with the key byte at that position)
   - Convert the encrypted bytes to a bit stream (MSB first per byte)
   - Embed each bit into the LSB of each color channel (R, G, B, skip A) of the image pixels sequentially
   - Return the modified ImageData
2. **Decoding:**
   - Extract LSBs from R, G, B channels sequentially to form a bit stream
   - Group bits into bytes (MSB first, 8 bits per byte)
   - Stop when a byte, after XOR decryption, equals 0x00
   - XOR decrypt each byte with the repeating password key
   - Convert decrypted bytes (excluding the terminator) to string via `TextDecoder`

**Capacity calculation:** Each pixel provides 3 bits (R, G, B). Total capacity = `(width * height * 3) / 8` bytes, minus 1 for the terminator byte.

- [ ] **Step 1: Create js/steganography.js**

```javascript
/**
 * VisualStealthLab — Steganography Core
 * LSB steganography with repeating-key XOR encryption.
 */
(function () {
  'use strict';

  /**
   * Apply repeating-key XOR to a byte array.
   * XOR is its own inverse: XOR(x, key) → XOR(result, key) = x.
   * @param {Uint8Array} data - bytes to transform
   * @param {Uint8Array} keyBytes - password as UTF-8 bytes
   * @returns {Uint8Array} transformed bytes (same length as input)
   */
  function xorTransform(data, keyBytes) {
    if (keyBytes.length === 0) {
      // No password: return copy unchanged
      return new Uint8Array(data);
    }
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ keyBytes[i % keyBytes.length];
    }
    return result;
  }

  /**
   * Get the bit at a specific position (0-indexed from MSB) of a byte.
   * @param {number} byte - the byte value (0-255)
   * @param {number} bitIndex - 0 for MSB, 7 for LSB
   * @returns {number} 0 or 1
   */
  function getBit(byte, bitIndex) {
    return (byte >> (7 - bitIndex)) & 1;
  }

  /**
   * Set the LSB of a byte to a given bit value.
   * @param {number} byte - original byte value
   * @param {number} bit - 0 or 1
   * @returns {number} byte with LSB set
   */
  function setLSB(byte, bit) {
    return (byte & 0xFE) | bit;
  }

  /**
   * Calculate the encoding capacity of an image.
   * @param {number} width - image width in pixels
   * @param {number} height - image height in pixels
   * @returns {number} maximum bytes that can be stored (including terminator)
   */
  function calculateCapacity(width, height) {
    // 3 channels (R, G, B) per pixel, 8 bits per byte
    return Math.floor((width * height * 3) / 8);
  }

  const Steganography = {
    /**
     * Encode a message into an image using LSB steganography.
     * @param {ImageData} imageData - cover image pixel data
     * @param {string} message - plaintext message to hide
     * @param {string} password - encryption key
     * @returns {{ imageData: ImageData, capacity: number, used: number }}
     * @throws {Error} if message is too large
     */
    encode: function (imageData, message, password) {
      if (!message || message.length === 0) {
        throw new Error('Message cannot be empty');
      }

      // Convert message to UTF-8 bytes
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);

      // Convert password to UTF-8 bytes
      const keyBytes = encoder.encode(password || '');

      // XOR encrypt the message
      const encrypted = xorTransform(messageBytes, keyBytes);

      // Append terminator byte (0x00), also XOR encrypted
      const terminator = xorTransform(new Uint8Array([0x00]), keyBytes.length > 0
        ? new Uint8Array([keyBytes[messageBytes.length % keyBytes.length]])
        : new Uint8Array([0x00]));
      const fullPayload = new Uint8Array(encrypted.length + 1);
      fullPayload.set(encrypted, 0);
      fullPayload.set(terminator, encrypted.length);

      // Capacity check
      const capacity = calculateCapacity(imageData.width, imageData.height);
      if (fullPayload.length > capacity) {
        throw new Error(
          `Message too large. Capacity: ${capacity - 1} bytes, required: ${messageBytes.length} bytes`
        );
      }

      // Create a copy of the image data to modify
      const pixels = new Uint8ClampedArray(imageData.data);

      // Embed bits into LSBs of R, G, B channels
      let bitPos = 0; // Global bit position across all bytes of the payload
      for (let byteIdx = 0; byteIdx < fullPayload.length; byteIdx++) {
        const byteVal = fullPayload[byteIdx];
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const pixelIdx = Math.floor(bitPos / 3); // Which pixel (group of 3 channels)
          const channelOffset = bitPos % 3; // 0=R, 1=G, 2=B
          const dataIdx = pixelIdx * 4 + channelOffset; // Index in imageData.data (RGBA)

          if (dataIdx >= pixels.length) {
            throw new Error('Unexpected: bit position exceeds image data');
          }

          const bit = getBit(byteVal, bitIdx);
          pixels[dataIdx] = setLSB(pixels[dataIdx], bit);
          bitPos++;
        }
      }

      const result = new ImageData(pixels, imageData.width, imageData.height);
      return {
        imageData: result,
        capacity: capacity - 1, // Usable capacity (excluding terminator)
        used: messageBytes.length,
      };
    },

    /**
     * Decode a message from an image using LSB steganography.
     * @param {ImageData} imageData - stego image pixel data
     * @param {string} password - decryption key
     * @returns {string} decoded plaintext message
     * @throws {Error} if no valid terminator found or data is corrupt
     */
    decode: function (imageData, password) {
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(password || '');
      const decoder = new TextDecoder();
      const pixels = imageData.data;
      const maxBits = pixels.length / 4 * 3; // Total usable bits (R,G,B per pixel, skip A)
      const maxBytes = Math.floor(maxBits / 8);

      const rawBytes = []; // Decrypted bytes (excluding terminator)
      let bitPos = 0;
      let foundTerminator = false;

      for (let byteIdx = 0; byteIdx < maxBytes; byteIdx++) {
        // Extract 8 bits from LSBs to form one byte
        let byteVal = 0;
        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
          const pixelIdx = Math.floor(bitPos / 3);
          const channelOffset = bitPos % 3;
          const dataIdx = pixelIdx * 4 + channelOffset;

          if (dataIdx >= pixels.length) {
            break;
          }

          const lsb = pixels[dataIdx] & 1; // Extract LSB
          byteVal = (byteVal << 1) | lsb;
          bitPos++;
        }

        // XOR decrypt this byte with the repeating key
        const keyByte = keyBytes.length > 0 ? keyBytes[byteIdx % keyBytes.length] : 0x00;
        const decrypted = byteVal ^ keyByte;

        if (decrypted === 0x00) {
          foundTerminator = true;
          break;
        }

        rawBytes.push(decrypted);
      }

      if (!foundTerminator) {
        throw new Error(
          'No valid message found. The image may not contain hidden data, or the password is incorrect.'
        );
      }

      if (rawBytes.length === 0) {
        return '';
      }

      return decoder.decode(new Uint8Array(rawBytes));
    },

    /**
     * Calculate the capacity of a given image (public helper).
     * @param {number} width
     * @param {number} height
     * @returns {number} usable bytes
     */
    getCapacity: function (width, height) {
      return calculateCapacity(width, height) - 1;
    },
  };

  // Expose globally
  window.Steganography = Steganography;
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/steganography.js
git commit -m "feat: add LSB steganography core with repeating-key XOR encryption"
```

---

### Task 4: Easter Egg System (easteregg.js)

**Files:**
- Create: `js/easteregg.js`

**Interfaces:**
- Produces: global `EasterEgg` object attached to `window`
  - `EasterEgg.init()` — starts listening for Konami code, sets up overlay close handler
  - `EasterEgg.show()` — triggers the easter egg overlay with a random hidden message
  - `EasterEgg.hide()` — hides the overlay
  - Internal: tracks Konami code sequence via `keydown` listener

**Requirements:**
- Konami code: `ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a`
- Key names use `event.key` (not keyCode, which is deprecated)
- On activation: show the `#easteregg-overlay` div with a randomly selected message from a predefined pool of at least 5 nerdy/cyberpunk messages
- Overlay dismissed by clicking anywhere on it or pressing Escape
- Debounce: once activated, ignore further Konami sequences for 3 seconds to prevent spam

- [ ] **Step 1: Create js/easteregg.js**

```javascript
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
```

- [ ] **Step 2: Commit**

```bash
git add js/easteregg.js
git commit -m "feat: add Konami code easter egg with secret messages"
```

---

### Task 5: Main Controller and UI Logic (main.js) + Integration Test Page

**Files:**
- Modify: `js/main.js` (replace skeleton with full implementation)
- Create: `tests/integration.html`

**Interfaces:**
- Consumes: `window.ParticleSystem` (Task 2), `window.Steganography` (Task 3), `window.EasterEgg` (Task 4)
- Consumes: All DOM element IDs defined in `index.html` (Task 1)
- Produces: Working application — encoding, decoding, particle background, easter egg

**Requirements:**
- Initialize `ParticleSystem` on the `#particle-canvas`
- Initialize `EasterEgg`
- Tab switching between encode/decode panels
- Encode flow: load cover image → show preview + capacity → enable encode button → encode + download result as PNG
- Decode flow: load stego image → show preview → enable decode button → decode + display result
- Image loading: use `FileReader` + `<img>` + draw to offscreen `<canvas>` to get `ImageData`
- Download: convert result `ImageData` to `<canvas>` → `canvas.toBlob()` → trigger download via `<a>` click
- All errors displayed in `#status-message` with appropriate class (`error` or `success`)
- Button disabled states: encode button disabled until image and message are provided; decode button disabled until image is provided
- Capacity display: update `#encode-capacity` when image loads to show available bytes

- [ ] **Step 1: Create tests/integration.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisualStealthLab — Integration Tests</title>
  <style>
    body { font-family: monospace; background: #111; color: #0f0; padding: 2rem; }
    h1 { color: #0f0; }
    .test { margin: 0.5rem 0; padding: 0.5rem; border-left: 3px solid #333; }
    .test.pass { border-color: #0f0; }
    .test.fail { border-color: #f00; color: #f00; }
    .test.running { border-color: #ff0; color: #ff0; }
    button { background: #0f0; color: #000; border: none; padding: 0.5rem 1rem; cursor: pointer; font-weight: bold; }
    button:hover { background: #0c0; }
  </style>
</head>
<body>
  <h1>VisualStealthLab Integration Tests</h1>
  <p>Open the browser console (F12) for detailed results.</p>
  <button onclick="runAllTests()">Run All Tests</button>
  <div id="results"></div>

  <!-- Load all source files first, then the test script -->
  <script src="../js/particles.js"></script>
  <script src="../js/steganography.js"></script>
  <script src="../js/easteregg.js"></script>
  <script>
    'use strict';

    const resultsEl = document.getElementById('results');
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(condition, testName) {
      totalTests++;
      const div = document.createElement('div');
      div.className = 'test running';
      div.textContent = `RUNNING: ${testName}`;
      resultsEl.appendChild(div);

      if (condition) {
        passedTests++;
        div.className = 'test pass';
        div.textContent = `✅ PASS: ${testName}`;
      } else {
        failedTests++;
        div.className = 'test fail';
        div.textContent = `❌ FAIL: ${testName}`;
      }
      console.log(condition ? `✅ ${testName}` : `❌ ${testName}`);
    }

    // Helper: create a simple test image (10x10 pixels)
    function createTestImageData(width, height) {
      const data = new Uint8ClampedArray(width * height * 4);
      // Fill with a gradient-ish pattern
      for (let i = 0; i < data.length; i += 4) {
        data[i] = (i % 256);       // R
        data[i + 1] = (i + 85) % 256; // G
        data[i + 2] = (i + 170) % 256; // B
        data[i + 3] = 255;         // A
      }
      return new ImageData(data, width, height);
    }

    async function runAllTests() {
      resultsEl.innerHTML = '';
      totalTests = 0;
      passedTests = 0;
      failedTests = 0;

      console.log('=== VisualStealthLab Integration Tests ===');

      // --- Test 1: Basic encode/decode round-trip ---
      try {
        const imgData = createTestImageData(100, 100);
        const message = 'Hello, Steganography!';
        const password = 'testkey';

        const encoded = Steganography.encode(imgData, message, password);
        assert(encoded.used === message.length, 'Round-trip: encode returns correct used bytes');

        const decoded = Steganography.decode(encoded.imageData, password);
        assert(decoded === message, `Round-trip: decoded message matches (got: "${decoded}")`);
      } catch (e) {
        assert(false, `Round-trip basic: ${e.message}`);
      }

      // --- Test 2: Empty password ---
      try {
        const imgData = createTestImageData(100, 100);
        const message = 'No password test';
        const password = '';

        const encoded = Steganography.encode(imgData, message, password);
        const decoded = Steganography.decode(encoded.imageData, password);
        assert(decoded === message, 'Empty password: round-trip works');
      } catch (e) {
        assert(false, `Empty password: ${e.message}`);
      }

      // --- Test 3: Unicode message ---
      try {
        const imgData = createTestImageData(100, 100);
        const message = '你好，世界！🚀✨';
        const password = 'unicode🔑';

        const encoded = Steganography.encode(imgData, message, password);
        const decoded = Steganography.decode(encoded.imageData, password);
        assert(decoded === message, 'Unicode: message survives round-trip');
      } catch (e) {
        assert(false, `Unicode: ${e.message}`);
      }

      // --- Test 4: Wrong password fails ---
      try {
        const imgData = createTestImageData(100, 100);
        const message = 'Secret message';
        const password = 'correct';

        const encoded = Steganography.encode(imgData, message, password);
        try {
          Steganography.decode(encoded.imageData, 'wrong');
          assert(false, 'Wrong password: should have thrown');
        } catch (e) {
          assert(true, 'Wrong password: correctly throws error');
        }
      } catch (e) {
        assert(false, `Wrong password setup: ${e.message}`);
      }

      // --- Test 5: Empty message throws ---
      try {
        const imgData = createTestImageData(10, 10);
        try {
          Steganography.encode(imgData, '', 'key');
          assert(false, 'Empty message: should have thrown');
        } catch (e) {
          assert(e.message === 'Message cannot be empty', 'Empty message: correctly throws');
        }
      } catch (e) {
        assert(false, `Empty message test: ${e.message}`);
      }

      // --- Test 6: Message too large throws ---
      try {
        const imgData = createTestImageData(2, 2); // Only 2*2*3/8 = 1 byte capacity
        try {
          Steganography.encode(imgData, 'This is too long for a 2x2 image', 'key');
          assert(false, 'Too large: should have thrown');
        } catch (e) {
          assert(e.message.includes('too large') || e.message.includes('Capacity'), 'Too large: correctly throws');
        }
      } catch (e) {
        assert(false, `Too large test: ${e.message}`);
      }

      // --- Test 7: Decode on clean image fails ---
      try {
        const imgData = createTestImageData(100, 100);
        try {
          Steganography.decode(imgData, 'anykey');
          assert(false, 'Clean image: should have thrown');
        } catch (e) {
          assert(true, 'Clean image: correctly throws');
        }
      } catch (e) {
        assert(false, `Clean image test: ${e.message}`);
      }

      // --- Test 8: Capacity calculation ---
      try {
        const cap = Steganography.getCapacity(100, 100);
        const expected = Math.floor((100 * 100 * 3) / 8) - 1;
        assert(cap === expected, `Capacity: ${cap} bytes (expected ${expected})`);
      } catch (e) {
        assert(false, `Capacity test: ${e.message}`);
      }

      // --- Test 9: ParticleSystem instantiation ---
      try {
        // Create a temporary canvas for testing
        const testCanvas = document.createElement('canvas');
        testCanvas.id = 'test-particles';
        document.body.appendChild(testCanvas);

        const ps = new ParticleSystem('test-particles');
        assert(ps instanceof ParticleSystem, 'ParticleSystem: instantiation works');
        assert(typeof ps.start === 'function', 'ParticleSystem: has start()');
        assert(typeof ps.stop === 'function', 'ParticleSystem: has stop()');

        ps.start();
        assert(ps.running === true, 'ParticleSystem: start() sets running');
        ps.stop();
        assert(ps.running === false, 'ParticleSystem: stop() clears running');

        document.body.removeChild(testCanvas);
      } catch (e) {
        assert(false, `ParticleSystem: ${e.message}`);
      }

      // --- Test 10: EasterEgg API ---
      try {
        assert(typeof EasterEgg === 'object', 'EasterEgg: object exists');
        assert(typeof EasterEgg.init === 'function', 'EasterEgg: has init()');
        assert(typeof EasterEgg.show === 'function', 'EasterEgg: has show()');
        assert(typeof EasterEgg.hide === 'function', 'EasterEgg: has hide()');
      } catch (e) {
        assert(false, `EasterEgg API: ${e.message}`);
      }

      // --- Test 11: Non-ASCII password bytes ---
      try {
        const imgData = createTestImageData(100, 100);
        const message = 'Test with funky password';
        const password = 'pässwörd🔐';

        const encoded = Steganography.encode(imgData, message, password);
        const decoded = Steganography.decode(encoded.imageData, password);
        assert(decoded === message, 'Non-ASCII password: round-trip works');
      } catch (e) {
        assert(false, `Non-ASCII password: ${e.message}`);
      }

      // --- Test 12: Long repeating message ---
      try {
        const imgData = createTestImageData(100, 100);
        const message = 'A'.repeat(500);
        const password = 'key';

        const encoded = Steganography.encode(imgData, message, password);
        const decoded = Steganography.decode(encoded.imageData, password);
        assert(decoded === message, `Long message (${message.length} chars): round-trip works`);
      } catch (e) {
        assert(false, `Long message: ${e.message}`);
      }

      // --- Test 13: XOR is symmetric ---
      try {
        const imgData1 = createTestImageData(100, 100);
        const imgData2 = createTestImageData(100, 100);
        const message = 'Symmetry test';
        const password = 'xor-test';

        const encoded1 = Steganography.encode(imgData1, message, password);
        const encoded2 = Steganography.encode(imgData2, message, password);
        const decoded1 = Steganography.decode(encoded1.imageData, password);
        const decoded2 = Steganography.decode(encoded2.imageData, password);
        assert(decoded1 === decoded2, 'XOR symmetry: same input produces same output');
      } catch (e) {
        assert(false, `XOR symmetry: ${e.message}`);
      }

      // Summary
      console.log(`=== Results: ${passedTests}/${totalTests} passed ===`);
      const summary = document.createElement('div');
      summary.style.marginTop = '1rem';
      summary.style.fontWeight = 'bold';
      summary.style.fontSize = '1.2rem';
      if (failedTests === 0) {
        summary.style.color = '#0f0';
        summary.textContent = `All ${passedTests} tests passed! 🎉`;
      } else {
        summary.style.color = '#f00';
        summary.textContent = `${passedTests}/${totalTests} passed, ${failedTests} failed`;
      }
      resultsEl.appendChild(summary);
    }

    // Auto-run on load
    window.addEventListener('DOMContentLoaded', function () {
      setTimeout(runAllTests, 500);
    });
  </script>
</body>
</html>
```

- [ ] **Step 2: Replace js/main.js with full implementation**

```javascript
/**
 * VisualStealthLab — Main Controller
 * Initializes particles, easter eggs, and wires UI events.
 */
(function () {
  'use strict';

  // --- State ---
  let encodeImage = null;      // ImageData of loaded cover image
  let decodeImage = null;      // ImageData of loaded stego image
  let particleSystem = null;

  // --- DOM Elements ---
  const $ = function (id) { return document.getElementById(id); };

  const els = {
    encodePanel:       $('encode-panel'),
    decodePanel:       $('decode-panel'),
    tabEncode:         $('tab-encode'),
    tabDecode:         $('tab-decode'),
    passwordInput:     $('password-input'),
    encodeImageInput:  $('encode-image-input'),
    messageInput:      $('message-input'),
    encodeCapacity:    $('encode-capacity'),
    encodeButton:      $('encode-button'),
    encodePreview:     $('encode-preview'),
    encodePreviewCanvas: $('encode-preview-canvas'),
    decodeImageInput:  $('decode-image-input'),
    decodeButton:      $('decode-button'),
    decodeResult:      $('decode-result'),
    decodedMessage:    $('decoded-message'),
    decodePreview:     $('decode-preview'),
    decodePreviewCanvas: $('decode-preview-canvas'),
    statusMessage:     $('status-message'),
  };

  // --- Utilities ---

  /**
   * Show a status message to the user.
   * @param {string} text - message text
   * @param {'error'|'success'} type - message type
   * @param {number} [duration] - auto-hide after ms (0 = permanent)
   */
  function showStatus(text, type, duration) {
    els.statusMessage.textContent = text;
    els.statusMessage.className = 'status ' + type;
    if (duration && duration > 0) {
      setTimeout(function () {
        els.statusMessage.classList.add('hidden');
      }, duration);
    }
  }

  function hideStatus() {
    els.statusMessage.classList.add('hidden');
  }

  /**
   * Load an image file and return its ImageData via canvas.
   * @param {File} file - image file from input
   * @returns {Promise<{ imageData: ImageData, img: HTMLImageElement }>}
   */
  function loadImageData(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type.match(/^image\/(png|jpeg|bmp)/)) {
        reject(new Error('Please select a valid image file (PNG, JPEG, or BMP).'));
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve({ imageData: imageData, img: img });
          } catch (err) {
            reject(new Error('Failed to read image data. The image may be tainted.'));
          }
        };
        img.onerror = function () {
          reject(new Error('Failed to load image. The file may be corrupted.'));
        };
        img.src = e.target.result;
      };
      reader.onerror = function () {
        reject(new Error('Failed to read file.'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Draw an ImageData to a preview canvas.
   * @param {HTMLCanvasElement} canvas
   * @param {ImageData} imageData
   */
  function showPreview(canvas, imageData) {
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Download ImageData as a PNG file.
   * @param {ImageData} imageData
   * @param {string} filename
   */
  function downloadImageData(imageData, filename) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // --- Tab Switching ---

  function switchTab(tab) {
    if (tab === 'encode') {
      els.encodePanel.classList.add('active');
      els.decodePanel.classList.remove('active');
      els.tabEncode.classList.add('active');
      els.tabDecode.classList.remove('active');
    } else {
      els.decodePanel.classList.add('active');
      els.encodePanel.classList.remove('active');
      els.tabDecode.classList.add('active');
      els.tabEncode.classList.remove('active');
    }
    hideStatus();
  }

  // --- Encode Handlers ---

  function onEncodeImageSelected(e) {
    hideStatus();
    const file = e.target.files[0];
    if (!file) return;

    loadImageData(file).then(function (result) {
      encodeImage = result.imageData;
      showPreview(els.encodePreviewCanvas, encodeImage);
      els.encodePreview.classList.remove('hidden');

      // Show capacity
      const cap = Steganography.getCapacity(encodeImage.width, encodeImage.height);
      els.encodeCapacity.textContent =
        'Image capacity: ' + cap.toLocaleString() + ' bytes' +
        ' (' + encodeImage.width + '×' + encodeImage.height + ' pixels)';
      els.encodeCapacity.style.color = '#888';

      updateEncodeButton();
    }).catch(function (err) {
      showStatus(err.message, 'error');
      encodeImage = null;
      updateEncodeButton();
    });
  }

  function onMessageChanged() {
    hideStatus();
    updateEncodeButton();

    // Update capacity estimate in real-time
    if (encodeImage) {
      const cap = Steganography.getCapacity(encodeImage.width, encodeImage.height);
      const encoder = new TextEncoder();
      const msgLen = encoder.encode(els.messageInput.value).length;
      if (msgLen > cap) {
        els.encodeCapacity.textContent =
          '⚠️ Message too large! ' + msgLen.toLocaleString() + ' bytes needed, ' +
          cap.toLocaleString() + ' bytes available';
        els.encodeCapacity.style.color = '#ff5555';
      } else if (msgLen > 0) {
        els.encodeCapacity.textContent =
          'Message: ' + msgLen.toLocaleString() + ' / ' + cap.toLocaleString() + ' bytes';
        els.encodeCapacity.style.color = '#00ff88';
      } else {
        const cap = Steganography.getCapacity(encodeImage.width, encodeImage.height);
        els.encodeCapacity.textContent =
          'Image capacity: ' + cap.toLocaleString() + ' bytes';
        els.encodeCapacity.style.color = '#888';
      }
    }
  }

  function updateEncodeButton() {
    els.encodeButton.disabled = !(
      encodeImage &&
      els.messageInput.value.trim().length > 0 &&
      els.passwordInput.value.length > 0
    );
  }

  function onEncode() {
    hideStatus();
    if (!encodeImage) return;

    try {
      const message = els.messageInput.value;
      const password = els.passwordInput.value;

      if (!password) {
        showStatus('Please enter a password for encryption.', 'error');
        return;
      }

      if (!message.trim()) {
        showStatus('Please enter a message to hide.', 'error');
        return;
      }

      const result = Steganography.encode(encodeImage, message, password);

      // Show result preview
      showPreview(els.encodePreviewCanvas, result.imageData);

      // Download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadImageData(result.imageData, 'stego-' + timestamp + '.png');

      showStatus(
        '✅ Message encoded! ' + result.used.toLocaleString() + ' bytes hidden. Image downloaded.',
        'success',
        8000
      );
    } catch (err) {
      showStatus(err.message, 'error');
    }
  }

  // --- Decode Handlers ---

  function onDecodeImageSelected(e) {
    hideStatus();
    const file = e.target.files[0];
    if (!file) return;

    loadImageData(file).then(function (result) {
      decodeImage = result.imageData;
      showPreview(els.decodePreviewCanvas, decodeImage);
      els.decodePreview.classList.remove('hidden');
      els.decodeResult.classList.add('hidden');
      updateDecodeButton();
    }).catch(function (err) {
      showStatus(err.message, 'error');
      decodeImage = null;
      updateDecodeButton();
    });
  }

  function updateDecodeButton() {
    els.decodeButton.disabled = !decodeImage;
  }

  function onDecode() {
    hideStatus();
    if (!decodeImage) return;

    try {
      const password = els.passwordInput.value;
      if (!password) {
        showStatus('Please enter the password used during encoding.', 'error');
        return;
      }

      const message = Steganography.decode(decodeImage, password);

      els.decodedMessage.textContent = message;
      els.decodeResult.classList.remove('hidden');
      showStatus('✅ Message decoded successfully!', 'success', 5000);
    } catch (err) {
      showStatus(err.message, 'error');
    }
  }

  // --- Password Changes ---

  function onPasswordChanged() {
    updateEncodeButton();
    updateDecodeButton();
  }

  // --- Initialization ---

  function init() {
    // Start particle system
    try {
      particleSystem = new ParticleSystem('particle-canvas');
      particleSystem.start();
    } catch (e) {
      console.error('Failed to start particle system:', e);
    }

    // Init easter eggs
    EasterEgg.init();

    // Tab switching
    els.tabEncode.addEventListener('click', function () { switchTab('encode'); });
    els.tabDecode.addEventListener('click', function () { switchTab('decode'); });

    // Encode panel events
    els.encodeImageInput.addEventListener('change', onEncodeImageSelected);
    els.messageInput.addEventListener('input', onMessageChanged);
    els.encodeButton.addEventListener('click', onEncode);
    els.passwordInput.addEventListener('input', onPasswordChanged);

    // Decode panel events
    els.decodeImageInput.addEventListener('change', onDecodeImageSelected);
    els.decodeButton.addEventListener('click', onDecode);

    // Initial button state
    updateEncodeButton();
    updateDecodeButton();

    console.log('VisualStealthLab ready.');
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
```

- [ ] **Step 3: Commit**

```bash
git add js/main.js tests/integration.html
git commit -m "feat: add main controller, UI logic, and integration tests"
```

---

### Task 6: README.md and Final Polish

**Files:**
- Create: `README.md`

**Interfaces:**
- None (standalone documentation)

**Requirements:**
- Project title and description
- Features list (particle background, LSB steganography, XOR encryption, easter egg)
- How to use (encode + decode steps)
- Technical details (algorithm explanation, capacity formula)
- Screenshot placeholder
- Browser compatibility note
- No license (personal project)

- [ ] **Step 1: Create README.md**

```markdown
# VisualStealthLab

A browser-based **LSB (Least Significant Bit) steganography** tool with
repeating-key XOR encryption, a live particle system background, and hidden
easter eggs. Hide secret messages inside images — invisible to the naked
eye, recoverable only with the correct password.

## Features

- **LSB Steganography** — Embeds data in the least significant bits of
  image pixels (R, G, B channels). The visual difference is imperceptible.
- **Repeating-Key XOR Encryption** — Messages are XOR-encrypted with the
  user's password before embedding. Without the correct password, extracted
  data is meaningless.
- **Particle System Background** — 120+ particles drift across the
  screen, connected by proximity lines, reacting to mouse movement.
- **Hidden Easter Egg** — Try the Konami code (↑ ↑ ↓ ↓ ← → ← → B A) …
- **Zero Dependencies** — Pure HTML, CSS, and JavaScript. No frameworks,
  no build tools. Just open `index.html` in a browser.
- **Unicode Support** — Full UTF-8 encoding via `TextEncoder`/`TextDecoder`.
  Hide text in any language, including emoji.

## How to Use

### Encode (Hide a Message)

1. Open `index.html` in a modern browser.
2. Stay on the **Encode** tab.
3. Enter a **password** — this encrypts your message.
4. Select a **cover image** (PNG, JPEG, or BMP).
5. Type your **secret message** in the text area.
6. Click **Encode & Download** — the stego image is saved as a PNG.

The resulting image looks identical to the original but carries your
hidden message.

### Decode (Extract a Message)

1. Switch to the **Decode** tab.
2. Enter the **same password** used during encoding.
3. Select the **stego image** (must be PNG or BMP — JPEG recompression
   destroys LSB data).
4. Click **Decode** — the hidden message appears.

**Important:** Decoding requires a **lossless** image format (PNG, BMP).
JPEG compression will corrupt the hidden data.

## Technical Details

### Encoding Algorithm

1. Convert the plaintext message to UTF-8 bytes.
2. Apply **repeating-key XOR**: each message byte is XOR'd with the
   corresponding password byte (password cycles: `key[i % key.length]`).
3. Append a `0x00` byte (also XOR-encrypted) as the end-of-message marker.
4. Convert encrypted bytes to a bit stream (MSB first per byte).
5. Replace the LSB of each R, G, B channel (skipping Alpha) in sequential
   pixels with the message bits.

### Decoding Algorithm

1. Extract LSBs from R, G, B channels sequentially to reconstruct a bit
   stream.
2. Group bits into bytes (8 bits each, MSB first).
3. Apply XOR decryption to each byte with the repeating password key.
4. Stop when a decrypted byte equals `0x00` (the terminator).
5. Convert all bytes before the terminator back to a UTF-8 string.

### Capacity

```
capacity_bytes = floor((width × height × 3) / 8) - 1
```

The `-1` accounts for the terminator byte. Each pixel provides 3 bits
(R, G, B). A 1000×1000 image can hold ~374,999 bytes (≈366 KB).

### Why Repeating-Key XOR?

- XOR is its own inverse: `encode(x, key) → decode(result, key) = x`.
- The `0x00` terminator, after XOR with the key byte at that position,
  becomes the key byte itself — but decryption XORs it back to `0x00`,
  so the terminator is always detectable with the correct key.
- Simple, deterministic, no external crypto dependencies.

## Browser Compatibility

Works in all modern browsers:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

Requires `TextEncoder`/`TextDecoder` APIs (available in all modern
browsers) and Canvas API support.

## Project Structure

```
VisualStealthLab/
├── index.html              # Main application HTML
├── css/
│   └── style.css           # All styles
├── js/
│   ├── particles.js        # Canvas particle system
│   ├── steganography.js    # LSB steganography core
│   ├── easteregg.js        # Konami code easter egg
│   └── main.js             # Main controller & UI logic
├── tests/
│   └── integration.html    # Integration test suite
└── README.md               # This file
```

## Running Tests

Open `tests/integration.html` in a browser. Tests run automatically on
page load (after a 500ms delay to ensure scripts are loaded). Results
appear on the page and in the browser console.

---

*"In a world of plain sight, the hidden truth travels in the least
significant places."*
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage guide and technical details"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] particles.js + easteregg.js (Task 2, Task 4)
- [x] steganography.js with repeating-key XOR (Task 3)
- [x] index.html + style.css + main.js (Task 1, Task 5)
- [x] README.md + integration tests (Task 6, Task 5)
- [x] Repeating-key XOR confirmed in algorithm spec (Task 3)
- [x] 0x00 terminator handling documented (Task 3)
- [x] No external dependencies (all tasks)

**Type consistency:**
- `Steganography.encode(imageData, message, password)` — consistent across Task 3, Task 5, and tests
- `Steganography.decode(imageData, password)` — consistent
- `Steganography.getCapacity(width, height)` — consistent
- `ParticleSystem(canvasId)` constructor — consistent across Task 2 and Task 5
- `EasterEgg.init()`, `.show()`, `.hide()` — consistent across Task 4 and Task 5
- DOM element IDs in Task 1 match all selectors in Task 2, Task 4, Task 5

**Placeholder scan:** Clean — no TBD, TODO, or placeholder patterns found.

**Execution flow:** Task 1 (scaffolding) → Task 2 (particles) → Task 3 (steganography) → Task 4 (easter egg) → Task 5 (main.js + tests) → Task 6 (README). Tasks 2-4 are independent of each other and could theoretically be parallelized, but sequential dispatch avoids git conflicts. Task 5 depends on all previous tasks.
