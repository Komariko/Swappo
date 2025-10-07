/* eslint-disable react/no-unescaped-entities */

"use client";


import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth, db } from "@/firebase/config";
import { collection, doc, getDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
<<<<<<< HEAD
import { Trash2, ArrowLeft, ChevronLeft, ChevronRight, Heart, X, PackageOpen, LogIn, Eye } from "lucide-react";

// --- Helper Functions ---
=======
import { Trash2, ArrowLeft, ChevronLeft, ChevronRight, Heart } from "lucide-react";

/* ---------- helpers ---------- */
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
function formatDate(ts) {
  try {
    if (!ts) return "ไม่ระบุเวลา";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "ไม่ระบุเวลา"; }
}

const handleImageError = (e) => { e.currentTarget.src = "/img/default-placeholder.jpg"; };

// --- Main Page Component ---
export default function WatchlistPage() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

<<<<<<< HEAD
  // Auth state listener
=======
  /* block background scroll when any modal opens */
  useEffect(() => {
    const hasModal = !!confirmRemove || !!selectedItem;
    if (typeof document !== "undefined") {
      document.body.style.overflow = hasModal ? "hidden" : "";
    }
    return () => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
    };
  }, [confirmRemove, selectedItem]);

  /* auth */
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setItems([]);
        setLoading(false);
      }
    });
