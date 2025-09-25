"use client";

/**
 * WatchlistPage (Client Component)
 * ---------------------------------------------------------
 * หน้ารายการโปรดของผู้ใช้:
 * - ตรวจสถานะการล็อกอิน (Firebase Auth)
 * - subscribe รายการโปรดของผู้ใช้แบบเรียลไทม์จาก Firestore
 * - ดึงรายละเอียดโพสต์ + โปรไฟล์เจ้าของโพสต์มา Merge แสดง
 * - ลบออกจากรายการโปรดแบบ Optimistic (ลบใน UI ก่อน แล้วค่อยยิงลบจริง)
 * - แสดง Modal ยืนยันการลบ และ Modal ดูรายละเอียด+แกลเลอรีรูป
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth, db } from "@/firebase/config";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Trash2, ArrowLeft, ChevronLeft, ChevronRight, Heart } from "lucide-react";

/* ---------- helpers: ฟังก์ชันช่วยรูปแบบเวลา ---------- */
/**
 * แปลง Timestamp/Date เป็นสตริงภาษาไทยแบบอ่านง่าย
 * - รองรับทั้ง Firestore Timestamp และ Date ปกติ
 * - กรณีจับ error หรือไม่มีค่า → คืน "ไม่ระบุเวลา"
 */
function formatDate(ts) {
  try {
    if (!ts) return "ไม่ระบุเวลา";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "ไม่ระบุเวลา";
  }
}

