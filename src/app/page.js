// src/app/page.js
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ChatSidebar from "@/components/ChatSidebar";
import Footer from "@/components/Footer";
import {
  authStateHandler,
  getUserProfile,
  loadItems,
  getPopularItems,
  watchlistListener,
  removeFromWatchlist,
} from "@/firebase/functions";
<<<<<<< HEAD
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import {
  Heart,
  MessageSquare,
  Share2,
  Search,
  Flame,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import StatusChip from "@/components/StatusChip";

/* ---------- Helpers ---------- */
=======

import { motion } from "framer-motion";
import { Heart, MessageSquare, Share2, Search, Flame, Crown } from "lucide-react";
import StatusChip from "@/components/StatusChip";

/* ✅ นำเข้ารูปสไปรต์แบบ static import ให้ Next สร้าง URL ที่ถูกต้องเสมอ */
import blinkPng from "@/../public/sprites/blink.png";
import walkPng from "@/../public/sprites/walk.png";

/* ---------- util: time ago ---------- */
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
function formatTimeAgo(ts) {
  try {
    const d =
      ts?.toDate?.() ??
      (typeof ts === "number" || typeof ts === "string" ? new Date(ts) : null);
    if (!d) return "ไม่ทราบเวลา";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "เมื่อสักครู่";
    if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
    if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(s / 86400)} วันที่แล้ว`;
  } catch {
    return "ไม่ทราบเวลา";
  }
}

<<<<<<< HEAD
function Spinner() {
  return (
    <span className="inline-flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
      <span className="sr-only">กำลังโหลด</span>
    </span>
  );
}

function SpriteOverlay({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-busy="true"
          aria-live="polite"
          style={{ position: "fixed", inset: 0, zIndex: 60 }}
          className="grid place-items-center bg-slate-900/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-4 rounded-2xl bg-slate-900/80 px-5 py-4 text-white/90 shadow-2xl border border-white/10"
          >
            <Spinner />
            <span className="font-medium tracking-wide">กำลังโหลดข้อมูล…</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-2 min-w-0">
          <div className="h-3 w-3/5 rounded bg-slate-200" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="aspect-square rounded-md bg-slate-200" />
        <div className="aspect-square rounded-md bg-slate-200" />
      </div>
      <div className="mt-3 h-4 w-4/5 rounded bg-slate-200" />
=======
/* ---------- NEW: Sprite Overlay (หน้าโหลดของเพจนี้) ---------- */
function SpriteOverlay({ show, variant = "blink" }) {
  if (!show) return null;

  /* URL ของรูปจาก static import (ถ้านำเข้าไม่สำเร็จจะ fallback ไปพาธ public) */
  const src =
    variant === "walk"
      ? (walkPng && walkPng.src) || "/sprites/walk.png"
      : (blinkPng && blinkPng.src) || "/sprites/blink.png";

  return (
    <div
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.7)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* ใช้ backgroundImage จาก URL ที่ได้จาก static import */}
        <div
          className={`sprite ${variant === "walk" ? "is-walk" : "is-blink"}`}
          style={{
            width: "256px",               // ปรับขนาดโชว์ได้
            height: "384px",
            backgroundImage: `url(${src})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "300% 100%",  // 3 เฟรมเรียงแนวนอน
            backgroundPosition: "0 0",
            imageRendering: "pixelated",
            willChange: "background-position",
          }}
        />
        <p style={{ color: "white", opacity: 0.9, fontSize: 14, letterSpacing: ".02em", margin: 0 }}>
          Loading…
        </p>
      </div>

      {/* แค่ keyframes + ผูกคลาสสำหรับอนิเมชัน */}
      <style jsx>{`
        @keyframes blinkSteps {
          from { background-position-x: 0%; }
          to   { background-position-x: -200%; }
        }
        @keyframes walkHold {
          0%,25% { background-position-x: 0%; }
          50%    { background-position-x: -100%; }
          75%    { background-position-x: -200%; }
          100%   { background-position-x: 0%; }
        }
        .is-blink { animation: blinkSteps .39s steps(3) infinite; }
        .is-walk  { animation: walkHold .6s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .is-blink, .is-walk { animation: none !important; }
        }
      `}</style>
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
    </div>
  );
}

