# PhotoRefine 📸

PhotoRefine is a professional-grade, browser-based image editor built with modern web technologies. It provides a sleek, high-performance interface for quick photo adjustments, professional presets, and cloud-synced edit history using MongoDB and Google OAuth.

![Preview](demo/screenshot.png) 

## ✨ Features

- **Professional UI/UX**: Minimalist 3-column layout with Lucide icons and Inter typography.
- **15 Professional Presets**:
  - **Core**: Bold (High dynamic range), Vivid, Vintage, B&W.
  - **Cinematic**: Cinematic tones, Teal & Orange, Moody, Gritty.
  - **Nature**: Golden Hour, Cold Winter, High Key.
  - **Artistic**: Dreamy, Retro Film, Neon Electric.
- **Manual Adjustments**:
  - Contrast & Saturation (Real-time Canvas filters).
  - Tonal Controls: Highlights and Shadows management.
  - Detail: Convolution-based Sharpening.
- **Cloud-Synced History**: Powered by **MongoDB** and **Google OAuth**, allowing you to securely save, reload, and manage your edits across devices.
- **High Performance**: Optimized pixel processing and scaled canvas rendering for a snappy experience.

## 🖼️ Before & After

| Before | After |
| :---: | :---: |
| <img src="demo/before3.png" width="250" height="250" alt="Original Image"> | <img src="demo/after3.png" width="250" height="250" alt="Edited Image"> |
| <img src="demo/before.png" width="250" height="250" alt="Original Image"> | <img src="demo/after.png" width="250" height="250" alt="Edited Image"> |



## 🛠️ Technology Stack

### Frontend
- **HTML5 Canvas**: Core image processing engine (zero server cost for image manipulation).
- **Vanilla CSS**: Premium styling with glassmorphism and responsive layout.
- **JavaScript (Vanilla)**: Preset logic, custom convolution kernels, and CropperJS integration.
- **Lucide Icons**: Clean, consistent iconography.

### Backend
- **Node.js & Express**: Fast, lightweight server handling API routes and templating (EJS).
- **MongoDB & Mongoose**: Secure database for storing user profiles and image edit history.
- **Passport.js**: Robust authentication using Google OAuth 2.0.

## 🚀 Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/TranHuuDat2004/photo-refine.git
   cd photo-refine/server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the `server` directory and configure your MongoDB URI and Google OAuth credentials (see `.env.example`).
4. Start the server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` in any modern web browser.

## 💾 Saving Your Work

When you click the **Download** button, your edited image is:
1. Saved to your local machine as a PNG.
2. Automatically stored in the **Recent Edits** sidebar for future access.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
Developed with ❤️ by [TranHuuDat2004](https://github.com/TranHuuDat2004)
