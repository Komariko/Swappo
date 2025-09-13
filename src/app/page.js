"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ChatSidebar from "@/components/ChatSidebar";
import Footer from "@/components/Footer";

import { authStateHandler, getUserProfile } from "@/firebase/functions";
import { loadItems } from "@/firebase/loadItems";

import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Share2, X, Search } from "lucide-react";

/* ---------- helper ---------- */
function formatTimeAgo(timestamp) {
  try {
    const date =
      (timestamp && typeof timestamp.toDate === "function" && timestamp.toDate()) ||
      (typeof timestamp === "string" || typeof timestamp === "number" ? new Date(timestamp) : null);
    if (!date || Number.isNaN(+date)) return "ไม่ทราบเวลา";

    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "ไม่กี่วินาทีที่แล้ว";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(seconds / 86400)} วันที่แล้ว`;
  } catch {
    return "ไม่ทราบเวลา";
  }
}

/* ---------- component ---------- */
export default function HomePage() {
  const [items, setItems] = useState([]);
  const [user, setUser] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [chatTo, setChatTo] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const unsubAuth = authStateHandler?.(setUser);

    loadItems()
      .then(async (data) => {
        const enriched = await Promise.all(
          (data || []).map(async (item) => {
            try {
              const profile = await getUserProfile(item.user_id);
              return {
                ...item,
                profileUsername: (profile && profile.username) || "ไม่ระบุชื่อ",
                profilePic: (profile && profile.profilePic) || "/images/profile-placeholder.jpg",
              };
            } catch {
              return {
                ...item,
                profileUsername: "ไม่ระบุชื่อ",
                profilePic: "/images/profile-placeholder.jpg",
              };
            }
          })
        );
        setItems(enriched);
      })
      .catch((e) => {
        console.error("loadItems error", e);
        setItems([]);
      })
      .finally(() => setLoading(false));

    return () => {
      try {
        typeof unsubAuth === "function" && unsubAuth();
      } catch { }
    };
  }, []);

  const handleViewDetails = (id) => {
    const item = items.find((it) => it.id === id);
    setSelectedItem(item || null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // filters and search
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
      list = list.filter((it) => {
        const cat = ((it && it.category) || "").toLowerCase();
        return cat.includes(activeFilter);
      });
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((it) => {
        const give = ((it && it.item_give) || "").toLowerCase();
        const recv = ((it && it.item_receive) || "").toLowerCase();
        const desc = ((it && it.description) || "").toLowerCase();
        const uname = ((it && it.profileUsername) || "").toLowerCase();
        return give.includes(q) || recv.includes(q) || desc.includes(q) || uname.includes(q);
      });
    }

    list.sort((a, b) => {
      const ta = (a && a.createdAt && a.createdAt.toDate && a.createdAt.toDate()) || new Date(0);
      const tb = (b && b.createdAt && b.createdAt.toDate && b.createdAt.toDate()) || new Date(0);
      return sortBy === "newest" ? +tb - +ta : +ta - +tb;
    });

    return list;
  }, [items, activeFilter, query, sortBy]);

  return (
    <>
      <Header />

      <main id="main-content" className="bg-gradient-to-b from-rose-50 via-white to-sky-50 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8">
            <div className="flex-1 flex gap-3">
              <div className="flex items-center bg-white rounded-2xl shadow-md px-4 py-2 w-full border border-slate-100">
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
                    className="text-xs text-rose-500 hover:text-rose-600 transition"
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
                  className={`whitespace-nowrap px-3 py-2 rounded-full text-sm font-medium transition ${activeFilter === c.key
                      ? "bg-rose-600 text-white shadow-lg"
                      : "bg-white text-slate-700 border border-slate-200 hover:shadow"
                    }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items list */}
          <section className="space-y-6">
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
                  const imageGive =
                    (item && item.item_images && item.item_images[0]) || "/img/default-placeholder.jpg";
                  const imageReceive = (item && item.item_wanted_image) || "/img/default-placeholder.jpg";

                  return (
                    <motion.article
                      layout
                      key={item.id}
                      whileHover={{ y: -6 }}
                      className="h-full flex flex-col bg-white rounded-2xl border border-slate-100 shadow hover:shadow-xl transition overflow-hidden"
                    >
                      {/* เนื้อหาหลัก ทำให้ยืดกินที่เท่ากันทุกใบ */}
                      <div className="flex-1 p-4">
                        {/* header ผู้โพสต์ */}
                        <div className="flex items-center gap-3">
                          <img
                            src={(item && item.profilePic) || "/images/profile-placeholder.jpg"}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover"
                            onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-800">
                              {(item && item.profileUsername) || "ไม่ระบุชื่อ"}
                            </div>
                            <div className="text-xs text-slate-400">{formatTimeAgo(item && item.createdAt)}</div>
                          </div>
                          <div className="text-[11px] text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                            {(item && item.category) || "ไม่ระบุหมวด"}
                          </div>
                        </div>

                        {/* ภาพ 2 ช่อง สูงเท่ากันเสมอด้วย aspect-ratio */}
                        <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                          <div>
                            <div className="w-full rounded-lg bg-slate-50 border overflow-hidden aspect-[4/3]">
                              <img
                                src={imageGive}
                                alt="ให้"
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                              />
                            </div>
                            <div className="mt-2 text-sm font-medium text-slate-600">
                              {(item && item.item_give) || "ไม่ระบุ"}
                            </div>
                          </div>

                          <div>
                            <div className="w-full rounded-lg bg-slate-50 border overflow-hidden aspect-[4/3]">
                              <img
                                src={imageReceive}
                                alt="รับ"
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                              />
                            </div>
                            <div className="mt-2 text-sm font-medium text-slate-600">
                              {(item && item.item_receive) || "ไม่ระบุ"}
                            </div>
                          </div>
                        </div>

                        {/* คำอธิบาย ให้ตัดบรรทัดและยืดได้ แต่ไม่ดันปุ่ม */}
                        <p className="mt-3 text-sm text-slate-700 line-clamp-3">
                          {(item && item.description) || "ไม่มีคำอธิบาย"}
                        </p>
                      </div>

                      {/* footer ปุ่ม — ตรึงไว้ล่างการ์ดเสมอ */}
                      <div className="px-4 pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="px-4 py-2 bg-rose-500 text-white rounded-full text-sm hover:bg-rose-600 transition shadow"
                              onClick={() => handleViewDetails(item.id)}
                            >
                              ดูรายละเอียด
                            </button>

                            <button
                              className="px-3 py-2 bg-white text-rose-500 border border-rose-200 rounded-full text-sm hover:bg-rose-50 transition"
                              onClick={() => {
                                if (!user) return alert("กรุณาเข้าสู่ระบบก่อนเพิ่มรายการโปรด");
                                import("@/firebase/functions").then(({ addToWatchlist }) => {
                                  addToWatchlist(item.id);
                                });
                              }}
                            >
                              <Heart className="inline-block w-4 h-4 mr-1" /> บันทึก
                            </button>

                            {user && user.uid !== item.user_id && (
                              <button
                                className="px-3 py-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-sm hover:bg-slate-100 transition"
                                onClick={() => {
                                  setChatTo(item.user_id);
                                  setChatOpen(true);
                                }}
                              >
                                <MessageSquare className="inline-block w-4 h-4 mr-1" /> แชท
                              </button>
                            )}
                          </div>

                          <button
                            className="text-slate-400 hover:text-slate-600 transition"
                            title="แชร์"
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.share) {
                                navigator
                                  .share({
                                    title: (item && item.item_give) || "Swappo",
                                    text: (item && item.description) || "",
                                    url: typeof window !== "undefined" ? window.location.href : "",
                                  })
                                  .catch(() => { });
                              } else if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(window.location.href);
                                alert("คัดลอกลิงก์แล้ว");
                              }
                            }}
                          >
                            <Share2 />
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

        {/* Floating compose button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="fixed right-6 bottom-20 z-40"
        >
          <Link
            href="/post"
            className="inline-flex items-center gap-3 px-5 py-3 bg-rose-600 text-white rounded-full shadow-lg hover:scale-105 transform transition"
          >
            + สร้างโพสต์ใหม่
          </Link>
        </motion.div>

        {/* Details modal */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedItem(null)} />

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden"
              >
                <div className="flex items-start justify-between p-4 border-b">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {(selectedItem && selectedItem.item_give) || "ไม่ระบุชื่อสินค้า"}
                    </h2>
                    <div className="text-xs text-slate-500 mt-1">
                      {(selectedItem && selectedItem.profileUsername) || ""} •{" "}
                      {formatTimeAgo(selectedItem && selectedItem.createdAt)}
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-full hover:bg-slate-100"
                    onClick={() => setSelectedItem(null)}
                    aria-label="ปิด"
                  >
                    <X />
                  </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    {/* image gallery horizontal */}
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedItem && selectedItem.item_images && selectedItem.item_images.length ? (
                        selectedItem.item_images.map((img, idx) => (
                          <div
                            key={idx}
                            className="min-w-[220px] h-44 rounded-lg overflow-hidden bg-slate-50 border"
                          >
                            <img
                              src={img}
                              alt={`img-${idx}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="min-w-[220px] h-44 rounded-lg overflow-hidden bg-slate-50 border flex items-center justify-center text-slate-400">
                          ไม่มีรูป
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-slate-700">
                      {(selectedItem && selectedItem.description) || "ไม่มีคำอธิบาย"}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-xs">
                        {(selectedItem && selectedItem.condition) || "ไม่ระบุสภาพ"}
                      </span>
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-xs">
                        {(selectedItem && selectedItem.category) || "ไม่ระบุหมวด"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <img
                          src={(selectedItem && selectedItem.profilePic) || "/images/profile-placeholder.jpg"}
                          alt="avatar"
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
                        />
                        <div>
                          <div className="text-sm font-semibold">
                            {(selectedItem && selectedItem.profileUsername) || ""}
                          </div>
                          <div className="text-xs text-slate-400">ผู้โพสต์</div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          className="flex-1 px-3 py-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
                          onClick={() => {
                            if (!user) return alert("กรุณาเข้าสู่ระบบก่อนแชท");
                            setChatTo(selectedItem && selectedItem.user_id);
                            setChatOpen(true);
                          }}
                        >
                          <MessageSquare className="inline-block w-4 h-4 mr-2" /> แชทกับผู้โพสต์
                        </button>

                        <button
                          className="px-3 py-2 bg-white border rounded-xl text-rose-600 hover:bg-rose-50 transition"
                          onClick={() => {
                            if (!user) return alert("กรุณาเข้าสู่ระบบก่อนบันทึก");
                            import("@/firebase/functions").then(({ addToWatchlist }) =>
                              addToWatchlist(selectedItem && selectedItem.id)
                            );
                          }}
                        >
                          <Heart className="inline-block w-4 h-4 mr-1" /> บันทึก
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border text-sm text-slate-600">
                      <div className="font-medium text-slate-700">รายละเอียดเพิ่มเติม</div>
                      <div className="mt-2">
                        {selectedItem && selectedItem.item_receive
                          ? `ต้องการ: ${selectedItem.item_receive}`
                          : "-"}
                      </div>
                    </div>

                    <div className="text-right">
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 transition"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ChatSidebar toUserId={chatTo || undefined} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      <Footer />
    </>
  );
}
