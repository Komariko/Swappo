"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  getDocs,
  getCountFromServer,
} from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { getUserProfile } from "@/firebase/functions";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import {
  ArrowLeft,
  Heart,
  Phone,
  MapPin,
  UserRound,
  CheckCircle2,
  XCircle,
  Loader2,
  Frown,
  X, // Import ไอคอนสำหรับปุ่มปิด
} from "lucide-react";

// --- Toast Component ---
function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const isError = type === "error";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed bottom-6 right-6 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-white font-medium
        ${isError ? "bg-rose-500 border-rose-600" : "bg-emerald-500 border-emerald-600"}`}
    >
      {isError ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
      <span>{message}</span>
    </motion.div>
  );
}

// --- Image Viewer Modal Component (ส่วนที่เพิ่มใหม่) ---
function ImageViewer({ src, alt, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()} // ป้องกันการปิด modal เมื่อคลิกที่รูป
        className="relative"
      >
        <img src={src} alt={alt} className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain" />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 bg-white text-slate-800 rounded-full p-1.5 shadow-lg hover:bg-slate-200 transition"
          aria-label="Close image viewer"
        >
          <X size={24} />
        </button>
      </motion.div>
    </motion.div>
  );
}


export default function ProfileCatClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const uid = sp.get("uid");

  const [currentUid, setCurrentUid] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [profile, setProfile] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [busyLike, setBusyLike] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // State สำหรับเปิด/ปิด Viewer
  const [isImageViewerOpen, setImageViewerOpen] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
  };

  // --- Functions (ส่วน Logic ไม่มีการเปลี่ยนแปลง) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUid(u?.uid || null));
    return () => unsub?.();
  }, []);

  const isSelf = useMemo(() => !!currentUid && currentUid === uid, [currentUid, uid]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!uid) {
        setNotFound(true);
        setLoadingProfile(false);
        return;
      }
      setLoadingProfile(true);
      setNotFound(false);
      try {
        const p = await getUserProfile(uid);
        if (cancelled) return;

        if (!p) {
          setNotFound(true);
          setProfile(null);
        } else {
          const phone = p.phone ?? p.phoneNumber ?? p.tel ?? p.contact ?? "";
          const place = p.place ?? p.location ?? p.address ?? p.city ?? p.province ?? "";
          setProfile({
            username: p.username || p.displayName || "ผู้ใช้",
            profilePic: p.profilePic || "/images/profile-placeholder.jpg",
            bio: p.bio || "",
            phone,
            place,
            likesCount: Number(p.likesCount ?? 0),
          });
        }
      } catch (e) {
        console.error("Load profile failed:", e);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!uid) return;
      if (profile?.likesCount != null) setLikesCount(Number(profile.likesCount));

      try {
        const likesCol = collection(db, "users", uid, "likes");
        let count = 0;
        try {
          const agg = await getCountFromServer(likesCol);
          count = agg.data().count || 0;
        } catch {
          const snap = await getDocs(likesCol);
          count = snap.size;
        }
        if (!cancelled) setLikesCount(count);
      } catch (e) {
        console.warn("Count likes failed, fallback to profile.likesCount if any:", e);
      }

      try {
        if (!currentUid) return;
        const likeDoc = await getDoc(doc(db, "users", uid, "likes", currentUid));
        if (!cancelled) setLiked(likeDoc.exists());
      } catch (e) {
        console.warn("Check liked failed:", e);
      }
    };
    run();
  }, [uid, currentUid, profile?.likesCount]);

  const toggleLike = async () => {
    if (!uid) return;
    if (!currentUid) {
      showToast("โปรดเข้าสู่ระบบก่อนกดไลก์", "error");
      return;
    }
    if (isSelf) {
      showToast("ไม่สามารถไลก์โปรไฟล์ของตนเองได้", "error");
      return;
    }
    if (busyLike) return;

    setBusyLike(true);
    const userDocRef = doc(db, "users", uid);
    const likeDocRef = doc(db, "users", uid, "likes", currentUid);

    try {
      if (liked) {
        await deleteDoc(likeDocRef);
        await updateDoc(userDocRef, { likesCount: increment(-1) });
        setLiked(false);
        setLikesCount((n) => Math.max(0, n - 1));
        showToast("ยกเลิกไลก์แล้ว");
      } else {
        await setDoc(likeDocRef, {
          likerUid: currentUid,
          targetUid: uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(userDocRef, { likesCount: increment(1) });
        setLiked(true);
        setLikesCount((n) => n + 1);
        showToast("ไลก์โปรไฟล์แล้ว");
      }
    } catch (e) {
      console.error("Toggle like failed:", e);
      showToast("ทำรายการไม่สำเร็จ", "error");
    } finally {
      setBusyLike(false);
    }
  };
  
  // --- UI Components ---

  if (loadingProfile) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md text-center bg-white p-8 rounded-2xl shadow-xl border"
          >
            <Frown className="mx-auto w-16 h-16 text-rose-400 mb-4" />
            <h2 className="text-3xl font-bold text-slate-800">ไม่พบโปรไฟล์</h2>
            <p className="text-slate-500 mt-2 mb-6">โปรไฟล์ที่คุณกำลังมองหาอาจไม่มีอยู่จริง</p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-pink-600 text-white font-semibold hover:bg-pink-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
            >
              <ArrowLeft size={18} />
              กลับหน้าหลัก
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <Header />
      <main className="flex-grow p-4 md:p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Profile Card */}
          <section className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  {/* ▼▼▼▼▼ ทำให้รูปภาพกดได้ตรงนี้ ▼▼▼▼▼ */}
                  <button onClick={() => setImageViewerOpen(true)} className="rounded-full focus:outline-none focus:ring-4 focus:ring-pink-300 focus:ring-offset-2 transition-all">
                    <img
                      src={profile.profilePic}
                      alt={profile.username}
                      className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-md cursor-pointer"
                      onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
                    />
                  </button>
                  {isSelf && (
                     <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 pointer-events-none">
                       คุณ
                     </span>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                    {profile.username}
                  </h1>
                  
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-x-5 gap-y-2 text-slate-600">
                    {profile.phone && (
                      <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-2 hover:text-pink-600 transition-colors group">
                        <Phone size={16} className="text-slate-400 group-hover:text-pink-500" />
                        <span className="font-medium">{profile.phone}</span>
                      </a>
                    )}
                    <div className="inline-flex items-center gap-2">
                      <MapPin size={16} className="text-slate-400" />
                      <span>{profile.place || "ไม่ได้ระบุพื้นที่"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50/70 p-6 md:p-8 border-t border-slate-200/80">
                <div className="flex items-center gap-2 mb-3">
                  <UserRound size={18} className="text-slate-500" />
                  <h2 className="font-semibold text-slate-700">เกี่ยวกับฉัน</h2>
                </div>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {profile.bio || "ยังไม่มีข้อมูลแนะนำตัว"}
                </p>
            </div>
          </section>

          {/* Action Section (Like) */}
          <section className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/80 shadow-lg p-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-600">
              <Heart className="text-rose-500" size={20} />
              <span>ยอดไลก์:</span>
              <strong className="text-xl font-bold text-slate-800">{likesCount.toLocaleString()}</strong>
            </div>

            {!isSelf && (
               <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleLike}
                disabled={busyLike}
                className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 shadow-md transform
                  ${liked
                    ? "bg-rose-500 text-white hover:bg-rose-600 shadow-rose-200"
                    : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"}`}
              >
                {liked ? <CheckCircle2 size={20} /> : <Heart size={20} />}
                <span>{liked ? "ไลก์แล้ว" : "กดไลก์"}</span>
              </motion.button>
            )}
          </section>

          <div className="flex justify-center pt-4">
             <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-slate-600 font-semibold hover:bg-slate-200/80 transition-colors"
            >
              <ArrowLeft size={18} />
              ย้อนกลับ
            </button>
          </div>
        </motion.div>
      </main>

      {/* ▼▼▼▼▼ ส่วน Modal และ Toast จะถูก Render ตรงนี้ ▼▼▼▼▼ */}
      <AnimatePresence>
        {isImageViewerOpen && (
          <ImageViewer
            src={profile.profilePic}
            alt={profile.username}
            onClose={() => setImageViewerOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.show && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast({ ...toast, show: false })}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}