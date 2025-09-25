"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

// ✅ ฟังก์ชันช่วยเรื่องสถานะล็อกอิน และออกจากระบบ
import { authStateHandler, logout } from "@/firebase/functions";

// ✅ ไอคอนที่ใช้ในเฮดเดอร์
import {
  Bell, Menu, X, User, PlusSquare, Heart, MessageSquare, LogOut, Check, CircleX
} from "lucide-react";

/* ---------- Firestore ---------- */
import { db } from "@/firebase/config";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

/* ใช้ app จาก Firebase SDK (สำหรับขอ FCM token) */
import { getApp, getApps } from "firebase/app";

export default function Header() {
  // ---------- สถานะที่ใช้ควบคุม UI ----------
  const [user, setUser] = useState(null);              // ผู้ใช้ที่ล็อกอินอยู่ (หรือ null)
  const [mobileOpen, setMobileOpen] = useState(false); // เปิด/ปิดเมนูมือถือ
  const [profileOpen, setProfileOpen] = useState(false);// เปิด/ปิดเมนูโปรไฟล์
  const [notifOpen, setNotifOpen] = useState(false);    // เปิด/ปิดป๊อปอัปแจ้งเตือน

  // ---------- ข้อมูลแจ้งเตือน ----------
  const [notifications, setNotifications] = useState([]); // รายการแจ้งเตือนของฉัน
  const [unreadCount, setUnreadCount] = useState(0);      // จำนวนที่ยังไม่ได้อ่าน

  // ---------- สถานะการรองรับ/สิทธิ Notification API ----------
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [confirmingId, setConfirmingId] = useState(null); // ใช้แสดงปุ่มกำลังยืนยัน

  // ตัวช่วยสำหรับคลิกนอกป๊อปอัป, และเก็บฟังก์ชันยกเลิก onSnapshot
  const router = useRouter();
  const clickScopeRef = useRef(null);
  const notifUnsubRef = useRef(null);

  /* ---------- เช็คว่าเบราว์เซอร์รองรับ Notification ไหม ---------- */
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifSupported(true);
      setNotifPermission(Notification.permission); // "default" | "granted" | "denied"
    }
  }, []);

  /* ---------- ฟังสถานะล็อกอิน แล้ว subscribe แจ้งเตือนแบบเรียลไทม์ ---------- */
  useEffect(() => {
    // authStateHandler จะเรียก callback ทุกครั้งที่มีการเปลี่ยนแปลงสถานะผู้ใช้
    authStateHandler(async (u) => {
      setUser(u);

      // ยกเลิกการติดตามเก่าก่อน (ป้องกันซ้อนหลายครั้ง)
      if (notifUnsubRef.current) {
        try { notifUnsubRef.current(); } catch {}
        notifUnsubRef.current = null;
      }

      // ถ้ามีผู้ใช้ → ฟัง collection "notifications" ของคนนั้น
      if (u) {
        const qRef = query(
          collection(db, "notifications"),
          where("toUserId", "==", u.uid),
          orderBy("createdAt", "desc")
        );
        const unsub = onSnapshot(qRef, (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setNotifications(docs);
          setUnreadCount(docs.filter((n) => !n.read && !n.handled).length);
        });
        notifUnsubRef.current = unsub;
      } else {
        // ไม่มีผู้ใช้ → ล้างข้อมูล
        setNotifications([]);
        setUnreadCount(0);
      }
    });

    // cleanup ตอน Header ถูกถอด
    return () => {
      if (notifUnsubRef.current) {
        try { notifUnsubRef.current(); } catch {}
        notifUnsubRef.current = null;
      }
    };
  }, []);

  /* ---------- ปิดป๊อปอัปเมื่อคลิกข้างนอก / กด ESC ---------- */
  useEffect(() => {
    function onDoc(e) {
      const el = clickScopeRef.current;
      if (!el) return;
      if (!el.contains(e.target)) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    }
    function onEsc(e) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", onDoc, true);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  /* ---------- ออกจากระบบ ---------- */
  const handleLogout = async () => {
    try {
      await logout();
      setProfileOpen(false);
      setMobileOpen(false);
    } catch (e) {
      console.error("Logout failed", e);
      alert("ออกจากระบบไม่สำเร็จ");
    }
  };

  /* ---------- ทำเป็นอ่านแล้ว (แจ้งเตือนเดี่ยว/ทั้งหมด) ---------- */
  const markAsRead = async (notifId) => {
    try { await updateDoc(doc(db, "notifications", notifId), { read: true }); }
    catch (e) { console.error("markAsRead error", e); }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })));
    } catch (e) { console.error("markAllAsRead error", e); }
  };

  /* ---------- ปุ่ม “ยืนยันกำลังติดต่อ” บนการแจ้งเตือนชนิด interest ----------
     - อัปเดตสถานะโพสต์ใน items
     - ทำเครื่องหมายว่าแจ้งเตือนนี้ถูกจัดการแล้ว
  ---------------------------------------------------------------------- */
  async function confirmContacting(n) {
    try {
      const itemId = n.itemId || n.data?.itemId;
      const requestedStatus = n.requestedStatus || n.data?.requestedStatus || "contacting";
      if (!itemId) { alert("แจ้งเตือนไม่มีข้อมูลรายการ (itemId)"); return; }

      setConfirmingId(n.id);

      // อัปเดตสถานะโพสต์
      await updateDoc(doc(db, "items", itemId), {
        status: requestedStatus,
        statusUpdatedAt: serverTimestamp(),
      });

      // อัปเดตสถานะแจ้งเตือน (handled + read)
      await updateDoc(doc(db, "notifications", n.id), {
        handled: true,
        read: true,
        handledAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "ยืนยันไม่สำเร็จ");
    } finally {
      setConfirmingId(null);
    }
  }

  /* ---------- ขออนุญาตแจ้งเตือน + บันทึก FCM token (เมื่อผู้ใช้กด) ----------
     - ใช้ getMessaging/getToken จาก firebase/messaging
     - ส่ง token ไปเก็บที่ API ฝั่งเซิร์ฟเวอร์
  -------------------------------------------------------------------------- */
  async function requestAndSaveFcmToken(uid) {
    try {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;

      // ต้องมี Firebase app ก่อน ถึงจะใช้ Messaging ได้
      const app = getApps().length ? getApp() : null;
      if (!app) return;

      const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
      const supported = await isSupported();
      if (!supported) return;

      // ต้องเกิดจากการคลิกของผู้ใช้เท่านั้น เบราว์เซอร์ถึงจะถามสิทธิ
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== "granted") return;

      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (!token) return;

      // ส่ง token ไปเก็บ (เพื่อใช้ส่ง push notification)
      await fetch("/api/saveFcmToken", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, token }),
      });
    } catch (e) {
      console.error("requestAndSaveFcmToken error", e);
    }
  }

  /* ============================== UI ============================== */
  return (
    // เฮดเดอร์ติดบนสุด (sticky) + เบลอพื้นหลังเล็กน้อย
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* แถบบน: โลโก้ซ้าย / ปุ่มต่าง ๆ ขวา */}
        <div className="flex items-center justify-between h-16">
          {/* ซ้าย: ปุ่มเปิดเมนูมือถือ + โลโก้ */}
          <div className="flex items-center gap-3">
            {/* ปุ่มเบอร์เกอร์ (มือถือ) */}
            <button
              type="button"
              className="md:hidden p-2 rounded-xl hover:bg-slate-100"
              aria-label="เปิดเมนู"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((s) => !s)}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* โลโก้ (สว่าง/มืด) */}
            <Link href="/" className="flex items-center gap-2">
              <span className="block dark:hidden">
                <Image
                  src="/images/swappo-logo.svg"
                  alt="Swappo"
                  width={132}
                  height={36}
                  priority
                  className="w-[132px] h-[36px] object-contain"
                />
              </span>
              <span className="hidden dark:block">
                <Image
                  src="/images/swappo-logo-dark.svg"
                  alt="Swappo"
                  width={132}
                  height={36}
                  priority
                  className="w-[132px] h-[36px] object-contain"
                />
              </span>
            </Link>
          </div>

          {/* ขวา: ปุ่มสร้างโพสต์ / แจ้งเตือน / เมนูโปรไฟล์ */}
          <div className="flex items-center gap-2 sm:gap-3" ref={clickScopeRef}>
            {/* สร้างโพสต์ (เดสก์ท็อป) */}
            <Link
              href="/post"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-full shadow-sm hover:shadow transition active:scale-[.98]"
            >
              <PlusSquare className="w-4 h-4" /> สร้างโพสต์
            </Link>

            {/* ปุ่มแจ้งเตือน + ป๊อปอัปแจ้งเตือน */}
            <div className="relative">
              <button
                type="button"
                className="relative p-2 rounded-full hover:bg-slate-100"
                aria-label="แจ้งเตือน"
                aria-expanded={notifOpen}
                aria-controls="notif-popover"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                  if (notifSupported) setNotifPermission(Notification.permission);
                }}
              >
                <Bell className="w-5 h-5 text-slate-600" />
                {/* แสดงตัวเลขถ้ามีแจ้งเตือนค้างอ่าน */}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold text-white bg-rose-600 rounded-full shadow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  id="notif-popover"
                  role="dialog"
                  className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  {/* ส่วนหัวของป๊อปอัป */}
                  <div className="px-4 py-2.5 border-b flex items-center justify-between">
                    <div className="font-semibold text-sm">การแจ้งเตือน</div>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-700"
                      onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                    >
                      ทำเครื่องหมายว่าอ่านแล้ว
                    </button>
                  </div>

                  {/* แถบชวนเปิดสิทธิแจ้งเตือน (ถ้ายังไม่ได้ให้สิทธิ) */}
                  {user && notifSupported && notifPermission !== "granted" && (
                    <div className="px-4 py-3 border-b bg-amber-50 text-amber-800 text-xs flex items-center justify-between gap-3">
                      <div>ต้องเปิดการแจ้งเตือนเพื่อรับข่าวสารแบบเรียลไทม์</div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); requestAndSaveFcmToken(user.uid); }}
                        className="px-2 py-1 rounded-full bg-amber-600 text-white hover:bg-amber-700"
                      >
                        เปิดการแจ้งเตือน
                      </button>
                    </div>
                  )}

                  {/* รายการแจ้งเตือน */}
                  <div className="max-h-80 overflow-auto">
                    {notifications.length === 0 && (
                      <div className="p-4 text-sm text-slate-500">ยังไม่มีการแจ้งเตือน</div>
                    )}

                    {notifications.map((n) => {
                      const itemId = n.itemId || n.data?.itemId;        // ลิงก์ไปโพสต์ที่เกี่ยวข้อง
                      const type = n.type || n.data?.type;               // ประเภทแจ้งเตือน (เช่น "interest")
                      const isInterest = (type === "interest");
                      const bg = !n.read && !n.handled ? "bg-white" : "bg-slate-50";

                      return (
                        <div
                          key={n.id}
                          className={`p-3 border-b ${bg}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                            if (itemId) router.push(`/item?id=${itemId}`);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{n.title || "การแจ้งเตือน"}</div>
                              <div className="text-xs text-slate-600 mt-0.5">{n.body || ""}</div>

                              {/* ปุ่ม “ดูโพสต์” แบบลิงก์ (หยุดบับเบิลเพื่อไม่ยิง onClick พาไปซ้ำ) */}
                              {itemId && (
                                <div className="mt-1 text-xs">
                                  รายการ:{" "}
                                  <a className="text-rose-600 hover:underline" href={`/item?id=${itemId}`} onClick={(e)=>e.stopPropagation()}>
                                    ดูโพสต์
                                  </a>
                                </div>
                              )}

                              {/* เวลาแจ้งเตือน */}
                              <div className="text-[11px] text-slate-400 mt-1">
                                {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString("th-TH") : ""}
                              </div>
                            </div>

                            {/* ถ้าเป็นแจ้งเตือน “มีคนสนใจ” และยังไม่ handled → แสดงปุ่มลัด */}
                            {isInterest && !n.handled && (
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  disabled={confirmingId === n.id}
                                  onClick={(e) => { e.stopPropagation(); confirmContacting(n); }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                                  title="ยืนยันเปลี่ยนสถานะเป็นกำลังติดต่อ"
                                >
                                  <Check className="w-4 h-4" />
                                  {confirmingId === n.id ? "กำลังยืนยัน..." : "ยืนยัน"}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-600 hover:bg-slate-50"
                                  title="ทำเป็นอ่านแล้ว"
                                >
                                  <CircleX className="w-4 h-4" /> อ่านแล้ว
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ส่วนโปรไฟล์ (ยังไม่ล็อกอิน / ล็อกอินแล้ว) */}
            {!user ? (
              // ยังไม่ล็อกอิน → ปุ่มไป Login/Register
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="px-3 py-2 rounded-full text-sm hover:bg-slate-50">🔑 เข้าสู่ระบบ</Link>
                <Link
                  href="/register"
                  className="px-3 py-2 rounded-full bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 text-sm"
                >
                  📝 ลงทะเบียน
                </Link>
              </div>
            ) : (
              // ล็อกอินแล้ว → ปุ่มรูปโปรไฟล์ + เมนูดรอปดาวน์
              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen((s) => !s);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-50"
                >
                  <Image
                    src={user.photoURL || "/images/profile-placeholder.jpg"}
                    alt="avatar"
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover pointer-events-none"
                  />
                  <span className="hidden md:inline-block text-sm font-medium text-slate-700 max-w-[150px] truncate">
                    {user.displayName || "ชื่อผู้ใช้"}
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50">
                    {/* ส่วนหัวในเมนูโปรไฟล์ (ภาพ+ชื่อ+อีเมล) */}
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        <Image
                          src={user.photoURL || "/images/profile-placeholder.jpg"}
                          alt="avatar"
                          width={44}
                          height={44}
                          className="w-11 h-11 rounded-full object-cover pointer-events-none"
                        />
                        <div>
                          <div className="text-sm font-semibold">{user.displayName || "ผู้ใช้"}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    {/* เมนูภายในโปรไฟล์ */}
                    <nav className="p-2">
                      <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm">
                        <User className="w-4 h-4 text-slate-500" /> โปรไฟล์
                      </Link>
                      <Link href="/watchlist" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm">
                        <Heart className="w-4 h-4 text-slate-500" /> รายการโปรด
                      </Link>
                      <Link href="/chat" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm">
                        <MessageSquare className="w-4 h-4 text-slate-500" /> แชท
                      </Link>
                      <div className="border-t my-2" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-50 text-sm text-rose-600"
                      >
                        <LogOut className="w-4 h-4" /> ออกจากระบบ
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* เมนูมือถือ (drawer ด้านล่างแถบหัว) */}
      <div className={`md:hidden ${mobileOpen ? "block" : "hidden"} border-t border-slate-100 bg-white`}>
        <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
          <Link href="/post" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 text-white">
            <PlusSquare className="w-4 h-4" /> สร้างโพสต์
          </Link>

          {!user ? (
            // เมนูสำหรับผู้ไม่ได้ล็อกอิน
            <div className="flex items-center gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
                🔑 เข้าสู่ระบบ
              </Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 text-sm text-center">
                📝 ลงทะเบียน
              </Link>
            </div>
          ) : (
            // เมนูสำหรับผู้ที่ล็อกอินแล้ว
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-slate-50 text-sm">
                <User className="inline w-4 h-4 mr-2 text-slate-500" /> โปรไฟล์
              </Link>
              <Link href="/watchlist" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-slate-50 text-sm">
                <Heart className="inline w-4 h-4 mr-2 text-slate-500" /> รายการโปรด
              </Link>
              <Link href="/chat" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-xl hover:bg-slate-50 text-sm">
                <MessageSquare className="inline w-4 h-4 mr-2 text-slate-500" /> แชท
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full mt-1 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-left text-sm"
              >
                <LogOut className="inline w-4 h-4 mr-2" /> ออกจากระบบ
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
