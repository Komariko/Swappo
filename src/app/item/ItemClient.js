"use client";
/**
 * ItemClient (Client Component)
 * ---------------------------------------------------------
 * หน้า "รายละเอียดโพสต์" (Item Detail)
 * - อ่าน id ของโพสต์จาก query string (?id=...)
 * - ดึงข้อมูลโพสต์จาก Firestore + ดึงโปรไฟล์เจ้าของโพสต์
 * - แสดงรูปหลัก + รูปย่อ, รายละเอียด, สิ่งที่อยากแลก, สถานะโพสต์
 * - แยกมุมมอง: ผู้ชมทั่วไปเห็นปุ่ม "แสดงความสนใจ", เจ้าของเห็นแผง "เปลี่ยนสถานะ"
 * - ปรับ UX: โครงหน้าโหลด (skeleton) / แจ้ง "ไม่พบโพสต์" / ปุ่มแชร์ลิงก์
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StatusChip from "@/components/StatusChip";                 // ป้ายสถานะโพสต์ (available/…)
import InterestButton from "@/components/InterestButton";         // ปุ่มส่งความสนใจถึงเจ้าของ (สร้างแชท/แจ้งเตือน)
import OwnerStatusPanel from "@/components/OwnerStatusPanel";     // แผงปรับสถานะ (เฉพาะเจ้าของโพสต์)

import { db, auth } from "@/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getUserProfile } from "@/firebase/functions";            // ดึงโปรไฟล์เจ้าของโพสต์
import { Share2, ArrowLeft } from "lucide-react";

/* --------------------------------------------------------------
 * ฟังก์ชันช่วย: แปลงเวลาเป็นข้อความอ่านง่าย (ไทย)
 * - รองรับ Firestore Timestamp และ number/string (ms)
 * - คืนข้อความเช่น "5 นาทีที่แล้ว"
 * -------------------------------------------------------------- */
