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

let originalImage = null;
let currentImageData = null;

// Initialization
function init() {
    setupEventListeners();
}

function setupEventListeners() {
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
    Object.keys(sliders).forEach(key => {
        if (key === 'contrast' || key === 'saturation') sliders[key].value = 100;
        else sliders[key].value = 0;
        updateValueDisplay(key);
    });
    applyFilters();
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
        const g = data[i+1];
        const b = data[i+2];

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
        data[i+1] = Math.min(255, Math.max(0, g * multiplier));
        data[i+2] = Math.min(255, Math.max(0, b * multiplier));
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
                    g += data[pIdx+1] * kVal;
                    b += data[pIdx+2] * kVal;
                }
            }

            output[idx] = r;
            output[idx+1] = g;
            output[idx+2] = b;
            output[idx+3] = data[idx+3]; // alpha
        }
    }
    
    imageData.data.set(output);
    return imageData;
}

function downloadImage() {
    if (!originalImage) return;
    const link = document.createElement('a');
    link.download = 'refined-photo.png';
    link.href = canvas.toDataURL();
    link.click();
}

init();
