/**
 * VisualStealthLab — Main Controller
 * Initializes particles, easter eggs, theme, toasts, drag & drop,
 * and wires all UI events.
 */
(function () {
  'use strict';

  // --- State ---
  var encodeImage = null;      // ImageData of loaded cover image
  var decodeImage = null;      // ImageData of loaded stego image
  var particleSystem = null;

  // --- DOM Elements ---
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    encodePanel:       $('encode-panel'),
    decodePanel:       $('decode-panel'),
    tabEncode:         $('tab-encode'),
    tabDecode:         $('tab-decode'),
    passwordInput:     $('password-input'),
    encodeImageInput:  $('encode-image-input'),
    messageInput:      $('message-input'),
    charCount:         $('char-count'),
    encodeCapacity:    $('encode-capacity'),
    encodeButton:      $('encode-button'),
    encodePreview:     $('encode-preview'),
    encodePreviewCanvas: $('encode-preview-canvas'),
    decodeImageInput:  $('decode-image-input'),
    decodeButton:      $('decode-button'),
    decodeResult:      $('decode-result'),
    decodedMessage:    $('decoded-message'),
    copyResult:        $('copy-result'),
    decodePreview:     $('decode-preview'),
    decodePreviewCanvas: $('decode-preview-canvas'),
    statusMessage:     $('status-message'),
    themeToggle:       $('theme-toggle'),
    themeIcon:         document.querySelector('#theme-toggle .theme-icon'),
    toastContainer:    $('toast-container'),
  };

  var statusTimeout = null;

  // ====================================================================
  // A. Theme Toggle
  // ====================================================================

  /**
   * Apply a theme to the document.
   * @param {'dark'|'light'} theme
   */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (els.themeIcon) {
      els.themeIcon.innerHTML = theme === 'light' ? '&#x2600;&#xFE0F;' : '&#x1F319;';
    }
    if (particleSystem && typeof particleSystem.setColorScheme === 'function') {
      particleSystem.setColorScheme(theme);
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);

    // Animate the icon rotation
    if (els.themeToggle) {
      els.themeToggle.classList.add('rotated');
      setTimeout(function () {
        els.themeToggle.classList.remove('rotated');
      }, 400);
    }
  }

  function initTheme() {
    // Check system preference
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var initialTheme = prefersDark ? 'dark' : 'light';
    setTheme(initialTheme);

    // Listen for system preference changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      setTheme(e.matches ? 'dark' : 'light');
    });

    // Toggle button click
    if (els.themeToggle) {
      els.themeToggle.addEventListener('click', toggleTheme);
    }
  }

  // ====================================================================
  // B. Toast Notification System
  // ====================================================================

  /**
   * Show a toast notification.
   * @param {string} message - toast message text
   * @param {'success'|'error'|'info'} type - toast type
   * @param {number} [duration] - auto-remove after ms (default 3000)
   */
  function showToast(message, type, duration) {
    var dur = duration || 3000;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;

    els.toastContainer.appendChild(toast);

    // Trigger removal after duration
    var removeTimer = setTimeout(function () {
      removeToast(toast);
    }, dur);

    // Allow click to dismiss early
    toast.addEventListener('click', function () {
      clearTimeout(removeTimer);
      removeToast(toast);
    });
  }

  function removeToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // ====================================================================
  // Original showStatus — kept for persistent messages
  // ====================================================================

  /**
   * Show persistent status message in the status bar.
   * Prefer showToast() for transient notifications.
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

  // ====================================================================
  // C. Drag & Drop
  // ====================================================================

  function initDragDrop() {
    var dropZones = document.querySelectorAll('.drop-zone');

    dropZones.forEach(function (zone) {
      // Prevent default to allow drop
      zone.addEventListener('dragenter', function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        // Only remove if we're actually leaving the zone (not entering a child)
        if (!zone.contains(e.relatedTarget)) {
          zone.classList.remove('drag-over');
        }
      });

      zone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');

        var files = e.dataTransfer.files;
        if (files.length === 0) return;

        var file = files[0];
        var targetId = zone.getAttribute('data-drop-target');
        var targetInput = document.getElementById(targetId);

        if (!targetInput) return;

        // Assign the file to the input and trigger change
        var dt = new DataTransfer();
        dt.items.add(file);
        targetInput.files = dt.files;
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // Also prevent default drops on the whole document to avoid browser opening the file
    document.addEventListener('dragover', function (e) {
      e.preventDefault();
    });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
    });
  }

  // ====================================================================
  // D. Character Count
  // ====================================================================

  function updateCharCount() {
    var len = els.messageInput.value.length;
    els.charCount.textContent = len + ' 字符';
  }

  // ====================================================================
  // E. Copy Button
  // ====================================================================

  function initCopyButton() {
    els.copyResult.addEventListener('click', function () {
      var text = els.decodedMessage.textContent;
      if (!text) return;

      navigator.clipboard.writeText(text).then(function () {
        els.copyResult.innerHTML = '&#x2705; 已复制';
        showToast('已复制到剪贴板', 'success', 2000);
        setTimeout(function () {
          els.copyResult.innerHTML = '&#x1F4CB; 复制';
        }, 2000);
      }).catch(function () {
        // Fallback for older browsers
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          els.copyResult.innerHTML = '&#x2705; 已复制';
          showToast('已复制到剪贴板', 'success', 2000);
          setTimeout(function () {
            els.copyResult.innerHTML = '&#x1F4CB; 复制';
          }, 2000);
        } catch (err) {
          showToast('复制失败，请手动选择文本', 'error', 3000);
        }
        document.body.removeChild(textarea);
      });
    });
  }

  // ====================================================================
  // Image Utilities
  // ====================================================================

  /**
   * Load an image file and return its ImageData via canvas.
   * @param {File} file - image file from input
   * @returns {Promise<{ imageData: ImageData, img: HTMLImageElement }>}
   */
  function loadImageData(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type.match(/^image\/(png|jpeg|bmp)/)) {
        reject(new Error('请选择有效的图像文件 (PNG, JPEG, or BMP).'));
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          try {
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve({ imageData: imageData, img: img });
          } catch (err) {
            reject(new Error('无法读取图像数据，可能被污染。'));
          }
        };
        img.onerror = function () {
          reject(new Error('无法加载图像，文件可能已损坏。'));
        };
        img.src = e.target.result;
      };
      reader.onerror = function () {
        reject(new Error('文件读取失败。'));
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
    var ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Download ImageData as a PNG file.
   * @param {ImageData} imageData
   * @param {string} filename
   */
  function downloadImageData(imageData, filename) {
    var canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    var ctx = canvas.getContext('2d');
    ctx.putImageData(imageData, 0, 0);

    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // ====================================================================
  // Tab Switching
  // ====================================================================

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

  // ====================================================================
  // Encode Handlers
  // ====================================================================

  function onEncodeImageSelected(e) {
    hideStatus();
    var file = e.target.files[0];
    if (!file) return;

    loadImageData(file).then(function (result) {
      encodeImage = result.imageData;
      showPreview(els.encodePreviewCanvas, encodeImage);
      els.encodePreview.classList.remove('hidden');

      // Show capacity
      var cap = Steganography.getCapacity(encodeImage.width, encodeImage.height);
      els.encodeCapacity.textContent =
        '图像容量: ' + cap.toLocaleString() + ' bytes' +
        ' (' + encodeImage.width + '×' + encodeImage.height + ' 像素)';
      els.encodeCapacity.style.color = 'var(--text-muted)';

      updateEncodeButton();
    }).catch(function (err) {
      showToast(err.message, 'error');
      encodeImage = null;
      updateEncodeButton();
    });
  }

  function onMessageChanged() {
    hideStatus();
    updateCharCount();
    updateEncodeButton();

    // Update capacity estimate in real-time
    if (encodeImage) {
      var cap = Steganography.getCapacity(encodeImage.width, encodeImage.height);
      var encoder = new TextEncoder();
      var msgLen = encoder.encode(els.messageInput.value).length;
      if (msgLen > cap) {
        els.encodeCapacity.textContent =
          '⚠️ 消息过大！需 ' + msgLen.toLocaleString() + ' 字节，仅 ' +
          cap.toLocaleString() + ' 字节可用';
        els.encodeCapacity.style.color = 'var(--error)';
      } else if (msgLen > 0) {
        els.encodeCapacity.textContent =
          '消息: ' + msgLen.toLocaleString() + ' / ' + cap.toLocaleString() + ' 字节';
        els.encodeCapacity.style.color = 'var(--success)';
      } else {
        var cap2 = Steganography.getCapacity(encodeImage.width, encodeImage.height);
        els.encodeCapacity.textContent =
          '图像容量: ' + cap2.toLocaleString() + ' 字节';
        els.encodeCapacity.style.color = 'var(--text-muted)';
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
      var message = els.messageInput.value;
      var password = els.passwordInput.value;

      if (!password) {
        showToast('请输入加密密码。', 'error');
        return;
      }

      if (!message.trim()) {
        showToast('请输入要隐藏的消息。', 'error');
        return;
      }

      var result = Steganography.encode(encodeImage, message, password);

      // Show result preview
      showPreview(els.encodePreviewCanvas, result.imageData);

      // Auto-download
      var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadImageData(result.imageData, 'stego-' + timestamp + '.png');

      showToast(
        '✅ 消息已编码！' + result.used.toLocaleString() + ' 字节已隐藏。图像已下载。',
        'success',
        5000
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ====================================================================
  // Decode Handlers
  // ====================================================================

  function onDecodeImageSelected(e) {
    hideStatus();
    var file = e.target.files[0];
    if (!file) return;

    loadImageData(file).then(function (result) {
      decodeImage = result.imageData;
      showPreview(els.decodePreviewCanvas, decodeImage);
      els.decodePreview.classList.remove('hidden');
      els.decodeResult.classList.add('hidden');
      els.copyResult.classList.add('hidden');
      updateDecodeButton();
    }).catch(function (err) {
      showToast(err.message, 'error');
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
      var password = els.passwordInput.value;
      if (!password) {
        showToast('请输入编码时使用的密码。', 'error');
        return;
      }

      var message = Steganography.decode(decodeImage, password);

      els.decodedMessage.textContent = message;
      els.decodeResult.classList.remove('hidden');
      els.copyResult.classList.remove('hidden');
      showToast('✅ 消息解码成功！', 'success', 5000);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ====================================================================
  // Password Changes
  // ====================================================================

  function onPasswordChanged() {
    updateEncodeButton();
    updateDecodeButton();
  }

  // ====================================================================
  // Initialization
  // ====================================================================

  function init() {
    // Start particle system
    try {
      particleSystem = new ParticleSystem('particle-canvas');
      particleSystem.start();
    } catch (e) {
      console.error('Failed to start particle system:', e);
    }

    // Initialize theme
    initTheme();

    // Init easter eggs with particle system reference
    try {
      EasterEgg.init(particleSystem);
    } catch (e) {
      console.error('Failed to init easter eggs:', e);
    }

    // Initialize drag & drop
    initDragDrop();

    // Initialize copy button
    initCopyButton();

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
    updateCharCount();

    console.log('VisualStealthLab ready.');
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