function timeAgo(ts) {
  const d = ts?.toDate ? ts.toDate() : (typeof ts === "number" || typeof ts === "string" ? new Date(ts) : null);
  if (!d) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "ไม่กี่วินาทีที่แล้ว";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

export default function ItemClient() {
  /* ------------------------------------------------------------
   * อ่านค่า id จาก query string (เช่น /item?id=abc123)
   * - ถ้าไม่มี id จะถือว่าไม่พบโพสต์
   * ------------------------------------------------------------ */
  const sp = useSearchParams();
  const id = sp.get("id");

  /* ------------------------------- State ------------------------------- */
  const [item, setItem] = useState(null);           // ข้อมูลโพสต์ที่ดึงมา
  const [imgIndex, setImgIndex] = useState(0);      // ดัชนีรูปหลักที่กำลังแสดง
  const [loading, setLoading] = useState(true);     // สถานะกำลังโหลดข้อมูลโพสต์

  const [currentUid, setCurrentUid] = useState(null); // uid ผู้ใช้ปัจจุบัน (ถ้าไม่ล็อกอิน = null)
  const [authReady, setAuthReady] = useState(false);  // รอฟัง auth ให้พร้อมก่อนคำนวณ isOwner

  /* ------------------------------------------------------------
   * ฟังสถานะการล็อกอินด้วย Firebase Auth (เรียลไทม์)
   * - ได้ uid ของผู้ใช้ (หรือ null ถ้าไม่ได้ล็อกอิน)
   * ------------------------------------------------------------ */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u?.uid || null);
      setAuthReady(true);
    });
    return () => unsub && unsub();
  }, []);

  /* ------------------------------------------------------------
   * โหลดข้อมูลโพสต์จาก Firestore ตาม id
   * - ดึง doc(items/{id}) → เติมสถานะเริ่มต้นถ้าไม่มี
   * - ดึงโปรไฟล์เจ้าของโพสต์ → เติมชื่อ/รูปโปรไฟล์แบบปลอดภัย
   * - ใช้แฟล็ก cancelled กัน setState หลัง unmount
   * ------------------------------------------------------------ */
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!id) { setItem(null); setLoading(false); return; }
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "items", id));
        if (!snap.exists()) { if (!cancelled) setItem(null); return; }

        const data = { id: snap.id, ...snap.data() };
        if (!data.status) data.status = "available"; // ค่าเริ่มต้นหากฟิลด์หาย

        // เติมโปรไฟล์เจ้าของโพสต์ (กันข้อมูลขาดหาย)
        try {
          const profile = await getUserProfile(data.user_id);
          data.profileUsername = profile?.username || "ผู้โพสต์";
          data.profilePic = profile?.profilePic || "/images/profile-placeholder.jpg";
        } catch {
          data.profileUsername = "ผู้โพสต์";
          data.profilePic = "/images/profile-placeholder.jpg";
        }

        if (!cancelled) {
          setItem(data);
          setImgIndex(0); // รีเซ็ตรูปหลักเมื่อเปลี่ยนโพสต์
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [id]);

  /* ------------------------------------------------------------
   * คำนวณว่า "ฉันเป็นเจ้าของโพสต์นี้ไหม"
   * - ใช้ useMemo เพื่อไม่ให้คำนวณซ้ำโดยไม่จำเป็น
   * ------------------------------------------------------------ */
  const isOwner = useMemo(() => !!currentUid && item?.user_id === currentUid, [currentUid, item?.user_id]);

  /* ------------------------------------------------------------
   * ภาพสำหรับแกลเลอรี: รูปหลัก + รูปย่อ
   * - ถ้าไม่มีรูป ใช้รูป placeholder
   * ------------------------------------------------------------ */
  const images = Array.isArray(item?.item_images) ? item.item_images : [];
  const activeImg = images[imgIndex] || "/img/default-placeholder.jpg";

  /* ============================ สถานะโหลด ============================ */
  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Skeleton ฝั่งซ้าย: รูปใหญ่ */}
          <div className="bg-white h-[520px] rounded-2xl border border-slate-200 shadow animate-pulse" />
          {/* Skeleton ฝั่งขวา: การ์ดข้อมูลย่อย */}
          <div className="space-y-4">
            <div className="bg-white h-40 rounded-2xl border border-slate-200 shadow animate-pulse" />
            <div className="bg-white h-48 rounded-2xl border border-slate-200 shadow animate-pulse" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  /* ============================ ไม่พบโพสต์ ============================ */
  if (!id || !item) {
    return (
      <>
        <Header />
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow">
            ไม่พบโพสต์นี้
            <div className="mt-4">
              <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200">
                <ArrowLeft className="w-4 h-4" /> กลับหน้าแรก
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  /* ============================== หน้าแสดงผลหลัก ============================== */
  return (
    <>
      <Header />

      {/* โครง 2 คอลัมน์: ซ้าย (รายละเอียดและรูป) / ขวา (ปุ่มการกระทำ) */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 lg:py-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">

        {/* --------- ซ้าย: รายละเอียดโพสต์ + แกลเลอรีภาพ --------- */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow">
          {/* หัวข้อโพสต์ + สถานะ + ปุ่มแชร์ */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b">
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900">{item.item_give || "สิ่งของ"}</h1>
              <div className="mt-1 text-xs text-slate-500">
                หมวดหมู่: <span className="font-medium">{item.category || "-"}</span> • สภาพ:{" "}
                <span className="font-medium">{item.condition || "-"}</span> • โพสต์เมื่อ {timeAgo(item.createdAt)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status={item.status || "available"} />
              {/* แชร์: ใช้ Web Share API ถ้ามี, ไม่งั้นคัดลอกลิงก์ */}
              <button
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.share) {
                    navigator.share({
                      title: item.item_give || "Swappo",
                      text: item.description || "",
                      url: typeof window !== "undefined" ? window.location.href : "",
                    }).catch(() => {});
                  } else if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(window.location.href);
                    alert("คัดลอกลิงก์แล้ว");
                  }
                }}
              >
                <Share2 className="w-4 h-4" /> แชร์
              </button>
            </div>
          </div>

          {/* รูปหลัก */}
          <div className="p-4 md:p-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-[4/3]">
              <img
                src={activeImg}
                alt="ภาพสินค้า"
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
              />
            </div>

            {/* แถวรูปย่อ (thumbnail) เพื่อสลับรูปหลัก */}
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {images.length ? images.map((src, idx) => (
                <button
                  key={idx}
                  onClick={() => setImgIndex(idx)}
                  className={`min-w_[88px] min-w-[88px] h-[66px] rounded-xl border overflow-hidden bg-white ${imgIndex === idx ? "ring-2 ring-rose-400" : "hover:opacity-90"}`}
                  title={`รูปที่ ${idx + 1}`}
                >
                  <img
                    src={src}
                    alt={`thumb-${idx}`}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                  />
                </button>
              )) : <div className="text-slate-400 text-sm">ไม่มีรูปเพิ่มเติม</div>}
            </div>

            {/* รายละเอียดข้อความ */}
            <div className="mt-6 grid gap-2">
              <h3 className="font-semibold text-slate-800">รายละเอียด</h3>
              <p className="text-slate-700 leading-7 whitespace-pre-wrap">{item.description || "-"}</p>
            </div>

            {/* สิ่งที่ต้องการแลก (ถ้ามี) */}
            {item.item_receive && (
              <div className="mt-4 text-sm text-slate-700">
                ต้องการแลกกับ: <b>{item.item_receive}</b>
              </div>
            )}

            {/* กล่องข้อมูลเจ้าของโพสต์ + ปุ่มกลับหน้าแรก */}
            <div className="mt-6 p-4 rounded-xl border bg-slate-50 flex items-center gap-3">
              <img
                src={item.profilePic || "/images/profile-placeholder.jpg"}
                alt="owner"
                className="w-10 h-10 rounded-full object-cover border"
                onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
              />
              <div className="text-sm">
                <div className="font-medium text-slate-800">{item.profileUsername || "ผู้โพสต์"}</div>
                <div className="text-xs text-slate-500">เจ้าของโพสต์นี้</div>
              </div>
              <div className="ml-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4" /> กลับหน้าแรก
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --------- ขวา: การกระทำตามบทบาท (ผู้ชม/เจ้าของ) --------- */}
        <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
          {/* มุมมองผู้ชม (ไม่ใช่เจ้าของ): ปุ่มส่งความสนใจ/เริ่มคุย */}
          {authReady && !isOwner && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow">
              <div className="px-4 py-3 border-b">
                <div className="font-semibold">ส่งข้อความถึงเจ้าของ</div>
                <div className="text-xs text-slate-500">ไม่บังคับ กดส่งเพื่อแจ้งความสนใจ</div>
              </div>
              <div className="p-4">
                <InterestButton item={item} />
              </div>
            </div>
          )}

          {/* มุมมองเจ้าของ: แผงปรับสถานะโพสต์ */}
          {authReady && isOwner && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow">
              <div className="px-4 py-3 border-b font-semibold">สถานะโพสต์ (เฉพาะเจ้าของ)</div>
              <div className="p-4">
                <OwnerStatusPanel
                  item={item}
                  onChanged={(s)=> setItem(prev => ({...prev, status: s}))} // อัปเดตสถานะในหน้าให้ทันที
                />
              </div>
            </div>
          )}
        </aside>
      </main>

      <Footer />
    </>
  );
}
