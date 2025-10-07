"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RegisterPage() {
  const router = useRouter();

  // form states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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

  const passLabel = ["อ่อน", "พอใช้", "ดี", "ดีมาก", "แข็งแกร่ง"][passScore] || "อ่อน";
  const passBarWidth = ["w-1/5","w-2/5","w-3/5","w-4/5","w-full"][passScore] || "w-1/5";
  const passBarColor = [
    "bg-rose-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500",
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
    if (passScore < 2) {
      setStatus("รหัสผ่านไม่ปลอดภัยเพียงพอ (ควรมีระดับ 'ดี' ขึ้นไป)");
      return;
    }

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await updateProfile(user, { displayName: username });

      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username,
        email,
        role: "user",
        created_at: serverTimestamp(),
        profilePic: `https://api.dicebear.com/8.x/initials/svg?seed=${username}`,
      });

      setSuccess(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ, ${username}`);
      setStatus("");
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
       switch (err.code) {
        case 'auth/email-already-in-use':
          setStatus('อีเมลนี้ถูกใช้งานแล้ว');
          break;
        case 'auth/invalid-email':
          setStatus('รูปแบบอีเมลไม่ถูกต้อง');
          break;
        case 'auth/weak-password':
          setStatus('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
          break;
        default:
          setStatus(`เกิดข้อผิดพลาด: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
<<<<<<< HEAD
    <div className="flex flex-col min-h-screen bg-slate-50">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden"
        >
          {/* --- Form Panel (Left on Desktop) --- */}
          <div className="p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              สร้างบัญชี
=======
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
              แลกเปลี่ยนสิ่งของกับเพื่อน ๆ ได้ในไม่กี่คลิก
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
>>>>>>> 449fd2ae2738fec35f73127255340c4edc942979
            </h1>
            <p className="mt-1 text-slate-500">เริ่มต้นเส้นทางการแลกเปลี่ยนของคุณ</p>

            {status && <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm">{status}</div>}
            {success && <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">{success}</div>}
            
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ชื่อผู้ใช้ (สำหรับแสดงผล)" className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ตั้งรหัสผ่าน" className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition" required />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full" aria-label={showPass ? "ซ่อนรหัส" : "แสดงรหัส"}>
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password.length > 0 && <div className="mt-2"><div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"><div className={`h-full ${passBarWidth} ${passBarColor} transition-all`}></div></div><div className="mt-1.5 text-xs text-slate-500">ความปลอดภัย: <span className="font-semibold">{passLabel}</span></div></div>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input type={showPass2 ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="ยืนยันรหัสผ่านอีกครั้ง" className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-11 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition" required />
                  <button type="button" onClick={() => setShowPass2(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full" aria-label={showPass2 ? "ซ่อนรหัส" : "แสดงรหัส"}>
                    {showPass2 ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && <p className="mt-1.5 text-xs text-rose-600">รหัสผ่านไม่ตรงกัน</p>}
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-pink-600 text-white py-3 font-bold shadow-sm hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-600">
                  {loading ? (<><Loader2 className="h-5 w-5 animate-spin" /> กำลังสร้างบัญชี...</>) : <><ShieldCheck className="w-5 h-5"/>สร้างบัญชี</>}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              มีบัญชีอยู่แล้ว?{" "}
              <Link href="/login" className="font-semibold text-pink-600 hover:underline">
                เข้าสู่ระบบที่นี่
              </Link>
            </p>
          </div>

          {/* --- Branding Panel (Right on Desktop) --- */}
          <div className="hidden lg:flex flex-col justify-center items-center p-8 bg-slate-50">
              <div className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-pink-100 mb-4">
                     <ShieldCheck className="w-8 h-8 text-pink-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">
                      ยินดีต้อนรับสู่ <span className="text-pink-600">Swappo</span>
                  </h2>
                  <p className="mt-2 text-slate-500 max-w-xs">
                      เข้าร่วมชุมชนแห่งการแบ่งปันที่ใหญ่ที่สุดของเรา
                  </p>
              </div>
              <div className="my-10">
                  <img src="/images/swappo-logo.svg" alt="Swappo Logo" className="w-48" /> {/* โลโก้ขนาดใหญ่ขึ้น */}
              </div>
               <div className="w-full flex justify-center">
                  <ul className="text-sm text-slate-600 space-y-3">
                      <li className="flex items-start gap-3"><span className="text-emerald-500 mt-1.5">•</span><span>ใช้อีเมลจริงเพื่อความปลอดภัยของบัญชี</span></li>
                      <li className="flex items-start gap-3"><span className="text-emerald-500 mt-1.5">•</span><span>ตั้งชื่อผู้ใช้เพื่อแสดงตัวตนในคอมมูนิตี้</span></li>
                      <li className="flex items-start gap-3"><span className="text-emerald-500 mt-1.5">•</span><span>ไม่มีค่าใช้จ่ายในการสมัครและใช้งาน</span></li>
                  </ul>
               </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}