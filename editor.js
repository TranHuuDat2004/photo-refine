const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

const cropBtn = document.getElementById('cropBtn');
const applyCropBtn = document.getElementById('applyCropBtn');
const cancelCropBtn = document.getElementById('cancelCropBtn');
const cropActions = document.getElementById('cropActions');
const mainActions = document.getElementById('mainActions');

// Sliders
const sliders = {
    brightness: document.getElementById('brightness'),
    contrast: document.getElementById('contrast'),
    saturation: document.getElementById('saturation'),
    blur: document.getElementById('blur'),
    temperature: document.getElementById('temperature'),
    tint: document.getElementById('tint'),
    highlights: document.getElementById('highlights'),
    midtones: document.getElementById('midtones'),
    shadows: document.getElementById('shadows'),
    sharpen: document.getElementById('sharpen'),
    dehaze: document.getElementById('dehaze'),
    denoise: document.getElementById('denoise'),
    vignette: document.getElementById('vignette'),
    grain: document.getElementById('grain')
};

// Value displays
const valDisplays = {
    brightness: document.getElementById('brightnessVal'),
    contrast: document.getElementById('contrastVal'),
    saturation: document.getElementById('saturationVal'),
    blur: document.getElementById('blurVal'),
    temperature: document.getElementById('temperatureVal'),
    tint: document.getElementById('tintVal'),
    highlights: document.getElementById('highlightsVal'),
    midtones: document.getElementById('midtonesVal'),
    shadows: document.getElementById('shadowsVal'),
    sharpen: document.getElementById('sharpenVal'),
    dehaze: document.getElementById('dehazeVal'),
    denoise: document.getElementById('denoiseVal'),
    vignette: document.getElementById('vignetteVal'),
    grain: document.getElementById('grainVal')
};

const historyList = document.getElementById('historyList');
const presetCards = document.querySelectorAll('.preset-card');

const presets = {
    none: { brightness: 100, contrast: 100, saturation: 100, blur: 0, temperature: 0, tint: 0, highlights: 0, midtones: 0, shadows: 0, sharpen: 0, dehaze: 0, denoise: 0, vignette: 0, grain: 0 },
    bold: { brightness: 105, contrast: 112, saturation: 120, blur: 0, temperature: 5, tint: 0, highlights: -10, midtones: 5, shadows: -5, sharpen: 35, dehaze: 10, denoise: 0, vignette: 15, grain: 0 },
    vivid: { brightness: 100, contrast: 110, saturation: 140, blur: 0, temperature: 10, tint: 5, highlights: 5, midtones: 0, shadows: 0, sharpen: 20, dehaze: 0, denoise: 0, vignette: 0, grain: 0 },
    vintage: { brightness: 110, contrast: 95, saturation: 70, blur: 0, temperature: 30, tint: -10, highlights: 20, midtones: 10, shadows: 15, sharpen: 0, dehaze: 0, denoise: 5, vignette: 25, grain: 40 },
    bw: { brightness: 100, contrast: 120, saturation: 0, blur: 0, temperature: 0, tint: 0, highlights: 10, midtones: 0, shadows: -10, sharpen: 25, dehaze: 5, denoise: 0, vignette: 10, grain: 20 },
    cinematic: { brightness: 95, contrast: 115, saturation: 85, blur: 0, temperature: -10, tint: 15, highlights: -15, midtones: -5, shadows: 5, sharpen: 30, dehaze: 0, denoise: 0, vignette: 30, grain: 15 },
    golden: { brightness: 110, contrast: 105, saturation: 125, blur: 0, temperature: 40, tint: 10, highlights: 25, midtones: 15, shadows: 0, sharpen: 15, dehaze: 0, denoise: 0, vignette: 5, grain: 0 },
    teal: { brightness: 90, contrast: 110, saturation: 110, blur: 0, temperature: -30, tint: 20, highlights: -10, midtones: 0, shadows: -20, sharpen: 20, dehaze: 15, denoise: 0, vignette: 20, grain: 5 },
    moody: { brightness: 85, contrast: 130, saturation: 70, blur: 0, temperature: -15, tint: -5, highlights: -25, midtones: -10, shadows: -15, sharpen: 10, dehaze: 5, denoise: 0, vignette: 40, grain: 25 },
    dreamy: { brightness: 115, contrast: 85, saturation: 90, blur: 2, temperature: 10, tint: 20, highlights: 35, midtones: 20, shadows: 20, sharpen: 0, dehaze: 0, denoise: 15, vignette: -10, grain: 0 },
    highkey: { brightness: 130, contrast: 90, saturation: 105, blur: 0, temperature: 5, tint: -5, highlights: 45, midtones: 25, shadows: 30, sharpen: 5, dehaze: 0, denoise: 0, vignette: -20, grain: 0 },
    gritty: { brightness: 90, contrast: 140, saturation: 60, blur: 0, temperature: 0, tint: 15, highlights: -5, midtones: -15, shadows: -20, sharpen: 60, dehaze: 20, denoise: 0, vignette: 35, grain: 60 },
    cold: { brightness: 100, contrast: 108, saturation: 80, blur: 0, temperature: -40, tint: 0, highlights: 0, midtones: 5, shadows: 5, sharpen: 15, dehaze: 0, denoise: 0, vignette: 10, grain: 0 },
    retro: { brightness: 105, contrast: 95, saturation: 85, blur: 1, temperature: 20, tint: 15, highlights: 15, midtones: 10, shadows: 10, sharpen: 5, dehaze: 0, denoise: 10, vignette: 20, grain: 30 },
    neon: { brightness: 100, contrast: 125, saturation: 180, blur: 0, temperature: -20, tint: 30, highlights: 10, midtones: 0, shadows: 0, sharpen: 25, dehaze: 10, denoise: 0, vignette: 15, grain: 10 }
};

