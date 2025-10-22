// API Configuration
const isDevelopment = import.meta.env.MODE === 'development';
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Use environment variable if available, otherwise auto-detect
export const API_URL = import.meta.env.VITE_API_URL ||
  (isLocalhost ? 'http://localhost:3002' : `${window.location.protocol}//${window.location.hostname}`);

console.log('API URL:', API_URL);
