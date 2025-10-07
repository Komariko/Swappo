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
import { Trash2, ArrowLeft, ChevronLeft, ChevronRight, Heart, X, PackageOpen, LogIn, Eye } from "lucide-react";

// --- Helper Functions ---
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

  // Auth state listener
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
    return () => unsubAuth();
  }, []);

  // Watchlist data listener
  useEffect(() => {
    if (!userId) {
      setLoading(false);
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
              {items.map((item) => (
                <WatchlistItem
                  key={item.watchDocId}
                  item={item}
                  onRemoveClick={() => setConfirmRemove({ watchDocId: item.watchDocId, title: item.item_give })}
                  onViewClick={() => setSelectedItem(item)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {confirmRemove && <ConfirmationModal {...confirmRemove} onConfirm={handleRemove} onCancel={() => setConfirmRemove(null)} />}
        {selectedItem && <DetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} onRemove={() => setConfirmRemove({ watchDocId: selectedItem.watchDocId, title: selectedItem.item_give })} onGoToItem={() => router.push(`/item?id=${selectedItem.id}`)} />}
      </AnimatePresence>
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