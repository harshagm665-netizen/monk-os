<div align="center">
  <img src="public/favicon.ico" alt="Monk OS Logo" width="120"/>
  <h1>Monk OS</h1>
  <p><strong>The Next-Generation AI Operating System for Edge Robotics</strong></p>
  
  [![Python](https://img.shields.io/badge/Python-3.13+-blue.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
  [![React](https://img.shields.io/badge/React-18.2-61dafb.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Flutter](https://img.shields.io/badge/Flutter-SDK-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev/)
  
  <br />
</div>

## 🌌 Overview

**Monk OS** is an exhaustive, production-grade Artificial Intelligence operating system purposefully engineered for the Raspberry Pi 5 (and compatible edge devices). It acts as the "brain," visual interface, and kinematic controller for advanced humanoid robotics.

Unlike traditional robotic middleware, Monk OS strips away bloat, merging a mathematically rigorous **Python FastAPI backend** with a stunning, glassmorphic **React desktop environment**. The entire neural network pipeline, computer vision logic, and LLM inference engine execute locally on the edge, eliminating severe latency bottlenecks while maintaining absolute data privacy.

---

## 🏗️ Architecture Stack

*   **Core Logic / Backend (The Brain):** Python 3.13 + FastAPI + Uvicorn
*   **Computer Vision Pipeline:** OpenCV Contrib (LBPH Face Recognition, MediaPipe Hand Tracking)
*   **Cognitive Engines:** Google Gemini (Multimodal), Groq API (High-Speed NLP), Ollama (Local RAG)
*   **Vector Database:** ChromaDB + Langchain (Semantic Memory)
*   **Frontend GUI (The Face):** React + Vite (AOT Compiled to Static Assets for zero-overhead serving)
*   **Physical Kinematics:** Asynchronous PySerial interfacing dynamically with Arduino C++ firmware.
*   **Zero-Touch Mobile Link:** Flutter Dart SDK integrating `avahi-daemon` mDNS broadcasting.

---

## ⚡ Flagship Features

*   **Asynchronous Hardware Bridge:** A thread-safe, `asyncio.Queue`-backed serial manager. It guarantees zero buffer overruns on the physical Arduino hardware by strictly enforcing deterministic mechanical execution matrices.
*   **Edge-Optimized Vision:** Thermal-conscious frame downscaling (`320x240`) and dynamic skip-framing (1-in-5 evaluation) ensure the Raspberry Pi runs cool while maintaining 60 FPS UI tracking.
*   **Multimodal RAG (Retrieval-Augmented Generation):** Chat natively with textbooks. The OS processes local PDFs into vector embeddings, enabling the robot to act as a highly specialized tutor.
*   **Zero-Touch Provisioning (mDNS):** The robot broadcasts its existence via Apple Bonjour protocols (`monkos.local`). The companion Flutter App automatically sweeps the local network, discovers the robot's dynamic IP, and connects seamlessly without QR codes or manual IP entry.
*   **Unified Media Explorer (MyFiles):** A native, glassmorphic file explorer built directly into the OS shell to index, render, and stream local videos, PDFs, and images with zero latency.
*   **WASM Hand Tracking:** Run complex skeletal topological tracking (Air Draw) entirely within the browser via WebAssembly without utilizing the Python layer.

---

## 🚀 Deployment & Installation

Monk OS has been heavily optimized to abstract away deployment friction. The Node.js server has been entirely stripped from the production pipeline; the Python backend now natively serves the statically compiled React DOM.

### Method A: Raspberry Pi (Production Edge)

1. Clone the repository onto your Raspberry Pi:
   ```bash
   git clone https://github.com/yourusername/monk-os.git
   cd monk-os
   ```
2. Run the automated bootloader:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   *The script will automatically provision `apt-get` dependencies, configure the `venv`, install OpenCV headless binaries, invoke the Avahi Daemon, and launch the hardware-accelerated Chromium Kiosk.*

### Method B: Windows (Active Development)

1. Ensure Python 3.13+ and Node.js are installed.
2. If modifying the UI, build the static React assets:
   ```bash
   npm install && npm run build
   ```
3. Boot the backend server:
   ```cmd
   start_monk_os.bat
   ```

---

## 🔐 Environment Secrets

The `os_backend/.env` file is heavily guarded via `.gitignore`. To utilize the cloud-cognitive features, you must provision your local `.env` with the following variables:

```env
GROQ_API_KEY=gsk_your_key_here
GEMINI_API_KEY=AIzaSy_your_key_here
```

---

## 📱 The Monk Mobile App

The repository includes `monk_mobile_app/`, a native Flutter SDK application designed for remote teleoperation. 

To compile the Android/iOS controller:
```bash
cd monk_mobile_app
flutter pub get
flutter run --release
```
**Features:** Seamless network autodiscovery, Joystick kinematic override, and Real-time agent status monitoring.

---

<div align="center">
  <i>"Simplicity is the ultimate sophistication."</i>
  <br>
  <b>Engineered for the Future.</b>
</div>