<<<<<<< HEAD
/* ---------- Popular Carousel ---------- */
function PopularCarousel({ items = [], renderItem }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!items.length) return null;

  return (
    <div className="relative sm:-mx-6 lg:-mx-8">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex pb-4">
          {items.map((it, i) => (
            <div
              key={it.id || i}
              className="relative pl-4 min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] lg:flex-[0_0_25%]"
            >
              {renderItem(it, i)}
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={scrollPrev}
        className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur border border-slate-200 rounded-full w-10 h-10 items-center justify-center shadow-md hover:bg-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        aria-label="ก่อนหน้า"
      >
        <ChevronLeft className="w-5 h-5 text-slate-700" />
      </button>
      <button
        onClick={scrollNext}
        className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 backdrop-blur border border-slate-200 rounded-full w-10 h-10 items-center justify-center shadow-md hover:bg-white transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        aria-label="ถัดไป"
      >
        <ChevronRight className="w-5 h-5 text-slate-700" />
      </button>
    </div>
  );
}

/* =========================================================
   หน้า Home
   ========================================================= */
=======
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
export default function HomePage() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); // ใช้ค้นหาในหน้านี้ (เฉพาะล็อกอิน)
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [favIds, setFavIds] = useState(new Set());

<<<<<<< HEAD
  // Guest states
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // Chat
  const [chatTo, setChatTo] = useState(null);

  /* ---------- Auth & Data ---------- */
=======
  // ⭐ Popular (guest)
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // ✅ watchlist ของผู้ใช้ (id ชุด Set)
  const [favIds, setFavIds] = useState(new Set());

  /* ---------- auth ---------- */
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
  useEffect(() => {
    const unsub = authStateHandler?.(setUser);
    return () => {
      try {
        typeof unsub === "function" && unsub();
      } catch {}
    };
  }, []);

  // subscribe watchlist เมื่อ login
  useEffect(() => {
    if (!user) {
      setFavIds(new Set());
      return;
    }
    const unsub = watchlistListener(setFavIds);
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [user]);

  /* ---------- load data ---------- */
  useEffect(() => {
    if (!user) {
      setFavIds(new Set());
      return;
    }
    const unsub = watchlistListener(setFavIds);
    return () => {
      try {
        unsub && unsub();
      } catch {}
    };
  }, [user]);

  useEffect(() => {
    async function run() {
      if (!user) {
        // Guest: โหลดโพสยอดนิยม
        setLoadingPopular(true);
        try {
<<<<<<< HEAD
          const top = await getPopularItems(12);
          const enriched = await Promise.all(
            (top || []).map(async (it) => {
              const watchCount = it.watchCount ?? it.watchlistCount ?? 0;
              const profile = await getUserProfile(it.user_id).catch(() => null);
              return {
                ...it,
                profileUsername: profile?.username || "ไม่ระบุชื่อ",
                profilePic: profile?.profilePic || "/images/profile-placeholder.jpg",
                watchCount: Math.max(0, watchCount),
              };
            })
          );
          const topItems = enriched
            .filter((x) => x.watchCount > 0)
            .sort((a, b) => b.watchCount - a.watchCount);
          setPopular(topItems);
=======
          // ดึงมาเผื่อกรองค่าศูนย์/ติดลบก่อน แล้วค่อยตัด 10
          const top = await getPopularItems(20);
          const enriched = await Promise.all(
            (top || []).map(async (it) => {
              const raw =
                typeof it.watchCount === "number"
                  ? it.watchCount
                  : typeof it.watchlistCount === "number"
                  ? it.watchlistCount
                  : 0;
              const safeCount = Math.max(0, raw);
              try {
                const profile = await getUserProfile(it.user_id);
                return {
                  ...it,
                  profileUsername: profile?.username || "ไม่ระบุชื่อ",
                  profilePic: profile?.profilePic || "/images/profile-placeholder.jpg",
                  status: it?.status || "available",
                  watchCount: safeCount,
                };
              } catch {
                return {
                  ...it,
                  profileUsername: "ไม่ระบุชื่อ",
                  profilePic: "/images/profile-placeholder.jpg",
                  status: it?.status || "available",
                  watchCount: safeCount,
                };
              }
            })
          );

          // ✅ กรองเฉพาะโพสที่หัวใจ > 0 แล้วเลือก Top 10
          const top10 = enriched
            .filter((x) => x.watchCount > 0)
            .sort((a, b) => b.watchCount - a.watchCount)
            .slice(0, 10);

          setPopular(top10);
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
        } finally {
          setLoadingPopular(false);
        }
      } else {
        // Logged-in: โหลดฟีดทั้งหมด
        setLoading(true);
<<<<<<< HEAD
        try {
          const data = await loadItems();
          const enriched = await Promise.all(
            (data || []).map(async (item) => {
              const profile = await getUserProfile(item.user_id).catch(() => null);
              return {
                ...item,
                profileUsername: profile?.username || "ไม่ระบุชื่อ",
                profilePic: profile?.profilePic || "/images/profile-placeholder.jpg",
              };
            })
          );
          setItems(enriched);
        } catch {
          setItems([]);
        } finally {
          setLoading(false);
        }
=======
        loadItems()
          .then(async (data) => {
            const enriched = await Promise.all(
              (data || []).map(async (item) => {
                try {
                  const profile = await getUserProfile(item.user_id);
                  return {
                    ...item,
                    profileUsername: profile?.username || "ไม่ระบุชื่อ",
                    profilePic: profile?.profilePic || "/images/profile-placeholder.jpg",
                    status: item?.status || "available",
                  };
                } catch {
                  return {
                    ...item,
                    profileUsername: "ไม่ระบุชื่อ",
                    profilePic: "/images/profile-placeholder.jpg",
                    status: item?.status || "available",
                  };
                }
              })
            );
            setItems(enriched);
          })
          .catch(() => setItems([]))
          .finally(() => setLoading(false));
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
      }
    }
    run();
  }, [user]);

<<<<<<< HEAD
  /* ---------- จัดกลุ่มหมวดหมู่ (หมวดใหญ่ตาม optgroup) ---------- */
  // ใช้ prefix (ก่อน :) ให้ตรงกับค่าที่บันทึกใน Firestore
  const CATEGORY_GROUPS = {
    electronics: ["electronics"],                  // อิเล็กทรอนิกส์
    pc: ["pc"],                                    // คอมพิวเตอร์ & อุปกรณ์
    home: ["home"],                                // บ้าน & เฟอร์นิเจอร์
    tools: ["tools"],                              // เครื่องมือช่าง & อุตสาหกรรม
    garden_outdoor: ["garden", "outdoor"],         // สวน & กลางแจ้ง
    sports_bikes: ["sports", "bikes"],             // กีฬา & จักรยาน
    auto: ["auto"],                                // ยานยนต์
    fashion: ["fashion"],                          // แฟชั่น
    baby: ["baby"],                                // แม่ & เด็ก
    pet: ["pet"],                                  // สัตว์เลี้ยง
    books_office: ["books", "office"],             // หนังสือ & การศึกษา
    toys_hobby: ["toys", "hobby", "collectibles:figures"], // ของเล่น & งานอดิเรก (รวมเฉพาะ collectibles:figures)
    music: ["music"],                              // ดนตรี & สตูดิโอ
    art_collectibles: ["art", "collectibles"],     // ศิลป์ & สะสม (ยกเว้น collectibles:figures ดู logic ด้านล่าง)
    beauty_health: ["beauty", "health"],           // ความงาม & สุขภาพ
    travel_lifestyle: ["travel", "lifestyle"],     // ท่องเที่ยว & ไลฟ์สไตล์
    digital: ["digital"],                          // ดิจิทัล
  };

  // ปุ่มหมวดใหญ่ที่ใช้แสดงใน UI
=======
  /* ---------- toggle favorite ---------- */
  async function toggleFavorite(itemId, isFav) {
    if (!user) return alert("กรุณาเข้าสู่ระบบก่อนบันทึก");

    setFavIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(itemId) : next.add(itemId);
      return next;
    });

    if (isFav) {
      await removeFromWatchlist(itemId);
    } else {
      const { addToWatchlist } = await import("@/firebase/functions");
      await addToWatchlist(itemId);
    }
  }

  /* ---------- categories + visible items (logged-in) ---------- */
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
  const categories = useMemo(
    () => [
      { key: "all",               label: "ทั้งหมด" },
      { key: "electronics",       label: "อิเล็กทรอนิกส์" },
      { key: "pc",                label: "คอมพิวเตอร์ & อุปกรณ์" },
      { key: "home",              label: "บ้าน & เฟอร์นิเจอร์" },
      { key: "tools",             label: "เครื่องมือช่าง & อุตสาหกรรม" },
      { key: "garden_outdoor",    label: "สวน & กลางแจ้ง" },
      { key: "sports_bikes",      label: "กีฬา & จักรยาน" },
      { key: "auto",              label: "ยานยนต์" },
      { key: "fashion",           label: "แฟชั่น" },
      { key: "baby",              label: "แม่ & เด็ก" },
      { key: "pet",               label: "สัตว์เลี้ยง" },
      { key: "books_office",      label: "หนังสือ & การศึกษา" },
      { key: "toys_hobby",        label: "ของเล่น & งานอดิเรก" },
      { key: "music",             label: "ดนตรี & สตูดิโอ" },
      { key: "art_collectibles",  label: "ศิลป์ & สะสม" },
      { key: "beauty_health",     label: "ความงาม & สุขภาพ" },
      { key: "travel_lifestyle",  label: "ท่องเที่ยว & ไลฟ์สไตล์" },
      { key: "digital",           label: "ดิจิทัล" },
      { key: "other",             label: "อื่น ๆ" },
    ],
    []
  );

  // helper: เช็คว่า category string c ตรงกับ token ใน GROUP หรือไม่
  const tokenMatch = (c, token) => {
    if (!c) return false;
    if (token.includes(":")) return c === token; // แมตช์แบบระบุหมวดย่อยตรง ๆ
    const pref = c.split(":")[0];
    return pref === token || c === token;
  };

  const ALL_GROUP_TOKENS = useMemo(
    () => Object.values(CATEGORY_GROUPS).flat(),
    []
  );

  /* ---------- คำนวณรายการที่มองเห็น ---------- */
  const visibleItems = useMemo(() => {
<<<<<<< HEAD
    let list = [...items];

    if (activeFilter !== "all") {
      list = list.filter((it) => {
        const c = (it?.category || "").toLowerCase().trim();
        if (!c) return false;

        // "อื่น ๆ" = ไม่อยู่ในหมวดที่เรานิยาม หรือไม่มี prefix
        if (activeFilter === "other") {
          const hasPrefix = c.includes(":");
          const isKnown = ALL_GROUP_TOKENS.some((t) => tokenMatch(c, t));
          return !hasPrefix || !isKnown || c === "other";
        }

        const tokens = CATEGORY_GROUPS[activeFilter];
        if (!tokens) return false;

        // กันชนกรณีพิเศษ: ให้ "ศิลป์ & สะสม" ไม่ดึง collectibles:figures (ไปอยู่ "ของเล่น & งานอดิเรก")
        if (activeFilter === "art_collectibles" && c === "collectibles:figures") {
          return false;
        }

        return tokens.some((t) => tokenMatch(c, t));
      });
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((it) =>
        Object.values(it).some(
          (val) => typeof val === "string" && val.toLowerCase().includes(q)
        )
      );
    }

=======
    let list = (items || []).slice();

    if (activeFilter !== "all") {
      list = list.filter((it) =>
        (it?.category || "").toLowerCase().includes(activeFilter)
      );
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((it) => {
        const give = (it?.item_give || "").toLowerCase();
        const recv = (it?.item_receive || "").toLowerCase();
        const desc = (it?.description || "").toLowerCase();
        const uname = (it?.profileUsername || "").toLowerCase();
        return give.includes(q) || recv.includes(q) || desc.includes(q) || uname.includes(q);
      });
    }

>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
    list.sort((a, b) => {
      const ta = a?.createdAt?.toDate?.() || 0;
      const tb = b?.createdAt?.toDate?.() || 0;
      return sortBy === "newest" ? tb - ta : ta - tb;
    });

    return list;
  }, [items, activeFilter, query, sortBy]);

