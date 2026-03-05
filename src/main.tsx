import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { syncPoiNotesOnce } from '@/features/poi/sync'

createRoot(document.getElementById('root')!).render(
  <App />,
)

// Enregistrement du Service Worker pour le support Offline PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
}

// Sync minimal des notes unsynced lors du retour en ligne
window.addEventListener('online', () => {
  syncPoiNotesOnce().catch(() => {
    // ignore
  });
});
