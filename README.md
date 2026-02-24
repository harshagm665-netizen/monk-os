# Monk OS UI Shell

Monk OS is a stunning, web-based operating system UI shell optimized for Raspberry Pi 5. It features a complete boot sequence, glassmorphic welcome screens, simulated quantum encryption authentication, and a futuristic humanoid AI dashboard interface.

## Prerequisites

Before running the application, ensure you have the following installed on your system (or your Raspberry Pi):
- **Node.js**: (v18 or higher recommended)
- **npm**: (comes with Node.js)

## Installation

1. Clone or download this repository to your local machine:
   ```bash
   cd os
   ```

2. Install the necessary dependencies:
   ```bash
   npm install
   ```

## Running the OS Locally

To start the Monk OS interface in development mode, run the following command:

```bash
npm run dev
```

This will start the Vite development server. Open your browser and navigate to the local URL provided in the terminal, usually `http://localhost:5173`. 

The application will initially load the `Boot` screen.

## Running on Raspberry Pi 5 (Kiosk Mode)

If you are running this on a Raspberry Pi 5, you can set it up to launch Chromium in "Kiosk Mode" on startup to act as a true OS shell.

1. Build the production version of the app:
   ```bash
   npm run build
   ```

2. Serve the built files using a basic static server (like `serve`):
   ```bash
   npm install -g serve
   serve -s dist
   ```

3. Configure your Raspberry Pi to automatically launch the Chromium browser on boot in Kiosk mode pointing to `http://localhost:3000` (or whichever port `serve` is running on).
   
   Add the following line to your autostart file (usually `~/.config/wayfire.ini` for Wayland or `/etc/xdg/lxsession/LXDE-pi/autostart` for X11 on Raspberry Pi OS):
   ```bash
   @chromium-browser --kiosk --incognito http://localhost:3000
   ```

## Key Features
- **Fluid Animations**: High-performance CSS keyframe animations powered by React & Vite.
- **Boot Sequence Simulation**: Video integration and terminal log output logic.
- **Quantum Auth**: Procedurally generated key animations during the login step.
- **Core Intelligence**: Basic UI wiring for an AI prompt interface on the home dashboard.
