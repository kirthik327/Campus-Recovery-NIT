# 🔍 Campus Recovery Portal - Lost & Found Management System

A modern, responsive, and highly interactive **College Lost & Found Management System** built with a mobile-first philosophy. Designed around a sleek **Light Aura Glassmorphic UI**, interactive **3D Spline models**, and real-time student verifications.

---

## ✨ Key Features

### 🌟 Volumetric 3D & "Aura" Interactivity
*   **3D Torus Glass Knot (Catalog Hero)**: An interactive volumetric 3D spline model embedded in the main dashboard hero section that reacts dynamically to mouse positions.
*   **3D Cursor-Following Robot (Auth)**: A friendly 3D companion helper integrated into the Login and Register screens. Optimized for mobile, it stacks vertically and auto-scales down to `240px` to keep form inputs immediately accessible.
*   **3D Perspective Card Tilts**: Grid cards incline along the X/Y axes in 3D space relative to your cursor coordinates, projecting a glowing neon spotlight overlay.
*   **Drifting Nebula Backdrop**: A soft Slate-lavender glass template layered with cyan, violet, and peach background gradients at `0.35` opacity.
*   **Elastic Viewport Scroll Reveals**: Elements mount dynamically with cubic-bezier ease-out scroll reveal transitions.

### 📸 Full-Scale Image Lightbox
*   **Aspect-Ratio Preserved Zoom**: Clickable catalog images that launch a dark fullscreen lightbox container (`object-fit: contain`). This allows students to zoom in and read fine text details (like names on ID cards or small serial keys) without any cropping.
*   **Dynamic Wi-Fi Image Binding**: Hosts images dynamically based on the local hostname, allowing seamless testing on other phones and laptops over Wi-Fi.

### 🔒 Secure Credentials & Verifications
*   **One-Time Register Verification**: Restricts edit rights on student registration numbers once locked. Enforces academic validation codes (must start with `7210`).

---

## 🚀 Tech Stack
*   **Frontend**: React (Vite), CSS3 Glassmorphism, Lucide Icons, Spline Viewer SDK
*   **Backend**: Node.js, Express.js, Local File Database (NoSQL simulation)
*   **Utilities**: Canvas Confetti, Intersection Observer hooks

---

## 💻 Quick Start

### 1. Install Dependencies
In the root directory, install packages for both client and API:
```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Run Applications
Launch both services locally:
```bash
# Start backend (Port 5000)
cd backend
node server.js

# Start frontend (Port 5173)
cd ../frontend
npm run dev -- --host
```
Check the network IP displayed in the terminal to load the portal on mobile phones connected to your local Wi-Fi!
