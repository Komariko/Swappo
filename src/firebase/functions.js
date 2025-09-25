// src/firebase/functions.js
// โมดูลรวมฟังก์ชันที่คุยกับ Firebase (Auth/Firestore) สำหรับใช้ซ้ำทั้งแอป

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

/* ----------------------- ✅ ตรวจสอบสถานะผู้ใช้ปัจจุบัน -----------------------
   ใช้สมัครสมาชิก/ล็อกอินแล้วต้องรู้ว่า “มีผู้ใช้ไหม” เพื่อปรับ UI
   - รับ setUser (setter จาก React) แล้วคืนค่า unsubscribe (ไว้ cleanup ใน useEffect)
------------------------------------------------------------------------------- */
export function authStateHandler(setUser) {
  return onAuthStateChanged(auth, (user) => {
    setUser(user || null);
  });
}

/* ----------------------- ✅ ออกจากระบบ -----------------------
   เซ็นเอาต์แล้วย้ายกลับหน้าแรก
---------------------------------------------------------------- */
export async function logout() {
  try {
    await signOut(auth);
    window.location.href = "/"; // รีเฟรชเส้นทางให้ state เคลียร์จริง
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการออกจากระบบ:", error);
    alert("ไม่สามารถออกจากระบบได้");
  }
}

/* ----------------------- ✅ ติดปุ่มออกจากระบบแบบ DOM ตรง ๆ -----------------------
   กรณีบางหน้าไม่มี React handler แต่อยากโยง <button id="logout-btn"> เร็ว ๆ
------------------------------------------------------------------------------- */
export function setupLogoutButton() {
  const logoutButton = document.getElementById("logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => logout());
  }
}

/* ----------------------- ✅ ดึงโปรไฟล์ผู้ใช้จาก UID -----------------------
   คืนข้อมูลเริ่มต้น (ชื่อ/รูป) ถ้าไม่มีเอกสารใน Firestore
-------------------------------------------------------------------------- */
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
  // ค่า fallback ปลอดภัย
  return {
    username: "ไม่ทราบชื่อ",
    profilePic: "/images/profile-placeholder.jpg",
  };
}

/* ======================= ⭐ Watchlist (รายการโปรด) ======================= */

/* ----------------------- ✅ subscribe รายการโปรดของผู้ใช้ -----------------------
   - คืน Set ของ itemId เพื่อเช็คว่าโพสต์ไหนถูกใจอยู่บ้าง (เช่น แสดงไอคอนหัวใจ)
   - ต้องเรียกตอน “มีผู้ใช้แล้ว” (auth.currentUser)
------------------------------------------------------------------------------- */
export function watchlistListener(setIds) {
  const user = auth.currentUser;
  if (!user) return () => {};
  const ref = collection(db, "users", user.uid, "watchlist");
  return onSnapshot(ref, (snap) => {
    const ids = new Set(snap.docs.map(d => d.id)); // โครงสร้าง: ใช้ itemId เป็น doc id
    setIds(ids);
  });
}

/* ----------------------- ✅ เพิ่มเข้ารายการโปรด (idempotent) -----------------------
   - กันบันทึกรายการซ้ำ และกันเจ้าของบันทึกโพสต์ของตัวเอง
   - เพิ่มตัวนับ watchCount ในเอกสาร item
------------------------------------------------------------------------------- */
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

    // watchlist เก็บเป็น doc id = itemId (เข้าถึงง่าย)
    const favRef = doc(db, "users", user.uid, "watchlist", itemId);
    const favSnap = await getDoc(favRef);
    if (favSnap.exists()) {
      return { ok: true, action: "exists" }; // มีแล้ว ไม่ต้องทำซ้ำ
    }

    // เพิ่มใน watchlist ของผู้ใช้ + เพิ่มตัวนับที่ item
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