/**
 * Cloud Storage Manager (MongoDB + GitHub Bridge)
 */
class CloudStorage {
    constructor() {
        this.apiBase = window.location.origin;
        this.isOnline = false;
        this.token = localStorage.getItem('photo_refine_token');
        this.user = JSON.parse(localStorage.getItem('photo_refine_user') || 'null');
    }

    async init() {
        try {
            const response = await fetch(`${this.apiBase}/health`);
            if (response.ok) {
                this.isOnline = true;
                this.updateUI();
            }
        } catch (e) {
            console.warn('Cloud Server offline. Using demo mode.');
        }
    }

    getHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    setAuth(user, token) {
        this.user = user;
        this.token = token;
        localStorage.setItem('photo_refine_user', JSON.stringify(user));
        localStorage.setItem('photo_refine_token', token);
        this.updateUI();
    }

    logout() {
        this.user = null;
        this.token = null;
        localStorage.removeItem('photo_refine_user');
        localStorage.removeItem('photo_refine_token');
        this.updateUI();

        // Clear history UI
        const historyList = document.getElementById('historyList');
        const existingItems = historyList.querySelectorAll('.history-item, .empty-history, .history-error');
        existingItems.forEach(item => item.remove());
        historyList.insertAdjacentHTML('beforeend', '<div class="empty-history"><p>Please login to view edits</p></div>');
    }

    updateUI() {
        const status = document.getElementById('syncStatus');
        const authControls = document.getElementById('authControls');
        const userInfo = document.getElementById('userInfo');
        const userNameDisplay = document.getElementById('userNameDisplay');

        // Update Auth State (Login/Register vs. Logout) independently of server status
        if (this.token && this.user) {
            if (authControls) {
                authControls.classList.add('hidden');
                authControls.style.display = 'none';
            }
            if (userInfo) {
                userInfo.classList.remove('hidden');
                userInfo.style.display = 'flex';
                userInfo.style.alignItems = 'center';
            }
            if (userNameDisplay) userNameDisplay.textContent = this.user.username;
        } else {
            if (authControls) {
                authControls.classList.remove('hidden');
                authControls.style.display = 'flex';
            }
            if (userInfo) {
                userInfo.classList.add('hidden');
                userInfo.style.display = 'none';
            }
        }

        // Update Server Status UI
        if (this.isOnline && status) {
            if (this.token && this.user) {
                status.classList.add('online');
                status.innerHTML = '<i data-lucide="cloud"></i> <span>Connected</span>';
            } else {
                status.classList.remove('online');
                status.innerHTML = '<i data-lucide="cloud-off"></i> <span>Login Required</span>';
            }
        } else if (status) {
            status.classList.remove('online');
            status.innerHTML = '<i data-lucide="cloud-off"></i> <span>Offline Mode</span>';
        }

        if (window.lucide) window.lucide.createIcons();
    }

