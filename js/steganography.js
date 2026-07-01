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