<<<<<<< HEAD
    return () => unsubAuth();
  }, []);

  // Watchlist data listener
  useEffect(() => {
    if (!userId) {
      setLoading(false);
=======
    return () => {
      try {
        unsubAuth && typeof unsubAuth === "function" && unsubAuth();
      } catch {}
    };
  }, []);

  /* subscribe watchlist */
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    setLoading(true);

    const ref = collection(db, "users", userId, "watchlist");
    const unsubscribe = onSnapshot(
      ref,
      async (snapshot) => {
        const fetchPromises = snapshot.docs.map(async (docSnap) => {
          const watchDocId = docSnap.id;
          const { itemId, addedAt } = docSnap.data() || {};
          if (!itemId) return null;

          try {
            const itemRef = doc(db, "items", itemId);
            const itemDoc = await getDoc(itemRef);
            if (!itemDoc.exists()) return null;
            const itemData = itemDoc.data();

            // profile ของผู้โพสต์
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
          setItems(results.filter(Boolean));
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

  /* remove (optimistic) */
  async function confirmAndRemove() {
    if (!confirmRemove || !userId) {
      setConfirmRemove(null);
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
      return;
    }
    setLoading(true);
    const ref = collection(db, "users", userId, "watchlist");
    const unsubscribe = onSnapshot(ref, async (snapshot) => {
      const fetchPromises = snapshot.docs.map(async (docSnap) => {
        const { itemId, addedAt } = docSnap.data();
        if (!itemId) return null;
        try {
          const itemDoc = await getDoc(doc(db, "items", itemId));
          if (!itemDoc.exists()) return null;
          const itemData = itemDoc.data();
          const userDoc = await getDoc(doc(db, "users", itemData.user_id));
          const userData = userDoc.exists() ? userDoc.data() : {};
          return {
            id: itemId,
            watchDocId: docSnap.id,
            addedAt,
            ...itemData,
            profileUsername: userData.username || "ไม่ระบุชื่อ",
            profilePic: userData.profilePic || "/images/profile-placeholder.jpg",
          };
        } catch (err) {
          console.error("Failed to load item", itemId, err);
          return null;
        }
      });
      const results = await Promise.all(fetchPromises);
      setItems(results.filter(Boolean).sort((a,b) => b.addedAt.toMillis() - a.addedAt.toMillis()));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  // Handle item removal
  async function handleRemove() {
    if (!confirmRemove || !userId) return setConfirmRemove(null);
    const { watchDocId } = confirmRemove;

    setItems((prev) => prev.filter((it) => it.watchDocId !== watchDocId));
    setConfirmRemove(null);
    if(selectedItem?.watchDocId === watchDocId) setSelectedItem(null);

    try {
      await deleteDoc(doc(db, "users", userId, "watchlist", watchDocId));
    } catch (err) {
      console.error("Failed to delete watchlist item", err);
      alert("ลบไม่สำเร็จ กรุณาลองใหม่");
<<<<<<< HEAD
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <Header />
      <main className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <PageHeader count={items.length} onBack={() => router.back()} />
        
        <div className="mt-8">
          {loading ? (
            <LoadingState />
          ) : !userId ? (
            <NotLoggedInState onLogin={() => router.push("/login")} />
          ) : items.length === 0 ? (
            <EmptyState onFind={() => router.push("/")} />
          ) : (
            <motion.div layout className="flex flex-col gap-4">
=======
      setLoading(true);
      setUserId((id) => id); // retrigger
    }
  }

  function goToItem(itemId) {
    if (!itemId) return;
    // ให้ตรงกับที่ใช้อยู่ทั้งเว็บ
    router.push(`/item?id=${encodeURIComponent(itemId)}`);
  }

  function handleImageError(e) {
    e.currentTarget.src = "/img/default-placeholder.jpg";
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-white">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
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

        {/* Content */}
        {loading ? (
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
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
              {items.map((item) => (
                <WatchlistItem
                  key={item.watchDocId}
<<<<<<< HEAD
                  item={item}
                  onRemoveClick={() => setConfirmRemove({ watchDocId: item.watchDocId, title: item.item_give })}
                  onViewClick={() => setSelectedItem(item)}
                />
=======
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  whileHover={{ y: -6, boxShadow: "0 12px 30px rgba(15,23,42,0.12)" }}
                  className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm"
                >
                  {/* Header */}
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

                  {/* Main image */}
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

                    <div className="absolute left-3 top-3 inline-flex items-center gap-2 bg-white/90 backdrop-blur rounded-full px-3 py-1 shadow-sm border border-slate-100">
                      <span className="text-xs font-medium text-rose-600 truncate max-w-[10rem]">
                        {item.item_give || "ไม่ระบุ"}
                      </span>
                    </div>

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

                  {/* Thumbs + info */}
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
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
<<<<<<< HEAD
        {confirmRemove && <ConfirmationModal {...confirmRemove} onConfirm={handleRemove} onCancel={() => setConfirmRemove(null)} />}
        {selectedItem && <DetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} onRemove={() => setConfirmRemove({ watchDocId: selectedItem.watchDocId, title: selectedItem.item_give })} onGoToItem={() => router.push(`/item?id=${selectedItem.id}`)} />}
      </AnimatePresence>
=======
        {confirmRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setConfirmRemove(null)}
            />
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

      {/* Detail modal + gallery */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="relative z-50 bg-white rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4 overflow-hidden"
            >
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

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  {/* large view */}
                  <div className="relative bg-slate-100 rounded-lg overflow-hidden h-80 flex items-center justify-center">
                    {selectedItem.item_images && selectedItem.item_images.length ? (
                      <>
                        <img
                          src={selectedItem.item_images[galleryIndex]}
                          alt={`large-${galleryIndex}`}
                          className="w-full h-full object-contain bg-white"
                          onError={handleImageError}
                        />
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

                  {/* thumbs */}
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

>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
      <Footer />
    </div>
  );
}

// --- Sub-components for Readability ---

const PageHeader = ({ count, onBack }) => (
  <section className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200/60 transition-colors" aria-label="ย้อนกลับ">
        <ArrowLeft className="w-6 h-6 text-slate-700" />
      </button>
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          รายการโปรด
        </h1>
        <p className="mt-1 text-slate-500">
          มี {count} รายการที่คุณบันทึกไว้
        </p>
      </div>
    </div>
    <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm text-pink-600">
      <Heart className="w-5 h-5 mr-2" />
      <span className="text-sm font-semibold">My Watchlist</span>
    </div>
  </section>
);

const LoadingState = () => (
    <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex items-center gap-4">
                <div className="w-24 h-24 bg-slate-200 rounded-lg shrink-0" />
                <div className="flex-grow space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

const EmptyState = ({ onFind }) => (
    <div className="text-center bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-200/80">
        <div className="w-20 h-20 mx-auto bg-rose-100 rounded-full flex items-center justify-center">
            <PackageOpen className="w-10 h-10 text-rose-500" />
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-800">รายการโปรดของคุณว่างเปล่า</h3>
        <p className="mt-2 text-slate-500 max-w-sm mx-auto">
            กดไอคอนรูปหัวใจ <Heart className="inline w-4 h-4 text-rose-500"/> เพื่อบันทึกโพสต์ที่น่าสนใจไว้ที่นี่
        </p>
        <div className="mt-6">
            <button onClick={onFind} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-full hover:bg-slate-800 transition-colors shadow-sm">
                ไปหน้าค้นหา
            </button>
        </div>
    </div>
);

const NotLoggedInState = ({ onLogin }) => (
    <div className="text-center bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-200/80">
        <div className="w-20 h-20 mx-auto bg-slate-200 rounded-full flex items-center justify-center">
            <LogIn className="w-10 h-10 text-slate-500" />
        </div>
        <h2 className="mt-6 text-xl font-bold text-slate-800">ดูเหมือนว่าคุณยังไม่ได้เข้าสู่ระบบ</h2>
        <p className="mt-2 text-slate-500">กรุณาเข้าสู่ระบบเพื่อดูรายการโปรดของคุณ</p>
        <div className="mt-6">
            <button onClick={onLogin} className="px-6 py-2.5 bg-rose-600 text-white font-bold rounded-full hover:bg-rose-700 transition-colors shadow-sm">
                เข้าสู่ระบบ
            </button>
        </div>
    </div>
);

const WatchlistItem = ({ item, onRemoveClick, onViewClick }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg border border-slate-200/80 transition-shadow duration-300 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
    >
        <img 
            src={item.item_images?.[0]} 
            alt={item.item_give} 
            onError={handleImageError} 
            className="w-full sm:w-28 h-40 sm:h-28 object-cover rounded-lg shrink-0"
        />
        <div className="flex-grow min-w-0">
            <p className="text-xs text-slate-500">บันทึกเมื่อ {formatDate(item.addedAt)}</p>
            <h3 className="text-lg font-bold text-slate-800 mt-1 line-clamp-2">{item.item_give}</h3>
            <div className="text-sm text-slate-600 mt-2 flex items-center gap-2">
                <img src={item.profilePic} alt={item.profileUsername} className="w-6 h-6 rounded-full object-cover" onError={handleImageError} />
                <span>โพสต์โดย <span className="font-semibold">{item.profileUsername}</span></span>
            </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pt-2 sm:pt-0">
            <button onClick={onViewClick} className="p-2 rounded-full text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors" title="ดูรายละเอียด">
                <Eye className="w-5 h-5"/>
            </button>
            <button onClick={onRemoveClick} className="p-2 rounded-full text-rose-600 bg-rose-100 hover:bg-rose-200 transition-colors" title="ลบจากรายการโปรด">
                <Trash2 className="w-5 h-5"/>
            </button>
        </div>
    </motion.div>
);

const DetailsModal = ({ item, onClose, onRemove, onGoToItem }) => {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const images = item.item_images || [];

  const prevImage = () => setGalleryIndex(i => (i - 1 + images.length) % images.length);
  const nextImage = () => setGalleryIndex(i => (i + 1) % images.length);
  
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="relative z-10 bg-slate-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
                <img src={item.profilePic} alt="poster" className="w-10 h-10 rounded-full object-cover border" onError={handleImageError}/>
                <div>
                    <div className="font-semibold text-slate-800">{item.profileUsername}</div>
                    <div className="text-xs text-slate-500">เจ้าของโพสต์</div>
                </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-200/80"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2">
            <div className="p-4 space-y-3"><div className="relative bg-white rounded-lg overflow-hidden aspect-square flex items-center justify-center border">{images.length > 0 ? (<><img src={images[galleryIndex]} alt={`gallery-${galleryIndex}`} className="w-full h-full object-contain" onError={handleImageError} />{images.length > 1 && <> <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition" aria-label="ก่อนหน้า"><ChevronLeft className="w-5 h-5" /></button><button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 hover:bg-white shadow-md transition" aria-label="ถัดไป"><ChevronRight className="w-5 h-5" /></button></>}</>) : <div className="text-sm text-slate-400">ไม่มีรูปภาพ</div> }</div>{images.length > 1 && (<div className="flex gap-2 overflow-x-auto pb-2">{images.map((img, idx) => (<button key={idx} onClick={() => setGalleryIndex(idx)} className={`flex-none w-20 h-20 rounded-md overflow-hidden border-2 transition ${idx === galleryIndex ? "border-pink-500" : "border-transparent hover:border-slate-300"}`} title={`รูปที่ ${idx + 1}`}><img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" onError={handleImageError} /></button>))}</div>)}</div>
            <div className="p-4 md:border-l"><h2 className="text-2xl font-bold text-slate-900">{item.item_give}</h2><div className="mt-2 text-slate-600"><span className="font-semibold">ต้องการแลกกับ:</span> {item.item_receive || "-"}</div><div className="mt-4 flex gap-2 flex-wrap"><span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">{item.condition || "ไม่ระบุสภาพ"}</span><span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium">{item.category || "ไม่ระบุหมวด"}</span></div><div className="mt-6 border-t pt-4"><h4 className="font-semibold text-slate-800">คำอธิบาย</h4><p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{item.description || "ไม่มีคำอธิบาย"}</p></div><div className="mt-8 flex items-center gap-3 flex-wrap"><button onClick={onGoToItem} className="px-5 py-2.5 bg-rose-600 text-white font-bold rounded-full hover:bg-rose-700 transition-colors shadow-sm">ไปยังหน้ารายละเอียด</button><button onClick={onRemove} className="px-5 py-2.5 bg-white border border-slate-300 text-rose-600 font-bold rounded-full hover:bg-rose-50 hover:border-rose-300 transition-colors">ลบจากรายการโปรด</button></div></div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ConfirmationModal = ({ title, onConfirm, onCancel }) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
    
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-rose-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-7 h-7 text-rose-600" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-800">ยืนยันการลบ</h3>
           <p className="mt-2 text-sm text-slate-600">
                ต้องการลบ &quot;<span className="font-semibold">{title}</span>&quot; ออกจากรายการโปรดใช่หรือไม่?
           </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={onCancel} className="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-100 transition-colors font-semibold">ยกเลิก</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors font-bold">ลบ</button>
        </div>
      </motion.div>
    </motion.div>
  );
};