    async save(imageDataUrl) {
        if (!this.isOnline || !this.token) {
            window.location.href = '/login';
            return;
        }
        try {
            const fileName = `edit_${new Date().getTime()}.png`;
            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ image: imageDataUrl, fileName })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                    window.location.href = '/login';
                }
                throw new Error('Upload failed');
            }
            return await response.json();
        } catch (e) {
            console.error('Cloud Save Error:', e);
            throw e;
        }
    }

    async getAll() {
        if (!this.isOnline || !this.token) return [];
        try {
            const response = await fetch(`${this.apiBase}/history`, {
                headers: this.getHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                }
                return [];
            }
            return await response.json();
        } catch (e) {
            console.error('Cloud Fetch Error:', e);
            return [];
        }
    }

    async delete(id) {
        if (!this.isOnline || !this.token) return;
        try {
            const response = await fetch(`${this.apiBase}/history/${id}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok && response.status === 401) {
                this.logout();
            }
        } catch (e) {
            console.error('Cloud Delete Error:', e);
        }
    }
}

const cloud = new CloudStorage();

let originalImage = null;
let currentImageData = null;
let cropper = null;
let isCropping = false;

// Auth flows moved to login.ejs

// Initialization
async function init() {
    await cloud.init();
    setupEventListeners();

    // Always update UI to show correct auth state based on localStorage
    cloud.updateUI();

    if (cloud.token) {
        loadHistory();
    } else {
        const historyList = document.getElementById('historyList');
        if (historyList) {
            const existingItems = historyList.querySelectorAll('.history-item, .empty-history, .history-error');
            existingItems.forEach(item => item.remove());
            historyList.insertAdjacentHTML('beforeend', '<div class="empty-history"><p>Please login to view edits</p></div>');
        }
    }
}

function setupEventListeners() {
    // Editor Event Listeners
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => { cloud.logout(); window.location.reload(); });

    const historyAddNew = document.getElementById('historyAddNew');
    if (historyAddNew) {
        historyAddNew.addEventListener('click', () => imageInput.click());
    }

    const syncHistoryBtn = document.getElementById('syncHistoryBtn');
    if (syncHistoryBtn) {
        syncHistoryBtn.addEventListener('click', () => {
            const icon = syncHistoryBtn.querySelector('i');
            if (icon) icon.classList.add('spinning');

            loadHistory().finally(() => {
                setTimeout(() => {
                    if (icon) icon.classList.remove('spinning');
                }, 600);
            });
        });
    }

    dropZone.addEventListener('click', () => imageInput.click());

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadImage(file);
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) loadImage(file);
    });

    // Slider inputs
    Object.keys(sliders).forEach(key => {
        sliders[key].addEventListener('input', () => {
            updateValueDisplay(key);
            applyFilters();
        });
    });

    resetBtn.addEventListener('click', resetFilters);
    downloadBtn.addEventListener('click', downloadImage);

    // Crop Listeners
    if (cropBtn) cropBtn.addEventListener('click', startCropping);
    if (cancelCropBtn) cancelCropBtn.addEventListener('click', cancelCropping);
    if (applyCropBtn) applyCropBtn.addEventListener('click', applyCrop);

    // Presets
    presetCards.forEach(card => {
        card.addEventListener('click', () => {
            const presetKey = card.dataset.preset;
            applyPreset(presetKey);

            // Toggle active class
            presetCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

function applyPreset(key) {
    if (isCropping) return; // Prevent preset changes while cropping
    const preset = presets[key];
    if (!preset) return;

    Object.keys(preset).forEach(attr => {
        if (sliders[attr]) {
            sliders[attr].value = preset[attr];
            updateValueDisplay(attr);
        }
    });

    applyFilters();
}

function updateValueDisplay(key) {
    let suffix = '';
    if (key === 'brightness' || key === 'contrast' || key === 'saturation') suffix = '%';
    if (key === 'blur') suffix = 'px';
    valDisplays[key].textContent = sliders[key].value + suffix;
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            // Scale and draw to canvas
            setupCanvas(img);
            dropZone.classList.add('hidden');
            resetFilters();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function setupCanvas(img) {
    // Max size to keep performance snappy in demo
    const MAX_WIDTH = 1200;
    const MAX_HEIGHT = 800;
    let width = img.width;
    let height = img.height;

    if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
    }
    if (height > MAX_HEIGHT) {
        width *= MAX_HEIGHT / height;
        height = MAX_HEIGHT;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
}



function resetFilters() {
    applyPreset('none');

    // Reset active preset card
    presetCards.forEach(c => c.classList.remove('active'));
    const originalCard = document.querySelector('[data-preset="none"]');
    if (originalCard) originalCard.classList.add('active');
}

function applyFilters() {
    if (!originalImage || isCropping) return;

    // Reset canvas to original image before applying filters
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // 1. Built-in Filters (Brightness, Contrast, Saturation, Blur) for performance
    const brightnessVal = sliders.brightness.value;
    const contrastVal = sliders.contrast.value;
    const saturationVal = sliders.saturation.value;
    const blurVal = sliders.blur.value;

    ctx.filter = `brightness(${brightnessVal}%) contrast(${contrastVal}%) saturate(${saturationVal}%) blur(${blurVal}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // 2. Custom Pixel Processing
    const highlights = parseInt(sliders.highlights.value);
    const midtones = parseInt(sliders.midtones.value);
    const shadows = parseInt(sliders.shadows.value);
    const sharpen = parseInt(sliders.sharpen.value);
    const temperature = parseInt(sliders.temperature.value);
    const tint = parseInt(sliders.tint.value);
    const dehaze = parseInt(sliders.dehaze.value);
    const denoise = parseInt(sliders.denoise.value);
    const vignette = parseInt(sliders.vignette.value);
    const grain = parseInt(sliders.grain.value);

    if (highlights !== 0 || midtones !== 0 || shadows !== 0 || sharpen > 0 || temperature !== 0 || tint !== 0 || dehaze > 0 || denoise > 0 || vignette > 0 || grain > 0) {
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Dehaze & Denoise should ideally run before color/lighting tweaks or early on
        if (denoise > 0) {
            imageData = applyDenoise(imageData, denoise);
        }
        if (dehaze > 0) {
            imageData = applyDehaze(imageData, dehaze);
        }

        // Temperature & Tint
        if (temperature !== 0 || tint !== 0) {
            imageData = applyTemperatureTint(imageData, temperature, tint);
        }

        // Highlights, Midtones, Shadows
        if (highlights !== 0 || midtones !== 0 || shadows !== 0) {
            imageData = applyHighlightsMidtonesShadows(imageData, highlights, midtones, shadows);
        }

        // Sharpen (Convolution)
        if (sharpen > 0) {
            imageData = applySharpen(imageData, sharpen / 100);
        }

        // Vignette & Grain (typically applied last)
        if (vignette > 0 || grain > 0) {
            imageData = applyVignetteGrain(imageData, vignette, grain);
        }

        ctx.putImageData(imageData, 0, 0);
    }
}

/**
 * Adjust Temperature (Yellow/Blue) and Tint (Magenta/Green)
 */
function applyTemperatureTint(imageData, temp, tint) {
    const data = imageData.data;
    // Map -100 to 100 scale to reasonable adjustment values (-50 to 50 RGB values)
    const tempK = temp * 0.5; // Positive: more Red/Less Blue. Negative: Less Red/More Blue.
    const tintK = tint * 0.5; // Positive: more Green. Negative: more Magenta.

    for (let i = 0; i < data.length; i += 4) {
        // Temperature (Orange-Blue axis)
        data[i] = Math.min(255, Math.max(0, data[i] + tempK)); // R
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - tempK)); // B

        // Tint (Magenta-Green axis)
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + tintK)); // G
    }
    return imageData;
}