<<<<<<< HEAD
  const isBusy = !user ? loadingPopular : loading;

  /* ---------- Guest View ---------- */
  if (!user) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 overflow-x-hidden">
        <GlobalNoXOverflow />
        <SpriteOverlay show={isBusy} />
        <Header />
        <main className="flex-grow max-w-full">
          {/* Hero */}
          <section className="py-12 md:py-20 text-center bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight"
              >
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500">
                  แลกเปลี่ยนของ
                </span>{" "}
                ง่ายๆ ในที่เดียว
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-4 max-w-2xl mx-auto text-slate-600 text-base md:text-lg"
              >
                เข้าร่วมชุมชนแห่งการแบ่งปัน ค้นพบของชิ้นใหม่จากสิ่งของที่คุณไม่ได้ใช้แล้ว
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8"
              >
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white font-bold shadow-lg hover:bg-slate-800 transform hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500"
                >
                  <Sparkles className="w-5 h-5" /> เริ่มใช้งานเลย
                </Link>
              </motion.div>
            </div>
          </section>
=======
  /* ---------- NEW: สถานะกำลังโหลดของหน้านี้ ---------- */
  const isBusy = !user ? loadingPopular : loading; // guest ใช้ loadingPopular, logged-in ใช้ loading

  /* ---------- Guest view: only Top 10 with hearts > 0 ---------- */
  if (!user) {
    return (
      <>
        {/* Overlay หน้าโหลดของเพจนี้ (ใช้ Blink สำหรับ Guest) */}
        <SpriteOverlay show={isBusy} variant="blink" />

        <Header />
        <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-sky-50 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <section className="mb-8">
              <div className="flex items-center gap-2 text-rose-600">
                <Flame className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wide">TRENDING NOW</span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                  โพสยอดนิยม Top 10
                </h1>
                <span className="hidden md:inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full text-sm">
                  <Crown className="w-4 h-4" /> จัดอันดับจากจำนวน “บันทึกเป็นรายการโปรด”
                </span>
              </div>
              <p className="mt-2 text-slate-600 text-sm md:text-base">
                เข้าสู่ระบบเพื่อกดบันทึก/แชทกับผู้โพสต์ และดูฟีดทั้งหมด
              </p>
            </section>
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979

          {/* Popular */}
          <section className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-3 mb-6">
              <Flame className="w-6 h-6 text-rose-500" />
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">
                รายการยอดนิยม
              </h2>
            </div>
            {loadingPopular ? (
<<<<<<< HEAD
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <div className="p-8 bg-white border rounded-lg text-center">
                <p className="text-slate-600">ยังไม่มีรายการยอดนิยม</p>
              </div>
            ) : (
              <PopularCarousel
                items={popular}
                renderItem={(item, index) => (
                  <div className="h-full relative">
                    <div className="absolute top-2 left-2 z-10 w-8 h-8 grid place-items-center rounded-full bg-slate-900/70 text-white font-bold text-sm border-2 border-white/50 backdrop-blur-sm">
                      #{index + 1}
                    </div>
                    <ItemCard
                      item={item}
                      isFav={false}
                      onToggleFavorite={() => alert("กรุณาเข้าสู่ระบบ")}
                      onChat={() => alert("กรุณาเข้าสู่ระบบ")}
                    />
                  </div>
                )}
              />
=======
              <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-2xl h-56 bg-white border border-slate-200 shadow animate-pulse" />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center shadow">
                ยังไม่มีโพสยอดนิยมที่มีหัวใจมากกว่า 0
              </div>
            ) : (
              <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {popular.map((it, idx) => {
                  const img = it?.item_images?.[0] || "/img/default-placeholder.jpg";
                  const count = Number(it.watchCount ?? 0); // > 0 เสมอจากการกรอง

                  return (
                    <Link
                      key={it.id}
                      href={`/item?id=${it.id}`}
                      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow hover:shadow-xl transition"
                    >
                      {/* rank ribbon */}
                      <div className="absolute -left-10 -top-10 rotate-[-35deg] z-20">
                        <div
                          className={`px-8 py-3 text-white text-sm font-bold shadow-lg ${
                            idx === 0
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : idx < 3
                              ? "bg-gradient-to-r from-rose-500 to-pink-500"
                              : "bg-slate-700"
                          }`}
                        >
                          #{idx + 1}
                        </div>
                      </div>

                      <div className="aspect-[4/3] bg-slate-50 overflow-hidden">
                        <img
                          src={img}
                          alt={it?.item_give || "item"}
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition duration-300"
                          onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                          loading="lazy"
                        />
                      </div>

                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusChip status={it?.status || "available"} />
                          </div>
                          <div className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            <span className="font-semibold">{count}</span>
                          </div>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-slate-900 line-clamp-1">
                          {it?.item_give || "ไม่ระบุ"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500 line-clamp-1">
                          โดย {it?.profileUsername || "ไม่ระบุชื่อ"} • {formatTimeAgo(it?.createdAt)}
                        </div>

                        {it?.item_receive && (
                          <div className="mt-2 text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 line-clamp-1">
                            ต้องการแลกกับ: <b>{it.item_receive}</b>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
            )}
          </section>
        </main>
        <Footer />
      </div>
    );
  }

<<<<<<< HEAD
  /* ---------- Logged-in View ---------- */
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden">
      <GlobalNoXOverflow />
      <SpriteOverlay show={isBusy} />
      <Header />
      <main className="flex-grow w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar (Desktop) */}
          <aside className="hidden lg:block lg:col-span-3 py-6">
            <div className="sticky top-24 space-y-4">
              <FilterControls
                categories={categories}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                query={query}
                setQuery={setQuery}
                sortBy={sortBy}
                setSortBy={setSortBy}
                isMobile={false}
              />
            </div>
          </aside>

          {/* Feed */}
          <div className="lg:col-span-9 min-w-0">
            {/* Mobile filter bar */}
            <div className="lg:hidden sticky top-[60px] z-30 bg-white border-b border-slate-200 shadow-sm w-full">
              <FilterControls
                categories={categories}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                query={query}
                setQuery={setQuery}
                sortBy={sortBy}
                setSortBy={setSortBy}
                isMobile={true}
              />
            </div>
=======
  /* ---------- Logged-in view (เหมือนเดิม + Sticky Search) ---------- */
  return (
    <>
      {/* Overlay หน้าโหลดของเพจนี้ (ใช้ Walk สำหรับ Logged-in) */}
      <SpriteOverlay show={isBusy} variant="walk" />

      <Header />

      <main className="bg-gradient-to-b from-rose-50 via-white to-sky-50 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 md:pt-6">
          {/* Sticky Search + Chips */}
          <div className="sticky top-16 z-40 -mx-4 px-4 sm:mx-0 sm:px-0 bg-white/85 supports-[backdrop-filter]:bg-white/60 backdrop-blur border-b border-slate-100">
            <div className="py-3 md:py-4">
              {/* desktop */}
              <div className="hidden md:flex items-center gap-3">
                {/* search */}
                <div className="flex-1">
                  <div className="flex items-center bg-white rounded-2xl shadow px-4 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-rose-300 transition">
                    <Search className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
                    <label htmlFor="home-search" className="sr-only">
                      ค้นหา
                    </label>
                    <input
                      id="home-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="ค้นหาชื่อสินค้า คำอธิบาย หรือผู้โพสต์"
                      className="w-full outline-none px-1 py-2 text-sm bg-transparent"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="text-xs rounded-full px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100"
                        aria-label="ล้างคำค้นหา"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>
                </div>

                {/* sort */}
                <div>
                  <label htmlFor="sort-select" className="sr-only">
                    เรียงลำดับ
                  </label>
                  <select
                    id="sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2 rounded-full bg-white shadow border border-slate-200 text-sm font-medium hover:bg-slate-50"
                  >
                    <option value="newest">ใหม่สุด</option>
                    <option value="oldest">เก่าสุด</option>
                  </select>
                </div>

                {/* chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                  {categories.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setActiveFilter(c.key)}
                      className={`shrink-0 whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition ${
                        activeFilter === c.key
                          ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                          : "bg-white text-slate-700 border border-slate-200 hover:shadow"
                      }`}
                      aria-pressed={activeFilter === c.key}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* mobile */}
              <div className="md:hidden flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center bg-white rounded-2xl shadow px-3 py-2 border border-slate-200 focus-within:ring-2 focus-within:ring-rose-300 transition">
                      <Search className="w-4 h-4 text-slate-400 mr-2" aria-hidden="true" />
                      <label htmlFor="home-search-m" className="sr-only">
                        ค้นหา
                      </label>
                      <input
                        id="home-search-m"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ค้นหาชื่อสินค้า คำอธิบาย หรือผู้โพสต์"
                        className="w-full outline-none px-1 py-1.5 text-sm bg-transparent"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={() => setQuery("")}
                          className="text-[11px] rounded-full px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100"
                          aria-label="ล้างคำค้นหา"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label htmlFor="sort-select-m" className="sr-only">
                      เรียงลำดับ
                    </label>
                    <select
                      id="sort-select-m"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 rounded-full bg-white border border-slate-200 text-xs"
                    >
                      <option value="newest">ใหม่สุด</option>
                      <option value="oldest">เก่าสุด</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent" />
                  <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent" />
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
                    {categories.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setActiveFilter(c.key)}
                        className={`shrink-0 snap-start whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition ${
                          activeFilter === c.key
                            ? "bg-rose-600 text-white shadow-md shadow-rose-200"
                            : "bg-white text-slate-700 border border-slate-200 hover:shadow"
                        }`}
                        aria-pressed={activeFilter === c.key}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feed */}
          <section className="space-y-6 mt-6">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 bg-white rounded-2xl shadow animate-pulse h-56" />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center py-20">
                <img src="/img/empty-illustration.svg" alt="empty" className="w-48 mx-auto mb-4 opacity-60" />
                <h3 className="text-lg font-semibold text-slate-700">ยังไม่มีสินค้าในหมวดนี้</h3>
                <p className="text-sm text-slate-500 mt-2">ลองเปลี่ยนตัวกรองหรือค้นหาคำอื่น</p>
              </div>
            ) : (
              <motion.div layout className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch">
                {visibleItems.map((item) => {
                  const imageGive = item?.item_images?.[0] || "/img/default-placeholder.jpg";
                  const imageReceive = item?.item_wanted_image || "/img/default-placeholder.jpg";
                  const isFav = favIds.has(item.id);
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979

            <div className="py-6">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="text-center py-20">
                  <h3 className="text-lg font-semibold text-slate-800">
                    ไม่พบรายการที่ตรงกัน
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    ลองเปลี่ยนตัวกรองหรือค้นหาด้วยคำอื่น
                  </p>
                </div>
              ) : (
                <motion.div
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-stretch"
                >
                  {visibleItems.map((item) => (
                    <ItemCard
                      key={item.id}
<<<<<<< HEAD
                      item={item}
                      user={user}
                      isFav={favIds.has(item.id)}
                      onToggleFavorite={toggleFavorite}
                      onChat={setChatTo}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>
      <ChatSidebar
        toUserId={chatTo || undefined}
        isOpen={!!chatTo}
        onClose={() => setChatTo(null)}
      />
=======
                      whileHover={{ y: -4 }}
                      className="group h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow hover:shadow-xl transition overflow-hidden"
                    >
                      {/* header */}
                      <div className="p-4 flex items-center gap-3">
                        <img
                          src={item?.profilePic || "/images/profile-placeholder.jpg"}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {item?.profileUsername || "ไม่ระบุชื่อ"}
                          </div>
                          <div className="text-xs text-slate-400">{formatTimeAgo(item?.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusChip status={item?.status || "available"} />
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                            {item?.category || "ไม่ระบุหมวด"}
                          </span>
                        </div>
                      </div>

                      {/* images */}
                      <Link href={`/item?id=${item.id}`} className="px-4">
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="w-full rounded-lg bg-slate-50 border overflow-hidden aspect-[4/3]">
                            <img
                              src={imageGive}
                              alt="ให้"
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                              onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                              loading="lazy"
                            />
                          </div>
                          <div className="w-full rounded-lg bg-slate-50 border overflow-hidden aspect-[4/3]">
                            <img
                              src={imageReceive}
                              alt="รับ"
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                              onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                              loading="lazy"
                            />
                          </div>
                        </div>
                      </Link>

                      {/* text */}
                      <div className="px-4 pt-3">
                        <div className="text-sm font-medium text-slate-700 line-clamp-1">
                          {item?.item_give || "ไม่ระบุ"}
                        </div>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {item?.description || "ไม่มีคำอธิบาย"}
                        </p>
                      </div>

                      {/* footer */}
                      <div className="px-4 py-3 mt-auto flex items-center justify-between">
                        <Link
                          href={`/item?id=${item.id}`}
                          className="px-4 py-2 bg-rose-600 text-white rounded-full text-sm hover:bg-rose-700 shadow transition"
                        >
                          ดูรายละเอียด
                        </Link>

                        <div className="flex items-center gap-2">
                          {/* ปุ่มบันทึก (ไม่ให้กดโพสต์ตัวเอง) */}
                          {(!user || user.uid !== item.user_id) && (
                            <button
                              className={`px-2.5 py-2 rounded-full border transition ${
                                isFav ? "bg-rose-50 border-rose-200" : "bg-white"
                              } ${isFav ? "text-rose-600 hover:bg-rose-100" : "text-rose-500 hover:bg-rose-50"}`}
                              onClick={() => toggleFavorite(item.id, isFav)}
                              title={isFav ? "ลบออกจากรายการโปรด" : "บันทึกเป็นรายการโปรด"}
                              aria-pressed={isFav}
                            >
                              <Heart className={`w-4 h-4 ${isFav ? "fill-rose-500 text-rose-500" : "text-rose-500"}`} />
                            </button>
                          )}

                          {/* แชท */}
                          {user && user.uid !== item.user_id && (
                            <button
                              className="px-2.5 py-2 rounded-full bg-white border text-slate-600 hover:bg-slate-50 transition"
                              onClick={() => {
                                setChatTo(item.user_id);
                                setChatOpen(true);
                              }}
                              title="แชท"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          )}

                          {/* แชร์ */}
                          <button
                            className="px-2.5 py-2 rounded-full bg-white border text-slate-600 hover:bg-slate-50 transition"
                            title="แชร์"
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.share) {
                                navigator
                                  .share({
                                    title: item?.item_give || "Swappo",
                                    text: item?.description || "",
                                    url: typeof window !== "undefined" ? window.location.href : "",
                                  })
                                  .catch(() => {});
                              } else if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(window.location.href);
                                alert("คัดลอกลิงก์แล้ว");
                              }
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </section>
        </div>
      </main>

      <ChatSidebar toUserId={chatTo || undefined} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
      <Footer />
    </div>
  );

  /* ---------- functions ---------- */
  async function toggleFavorite(itemId, isFav) {
    if (!user) return alert("กรุณาเข้าสู่ระบบก่อนบันทึก");
    setFavIds((prev) => {
      const next = new Set(prev);
      isFav ? next.delete(itemId) : next.add(itemId);
      return next;
    });
    if (isFav) {
      await removeFromWatchlist(itemId);
    } else {
      const { addToWatchlist } = await import("@/firebase/functions");
      await addToWatchlist(itemId);
    }
  }
}

/* ---------- Global no-X overflow ---------- */
function GlobalNoXOverflow() {
  return (
    <style jsx global>{`
      html,
      body {
        overflow-x: hidden;
      }
    `}</style>
  );
}

/* ---------- Filter Controls ---------- */
function FilterControls({
  categories,
  activeFilter,
  setActiveFilter,
  query,
  setQuery,
  sortBy,
  setSortBy,
  isMobile,
}) {
  if (isMobile) {
    return (
      <div className="space-y-3 py-3 max-w-full">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา"
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 rounded-md border-transparent focus:ring-2 focus:ring-pink-500 focus:bg-white"
          />
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto no-scrollbar px-1"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveFilter(c.key)}
              className={`shrink-0 whitespace-nowrap py-1 text-sm ${
                activeFilter === c.key
                  ? "font-semibold text-pink-600 border-b-2 border-pink-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label htmlFor="search-desktop" className="sr-only">
          ค้นหา
        </label>
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          id="search-desktop"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหา"
          className="w-full pl-9 pr-3 py-2 text-sm bg-white rounded-md border border-slate-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        />
      </div>
      <div>
        <label htmlFor="sort-desktop" className="sr-only">
          เรียงลำดับ
        </label>
        <select
          id="sort-desktop"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
        >
          <option value="newest">ใหม่ล่าสุด</option>
          <option value="oldest">เก่าที่สุด</option>
        </select>
      </div>
      <div className="space-y-2 border-t border-slate-200 pt-4">
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveFilter(c.key)}
            className={`block w-full text-left rounded-md px-3 py-1.5 text-sm transition-colors ${
              activeFilter === c.key
                ? "font-semibold text-pink-600 bg-pink-50"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Item Card ---------- */
function ItemCard({ item, user, isFav, onToggleFavorite, onChat }) {
  const {
    id,
    item_images,
    item_wanted_image,
    item_give,
    profilePic,
    profileUsername,
    createdAt,
    status,
  } = item;

  const imageGive = item_images?.[0] || "/img/default-placeholder.jpg";
  const imageReceive = item_wanted_image || "/img/default-placeholder.jpg";

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="group h-full flex flex-col bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow duration-300 min-w-0"
    >
      {/* Header */}
      <div className="p-3 flex items-center gap-2.5">
        <img
          src={profilePic}
          alt="avatar"
          className="w-8 h-8 rounded-full object-cover"
          onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">
            {profileUsername}
          </div>
          <div className="text-xs text-slate-500">{formatTimeAgo(createdAt)}</div>
        </div>
        <StatusChip status={status || "available"} />
      </div>

      {/* Images */}
      <Link href={`/item?id=${id}`} className="px-3 block">
        <div className="grid grid-cols-2 gap-2">
          <div className="w-full rounded-md bg-slate-100 overflow-hidden aspect-square">
            <img
              src={imageGive}
              alt={`ให้: ${item_give}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
              loading="lazy"
            />
          </div>
          <div className="w-full rounded-md bg-slate-100 overflow-hidden aspect-square">
            <img
              src={imageReceive}
              alt="รับ"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
              loading="lazy"
            />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 flex-grow flex flex-col min-w-0">
        <Link href={`/item?id=${id}`}>
          <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug hover:text-pink-600">
            {item_give || "ไม่ระบุ"}
          </h3>
        </Link>
      </div>

      {/* Footer */}
      <div className="px-3 pb-3 mt-auto flex items-center justify-between gap-2">
        <Link
          href={`/item?id=${id}`}
          className="text-sm font-semibold text-pink-600 hover:underline"
        >
          ดูรายละเอียด
        </Link>
        <div className="flex items-center">
          {user && user.uid !== item.user_id && (
            <button
              onClick={() => onToggleFavorite(id, isFav)}
              title={isFav ? "ลบออกจากรายการโปรด" : "บันทึก"}
              className="p-1.5 text-slate-500 hover:text-pink-500 rounded-full hover:bg-pink-50 transition-colors"
            >
              <Heart
                className={`w-5 h-5 ${isFav ? "fill-pink-500 text-pink-500" : ""}`}
              />
            </button>
          )}
          {user && user.uid !== item.user_id && (
            <button
              onClick={() => onChat(item.user_id)}
              title="แชท"
              className="p-1.5 text-slate-500 hover:text-sky-500 rounded-full hover:bg-sky-50 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          )}
          <button
            title="แชร์"
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            onClick={() => {
              if (typeof window === "undefined") return;
              const url = `${window.location.origin}/item?id=${id}`;
              if (navigator.share) {
                navigator
                  .share({
                    title: item_give || "Swappo",
                    text: item.description || "",
                    url,
                  })
                  .catch(() => {});
              } else if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url);
                alert("คัดลอกลิงก์แล้ว");
              }
            }}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
