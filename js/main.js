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

  let statusTimeout = null;

  // --- Utilities ---

  /**
   * Show a status message to the user.
   * @param {string} text - message text
   * @param {'error'|'success'} type - message type
   * @param {number} [duration] - auto-hide after ms (0 = permanent)
   */
  function showStatus(text, type, duration) {
    if (statusTimeout) {
      clearTimeout(statusTimeout);
      statusTimeout = null;
    }
    els.statusMessage.textContent = text;
    els.statusMessage.className = 'status ' + type;
    if (duration && duration > 0) {
      statusTimeout = setTimeout(function () {
        els.statusMessage.classList.add('hidden');
        statusTimeout = null;
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
