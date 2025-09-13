// src/firebase/config.js
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCxdWVQEBmkNDPRLrcouMo08UWzks2L5dY",
  authDomain: "nako-9e4b6.firebaseapp.com",
  projectId: "nako-9e4b6",
  storageBucket: "nako-9e4b6.firebasestorage.app", // ✅ ต้องเป็นอันนี้ (ไม่ใช่ .appspot.com)
  messagingSenderId: "511236364437",
  appId: "1:511236364437:web:bbd4b6cc67d3aecb24639c",
  measurementId: "G-4XYSEV9V84",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// ใช้ default bucket จาก config หรือจะระบุให้ชัดก็ได้:
export const storage = getStorage(app); 
// หรือแบบระบุชัด:
// export const storage = getStorage(app, "gs://nako-9e4b6.firebasestorage.app");

export default firebaseConfig;
