"use client";

/**
 * ProfilePage (Client Component)
 * ---------------------------------------------------------
 * หน้าสำหรับแก้ไขโปรไฟล์ผู้ใช้:
 *  - โหลดข้อมูลผู้ใช้ที่ล็อกอิน (Firebase Auth) + อ่านโปรไฟล์จาก Firestore
 *  - เปลี่ยนชื่อผู้ใช้ (username) และรูปโปรไฟล์ (อัปโหลดขึ้น Storage)
 *  - อัปเดตทั้ง Firestore (คอลเลกชัน "users") และ Auth Profile (displayName/photoURL)
 *
 * คำไทยที่ใช้ให้สม่ำเสมอ: โปรไฟล์, อัปโหลด, บันทึก, รูปโปรไฟล์, ชื่อผู้ใช้, กำลังโหลดข้อมูล, ย้อนกลับ
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/firebase/config";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Loader2, Save, User as UserIcon } from "lucide-react";

/* ---------- ค่าจำกัดการอัปโหลดรูป ---------- */
const MAX_MB = 8; // จำกัดขนาดไฟล์รูปโปรไฟล์ไม่เกิน 8MB
const ALLOW_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export default function ProfilePage() {
  const router = useRouter();

  /* ---------- สถานะหลักของหน้า ---------- */
  const [userId, setUserId] = useState("");                 // เก็บ uid ของผู้ใช้ที่ล็อกอิน
  const [username, setUsername] = useState("");             // ชื่อผู้ใช้ (แก้ไขได้)
  const [profilePic, setProfilePic] = useState/** @type {File|null} */(null); // ไฟล์รูปที่เลือกใหม่ (ถ้ามี)
  const [previewUrl, setPreviewUrl] = useState("/images/profile-placeholder.jpg"); // พรีวิวรูปปัจจุบัน/ใหม่
  const [loading, setLoading] = useState(true);             // กำลังโหลดข้อมูลเริ่มต้นของหน้า
  const [saving, setSaving] = useState(false);              // กำลังบันทึก (กันกดซ้ำ + แสดงสปินเนอร์)
  const [status, setStatus] = useState({ type: "idle", msg: "" }); // แถบแจ้งสถานะ (success/error)

  /**
   * ฟังสถานะการล็อกอิน (Auth)
   * - ถ้ายังไม่ล็อกอิน → ส่งไปหน้า /login
   * - ถ้าล็อกอินแล้ว → โหลดโปรไฟล์จาก Firestore (collection "users")
   *   แล้วตั้งค่าพรีวิวรูป/ชื่อผู้ใช้เบื้องต้น
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login"); // ยังไม่ได้ล็อกอิน → เปลี่ยนหน้าไป login
        return;
      }

      setUserId(user.uid);
      setUsername(user.displayName || ""); // เริ่มจาก displayName ของ Auth ก่อน

      try {
        const snap = await getDoc(doc(db, "users", user.uid)); // อ่านข้อมูลโปรไฟล์ใน Firestore
        if (snap.exists()) {
          const data = snap.data();
          // ถ้ามีรูปใน Firestore → ใช้เป็นพรีวิว
          if (data?.profilePic) setPreviewUrl(data.profilePic);
          // ถ้า Auth ยังไม่มี displayName แต่ Firestore มี username → ดึงมาใส่ช่องแก้ไข
          if (!user.displayName && data?.username) setUsername(data.username);
        }
      } catch (e) {
        console.error("Read profile error:", e);
      } finally {
        setLoading(false); // โหลดเสร็จแล้ว ค่อยเรนเดอร์ฟอร์ม
      }
    });
    return () => unsub();
  }, [router]);

  /**
   * เคลียร์ object URL ของรูปพรีวิวเมื่อคอมโพเนนต์ unmount หรือรูปพรีวิวเปลี่ยน
   * - ป้องกัน memory leak (เฉพาะกรณีที่เป็น blob URL)
   */
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /**
   * ปุ่ม "บันทึก" ใช้ได้ต่อเมื่อ:
   * - มี userId แล้ว
   * - ชื่อผู้ใช้ไม่เป็นค่าว่าง
   * - ไม่อยู่ระหว่างบันทึก
   */
  const canSave = useMemo(() => {
    return !!userId && !!username.trim() && !saving;
  }, [userId, username, saving]);

  /**
   * เมื่อผู้ใช้เลือกไฟล์รูปใหม่:
   * - ตรวจขนาด/ชนิดไฟล์ตามที่กำหนด
   * - เก็บไฟล์ไว้ใน state และสร้าง object URL สำหรับพรีวิวทันที
   */
  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setStatus({ type: "error", msg: `ไฟล์ใหญ่เกิน ${MAX_MB}MB` });
      return;
    }
    if (file.type && !ALLOW_TYPES.includes(file.type)) {
      setStatus({ type: "error", msg: "ชนิดไฟล์ไม่รองรับ (รองรับ: jpg, png, webp, gif, heic)" });
      return;
    }

    setStatus({ type: "idle", msg: "" });
    setProfilePic(file);
    setPreviewUrl(URL.createObjectURL(file)); // แสดงพรีวิวทันที
  }

  /**
   * บันทึกโปรไฟล์:
   * 1) ถ้ามีเลือกรูปใหม่ → อัปโหลดขึ้น Storage → ได้ downloadURL
   * 2) อัปเดต Firestore (users/{uid}) ด้วย username + profilePic
   * 3) อัปเดต Auth Profile (displayName + photoURL) เพื่อให้ระบบล็อกอินเห็นค่าทันที
   * 4) แสดงสถานะสำเร็จ และเด้งกลับหน้าแรก
   */
  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setStatus({ type: "idle", msg: "" });

    try {
      let downloadURL = previewUrl; // ถ้าไม่ได้เลือกรูปใหม่ จะใช้ URL เดิม

      if (profilePic) {
        // ตั้ง path ให้เป็นระเบียบ: profile-pics/{uid}/{timestamp}_{safeName}
        const safeName = profilePic.name.replace(/[^\w.\-]+/g, "_");
        const path = `profile-pics/${userId}/${Date.now()}_${safeName}`;
        const ref = sRef(storage, path);
        const metadata = { contentType: profilePic.type || "image/jpeg" };

        // อัปโหลดไฟล์ขึ้น Storage
        const snap = await uploadBytes(ref, profilePic, metadata);
        // ดึง URL สำหรับแสดงผล/บันทึกในฐานข้อมูล
        downloadURL = await getDownloadURL(snap.ref);
      }

      // อัปเดต Firestore (ข้อมูลกลางของระบบ)
      await updateDoc(doc(db, "users", userId), {
        username: username.trim(),
        profilePic: downloadURL,
      });

      // อัปเดตโปรไฟล์ใน Firebase Auth (ให้ส่วนอื่น ๆ ที่อ่านจาก Auth เห็นผลทันที)
      await updateProfile(auth.currentUser, {
        displayName: username.trim(),
        photoURL: downloadURL,
      });

      setStatus({ type: "success", msg: "บันทึกโปรไฟล์เรียบร้อยแล้ว 🎉" });

      // เด้งกลับหน้าแรกเล็กน้อยหลังแสดงผลลัพธ์ (ปรับเวลาได้ตาม UX ที่ต้องการ)
      setTimeout(() => router.replace("/"), 900);
    } catch (error) {
      console.error("Error updating profile:", error);
      setStatus({ type: "error", msg: `เกิดข้อผิดพลาดในการบันทึกโปรไฟล์: ${error?.message || "ไม่ทราบสาเหตุ"}` });
    } finally {
      setSaving(false);
    }
  }

  /* ---------- หน้ากำลังโหลดข้อมูลเริ่มต้น ---------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-sky-50">
        <div className="inline-flex items-center gap-2 text-slate-600 bg-white/70 backdrop-blur px-4 py-2 rounded-2xl border border-slate-100 shadow">
          <Loader2 className="h-5 w-5 animate-spin" />
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  /* ---------- UI หลักของหน้าโปรไฟล์ ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 text-center">
          แก้ไขโปรไฟล์ของคุณ
        </h1>
        <p className="text-center text-slate-500 mt-2">อัปเดตรูปและชื่อผู้ใช้ของคุณ</p>

        {/* แถบสถานะสำเร็จ/ผิดพลาด (มี role/aria สำหรับการเข้าถึง) */}
        {status.type !== "idle" && (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-sm border ${
              status.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
            role="status"
            aria-live="polite"
          >
            {status.msg}
          </div>
        )}

        {/* ฟอร์มแก้ไขโปรไฟล์ */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* User ID (แสดงเพื่ออ้างอิง, ปิดแก้ไข) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">User ID</label>
            <input
              type="text"
              value={userId}
              disabled
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600"
            />
          </div>

          {/* ชื่อผู้ใช้ (username) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">ชื่อผู้ใช้</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                maxLength={40}                              // จำกัดความยาวเพื่อความสวยงาม/ป้องกัน UI แตก
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น pond_kasu"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="mt-1 text-xs text-slate-400">{username.length}/40</div>
          </div>

          {/* อัปโหลดรูปโปรไฟล์ */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">รูปโปรไฟล์</label>

            <div className="flex items-center gap-5">
              {/* พรีวิวรูปปัจจุบัน/ใหม่ */}
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-white shadow border border-slate-200"
                />
              </div>

              {/* ปุ่มเลือกไฟล์ + คำอธิบายข้อกำหนดไฟล์ */}
              <div className="flex-1">
                <div className="text-sm text-slate-500">
                  รองรับ: JPG, PNG, WEBP, GIF, HEIC (≤ {MAX_MB}MB)
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 text-white px-4 py-2 font-medium shadow hover:bg-rose-700 cursor-pointer">
                    <Camera className="h-4 w-4" />
                    เลือกรูปใหม่
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>

                  {/* ปุ่มลบรูปที่เลือก (รีเซ็ตกลับเป็น placeholder) */}
                  {previewUrl && previewUrl !== "/images/profile-placeholder.jpg" && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfilePic(null);
                        setPreviewUrl("/images/profile-placeholder.jpg");
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      ลบรูปที่เลือก
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white px-5 py-3 font-semibold shadow-lg hover:shadow-xl hover:bg-emerald-700 transition disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  บันทึกการเปลี่ยนแปลง
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()} // ย้อนกลับไปหน้าก่อนหน้า
              className="rounded-2xl border border-slate-200 px-5 py-3 text-slate-700 hover:bg-slate-50"
            >
              ย้อนกลับ
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          SWAPPO — แลกเปลี่ยนของกันแบบแฟร์ ๆ
        </p>
      </div>
    </div>
  );
}
