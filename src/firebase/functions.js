import { db, auth } from './config';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

/* ----------------------- ✅ ตรวจสอบสถานะผู้ใช้ ----------------------- */
export function authStateHandler(setUser) {
  onAuthStateChanged(auth, (user) => {
    setUser(user || null);
  });
}

/* ----------------------- ✅ ออกจากระบบ ----------------------- */
export async function logout() {
  try {
    await signOut(auth);
    window.location.href = "/";
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการออกจากระบบ:", error);
    alert("ไม่สามารถออกจากระบบได้");
  }
}

export function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => logout());
  }
}

/* ----------------------- ✅ ดึงโปรไฟล์ผู้ใช้จาก UID ----------------------- */
export async function getUserProfile(uid) {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("โหลดโปรไฟล์ล้มเหลว:", err);
  }
  return {
    username: "ไม่ทราบชื่อ",
    profilePic: "/images/profile-placeholder.jpg",
  };
}

/* ----------------------- ✅ เพิ่มสินค้าเข้ารายการโปรด ----------------------- */
export async function addToWatchlist(itemId) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const favRef = doc(db, "users", user.uid, "watchlist", itemId);
    const favSnap = await getDoc(favRef);
    if (favSnap.exists()) {
      alert("❤️ โพสต์นี้ถูกเพิ่มไว้ในรายการโปรดแล้ว");
      return;
    }
    await setDoc(favRef, { itemId, addedAt: serverTimestamp() });
    alert("✅ บันทึกไปในรายการโปรดแล้ว!");
  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
  }
}

/* ----------------------- ✅ โหลดรายการสินค้า โดยเรียงจากล่าสุด ----------------------- */
export async function loadItems(searchTerm = "") {
  try {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  } catch (err) {
    console.error("โหลดรายการล้มเหลว:", err);
    return [];
  }
}

/* ----------------------- ✅ ส่งข้อความแชท ----------------------- */
export async function sendPrivateMessage(toUserId, text) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const chatId = [currentUser.uid, toUserId].sort().join("_");
  const messagesRef = collection(db, "privateChats", chatId, "messages");

  await addDoc(messagesRef, {
    message: text,
    senderId: currentUser.uid,
    receiverId: toUserId,
    createdAt: serverTimestamp(),
  });
}

/* ----------------------- ✅ โหลดข้อความแชทแบบเรียลไทม์ ----------------------- */
export function loadPrivateChat(withUserId) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const chatId = [currentUser.uid, withUserId].sort().join("_");
  const q = query(collection(db, "privateChats", chatId, "messages"), orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    const chatMessages = document.getElementById("chat-messages");
    if (!chatMessages) return;
    chatMessages.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const isSelf = data.senderId === currentUser.uid;
      const msgDiv = document.createElement("div");
      msgDiv.classList.add("chat-message", isSelf ? "self" : "other");
      msgDiv.textContent = data.message;
      chatMessages.appendChild(msgDiv);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* ----------------------- ✅ แสดงเวลาที่โพสต์แบบ time ago ----------------------- */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return "ไม่ทราบเวลา";

  const now = new Date();
  const posted = timestamp.toDate();
  const seconds = Math.floor((now - posted) / 1000);

  if (seconds < 60) return "ไม่กี่วินาทีที่แล้ว";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(seconds / 86400)} วันที่แล้ว`;
}
// ชั่วคราว: ใส่ไว้ตรงไหนก็ได้หลัง initialize เพื่อตรวจค่า
import { getApp } from "firebase/app";
console.log("Firebase projectId =", getApp().options.projectId);
console.log("authDomain =", getApp().options.authDomain);
console.log("storageBucket =", getApp().options.storageBucket);
