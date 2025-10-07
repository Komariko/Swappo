"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/config";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { Eye, EyeOff, Mail, Lock, Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "idle", msg: "" });
  const [visiblePw, setVisiblePw] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  async function handleLogin(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus({ type: "idle", msg: "" });
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);

      setStatus({ type: "success", msg: "เข้าสู่ระบบสำเร็จ กำลังนำทาง…" });
      router.push("/");
    } catch (err) {
      console.error("Login error:", err);
      let msg = "ล็อกอินไม่สำเร็จ";
      switch (err?.code) {
        case "auth/network-request-failed":
          msg = "การเชื่อมต่อล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ต";
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
          msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
          break;
        case "auth/user-not-found":
          msg = "ไม่พบบัญชีผู้ใช้นี้";
          break;
        case "auth/too-many-requests":
          msg = "พยายามล็อกอินหลายครั้งเกินไป โปรดลองใหม่ภายหลัง";
          break;
        default:
          msg = `ไม่สามารถเข้าสู่ระบบได้: ${err?.code || "ไม่ทราบสาเหตุ"}`;
      }
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden"
        >
          {/* --- Form Panel (Left) --- */}
          <div className="p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              ยินดีต้อน
            </h1>
            <p className="mt-1 text-slate-500">
              กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ
            </p>

            {status.type !== "idle" && (
              <div
                className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                  status.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-800"
                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {status.msg}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="email"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                    value={email}
                    placeholder="you@example.com"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                {/* ▼▼▼▼▼ จุดที่ 1: ลบ Link "ลืมรหัสผ่าน?" ออกจากตรงนี้ ▼▼▼▼▼ */}
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  {/* ลบ Link ที่เคยอยู่ตรงนี้ออกไป */}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type={visiblePw ? "text" : "password"}
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                    value={password}
                    placeholder="••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVisiblePw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                    aria-label={
                      visiblePw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"
                    }
                  >
                    {visiblePw ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pink-600 text-white py-3 font-bold shadow-sm hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />{" "}
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      เข้าสู่ระบบ
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* ▼▼▼▼▼ จุดที่ 2: ย้ายลิงก์มาไว้ตรงนี้ และจัด Layout ใหม่ ▼▼▼▼▼ */}
            <div className="mt-6 flex justify-between items-center text-sm">
              <span className="text-slate-600">
                ยังไม่มีบัญชี?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-pink-600 hover:underline"
                >
                  สร้างบัญชีใหม่
                </Link>
              </span>
              <Link
                href="/forgot-password"
                className="font-semibold text-pink-600 hover:underline"
              >
                ลืมรหัสผ่าน?
              </Link>
            </div>
            
          </div>

          {/* --- Branding Panel (Right) --- */}
          <div className="hidden lg:flex flex-col justify-center items-center p-8 bg-slate-50">
            {/* ... โค้ดส่วนนี้เหมือนเดิม ... */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-100 mb-4">
                <LogIn className="w-8 h-8 text-pink-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                เข้าสู่ระบบ <span className="text-pink-600">Swappo</span>
              </h2>
              <p className="mt-2 text-slate-500 max-w-xs">
                แลกเปลี่ยนสิ่งของกับเพื่อน ๆ ได้ในไม่กี่คลิก
              </p>
            </div>
            <div className="my-10">
              <img
                src="/images/swappo-logo.svg"
                alt="Swappo Logo"
                className="w-48"
              />
            </div>
            <div className="w-full flex justify-center">
              <ul className="text-sm text-slate-600 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-1.5">•</span>
                  <span>ใช้อีเมลและรหัสผ่านที่ลงทะเบียนไว้</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-500 mt-1.5">•</span>
                  <span>หากลืมรหัสผ่าน สามารถตั้งค่าใหม่ได้</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}