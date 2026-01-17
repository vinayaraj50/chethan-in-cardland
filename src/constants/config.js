/**
 * Application Configuration
 * Centralized configuration for environment variables and constants
 */

// Google API Configuration
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '3124844364-rpsgos6belof4b0j49tj7ml1dqaiu0l2.apps.googleusercontent.com';
export const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY || 'AIzaSyBpuk4WC23PTJkQS-IbRQoXxZRFt6XIvU';
export const PUBLIC_FOLDER_ID = import.meta.env.VITE_PUBLIC_FOLDER_ID || '12_SY42jlKrH7qYNzolw1H9Ss9zLbyGN5';
export const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbzkKAFTN9yV0JryQS7J3J_iaCpZRD9vU8jyw21fL_mZbL13pO5iAEaasYq234hYT4Ylfg/exec';
export const APPS_SCRIPT_KEY = import.meta.env.VITE_APPS_SCRIPT_KEY || 'chethan_cArdlAnd_unIvErsAl_2026';

// Admin Configuration
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'chethanincardland@gmail.com';

// Payment Configuration
export const UPI_ID = import.meta.env.VITE_UPI_ID || 'vinayarajh1-1@okhdfcbank';
export const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE || '919497449115';
export const UPI_NAME = 'ChethanInCardland';

// Application Constants
export const PREVIEW_CARD_LIMIT = 10;
export const SRS_INTERVALS = [1, 3, 7, 30]; // Days
export const DAILY_LOGIN_COINS = 5;
export const REFERRAL_COINS = 50;

// Coin Packages
export const COIN_PACKAGES = [
    { coins: 50, price: 79, label: 'Basic Pack' },
    { coins: 200, price: 299, label: 'Popular Choice' },
    { coins: 500, price: 479, label: 'Master Study Pack' }
];
