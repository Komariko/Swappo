// src/firebase/functions.js
import { db, auth } from './config';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

/* ----------------------- ✅ ตรวจสอบสถานะผู้ใช้ ----------------------- */
export function authStateHandler(setUser) {
  // คืนค่า unsubscribe เพื่อให้ผู้เรียกนำไป cleanup ได้
  return onAuthStateChanged(auth, (user) => {
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

/* ----------------------- ⭐ รายการโปรด (watchlist) ----------------------- */
/** subscribe รายการโปรดของผู้ใช้ -> ส่ง Set ของ itemId กลับผ่าน setIds */
export function watchlistListener(setIds) {
  const user = auth.currentUser;
  if (!user) return () => {};
  const ref = collection(db, "users", user.uid, "watchlist");
  return onSnapshot(ref, (snap) => {
    const ids = new Set(snap.docs.map(d => d.id));
    setIds(ids);
  });
}

/** เพิ่มเข้ารายการโปรด (idempotent) + เพิ่มตัวนับ */
export async function addToWatchlist(itemId) {
  const user = auth.currentUser;
  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนบันทึก");
    return { ok: false, reason: "no-auth" };
  }

  try {
    const itemRef = doc(db, "items", itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) {
      alert("ไม่พบโพสต์นี้แล้ว");
      return { ok: false, reason: "not-found" };
    }
    const item = itemSnap.data();

    // กันเจ้าของโพสต์บันทึกโพสต์ตัวเอง
    if (item.user_id === user.uid) {
      alert("ไม่สามารถบันทึกโพสต์ของตัวเองได้");
      return { ok: false, reason: "own-post" };
    }

    const favRef = doc(db, "users", user.uid, "watchlist", itemId);
    const favSnap = await getDoc(favRef);
    if (favSnap.exists()) {
      // มีอยู่แล้ว -> ไม่ทำซ้ำ
      return { ok: true, action: "exists" };
    }

    await setDoc(favRef, { itemId, addedAt: serverTimestamp() });
    await updateDoc(itemRef, {
      watchCount: increment(1),
      watchCountUpdatedAt: serverTimestamp(),
    });
    return { ok: true, action: "added" };
  } catch (err) {
    console.error("addToWatchlist error:", err);
    alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    return { ok: false, reason: "error" };
  }
}

/** เอาออกจากรายการโปรด (ถ้ามี) + ลดตัวนับ */
export async function removeFromWatchlist(itemId) {
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "no-auth" };

  try {
    const favRef = doc(db, "users", user.uid, "watchlist", itemId);
    const favSnap = await getDoc(favRef);
    if (!favSnap.exists()) {
      return { ok: true, action: "noop" };
    }

    await deleteDoc(favRef);
    const itemRef = doc(db, "items", itemId);
    await updateDoc(itemRef, {
      watchCount: increment(-1),
      watchCountUpdatedAt: serverTimestamp(),
    });
    return { ok: true, action: "removed" };
  } catch (err) {
    console.error("removeFromWatchlist error:", err);
    alert("ลบออกจากรายการโปรดไม่สำเร็จ");
    return { ok: false, reason: "error" };
  }
}

/** toggle รายการโปรดแบบเดียวจบ (เผื่ออยากใช้) */
export async function toggleWatchlist(itemId) {
  const user = auth.currentUser;
  if (!user) {
    alert("กรุณาเข้าสู่ระบบก่อนบันทึก");
    return { ok: false, reason: "no-auth" };
  }

  const favRef = doc(db, "users", user.uid, "watchlist", itemId);
  const favSnap = await getDoc(favRef);
  return favSnap.exists()
    ? removeFromWatchlist(itemId)
    : addToWatchlist(itemId);
}

/* ----------------------- ✅ โหลดรายการสินค้า โดยเรียงจากล่าสุด ----------------------- */
export async function loadItems(searchTerm = "") {
  try {
    const q = query(collection(db, "items"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const items = [];
    querySnapshot.forEach((d) => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch (err) {
    console.error("โหลดรายการล้มเหลว:", err);
    return [];
  }
}

/* ----------------------- ⭐ ดึงโพสต์ยอดนิยมตาม watchCount ----------------------- */
export async function getPopularItems(limitCount = 10) {
  try {
    const q = query(
      collection(db, "items"),
      orderBy("watchCount", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const items = await Promise.all(
      snap.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() };
        const profile = await getUserProfile(data.user_id).catch(() => null);
        return {
          ...data,
          status: data?.status || "available",
          profileUsername: profile?.username || "ไม่ทราบชื่อ",
          profilePic: profile?.profilePic || "/images/profile-placeholder.jpg",
        };
      })
    );
    return items;
  } catch (err) {
    console.error("getPopularItems error:", err);
    return [];
  }
}

/* ----------------------- ✅ แชทส่วนตัว ----------------------- */
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

/* ----------------------- ✅ time ago ----------------------- */
export function formatTimeAgo(timestamp) {
  if (!timestamp) return "ไม่ทราบเวลา";
  const now = new Date();
  const posted = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((now - posted) / 1000);

  if (seconds < 60) return "ไม่กี่วินาทีที่แล้ว";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(seconds / 86400)} วันที่แล้ว`;
}

/* ----------------------- 🔎 Debug (ชั่วคราว) ----------------------- */
import { getApp } from "firebase/app";
console.log("Firebase projectId =", getApp().options.projectId);
console.log("authDomain =", getApp().options.authDomain);
console.log("storageBucket =", getApp().options.storageBucket);