/**
 * Cropping Functions
 */
function startCropping() {
    if (!originalImage || isCropping) return;

    isCropping = true;

    // Hide standard actions, show crop actions
    mainActions.style.display = 'none';
    cropActions.style.display = 'flex';
    document.querySelector('.presets-grid').style.opacity = '0.5';
    document.querySelector('.presets-grid').style.pointerEvents = 'none';

    // Draw the pure original image onto the canvas without filters
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    cropper = new Cropper(canvas, {
        viewMode: 1, // Restrict the crop box to not exceed the size of the canvas
        background: false,
        guides: true,
        autoCropArea: 0.8,
        responsive: true
    });
}

function cancelCropping() {
    if (!isCropping) return;

    isCropping = false;
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    // Restore UI
    mainActions.style.display = 'flex';
    cropActions.style.display = 'none';
    document.querySelector('.presets-grid').style.opacity = '1';
    document.querySelector('.presets-grid').style.pointerEvents = 'auto';

    // Re-apply filters
    applyFilters();
}

function applyCrop() {
    if (!isCropping || !cropper) return;

    // Get cropped canvas
    const croppedCanvas = cropper.getCroppedCanvas();

    // Convert cropped canvas to an image and update originalImage
    const croppedUrl = croppedCanvas.toDataURL('image/png');
    const newImg = new Image();
    newImg.onload = () => {
        originalImage = newImg;
        // Re-setup canvas dimensions and initial drawing based on new cropped image
        setupCanvas(newImg);
        cancelCropping(); // This will cleanup cropper and re-apply filters
    };
    newImg.src = croppedUrl;
}

