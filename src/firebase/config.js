// src/firebase/config.js
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCxdWVQEBmkNDPRLrcouMo08UWzks2L5dY",
  authDomain: "nako-9e4b6.firebaseapp.com",
  projectId: "nako-9e4b6",
  // ใช้ชื่อบักเก็ตจริงของคุณ (ไม่ใช่โดเมน URL แต่เป็นชื่อบักเก็ต)
  storageBucket: "nako-9e4b6.firebasestorage.app",
  messagingSenderId: "511236364437",
  appId: "1:511236364437:web:bbd4b6cc67d3aecb24639c",
  measurementId: "G-4XYSEV9V84",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ระบุบักเก็ตด้วย gs:// ให้ชัด (กันพลาดหาก config อื่นเปลี่ยน)
export const storage = getStorage(app, "gs://nako-9e4b6.firebasestorage.app");
