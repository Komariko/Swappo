"use client";
/**
 * ForgotPasswordPage (Client Component)
 * ---------------------------------------------------------
 * หน้านี้ให้ผู้ใช้กรอกอีเมลเพื่อรับ "ลิงก์รีเซ็ตรหัสผ่าน" ผ่าน Firebase Authentication
 * แนวคิดหลัก:
 *  - ตรวจรูปแบบอีเมลแบบง่าย ๆ ก่อนส่งคำขอ
 *  - เรียกใช้ sendPasswordResetEmail พร้อมกำหนด URL ปลายทางหลังรีเซ็ตเสร็จ
 *  - ข้อความตอบกลับ “กลาง ๆ” (ไม่บอกว่าอีเมลมีอยู่จริงไหม) เพื่อป้องกัน user enumeration
 */

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { auth } from "@/firebase/config";
import { sendPasswordResetEmail } from "firebase/auth";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  /* --------------------------- State --------------------------- */
  const [email, setEmail] = useState("");     // เก็บอีเมลที่ผู้ใช้กรอก
  const [sending, setSending] = useState(false); // สถานะระหว่างกำลังส่งคำขอ
  const [done, setDone] = useState(false);       // ส่งคำขอเสร็จแล้วหรือยัง (ใช้แสดงข้อความยืนยัน)
  const [err, setErr] = useState("");            // ข้อความผิดพลาดฝั่งฟอร์ม (เช่น อีเมลไม่ถูกต้อง)

  /* --------------------------- Handler ------------------------- */
  // ส่งคำขอรีเซ็ตรหัสผ่านไปยัง Firebase
  async function onSubmit(e) {
    e.preventDefault(); // ป้องกันรีเฟรชหน้า
    setErr("");

    // ตรวจรูปแบบอีเมลแบบง่าย ๆ (เสริมจาก input type="email")
    const clean = email.trim();
    if (!clean || !/\S+@\S+\.\S+/.test(clean)) {
      setErr("กรุณากรอกอีเมลให้ถูกต้อง");
      return;
    }

    try {
      setSending(true);

      // ตั้ง URL ปลายทางหลังรีเซ็ตรหัสผ่านเสร็จ → กลับไปหน้าเข้าสู่ระบบ
      // หมายเหตุ: เปลี่ยนโดเมน fallback ให้เป็นโดเมนโปรดักชันของคุณ
      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://nako-9e4b6.web.app";

      await sendPasswordResetEmail(auth, clean, {
        url: `${base}/login`, // ผู้ใช้กรอกรหัสใหม่แล้วจะถูกนำกลับมาที่หน้า /login
        handleCodeInApp: false, // ใช้หน้ามาตรฐานของ Firebase สำหรับรีเซ็ต
      });

      // เพื่อความปลอดภัย: แสดงข้อความกลาง ๆ ไม่ระบุว่าอีเมลมี/ไม่มีในระบบ
      setDone(true);
    } catch (e) {
      // จัดการ error แบบเป็นมิตร (ไม่บอกเหตุผลละเอียด)
      // เช่น auth/invalid-email, auth/user-not-found ฯลฯ
      console.error(e);
      setDone(true); // ยังคงแสดงข้อความกลาง ๆ
    } finally {
      setSending(false);
    }
  }

  /* ----------------------------- UI ----------------------------- */
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-sky-50">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow p-6">
            {/* ส่วนหัวแบบย่อ: ไอคอน + ชื่อหน้า + คำอธิบาย */}
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0 p-2 rounded-xl bg-rose-100 text-rose-700">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">ลืมรหัสผ่าน</h1>
                <p className="text-sm text-slate-500">
                  กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่
                </p>
              </div>
            </div>

            {/* เนื้อหาหลัก: แสดงข้อความยืนยันถ้าส่งแล้ว ไม่เช่นนั้นแสดงฟอร์ม */}
            {done ? (
              // ข้อความกลาง ๆ เพื่อป้องกันการไล่เดาอีเมลในระบบ (user enumeration)
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 text-sm">
                ถ้ามีอีเมลนี้อยู่ในระบบ เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว
                โปรดตรวจสอบกล่องจดหมายหรือโฟลเดอร์สแปม
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                {/* ฟิลด์อีเมล + แสดงข้อความผิดพลาด */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                    อีเมล
                  </label>
                  <input
                    id="email"
                    type="email" // ให้เบราว์เซอร์ช่วยตรวจรูปแบบอีเมลขั้นต้น
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300"
                    aria-invalid={!!err}
                    aria-describedby={err ? "email-error" : undefined}
                  />
                  {err && (
                    <div id="email-error" className="mt-1 text-xs text-rose-600">
                      {err}
                    </div>
                  )}
                </div>

                {/* ปุ่มส่งคำขอ (ปิดการกดระหว่างกำลังส่ง) */}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-full bg-rose-600 text-white py-2 text-sm font-medium hover:bg-rose-700 disabled:opacity-60"
                >
                  {sending ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
                </button>
              </form>
            )}

            {/* ลิงก์ย้อนกลับไปหน้าเข้าสู่ระบบ */}
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