/**
 * Adjust Highlights, Midtones, and Shadows based on pixel luminance
 */
function applyHighlightsMidtonesShadows(imageData, highlights, midtones, shadows) {
    const data = imageData.data;
    const hFactor = highlights / 100;
    const mFactor = midtones / 100;
    const sFactor = shadows / 100;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Relative luminance
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        let multiplier = 1;

        // Shadows (lum < 0.5)
        if (lum < 0.5 && shadows !== 0) {
            const weight = (0.5 - lum) * 2; // 0 to 1
            multiplier += sFactor * weight;
        }

        // Highlights (lum > 0.5)
        if (lum > 0.5 && highlights !== 0) {
            const weight = (lum - 0.5) * 2; // 0 to 1
            multiplier += hFactor * weight;
        }

        // Midtones (Gaussian-like curve centered at 0.5)
        if (midtones !== 0) {
            // Distance from 0.5, inverted
            const dist = Math.abs(lum - 0.5) * 2; // 0 at center, 1 at edges
            const weight = Math.max(0, 1 - dist);
            multiplier += mFactor * weight;
        }

        data[i] = Math.min(255, Math.max(0, r * multiplier));
        data[i + 1] = Math.min(255, Math.max(0, g * multiplier));
        data[i + 2] = Math.min(255, Math.max(0, b * multiplier));
    }
    return imageData;
}

/**
 * Sharpen using a 3x3 Convolution Kernel
 */
function applySharpen(imageData, amount) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    // Sharpen kernel: [ 0, -1,  0, -1,  5, -1,  0, -1,  0 ]
    // We blend based on 'amount'
    const a = -amount;
    const b = 1 + 4 * amount;
    const kernel = [
        0, a, 0,
        a, b, a,
        0, a, 0
    ];

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            let r = 0, g = 0, b = 0;

            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const py = Math.min(h - 1, Math.max(0, y + ky));
                    const px = Math.min(w - 1, Math.max(0, x + kx));
                    const pIdx = (py * w + px) * 4;
                    const kVal = kernel[(ky + 1) * 3 + (kx + 1)];

                    r += data[pIdx] * kVal;
                    g += data[pIdx + 1] * kVal;
                    b += data[pIdx + 2] * kVal;
                }
            }

            output[idx] = r;
            output[idx + 1] = g;
            output[idx + 2] = b;
            output[idx + 3] = data[idx + 3]; // alpha
        }
    }

    imageData.data.set(output);
    return imageData;
}

/**
 * Apply Denoise (Box Blur proxy for performance)
 */
function applyDenoise(imageData, amount) {
    // Simply uses a box blur approach but only applied lightly based on amount
    // amount represents radius (0 to 10 mapped from sliders 0-100)
    const radius = Math.floor(amount / 10);
    if (radius === 0) return imageData; // Too small to blur

    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;
    const output = new Uint8ClampedArray(data.length);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            let r = 0, g = 0, b = 0, count = 0;

            for (let ky = -radius; ky <= radius; ky++) {
                for (let kx = -radius; kx <= radius; kx++) {
                    const py = Math.min(h - 1, Math.max(0, y + ky));
                    const px = Math.min(w - 1, Math.max(0, x + kx));
                    const pIdx = (py * w + px) * 4;

                    r += data[pIdx];
                    g += data[pIdx + 1];
                    b += data[pIdx + 2];
                    count++;
                }
            }

            output[idx] = r / count;
            output[idx + 1] = g / count;
            output[idx + 2] = b / count;
            output[idx + 3] = data[idx + 3];
        }
    }

    imageData.data.set(output);
    return imageData;
}

