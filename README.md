# Chethan in Cardland (Antigravity) 🚀

**Chethan in Cardland** is a premium, free flashcard application designed for students in Kerala (NCERT & State Syllabus). It offers a seamless, ad-free experience (or optional ads for support) with features like spaced repetition, audio recording, image support, and community sharing.

## ✨ Features

- **Create & Study Stacks**: Create rich flashcards with text, images, and audio.
- **Smart Review**: Rate your answers to focus on difficult cards (Spaced Repetition Lite).
- **Public Library**: Access thousands of ready-made stacks shared by the community.
- **Offline Capable**: Works offline after initial load (PWA support).
- **Neumorphic Design**: A beautiful, modern UI/UX with light/dark modes.
- **No Login Required for Review**: Guests can review public stacks instantly.
- **Google Drive Sync**: Sign in to save your progress and stacks to your personal Google Drive.

## 🛠 Tech Stack

- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS (CSS Variables, Neumorphism)
- **State Management**: React Context / Local State
- **Icons**: `lucide-react`
- **Animations**: `framer-motion`, `canvas-confetti`
- **Backend/Storage**: 
  - **Google Drive API** (User Data Storage)
  - **Google Apps Script** (Public Library Proxy & Admin Tools)
  - **GitHub Pages** (Hosting)

## 🚀 Setup & Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/vinayaraj50/chethan-in-cardland.git
    cd chethan-in-cardland
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file based on `.env.example`:
    ```env
    VITE_GOOGLE_CLIENT_ID=your_client_id
    VITE_PUBLIC_API_KEY=your_public_api_key
    VITE_PUBLIC_FOLDER_ID=your_public_folder_id
    ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```

5.  **Build**:
    ```bash
    npm run build
    ```

## 🌐 Live Demo

[Check out the Live App](https://vinayaraj50.github.io/chethan-in-cardland/)

## 🔒 Security Note

This is a client-side application. 
- **User Data**: Stored entirely in the user's own Google Drive (we do not see your private stacks).
- **Public Data**: Accessed via read-only APIs or proxy scripts.

---
*Created by Vinayaraj (Chethan)*
