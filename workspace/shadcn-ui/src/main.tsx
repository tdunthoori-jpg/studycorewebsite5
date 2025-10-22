import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeSupabase } from './lib/supabaseInit';

// Initialize Supabase connection and resources
initializeSupabase()
  .then(initialized => {
    console.log(`Supabase initialization ${initialized ? 'successful' : 'failed'}`);
  })
  .catch(err => {
    console.error('Error during Supabase initialization:', err);
  });

createRoot(document.getElementById('root')!).render(<App />);
