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