export default function WatchlistPage() {
  const router = useRouter();

  /* ---------- state หลักของหน้า ---------- */
  const [userId, setUserId] = useState(null);       // uid ของผู้ใช้ที่ล็อกอิน (หรือ null ถ้ายังไม่ล็อกอิน)
  const [items, setItems] = useState([]);           // รายการโปรด: รวมข้อมูล watchlist + item + profile ของเจ้าของโพสต์
  const [loading, setLoading] = useState(true);     // สถานะโหลดข้อมูลเพื่อแสดง skeleton
  const [confirmRemove, setConfirmRemove] = useState(null); // เก็บข้อมูลรายการที่กำลังจะลบ (แสดงใน modal)
  const [selectedItem, setSelectedItem] = useState(null);   // รายการที่เปิดดูรายละเอียดใน modal
  const [galleryIndex, setGalleryIndex] = useState(0);      // index รูปในแกลเลอรีของ modal

  /* ---------- จัดการ scroll ของ body เมื่อมี modal ---------- */
  useEffect(() => {
    const hasModal = !!confirmRemove || !!selectedItem;
    if (typeof document !== "undefined") {
      document.body.style.overflow = hasModal ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
    };
  }, [confirmRemove, selectedItem]);

  /* ---------- auth: ติดตามสถานะการล็อกอิน ---------- */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // ไม่ล็อกอิน: ล้างสถานะและหยุดโหลด
        setUserId(null);
        setItems([]);
        setLoading(false);
      }
    });
    return () => {
      try {
        unsubAuth && typeof unsubAuth === "function" && unsubAuth();
      } catch {}
    };
  }, []);

  /* ---------- subscribe watchlist ของผู้ใช้แบบเรียลไทม์ ---------- */
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    setLoading(true);

    // โครงสร้าง: users/{uid}/watchlist → doc แต่ละรายการมี { itemId, addedAt }
    const ref = collection(db, "users", userId, "watchlist");

    const unsubscribe = onSnapshot(
      ref,
      async (snapshot) => {
        // ดึง item ทีละตัวตาม itemId แล้ว merge โปรไฟล์ของเจ้าของโพสต์
        const fetchPromises = snapshot.docs.map(async (docSnap) => {
          const watchDocId = docSnap.id;
          const { itemId, addedAt } = docSnap.data() || {};
          if (!itemId) return null;

          try {
            // อ่านข้อมูลโพสต์จาก items/{itemId}
            const itemRef = doc(db, "items", itemId);
            const itemDoc = await getDoc(itemRef);
            if (!itemDoc.exists()) return null;
            const itemData = itemDoc.data();

            // ดึงโปรไฟล์ของเจ้าของโพสต์จาก users/{ownerUid}
            let profileUsername = "ไม่ระบุชื่อ";
            let profilePic = "/images/profile-placeholder.jpg";
            try {
              if (itemData?.user_id) {
                const userRef = doc(db, "users", itemData.user_id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  const ud = userSnap.data();
                  profileUsername = ud.username || profileUsername;
                  profilePic = ud.profilePic || profilePic;
                }
              }
            } catch {}

            // สรุปแถวที่จะใช้แสดงผลการ์ด
            return {
              id: itemId,
              watchDocId,
              addedAt,
              profileUsername,
              profilePic,
              ...itemData,
            };
          } catch (err) {
            console.error("failed to load item", itemId, err);
            return null;
          }
        });

        try {
          const results = await Promise.all(fetchPromises);
          if (!mounted) return;
          setItems(results.filter(Boolean)); // กรอง null ออก (กรณีรายการหาย/ลบ)
          setLoading(false);
        } catch (err) {
          console.error("error resolving watchlist items:", err);
          if (mounted) {
            setItems([]);
            setLoading(false);
          }
        }
      },
      (err) => {
        // error ขณะ onSnapshot (เช่น permission)
        console.error("watchlist onSnapshot error:", err);
        if (mounted) {
          setItems([]);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe && unsubscribe();
    };
  }, [userId]);

  /* ---------- ลบออกจากรายการโปรด (Optimistic UI) ---------- */
  async function confirmAndRemove() {
    if (!confirmRemove || !userId) {
      setConfirmRemove(null);
      return;
    }
    const { watchDocId } = confirmRemove;

    // 1) อัปเดตหน้าจอก่อน (รู้สึกไว) → filter ออก
    setItems((prev) => prev.filter((it) => it.watchDocId !== watchDocId));
    setConfirmRemove(null);

    // 2) ยิงลบจริงที่ Firestore
    try {
      await deleteDoc(doc(db, "users", userId, "watchlist", watchDocId));
    } catch (err) {
      console.error("failed to delete watchlist item", err);
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
      // บังคับให้ re-subscribe/refresh ข้อมูลใหม่
      setLoading(true);
      setUserId((id) => id); // ทริกเกอร์ useEffect ที่ผูกกับ userId
    }
  }

  /* ---------- นำทางไปหน้ารายละเอียดโพสต์ ---------- */
  function goToItem(itemId) {
    if (!itemId) return;
    router.push(`/item?id=${encodeURIComponent(itemId)}`);
  }

  /* ---------- placeholder เมื่อรูปโหลดไม่สำเร็จ ---------- */
  function handleImageError(e) {
    e.currentTarget.src = "/img/default-placeholder.jpg";
  }

  /* ---------- จัดการ modal รายละเอียด + แกลเลอรี ---------- */
  function openDetails(item, idx = 0) {
    setSelectedItem(item);
    setGalleryIndex(idx || 0);
  }
  function prevImage() {
    if (!selectedItem) return;
    const len = (selectedItem.item_images || []).length;
    if (!len) return;
    setGalleryIndex((i) => (i - 1 + len) % len);
  }
  function nextImage() {
    if (!selectedItem) return;
    const len = (selectedItem.item_images || []).length;
    if (!len) return;
    setGalleryIndex((i) => (i + 1) % len);
  }

  /* ---------- JSX: โครงหน้า + เงื่อนไขแสดงผล ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ส่วนหัวของหน้า: ชื่อหน้า + ปุ่มย้อนกลับ + ตัวนับจำนวนรายการ */}
        <section className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-full hover:bg-slate-100 transition"
                aria-label="ย้อนกลับ"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800">
                  รายการโปรดของคุณ
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  รวมโพสต์ที่คุณบันทึกไว้เพื่อกลับมาดูภายหลัง
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center bg-white/80 border border-slate-200 rounded-full px-3 py-1 shadow-sm">
              <Heart className="w-4 h-4 mr-2 text-rose-500" />
              <span className="text-sm text-slate-600">{items.length} รายการ</span>
            </div>
          </div>
        </section>

        {/* เนื้อหา: สลับ 4 สถานะ → loading / ไม่ล็อกอิน / ว่างเปล่า / มีข้อมูล */}
        {loading ? (
          // 1) Loading: แสดง skeleton
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="w-full h-44 bg-slate-200 rounded-md mb-4" />
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !userId ? (
          // 2) ยังไม่ได้ล็อกอิน
          <div className="rounded-xl bg-white p-8 shadow-md text-center border border-slate-100">
            <h2 className="text-xl font-semibold">ยังไม่ได้เข้าสู่ระบบ</h2>
            <p className="mt-2 text-slate-500">กรุณาเข้าสู่ระบบเพื่อดูรายการโปรดของคุณ</p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition"
              >
                เข้าสู่ระบบ
              </button>
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 border rounded-full hover:bg-slate-50"
              >
                กลับหน้าแรก
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          // 3) ล็อกอินแล้วแต่ยังไม่มีรายการโปรด
          <div className="rounded-xl bg-white p-8 shadow-md text-center border border-slate-100">
            <img src="/img/empty-illustration.svg" alt="empty" className="w-48 mx-auto mb-4 opacity-70" />
            <h3 className="text-lg font-medium">ยังไม่มีรายการโปรด</h3>
            <p className="mt-2 text-slate-500">
              ไปที่หน้าฟีดแล้วกด “บันทึกเป็นรายการโปรด” เพื่อเก็บโพสต์ไว้ที่นี่
            </p>
            <div className="mt-4">
              <button
                onClick={() => router.push("/")}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition"
              >
                ค้นหาสินค้า
              </button>
            </div>
          </div>
        ) : (
          // 4) มีข้อมูล: แสดงการ์ดรายการโปรดทั้งหมด
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <motion.article
                  key={item.watchDocId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  whileHover={{ y: -6, boxShadow: "0 12px 30px rgba(15,23,42,0.12)" }}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
                >
                  {/* ส่วนหัวการ์ด: รูปโปรไฟล์ + ชื่อผู้โพสต์ + เวลาเพิ่มลงรายการโปรด */}
                  <div className="flex items-center gap-3 p-3">
                    <img
                      src={item.profilePic}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover border"
                      onError={handleImageError}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {item.profileUsername}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {item.user_id ? `ผู้โพสต์ • ${item.user_id.slice(0, 6)}` : "ผู้โพสต์"}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{formatDate(item.addedAt)}</div>
                  </div>

                  {/* รูปหลักของสินค้า + ปุ่มลบออกจากรายการโปรด */}
                  <div
                    className="relative h-44 bg-slate-100 cursor-pointer"
                    onClick={() => openDetails(item, 0)}
                    role="button"
                    aria-label="เปิดดูรายละเอียด"
                  >
                    <img
                      src={item.item_images?.[0] || "/img/default-placeholder.jpg"}
                      alt={item.item_give || "รายการ"}
                      onError={handleImageError}
                      className="w-full h-full object-cover"
                    />

                    {/* ป้ายชื่อสินค้า (ซ้ายบน) */}
                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-3 py-1 shadow-sm border border-slate-100">
                      <span className="text-xs font-medium text-rose-600 truncate max-w-[10rem]">
                        {item.item_give || "ไม่ระบุ"}
                      </span>
                    </div>

                    {/* ปุ่มลบออกจากรายการโปรด (ขวาบน) */}
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRemove({ watchDocId: item.watchDocId, title: item.item_give || "รายการ" });
                        }}
                        className="bg-white/90 hover:bg-red-50 border border-transparent px-2 py-1 rounded-full shadow-sm"
                        title="ลบจากรายการโปรด"
                        aria-label="ลบจากรายการโปรด"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>
                  </div>

                  {/* แถบรูปย่อ + ข้อมูลโดยย่อ + ปุ่มดูรายละเอียด */}
                  <div className="px-3 py-3 border-t">
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {(item.item_images || []).slice(0, 6).map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => openDetails(item, idx)}
                          className="flex-none w-20 h-14 rounded-md overflow-hidden border hover:scale-105 transition"
                          title={`รูปที่ ${idx + 1}`}
                        >
                          <img
                            src={img}
                            alt={`thumb-${idx}`}
                            className="w-full h-full object-cover"
                            onError={handleImageError}
                          />
                        </button>
                      ))}
                      {!(item.item_images && item.item_images.length) && (
                        <div className="flex-none w-20 h-14 rounded-md overflow-hidden border bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                          ไม่มีรูป
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-slate-700 truncate">
                        {item.item_give || "ไม่ระบุ"} ↔ {item.item_receive || "-"}
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {item.description || "ไม่มีคำอธิบาย"}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        {item.category || "ไม่ระบุหมวด"}
                      </div>
                      <button
                        onClick={() => openDetails(item, 0)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-full text-sm shadow-sm hover:bg-rose-700"
                      >
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>

      {/* Modal: ยืนยันการลบจากรายการโปรด */}
      <AnimatePresence>
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* พื้นหลังมืด: คลิกเพื่อปิด */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setConfirmRemove(null)}
            />
            {/* กล่องยืนยันการลบ */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-50 bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-semibold text-slate-800">ยืนยันการลบ</h3>
              <p className="mt-2 text-sm text-slate-600">
                ต้องการลบ{" "}
                <span className="font-medium">{confirmRemove.title}</span>{" "}
                ออกจากรายการโปรดหรือไม่?
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-4 py-2 rounded-full border hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmAndRemove}
                  className="px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700"
                >
                  ลบรายการ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: รายละเอียดโพสต์ + แกลเลอรีรูป */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* พื้นหลังมืด: คลิกเพื่อปิด */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSelectedItem(null)}
            />
            {/* เนื้อหา modal */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative z-50 bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4 overflow-hidden"
            >
              {/* ส่วนหัว: โปรไฟล์เจ้าของโพสต์ + เวลาที่บันทึกเป็นรายการโปรด */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedItem.profilePic}
                    alt="poster"
                    className="w-12 h-12 rounded-full object-cover border"
                    onError={handleImageError}
                  />
                  <div>
                    <div className="font-semibold">{selectedItem.profileUsername}</div>
                    <div className="text-xs text-slate-400">
                      บันทึกเมื่อ {formatDate(selectedItem.addedAt)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  ปิด
                </button>
              </div>

              {/* ตัวเนื้อหาหลัก: รูปใหญ่ + ทัมบ์ + ข้อมูลโพสต์ */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ซ้าย: แกลเลอรีรูป */}
                <div className="space-y-3">
                  {/* รูปใหญ่ */}
                  <div className="relative bg-slate-100 rounded-lg overflow-hidden h-80 flex items-center justify-center">
                    {selectedItem.item_images && selectedItem.item_images.length ? (
                      <>
                        <img
                          src={selectedItem.item_images[galleryIndex]}
                          alt={`large-${galleryIndex}`}
                          className="w-full h-full object-contain bg-white"
                          onError={handleImageError}
                        />
                        {/* ปุ่มเลื่อนซ้าย/ขวา */}
                        <button
                          onClick={prevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/85 hover:bg-white shadow"
                          aria-label="ก่อนหน้า"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={nextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/85 hover:bg-white shadow"
                          aria-label="ถัดไป"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-slate-400">ไม่มีรูปภาพ</div>
                    )}
                  </div>

                  {/* รูปย่อ */}
                  <div className="flex gap-2 overflow-x-auto pt-2">
                    {(selectedItem.item_images || []).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryIndex(idx)}
                        className={`flex-none w-20 h-14 rounded-md overflow-hidden border ${
                          idx === galleryIndex ? "ring-2 ring-rose-400" : ""
                        }`}
                        title={`รูปที่ ${idx + 1}`}
                      >
                        <img
                          src={img}
                          alt={`t-${idx}`}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* ขวา: รายละเอียดโพสต์ */}
                <div>
                  <h2 className="text-2xl font-semibold">
                    {selectedItem.item_give || "ไม่ระบุ"}
                  </h2>
                  <div className="mt-2 text-sm text-slate-600">
                    {selectedItem.item_receive ? `ต้องการแลกกับ: ${selectedItem.item_receive}` : "-"}
                  </div>

                  <div className="mt-4 flex gap-2 flex-wrap">
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">
                      {selectedItem.condition || "ไม่ระบุสภาพ"}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 rounded-full text-sm">
                      {selectedItem.category || "ไม่ระบุหมวด"}
                    </span>
                  </div>

                  <div className="mt-4 text-slate-700">
                    <h4 className="font-medium">คำอธิบาย</h4>
                    <p className="mt-2 text-sm">
                      {selectedItem.description || "ไม่มีคำอธิบาย"}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => goToItem(selectedItem.id)}
                      className="px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition"
                    >
                      ไปยังหน้ารายละเอียด
                    </button>
                    <button
                      onClick={() => {
                        setConfirmRemove({
                          watchDocId: selectedItem.watchDocId,
                          title: selectedItem.item_give || "รายการ",
                        });
                        setSelectedItem(null);
                      }}
                      className="px-4 py-2 border rounded-full text-rose-600 hover:bg-rose-50"
                    >
                      ลบจากรายการโปรด
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