/* ----------------------- ✅ เอาออกจากรายการโปรด -----------------------
   - ลบเอกสารใต้ users/{uid}/watchlist/{itemId}
   - ลดตัวนับ watchCount ที่ item
----------------------------------------------------------------------- */
export async function removeFromWatchlist(itemId) {
  const user = auth.currentUser;
  if (!user) return { ok: false, reason: "no-auth" };

  try {
    const favRef = doc(db, "users", user.uid, "watchlist", itemId);
    const favSnap = await getDoc(favRef);
    if (!favSnap.exists()) {
      return { ok: true, action: "noop" }; // ไม่มีอยู่แล้ว
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

/* ----------------------- ✅ toggle รายการโปรด -----------------------
   - กดครั้งแรก = เพิ่ม, กดซ้ำ = เอาออก (ห่อ logic สองฟังก์ชันด้านบน)
-------------------------------------------------------------------- */
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

/* ======================= 📦 ฟีดรายการสินค้า ======================= */

/* ----------------------- ✅ โหลดรายการสินค้าล่าสุด -----------------------
   - ดึง collection "items" เรียงตาม createdAt จากใหม่ไปเก่า
   - (พารามิเตอร์ searchTerm ยังไม่ถูกใช้ในฟังก์ชันนี้)
-------------------------------------------------------------------------- */
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

/* ----------------------- ⭐ ดึงโพสต์ยอดนิยม (ตาม watchCount) -----------------------
   - ใช้กับหน้า Guest/หน้าแรกสำหรับโชว์ Top N
   - enrich ด้วยโปรไฟล์ของเจ้าของโพสต์
------------------------------------------------------------------------------- */
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

/* ======================= 💬 แชทส่วนตัว (API ระดับฟังก์ชัน) ======================= */

/* ----------------------- ✅ ส่งข้อความส่วนตัว -----------------------
   - สร้าง chatId จาก uid สองฝั่ง (เรียงแล้ว join ด้วย '_')
   - เพิ่มเอกสารข้อความใต้ privateChats/{chatId}/messages
   หมายเหตุ: โครงสร้างฟิลด์ที่นี่ใช้ "message"
   (ส่วนคอมโพเนนต์ ChatPage/ChatSidebar ของคุณใช้ฟิลด์ "text")
--------------------------------------------------------------------- */
export async function sendPrivateMessage(toUserId, text) {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const chatId = [currentUser.uid, toUserId].sort().join("_");
  const messagesRef = collection(db, "privateChats", chatId, "messages");

  await addDoc(messagesRef, {
    message: text,             // ← เวอร์ชันเดิมของ util ตัวนี้
    senderId: currentUser.uid,
    receiverId: toUserId,
    createdAt: serverTimestamp(),
  });
}

/* ----------------------- ✅ subscribe แชท (สไตล์ DOM เดิม) -----------------------
   - โหลดข้อความแล้วเติมลง element#chat-messages แบบเดิม ๆ (ไม่ใช่ React state)
   - เหมาะกับหน้าที่ไม่ได้ใช้ React แสดงแชท
   - ใช้ฟิลด์ "message" เหมือนฟังก์ชันด้านบน
------------------------------------------------------------------------------- */
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
      msgDiv.textContent = data.message; // ← ใช้ "message"
      chatMessages.appendChild(msgDiv);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* ======================= 🕓 ตัวช่วย time ago ======================= */

/* ----------------------- ✅ แปลงเวลาเป็นข้อความอ่านง่าย -----------------------
   รับ Firestore Timestamp หรือ Date/number/string
------------------------------------------------------------------------------- */
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

/* ----------------------- 🔎 Debug (ชั่วคราว) -----------------------
   พิมพ์ config ที่แอปกำลังใช้จริง ๆ ในคอนโซล ช่วยเช็คสภาพแวดล้อม dev/prod
------------------------------------------------------------------------------- */
import { getApp } from "firebase/app";
console.log("Firebase projectId =", getApp().options.projectId);
console.log("authDomain =", getApp().options.authDomain);
console.log("storageBucket =", getApp().options.storageBucket);
