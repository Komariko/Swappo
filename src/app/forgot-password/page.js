"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth } from "@/firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const clean = email.trim();
    if (!clean || !/\S+@\S+\.\S+/.test(clean)) {
      setErr("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    try {
      setSending(true);

      // ให้ลิงก์พากลับไปหน้า login หลังรีเซ็ตรหัส
      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://nako-9e4b6.web.app";

      await sendPasswordResetEmail(auth, clean, {
        url: `${base}/login`,
        handleCodeInApp: false,
      });

      // เพื่อความปลอดภัย แสดงข้อความกลางๆ (หลีกเลี่ยง user enumeration)
      setDone(true);
    } catch (e) {
      // จัดการ error แบบเป็นมิตร
      // เช่น auth/invalid-email, auth/user-not-found ฯลฯ
      console.error(e);
      setDone(true); // ยังคงแสดงข้อความกลางๆ
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-sky-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 p-2 rounded-xl bg-rose-100 text-rose-700">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  ลืมรหัสผ่าน
                </h1>
                <p className="text-sm text-slate-500">
                  กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                </p>
              </div>
            </div>

            {done ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">
                ถ้ามีอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว
                โปรดตรวจสอบกล่องจดหมายหรือโฟลเดอร์สแปม
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    อีเมล
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  {err && (
                    <div className="mt-1 text-xs text-rose-600">{err}</div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-rose-600 text-white py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-60"
                >
                  {sending ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <Link
                href="/login"
                className="text-slate-600 hover:text-slate-800 underline underline-offset-4"
              >
                ← กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
