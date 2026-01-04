# Chethan in Cardland 🗂️

**Chethan in Cardland** is a premium, open-source flashcard application designed for students in Kerala (NCERT & State Syllabus). It provides a high-performance, distraction-free study environment with spaced repetition features to optimize learning retention.

[![Live Demo](https://img.shields.io/badge/Live-Demo-3b82f6?style=for-the-badge&logoColor=white)](https://vinayaraj50.github.io/chethan-in-cardland/)
[![React](https://img.shields.io/badge/React-20232a?style=for-the-badge&logo=react&logoColor=61dafb)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

## ✨ Key Features

-   **🎯 Smart Flashcards**: Create cards with rich text, images, and audio recordings.
-   **📈 Spaced Repetition (Lite)**: Automated review scheduling based on performance (Last Marks, Average Rating).
-   **🌐 Public Library**: Instant access to verified, ready-made stacks for Kerala State & NCERT syllabus.
-   **📱 Mobile-First PWA**: Installable on any device, works offline after initial synchronization.
-   **🎨 Premium Neumorphic UI**: A refined, modern design system optimized for cognitive focus.
-   **🔐 Secure-by-Design**: User data is stored exclusively in the user's personal Google Drive via the `drive.file` scope.

## 🛠 Tech Stack

-   **Language**: Modern JavaScript (ES2022+)
-   **Framework**: [React 18](https://reactjs.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **State Management**: React Hooks (useState, useEffect, context-like state)
-   **Styling**: Specialized CSS Variables for Neumorphic depth.
-   **Integration**: Google Drive API, Google Identity Services (GIS).

## 🚀 Getting Started

### Prerequisites

-   Node.js (v16+)
-   NPM or Yarn
-   A Google Cloud Project with Drive API enabled.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/vinayaraj50/chethan-in-cardland.git
    cd chethan-in-cardland
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file based on `.env.example`:
    ```env
    VITE_GOOGLE_CLIENT_ID=your_client_id
    VITE_PUBLIC_API_KEY=your_public_api_key
    VITE_PUBLIC_FOLDER_ID=your_public_folder_id
    VITE_APPS_SCRIPT_URL=your_proxy_url
    ```

4.  **Launch Local Dev**
    ```bash
    npm run dev
    ```

## 🔒 Security Summary

-   **Zero-Server Architecture**: No backend database stores user cards. Everything is client-side or user-owned cloud storage.
-   **Minimal Scopes**: Requests only `drive.file` scope, ensuring the app can never access files it didn't create.
-   **Privacy First**: No analytics or tracking beyond basic session activity (optional for admins).

## 📄 License & Credits

Built with ❤️ by **Vinayaraj (Chethan)**. 

---
*Empowering students with better tools for better exams.*
