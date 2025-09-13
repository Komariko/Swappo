// firebase/authStateHandler.js
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';

export function authStateHandler(setUser) {
  if (typeof window === 'undefined') return; // ป้องกันการทำงานในฝั่ง Server-Side

  onAuthStateChanged(auth, (user) => {
    if (user) {
      setUser(user);
    } else {
      setUser(null);
    }
  });
}
