"use client";

import { useEffect, useState, useMemo } from "react";
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

import { motion } from "framer-motion";
import { Heart, MessageSquare, Share2, Search, Flame, Crown } from "lucide-react";
import StatusChip from "@/components/StatusChip";

/* ✅ นำเข้ารูปสไปรต์แบบ static import ให้ Next สร้าง URL ที่ถูกต้องเสมอ */
import blinkPng from "@/../public/sprites/blink.png";
import walkPng from "@/../public/sprites/walk.png";

/* ---------- util: time ago ---------- */
function formatTimeAgo(ts) {
  try {
    const d =
      ts?.toDate?.() ??
      (typeof ts === "number" || typeof ts === "string" ? new Date(ts) : null);
    if (!d) return "ไม่ทราบเวลา";
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 60) return "ไม่กี่วินาทีที่แล้ว";
    if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
    if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(s / 86400)} วันที่แล้ว`;
  } catch {
    return "ไม่ทราบเวลา";
  }
}

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
    </div>
  );
}

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [chatTo, setChatTo] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); // ใช้ค้นหาในหน้านี้ (เฉพาะล็อกอิน)
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // ⭐ Popular (guest)
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // ✅ watchlist ของผู้ใช้ (id ชุด Set)
  const [favIds, setFavIds] = useState(new Set());

  /* ---------- auth ---------- */
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
    async function run() {
      if (!user) {
        // Guest: โหลดโพสยอดนิยม
        setLoadingPopular(true);
        try {
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
        } finally {
          setLoadingPopular(false);
        }
      } else {
        // Logged-in: โหลดฟีดทั้งหมด
        setLoading(true);
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
      }
    }
    run();
  }, [user]);

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
  const categories = useMemo(
    () => [
      { key: "all", label: "ทั้งหมด" },
      { key: "electronics", label: "อิเล็กทรอนิกส์" },
      { key: "clothes", label: "เสื้อผ้า" },
      { key: "home", label: "บ้าน & เฟอร์นิเจอร์" },
      { key: "books", label: "หนังสือ" },
      { key: "hobby", label: "งานอดิเรก" },
      { key: "other", label: "อื่น ๆ" },
    ],
    []
  );

  const visibleItems = useMemo(() => {
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

    list.sort((a, b) => {
      const ta = a?.createdAt?.toDate?.() || new Date(0);
      const tb = b?.createdAt?.toDate?.() || new Date(0);
      return sortBy === "newest" ? +tb - +ta : +ta - +tb;
    });
    return list;
  }, [items, activeFilter, query, sortBy]);

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

            {loadingPopular ? (
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
            )}

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-rose-600 text-white font-medium shadow hover:bg-rose-700 transition"
              >
                เข้าสู่ระบบเพื่อเริ่มแลกเปลี่ยน
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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

                  return (
                    <motion.article
                      layout
                      key={item.id}
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
      <Footer />
    </>
  );
}
