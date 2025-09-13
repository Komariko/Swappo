// src/firebase/messaging.js
import { getMessaging } from 'firebase/messaging';
import { app } from './config';

export const getFirebaseMessaging = () => {
  if (typeof window !== 'undefined') {
    try {
      return getMessaging(app);
    } catch (error) {
      console.error("Firebase Messaging error:", error);
    }
  }
  return null;
};
