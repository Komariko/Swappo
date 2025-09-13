"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/firebase/config";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Loader2, Save, User as UserIcon } from "lucide-react";

const MAX_MB = 8;
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
  const [userId, setUserId] = useState("");
  const [username, setUsername] = useState("");
  const [profilePic, setProfilePic] = useState/** @type {File|null} */(null);
  const [previewUrl, setPreviewUrl] = useState("/images/profile-placeholder.jpg");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "idle", msg: "" });


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.uid);
      setUsername(user.displayName || "");

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.profilePic) setPreviewUrl(data.profilePic);
          if (!user.displayName && data?.username) setUsername(data.username);
        }
      } catch (e) {
        console.error("Read profile error:", e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  // ป้องกัน memory leak จาก object URL
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canSave = useMemo(() => {
    return !!userId && !!username.trim() && !saving;
  }, [userId, username, saving]);

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
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setStatus({ type: "idle", msg: "" });

    try {
      let downloadURL = previewUrl;

      if (profilePic) {
        // ✔️ เก็บตาม rules: profile-pics/{uid}/...
        const safeName = profilePic.name.replace(/[^\w.\-]+/g, "_");
        const path = `profile-pics/${userId}/${Date.now()}_${safeName}`;
        const ref = sRef(storage, path);
        const metadata = { contentType: profilePic.type || "image/jpeg" };
        const snap = await uploadBytes(ref, profilePic, metadata);
        downloadURL = await getDownloadURL(snap.ref);
      }

      // อัปเดต Firestore
      await updateDoc(doc(db, "users", userId), {
        username: username.trim(),
        profilePic: downloadURL,
      });

      // อัปเดต Auth profile
      await updateProfile(auth.currentUser, {
        displayName: username.trim(),
        photoURL: downloadURL,
      });

      setStatus({ type: "success", msg: "บันทึกโปรไฟล์เรียบร้อยแล้ว 🎉" });
      // เด้งกลับหรือรีเฟรช (แล้วแต่ชอบ)
      setTimeout(() => router.replace("/"), 900);
    } catch (error) {
      console.error("Error updating profile:", error);
      setStatus({ type: "error", msg: `เกิดข้อผิดพลาดในการบันทึกโปรไฟล์: ${error?.message || "ไม่ทราบสาเหตุ"}` });
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 text-center">
          แก้ไขโปรไฟล์ของคุณ
        </h1>
        <p className="text-center text-slate-500 mt-2">อัปเดตรูปและชื่อผู้ใช้ของคุณ</p>

        {/* สถานะ */}
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* User ID (readonly) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">User ID</label>
            <input
              type="text"
              value={userId}
              disabled
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-slate-600"
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">ชื่อผู้ใช้</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <UserIcon className="h-5 w-5" />
              </span>
              <input
                type="text"
                value={username}
                maxLength={40}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="เช่น pond_kasu"
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="mt-1 text-xs text-slate-400">{username.length}/40</div>
          </div>

          {/* Avatar uploader */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">รูปโปรไฟล์</label>

            <div className="flex items-center gap-5">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-white shadow border border-slate-200"
                />
              </div>

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

          {/* Actions */}
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
              onClick={() => router.back()}
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
