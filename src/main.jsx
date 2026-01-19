import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@fontsource/chilanka';

// Production Integrity Check
console.log('%c Chethan in Cardland ', 'background: #4f46e5; color: #fff; font-weight: bold; padding: 4px; border-radius: 4px;');
console.log(`Build Version: 1.1.1 | Sync: ${new Date().toISOString()}`);


import { AuthProvider } from './components/AuthProvider';
import { TourProvider } from './components/TourContext';
import { SessionManager } from './services/sessionManager';

// 2026 Strategy: We no longer purge all sessions on every boot.
// SessionManager now uses "Smart Purge" during startSession(uid) to preserve current user data.
// SessionManager.purgeAllUserSessions();
// Cold-Start Purge is now managed internally by SessionManager during identity verification
// to prevent premature deletion of valid user data on browser refresh.


ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <TourProvider>
                <App />
            </TourProvider>
        </AuthProvider>
    </React.StrictMode>,
)
// Unregister any existing service workers (to fix "Old UI" caching issues)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
            console.log('Unregistering Service Worker:', registration);
            registration.unregister();
        }
    });
}
