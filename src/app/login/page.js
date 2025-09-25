"use client";
/**
 * LoginPage (Client Component)
 * ---------------------------------------------------------
 * หน้านี้ให้ผู้ใช้ "เข้าสู่ระบบ" ด้วยอีเมล/รหัสผ่านผ่าน Firebase Auth
 * แนวคิด:
 *  - เก็บสถานะฟอร์มและสถานะโหลด เพื่อควบคุมปุ่ม/ข้อความแจ้ง
 *  - setPersistence(browserLocalPersistence): คงสถานะล็อกอินใน local storage
 *  - signInWithEmailAndPassword: ทำการยืนยันตัวตน → สำเร็จแล้วพาไปหน้าแรก
 *  - จัดการ error code หลัก ๆ และแสดงข้อความที่เป็นมิตร
 */

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

export default function LoginPage() {
  const router = useRouter();

  /* --------------------------- State ฟอร์ม/สถานะ --------------------------- */
  const [email, setEmail] = useState("");                          // ค่าที่ผู้ใช้กรอกอีเมล
  const [password, setPassword] = useState("");                    // ค่าที่ผู้ใช้กรอกรหัสผ่าน
  const [status, setStatus] = useState({ type: "idle", msg: "" }); // สถานะแจ้งเตือน: idle | error | success
  const [visiblePw, setVisiblePw] = useState(false);               // toggle แสดง/ซ่อนรหัสผ่าน
  const [loading, setLoading] = useState(false);                   // กำลังส่งคำขออยู่หรือไม่

  // canSubmit: ปุ่มส่งพร้อมไหม (มีอีเมล/รหัสผ่าน และไม่ได้กำลังโหลด)
  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !loading,
    [email, password, loading]
  );

  /* --------------------------- Handler: ทำงานเมื่อกดเข้าสู่ระบบ --------------------------- */
  async function handleLogin(e) {
    e.preventDefault();                 // ป้องกันรีเฟรชหน้า
    if (!canSubmit) return;             // เงื่อนไขกันกดซ้ำ/ข้อมูลไม่ครบ

    setStatus({ type: "idle", msg: "" });
    setLoading(true);

    try {
      // 1) ตั้งค่า persistence ให้จำการล็อกอินไว้ใน local storage ของเบราว์เซอร์
      await setPersistence(auth, browserLocalPersistence);

      // 2) เรียก Firebase Auth เพื่อลงชื่อเข้าใช้งานด้วยอีเมล/รหัสผ่าน
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // 3) แจ้งผลและนำทางกลับหน้าแรก
      setStatus({ type: "success", msg: "เข้าสู่ระบบสำเร็จ กำลังนำทาง…" });
      router.push("/");
    } catch (err) {
      // แปลง error code เป็นข้อความที่เข้าใจง่าย
      console.error("Login error:", err);
      let msg = "ล็อกอินไม่สำเร็จ";
      switch (err?.code) {
        case "auth/network-request-failed":
          msg =
            "การเชื่อมต่อถูกบล็อก/ไม่ถึงเซิร์ฟเวอร์ • ตรวจ Authorized domains • ปิด AdBlock/Privacy ชั่วคราว • เคลียร์ข้อมูลเว็บไซต์";
          break;
        case "auth/wrong-password":
        case "auth/invalid-credential":
          msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
          break;
        case "auth/user-not-found":
          msg = "ไม่พบบัญชีผู้ใช้นี้";
          break;
        case "auth/too-many-requests":
          msg = "พยายามหลายครั้งเกินไป • ลองใหม่ภายหลัง";
          break;
        default:
          msg = `ไม่สามารถเข้าสู่ระบบได้: ${err?.message || "ไม่ทราบสาเหตุ"}`;
      }
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------ UI ------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center px-4 py-10">
      {/* โครง 2 คอลัมน์: ด้านขวา (แบรนด์/คำแนะนำ), ด้านซ้าย (ฟอร์ม) บนจอใหญ่ */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* กล่องแบรนด์/ภาพประกอบ/คำแนะนำการเข้าสู่ระบบ */}
        <div className="order-1 lg:order-2 bg-white/70 backdrop-blur rounded-3xl border border-slate-100 shadow-xl p-8 flex flex-col items-center justify-center">
          {/* หัวข้อ + ไอคอน */}
          <div className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100">
              <LogIn className="h-6 w-6 text-rose-600" />
            </span>
            <h2 className="text-2xl font-bold text-slate-800">
              เข้าสู่ระบบ <span className="text-rose-600">Swappo</span>
            </h2>
          </div>

          {/* คำอธิบายสั้น ๆ */}
          <p className="mt-3 text-slate-500 text-center">
            แลกเปลี่ยนสิ่งของกับเพื่อน ๆ ได้ในไม่กี่คลิก
          </p>

          {/* โลโก้ (ปรับตามโหมดสว่าง/มืด) */}
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

          {/* ทิปสั้น ๆ สำหรับผู้ใช้ */}
          <ul className="mt-8 w-full text-slate-600 space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ใช้อีเมลที่ลงทะเบียนไว้</li>
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ลืมรหัส? รีเซ็ตได้ที่ Forgot Password</li>
            {/* <li className="flex gap-2"><span className="text-emerald-600">•</span> มีปัญหาโดเมน/เน็ต ให้ลองเคลียร์แคช</li> */}
          </ul>
        </div>

        {/* กล่องฟอร์มเข้าสู่ระบบ */}
        <div className="order-2 lg:order-1">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
            {/* หัวเรื่องฟอร์ม */}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              ยินดีต้อนรับ
            </h1>
            <p className="mt-2 text-slate-500">กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่ระบบ</p>

            {/* แถบแจ้งสถานะสำเร็จ/ผิดพลาด (ซ่อนเมื่อ idle) */}
            {status.type !== "idle" && (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
                // เคล็ดลับ a11y: ถ้าต้องการให้ผู้อ่านหน้าจอรู้ว่ามีข้อความใหม่ ให้เติม aria-live="polite"
              >
                {status.msg}
              </div>
            )}

            {/* ฟอร์มอีเมล/รหัสผ่าน */}
            <form onSubmit={handleLogin} className="mt-6 space-y-5">
              {/* ช่องอีเมล */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <div className="relative">
                  {/* ไอคอนซ้าย */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
                    value={email}
                    placeholder="you@example.com"
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ช่องรหัสผ่าน + ปุ่มแสดง/ซ่อน */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                <div className="relative">
                  {/* ไอคอนซ้าย */}
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={visiblePw ? "text" : "password"}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 pr-12 text-slate-800 outline-none focus:ring-2 focus:ring-rose-300"
                    value={password}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {/* ปุ่มสลับแสดง/ซ่อนรหัสผ่าน */}
                  <button
                    type="button"
                    onClick={() => setVisiblePw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                    aria-label={visiblePw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  >
                    {visiblePw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* ลิงก์ไปหน้าลืมรหัสผ่าน */}
                <div className="mt-2 text-right text-sm">
                  <p className="mt-3 text-right text-sm">
                    <Link href="/forgot-password" className="text-rose-600 hover:text-rose-700 underline underline-offset-4">
                      ลืมรหัสผ่าน?
                    </Link>
                  </p>
                </div>
              </div>

              {/* ปุ่มส่งฟอร์ม (แสดงสถานะกำลังเข้าสู่ระบบ) */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 text-white py-3 font-semibold shadow-lg hover:shadow-xl hover:bg-rose-700 transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังเข้าสู่ระบบ...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Log in
                  </>
                )}
              </button>

              {/* ลิงก์ไปสมัครสมาชิก */}
              <p className="text-center text-sm text-slate-600">
                ยังไม่มีบัญชี?{" "}
                <a href="/register" className="text-rose-600 font-semibold hover:underline">
                  สร้างบัญชีใหม่
                </a>
              </p>
            </form>
          </div>

          {/* ลิขสิทธิ์/สโลแกนสั้น ๆ ด้านล่าง */}
          <p className="mt-4 text-center text-xs text-slate-400">
            SWAPPO — แลกเปลี่ยนของกันแบบแฟร์ ๆ
          </p>
        </div>
      </div>
    </div>
  );
}
