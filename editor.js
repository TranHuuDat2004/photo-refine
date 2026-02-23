const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Sliders
const sliders = {
    contrast: document.getElementById('contrast'),
    saturation: document.getElementById('saturation'),
    highlights: document.getElementById('highlights'),
    shadows: document.getElementById('shadows'),
    sharpen: document.getElementById('sharpen')
};

// Value displays
const valDisplays = {
    contrast: document.getElementById('contrastVal'),
    saturation: document.getElementById('saturationVal'),
    highlights: document.getElementById('highlightsVal'),
    shadows: document.getElementById('shadowsVal'),
    sharpen: document.getElementById('sharpenVal')
};

const historyList = document.getElementById('historyList');
const presetCards = document.querySelectorAll('.preset-card');

const presets = {
    none: { contrast: 100, saturation: 100, highlights: 0, shadows: 0, sharpen: 0 },
    bold: { contrast: 112, saturation: 120, highlights: -10, shadows: -5, sharpen: 35 },
    vivid: { contrast: 110, saturation: 140, highlights: 5, shadows: 0, sharpen: 20 },
    vintage: { contrast: 95, saturation: 70, highlights: 20, shadows: 15, sharpen: 0 },
    bw: { contrast: 120, saturation: 0, highlights: 10, shadows: -10, sharpen: 25 },
    cinematic: { contrast: 115, saturation: 85, highlights: -15, shadows: 5, sharpen: 30 },
    golden: { contrast: 105, saturation: 125, highlights: 25, shadows: 0, sharpen: 15 },
    teal: { contrast: 110, saturation: 110, highlights: -10, shadows: -20, sharpen: 20 },
    moody: { contrast: 130, saturation: 70, highlights: -25, shadows: -15, sharpen: 10 },
    dreamy: { contrast: 85, saturation: 90, highlights: 35, shadows: 20, sharpen: 0 },
    highkey: { contrast: 90, saturation: 105, highlights: 45, shadows: 30, sharpen: 5 },
    gritty: { contrast: 140, saturation: 60, highlights: -5, shadows: -20, sharpen: 60 },
    cold: { contrast: 108, saturation: 80, highlights: 0, shadows: 5, sharpen: 15 },
    retro: { contrast: 95, saturation: 85, highlights: 15, shadows: 10, sharpen: 5 },
    neon: { contrast: 125, saturation: 180, highlights: 10, shadows: 0, sharpen: 25 }
};

/**
 * Cloud Storage Manager (GitHub Bridge)
 */
class CloudStorage {
    constructor() {
        // Use current domain for API calls (works for both localhost and Render)
        this.apiBase = window.location.origin;
        this.isOnline = false;
    }

    async init() {
        try {
            const response = await fetch(this.apiBase);
            if (response.ok) {
                this.isOnline = true;
                this.updateUI();
            }
        } catch (e) {
            console.warn('Cloud Server offline. Using demo mode.');
        }
    }

    updateUI() {
        const status = document.getElementById('syncStatus');
        if (this.isOnline && status) {
            status.classList.add('online');
            status.innerHTML = '<i data-lucide="cloud"></i> <span>Connected to Cloud</span>';
            if (window.lucide) window.lucide.createIcons();
        }
    }

    async save(imageDataUrl) {
        if (!this.isOnline) return;
        try {
            const fileName = `edit_${new Date().getTime()}.png`;
            const response = await fetch(`${this.apiBase}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageDataUrl, fileName })
            });
            return await response.json();
        } catch (e) {
            console.error('Cloud Save Error:', e);
        }
    }

    async getAll() {
        if (!this.isOnline) return [];
        try {
            const response = await fetch(`${this.apiBase}/history`);
            return await response.json();
        } catch (e) {
            console.error('Cloud Fetch Error:', e);
            return [];
        }
    }

    async delete(id, path) {
        if (!this.isOnline) return;
        try {
            await fetch(`${this.apiBase}/history/${id}?path=edits/${path}`, {
                method: 'DELETE'
            });
        } catch (e) {
            console.error('Cloud Delete Error:', e);
        }
    }
}

const cloud = new CloudStorage();

let originalImage = null;
let currentImageData = null;

// Initialization
async function init() {
    await cloud.init();
    setupEventListeners();
    loadHistory();
}

function setupEventListeners() {
    const historyAddNew = document.getElementById('historyAddNew');
    if (historyAddNew) {
        historyAddNew.addEventListener('click', () => imageInput.click());
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
    if (key === 'contrast' || key === 'saturation') suffix = '%';
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
    if (!originalImage) return;

    // Reset canvas to original image before applying filters
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

    // 1. Contrast & Saturation (Using built-in filter for performance)
    const contrastVal = sliders.contrast.value;
    const saturationVal = sliders.saturation.value;
    ctx.filter = `contrast(${contrastVal}%) saturate(${saturationVal}%)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    // 2. Custom Pixel Processing (Highlights, Shadows, Sharpen)
    const highlights = parseInt(sliders.highlights.value);
    const shadows = parseInt(sliders.shadows.value);
    const sharpen = parseInt(sliders.sharpen.value);

    if (highlights !== 0 || shadows !== 0 || sharpen > 0) {
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Highlights & Shadows
        if (highlights !== 0 || shadows !== 0) {
            imageData = applyHighlightsShadows(imageData, highlights, shadows);
        }

        // Sharpen (Convolution)
        if (sharpen > 0) {
            imageData = applySharpen(imageData, sharpen / 100);
        }

        ctx.putImageData(imageData, 0, 0);
    }
}

/**
 * Adjust Highlights and Shadows based on pixel luminance
 */
function applyHighlightsShadows(imageData, highlights, shadows) {
    const data = imageData.data;
    const hFactor = highlights / 100;
    const sFactor = shadows / 100;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Relative luminance
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        let multiplier = 1;

        // Highlights (lum > 0.5)
        if (lum > 0.5 && highlights !== 0) {
            const weight = (lum - 0.5) * 2; // 0 to 1
            multiplier += hFactor * weight;
        }

        // Shadows (lum < 0.5)
        if (lum < 0.5 && shadows !== 0) {
            const weight = (0.5 - lum) * 2; // 0 to 1
            multiplier += sFactor * weight;
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
                <button class="delete-history-btn" onclick="deleteHistoryItem(event, '${edit.id}', '${edit.name}')">
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
                resetFilters();
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            };
            img.src = item.querySelector('img').src;
        });
    });
}

async function deleteHistoryItem(event, id, path) {
    event.stopPropagation();
    if (confirm('Delete this from Cloud History?')) {
        await cloud.delete(id, path);
        loadHistory();
    }
}

init();
