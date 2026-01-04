# Chethan in Cardland

**Chethan in Cardland** is a premium, free flashcard application designed for students in Kerala (NCERT & State Syllabus), built with modern web technologies. It offers a seamless, app-like experience with spaced repetition features to help students remember longer.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://vinayaraj50.github.io/chethan-in-cardland/)

## ✨ Key Features

-   **Smart Flashcards**: Support for text, images, and audio recording.
-   **Spaced Repetition (Lite)**: Review difficult cards more frequently to ensure mastery.
-   **Public Library**: Access a growing collection of ready-made stacks shared by the community.
-   **Offline Capable**: Installable as a PWA, works offline after initial load.
-   **Neumorphic Design**: A clean, distraction-free UI with Light/Dark mode.
-   **Google Integration**:
    -   **Sign In**: Sync your progress and stacks to your personal Google Drive.
    -   **Guest Mode**: Review public stacks without creating an account.

## 🛠 Tech Stack

-   **Frontend**: React (Vite)
-   **Styling**: Vanilla CSS (Variables + Neumorphism)
-   **Icons**: [Lucide React](https://lucide.dev)
-   **Animations**: `framer-motion`, `canvas-confetti`
-   **Storage**: Google Drive API (User data owned by user).

## 🚀 Getting Started

### Prerequisites
-   Node.js (v14 or higher)
-   A Google Cloud Project with Drive API enabled (for full feature set).

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

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    VITE_GOOGLE_CLIENT_ID=your_client_id_from_google_cloud
    VITE_PUBLIC_API_KEY=your_api_key
    VITE_PUBLIC_FOLDER_ID=your_public_drive_folder_id
    VITE_APPS_SCRIPT_URL=your_google_apps_script_url
    VITE_ADMIN_EMAIL=your_admin_email
    VITE_UPI_ID=your_upi_id_for_payments
    VITE_SUPPORT_PHONE=your_support_phone_number
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Build for Production**
    ```bash
    npm run build
    ```

## 🔒 Security & Privacy

-   **Client-Side Only**: The app runs entirely in the browser.
-   **Data Ownership**: All user-created stacks and progress data are stored in the user's *own* Google Drive. We do not have access to private data.
-   **Secure Permissions**: The app requests the minimum required scopes (`drive.file`) to manage only the files it creates.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---
*Created by Vinayaraj (Chethan)*