/**
 * Apply Dehaze (Contrast stretching in shadow/cloudy regions)
 */
function applyDehaze(imageData, amount) {
    const data = imageData.data;
    const factor = (259 * (amount + 255)) / (255 * (259 - amount));

    for (let i = 0; i < data.length; i += 4) {
        // Boost contrast heavily but bring down overall brightness to recover lost dark sky details
        data[i] = factor * (data[i] - 128) + 128 - (amount * 0.5);
        data[i + 1] = factor * (data[i + 1] - 128) + 128 - (amount * 0.5);
        data[i + 2] = factor * (data[i + 2] - 128) + 128 - (amount * 0.5);
    }
    return imageData;
}

/**
 * Apply Vignette (darken corners) and Grain (Film Noise)
 */
function applyVignetteGrain(imageData, vignetteAmount, grainAmount) {
    const w = imageData.width;
    const h = imageData.height;
    const data = imageData.data;

    const cx = w / 2;
    const cy = h / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const vFactor = vignetteAmount / 100;
    const gFactor = grainAmount / 100;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;

            let r = data[idx];
            let g = data[idx + 1];
            let b = data[idx + 2];

            // 1. Vignette
            if (vignetteAmount > 0) {
                const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
                const vignetteStrength = (dist / maxDist) * vFactor;
                // Exponential falloff for smooth corners
                const darkening = 1 - Math.pow(vignetteStrength, 2);

                r *= darkening;
                g *= darkening;
                b *= darkening;
            }

            // 2. Grain
            if (grainAmount > 0) {
                // monochromatic noise
                const noise = (Math.random() - 0.5) * 50 * gFactor;
                r += noise;
                g += noise;
                b += noise;
            }

            data[idx] = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
        }
    }
    return imageData;
}

async function downloadImage() {
    if (!originalImage) return;

    // Change button text to indicate processing
    const oldText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = 'Saving...';
    downloadBtn.style.pointerEvents = 'none';

    const dataUrl = canvas.toDataURL('image/png');

    try {
        // Save to Cloud before downloading (wait for completion)
        await cloud.save(dataUrl);
        setTimeout(loadHistory, 1000); // Wait for GitHub to process
    } catch (e) {
        console.error('Cloud Save Error:', e);
    }

    // Trigger browser download
    const link = document.createElement('a');
    link.download = 'refined-photo.png';
    link.href = dataUrl;
    link.click();

    // Restore button state
    downloadBtn.innerHTML = oldText;
    downloadBtn.style.pointerEvents = 'auto';
}

async function loadHistory() {
    const edits = await cloud.getAll();
    const historyList = document.getElementById('historyList');

    // Clear only history items, keep "Add New" button
    const existingItems = historyList.querySelectorAll('.history-item, .empty-history, .history-error');
    existingItems.forEach(item => item.remove());

    if (!edits || edits.length === 0) {
        historyList.insertAdjacentHTML('beforeend', '<div class="empty-history"><p>No cloud edits yet</p></div>');
        return;
    }

    const historyHtml = edits.map(edit => `
        <div class="history-item" data-id="${edit.id}" data-path="${edit.name}">
            <img src="${edit.image}" alt="Cloud Edit" crossorigin="anonymous">
            <div class="history-item-info">
                <span>${new Date(edit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button class="delete-history-btn" onclick="deleteHistoryItem(event, '${edit.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        </div>
    `).join('');

    historyList.insertAdjacentHTML('beforeend', historyHtml);

    // Re-initialize icons
    if (window.lucide) window.lucide.createIcons();

    // Add click listeners
    const items = historyList.querySelectorAll('.history-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                originalImage = img;
                setupCanvas(img);
                dropZone.classList.add('hidden');
                resetFilters();
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };
            img.src = item.querySelector('img').src;
        });
    });
}

async function deleteHistoryItem(event, id) {
    event.stopPropagation();
    if (confirm('Delete this from Cloud History?')) {
        await cloud.delete(id);
        loadHistory();
    }
}

init();
