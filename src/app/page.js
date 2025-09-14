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
} from "@/firebase/functions";

import { motion } from "framer-motion";
import {
  Heart,
  MessageSquare,
  Share2,
  Search,
  Flame,
  Crown,
  Sparkles,
} from "lucide-react";
import StatusChip from "@/components/StatusChip";

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

export default function HomePage() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [chatTo, setChatTo] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // ⭐ Popular only (guest)
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  // ------ effects ------
  useEffect(() => {
    const unsub = authStateHandler?.(setUser);
    return () => {
      try {
        typeof unsub === "function" && unsub();
      } catch {}
    };
  }, []);

  useEffect(() => {
    async function run() {
      if (!user) {
        setLoadingPopular(true);
        const top = await getPopularItems(10);
        setPopular(top || []);
        setLoadingPopular(false);
      } else {
        setLoading(true);
        loadItems()
          .then(async (data) => {
            const enriched = await Promise.all(
              (data || []).map(async (item) => {
                try {
                  const profile = await getUserProfile(item.user_id);
                  return {
                    ...item,
                    status: item?.status || "available",
                    profileUsername: profile?.username || "ไม่ระบุชื่อ",
                    profilePic:
                      profile?.profilePic || "/images/profile-placeholder.jpg",
                  };
                } catch {
                  return {
                    ...item,
                    status: item?.status || "available",
                    profileUsername: "ไม่ระบุชื่อ",
                    profilePic: "/images/profile-placeholder.jpg",
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

  // ------ FIX: เรียก useMemo เสมอ (ก่อน return เงื่อนไข) ------
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
        return (
          give.includes(q) ||
          recv.includes(q) ||
          desc.includes(q) ||
          uname.includes(q)
        );
      });
    }
    list.sort((a, b) => {
      const ta = a?.createdAt?.toDate?.() || new Date(0);
      const tb = b?.createdAt?.toDate?.() || new Date(0);
      return sortBy === "newest" ? +tb - +ta : +ta - +tb;
    });
    return list;
  }, [items, activeFilter, query, sortBy]);

  // ------ Guest view: show only Popular ------
  if (!user) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-sky-50 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <section className="mb-8">
              <div className="flex items-center gap-2 text-rose-600">
                <Flame className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wide">
                  TRENDING NOW
                </span>
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
                  <div
                    key={i}
                    className="rounded-2xl h-56 bg-white border border-slate-200 shadow animate-pulse"
                  />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center shadow">
                ยังไม่มีข้อมูลยอดนิยมในขณะนี้
              </div>
            ) : (
              <div className="grid gap-5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {popular.map((it, idx) => {
                  const img = it?.item_images?.[0] || "/img/default-placeholder.jpg";
                  const count =
                    typeof it.watchCount === "number" ? it.watchCount : 0;

                  return (
                    <Link
                      key={it.id}
                      href={`/items/${it.id}`}
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
                          onError={(e) =>
                            (e.currentTarget.src = "/img/default-placeholder.jpg")
                          }
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
                          โดย {it?.profileUsername || "ไม่ระบุชื่อ"} •{" "}
                          {formatTimeAgo(it?.createdAt)}
                        </div>

                        {it?.item_receive && (
                          <div className="mt-2 text-[12px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 line-clamp-1">
                            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
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

  // ------ Logged-in view ------
  return (
    <>
      <Header />

      <main className="bg-gradient-to-b from-rose-50 via-white to-sky-50 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
            <div className="flex-1 flex gap-3">
              <div className="flex items-center bg-white rounded-2xl shadow px-4 py-2 w-full border border-slate-200">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ค้นหาชื่อสินค้า คำอธิบาย หรือผู้โพสต์"
                  className="w-full outline-none px-1 py-2 text-sm bg-transparent"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-xs text-rose-500 hover:text-rose-600"
                  >
                    ล้าง
                  </button>
                )}
              </div>

              <div className="hidden md:flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white shadow border border-slate-200 text-sm"
                >
                  <option value="newest">ใหม่สุด</option>
                  <option value="oldest">เก่าสุด</option>
                </select>
              </div>
            </div>

            <div className="mt-2 md:mt-0 flex items-center gap-2 overflow-x-auto">
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveFilter(c.key)}
                  className={`whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition ${
                    activeFilter === c.key
                      ? "bg-rose-600 text-white shadow"
                      : "bg-white text-slate-700 border border-slate-200 hover:shadow"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed */}
          <section className="space-y-6">
            {loading ? (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-4 bg-white rounded-2xl shadow animate-pulse h-56"
                  />
                ))}
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="text-center py-20">
                <img
                  src="/img/empty-illustration.svg"
                  alt="empty"
                  className="w-48 mx-auto mb-4 opacity-60"
                />
                <h3 className="text-lg font-semibold text-slate-700">
                  ยังไม่มีสินค้าในหมวดนี้
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  ลองเปลี่ยนตัวกรองหรือค้นหาคำอื่น
                </p>
              </div>
            ) : (
              <motion.div
                layout
                className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-stretch"
              >
                {visibleItems.map((item) => {
                  const imageGive =
                    item?.item_images?.[0] || "/img/default-placeholder.jpg";
                  const imageReceive =
                    item?.item_wanted_image || "/img/default-placeholder.jpg";

                  return (
                    <motion.article
                      layout
                      key={item.id}
                      whileHover={{ y: -4 }}
                      className="group h-full flex flex-col bg-white rounded-2xl border border-slate-200 shadow hover:shadow-xl transition overflow-hidden"
                    >
                      {/* Header */}
                      <div className="p-4 flex items-center gap-3">
                        <img
                          src={item?.profilePic || "/images/profile-placeholder.jpg"}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) =>
                            (e.currentTarget.src = "/images/profile-placeholder.jpg")
                          }
                        />
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-800">
                            {item?.profileUsername || "ไม่ระบุชื่อ"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatTimeAgo(item?.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusChip status={item?.status || "available"} />
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                            {item?.category || "ไม่ระบุหมวด"}
                          </span>
                        </div>
                      </div>

                      {/* Images */}
                      <Link href={`/items/${item.id}`} className="px-4">
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <div className="w-full rounded-lg bg-slate-50 border overflow-hidden aspect-[4/3]">
                            <img
                              src={imageGive}
                              alt="ให้"
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                              onError={(e) =>
                                (e.currentTarget.src =
                                  "/img/default-placeholder.jpg")
                              }
                              loading="lazy"
                            />
                          </div>
                          <div className="w-full rounded-lg bg-slate-50 border overflow-hidden aspect-[4/3]">
                            <img
                              src={imageReceive}
                              alt="รับ"
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition"
                              onError={(e) =>
                                (e.currentTarget.src =
                                  "/img/default-placeholder.jpg")
                              }
                              loading="lazy"
                            />
                          </div>
                        </div>
                      </Link>

                      {/* Text */}
                      <div className="px-4 pt-3">
                        <div className="text-sm font-medium text-slate-700 line-clamp-1">
                          {item?.item_give || "ไม่ระบุ"}
                        </div>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {item?.description || "ไม่มีคำอธิบาย"}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-3 mt-auto flex items-center justify-between">
                        <Link
                          href={`/items/${item.id}`}
                          className="px-4 py-2 bg-rose-600 text-white rounded-full text-sm hover:bg-rose-700 shadow transition"
                        >
                          ดูรายละเอียด
                        </Link>

                        <div className="flex items-center gap-2">
                          {/* ไม่ให้เจ้าของบันทึกโพสต์ตัวเอง */}
                          {(!user || user.uid !== item.user_id) && (
                            <button
                              className="px-2.5 py-2 rounded-full bg-white border text-rose-500 hover:bg-rose-50 transition"
                              onClick={() => {
                                if (!user) return alert("กรุณาเข้าสู่ระบบก่อนบันทึก");
                                import("@/firebase/functions").then(
                                  ({ addToWatchlist }) => addToWatchlist(item.id)
                                );
                              }}
                              title="บันทึก"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                          )}

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

                          <button
                            className="px-2.5 py-2 rounded-full bg-white border text-slate-600 hover:bg-slate-50 transition"
                            title="แชร์"
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.share) {
                                navigator
                                  .share({
                                    title: item?.item_give || "Swappo",
                                    text: item?.description || "",
                                    url:
                                      typeof window !== "undefined"
                                        ? window.location.href
                                        : "",
                                  })
                                  .catch(() => {});
                              } else if (
                                typeof window !== "undefined" &&
                                navigator.clipboard?.writeText
                              ) {
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

      <ChatSidebar
        toUserId={chatTo || undefined}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />
      <Footer />
    </>
  );
}
