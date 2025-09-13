"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  // form states
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI states
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // password strength
  const passScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0..4
  }, [password]);

  const passLabel = ["Weak", "Okay", "Good", "Strong", "Strong"][passScore] || "Weak";
  const passBarWidth = ["w-1/5","w-2/5","w-3/5","w-4/5","w-full"][passScore] || "w-1/5";
  const passBarColor = [
    "bg-rose-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-emerald-500",
  ][passScore] || "bg-rose-500";

  async function handleRegister(e) {
    e.preventDefault();
    if (loading) return;

    setStatus("");
    setSuccess("");

    if (!username || !email || !password || !confirmPassword) {
      setStatus("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      // 1) create user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) update display name
      await updateProfile(user, { displayName: username });

      // 3) save to Firestore
      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username,
        email,
        role: "user",
        created_at: serverTimestamp(),
      });

      setSuccess(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ, ${username}`);
      setStatus("");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setStatus(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Right Panel (ภาพ/แบรนด์) */}
        <div className="order-1 lg:order-2 bg-white/70 backdrop-blur rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100">
              <ShieldCheck className="h-6 w-6 text-rose-600" />
            </span>
            <h2 className="text-2xl font-bold text-slate-800">
              สมัครสมาชิก <span className="text-rose-600">Swappo</span>
            </h2>
          </div>

          <p className="mt-3 text-slate-500 text-center">
            แลกเปลี่ยนสิ่งของง่าย ๆ ในชุมชนของคุณ — ปลอดภัย รวดเร็ว และฟรี
          </p>

          {/* โลโก้ใหม่ (รองรับ dark mode) */}
          <div className="mt-6">
            <img
              src="/images/swappo-logo.svg"
              alt="Swappo Logo"
              className="w-64 max-w-full drop-shadow block dark:hidden"
            />
            <img
              src="/images/swappo-logo-dark.svg"
              alt="Swappo Logo Dark"
              className="w-64 max-w-full drop-shadow hidden dark:block"
            />
          </div>

          <ul className="mt-8 w-full text-slate-600 space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ใช้อีเมลจริงเพื่อรีเซ็ตรหัสผ่านได้</li>
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ตั้งชื่อผู้ใช้เพื่อแสดงในโพสต์</li>
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ไม่มีค่าใช้จ่าย</li>
          </ul>
        </div>

        {/* Left Panel (Form) */}
        <div className="order-2 lg:order-1">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              สร้างบัญชีใหม่
            </h1>
            <p className="mt-2 text-slate-500">กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งาน</p>

            {/* Status messages */}
            {status && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                {status}
              </div>
            )}
            {success && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <User className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="เช่น pond_kasu"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัว มีตัวเลข & ตัวพิมพ์ใหญ่"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 pr-11 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* strength bar */}
                <div className="mt-2">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${passBarWidth} ${passBarColor} transition-all`}></div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">ความปลอดภัยรหัสผ่าน: {passLabel}</div>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showPass2 ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="พิมพ์รหัสผ่านซ้ำอีกครั้ง"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 pr-11 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showPass2 ? "ซ่อนรหัสผ่านยืนยัน" : "แสดงรหัสผ่านยืนยัน"}
                    onClick={() => setShowPass2((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass2 ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-2 text-xs text-rose-600">รหัสผ่านไม่ตรงกัน</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white py-3 font-semibold shadow-lg hover:shadow-xl hover:bg-rose-700 transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังสร้างบัญชี...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>

              {/* Link to login */}
              <p className="text-center text-sm text-slate-600">
                มีบัญชีอยู่แล้ว?{" "}
                <a href="/login" className="text-rose-600 font-semibold hover:underline">
                  Log in
                </a>
              </p>
            </form>
          </div>

          {/* footer small */}
          <p className="mt-4 text-center text-xs text-slate-400">
            SWAPPO — แลกเปลี่ยนของกันแบบแฟร์ ๆ
          </p>
        </div>
      </div>
    </div>
  );
}
