"use client";

/**
 * RegisterPage (Client Component)
 * ---------------------------------------------------------
 * หน้าสมัครสมาชิก:
 *  - รับ username, email, password, confirm password
 *  - ตรวจความครบถ้วน + ตรวจว่ารหัสผ่านตรงกัน
 *  - เรียก Firebase Auth เพื่อสร้างผู้ใช้ใหม่
 *  - อัปเดต displayName ใน Auth ให้เป็น username
 *  - บันทึกข้อมูลผู้ใช้ลง Firestore (collection "users")
 *  - แสดงสถานะความสำเร็จ/ผิดพลาด + เปลี่ยนหน้าไป /login
 *
 * หมายเหตุถ้อยคำ: ใช้คำไทยสม่ำเสมอ เช่น สมัครสมาชิก, รหัสผ่าน, ยืนยันรหัสผ่าน, กำลังสร้างบัญชี...
 * (ปุ่มบางอันยังเป็นอังกฤษตามต้นฉบับ เช่น "Create Account" — ถ้าต้องการไทย เปลี่ยนข้อความได้โดยไม่กระทบลอจิก)
 */

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/firebase/config";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { User, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();

  /* ---------- ฟอร์ม: เก็บค่าที่ผู้ใช้กรอก ---------- */
  const [username, setUsername] = useState("");               // ชื่อผู้ใช้ที่จะแสดงในระบบ
  const [email, setEmail] = useState("");                     // อีเมลสำหรับล็อกอิน/รีเซ็ตรหัสผ่าน
  const [password, setPassword] = useState("");               // รหัสผ่าน
  const [confirmPassword, setConfirmPassword] = useState(""); // ยืนยันรหัสผ่าน

  /* ---------- สถานะ UI: ใช้แสดงผลการทำงาน/ป้องกันการกดซ้ำ ---------- */
  const [status, setStatus] = useState("");   // ข้อความสถานะผิดพลาด (สีแดง)
  const [success, setSuccess] = useState(""); // ข้อความสถานะสำเร็จ (สีเขียว)
  const [loading, setLoading] = useState(false);  // กำลังสร้างบัญชี (ปิดปุ่มชั่วคราว)
  const [showPass, setShowPass] = useState(false);  // toggle แสดง/ซ่อนรหัสผ่าน
  const [showPass2, setShowPass2] = useState(false); // toggle แสดง/ซ่อนยืนยันรหัสผ่าน

  /**
   * ตัวช่วยประเมิน "ความแข็งแรงของรหัสผ่าน"
   * เกณฑ์ที่นับแต้ม: ยาว ≥ 8, มีตัวเลข, มีตัวพิมพ์เล็ก+ใหญ่, มีอักขระพิเศษ
   * คะแนนรวม 0..4 → ใช้ไปวาดแถบ progress
   */
  const passScore = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  // ป้ายกำกับ/ความยาว/สีของแถบความแข็งแรง (ยังใช้ภาษาอังกฤษสั้นๆ ตามต้นฉบับ)
  // ถ้าต้องการให้เป็นไทย: ["อ่อนมาก", "พอใช้", "ดี", "แข็งแรง", "แข็งแรง"]
  const passLabel = ["Weak", "Okay", "Good", "Strong", "Strong"][passScore] || "Weak";
  const passBarWidth = ["w-1/5","w-2/5","w-3/5","w-4/5","w-full"][passScore] || "w-1/5";
  const passBarColor = [
    "bg-rose-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-emerald-500",
  ][passScore] || "bg-rose-500";

  /**
   * สมัครสมาชิก:
   * 1) ตรวจความครบถ้วนของฟอร์ม + รหัสผ่านตรงกัน
   * 2) เรียก createUserWithEmailAndPassword → ได้ user ใหม่ใน Auth
   * 3) อัปเดต displayName ใน Auth เป็น username (ให้ส่วนอื่นเห็นทันที)
   * 4) บันทึกข้อมูลผู้ใช้ไปยัง Firestore (users/{uid})
   * 5) แสดงข้อความสำเร็จ แล้วนำทางไปหน้า /login
   */
  async function handleRegister(e) {
    e.preventDefault();
    if (loading) return;        // กันการกดซ้ำ

    setStatus("");
    setSuccess("");

    // ตรวจความครบถ้วน
    if (!username || !email || !password || !confirmPassword) {
      setStatus("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    // ตรวจรหัสผ่านตรงกัน
    if (password !== confirmPassword) {
      setStatus("รหัสผ่านไม่ตรงกัน");
      return;
    }

    setLoading(true);

    try {
      // 1) สร้างผู้ใช้ใหม่ใน Firebase Auth
      //    (แนะนำ: สามารถ trim อีเมลก่อนส่งเพื่อกันช่องว่างเผลอ ๆ ได้ เช่น email.trim())
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) ตั้งค่า displayName ใน Auth ให้เป็น username
      await updateProfile(user, { displayName: username });

      // 3) บันทึกข้อมูลผู้ใช้ลง Firestore (ใช้ serverTimestamp เพื่อเก็บเวลาสร้างฝั่งเซิร์ฟเวอร์)
      const db = getFirestore();
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        username,
        email,
        role: "user",                   // กำหนดบทบาทเริ่มต้น (เผื่ออนาคตมี admin/moderator)
        created_at: serverTimestamp(),  // เวลาสร้างสำหรับอ้างอิง
      });

      // 4) แจ้งสำเร็จ + เปลี่ยนหน้าไป login
      setSuccess(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ, ${username}`);
      setStatus("");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      // รวมทุกกรณีไว้ใน status เดียว (ถ้าต้องการแยกรายละเอียดตาม err.code ทำได้)
      setStatus(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- ส่วนแสดงผล UI ---------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* แผงด้านขวา: แบรนด์/ภาพอธิบาย (สร้างความเชื่อใจ + ข้อมูลกำกับ) */}
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

          {/* โลโก้ (สว่าง/มืด) */}
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

          {/* ข้อแนะนำสั้น ๆ เพื่อ UX ที่ดี */}
          <ul className="mt-8 w-full text-slate-600 space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ใช้อีเมลจริงเพื่อรีเซ็ตรหัสผ่านได้</li>
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ตั้งชื่อผู้ใช้เพื่อแสดงในโพสต์</li>
            <li className="flex gap-2"><span className="text-emerald-600">•</span> ไม่มีค่าใช้จ่าย</li>
          </ul>
        </div>

        {/* แผงด้านซ้าย: ฟอร์มสมัครสมาชิก (ส่วนที่ผู้ใช้กรอกจริง) */}
        <div className="order-2 lg:order-1">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
              สร้างบัญชีใหม่
            </h1>
            <p className="mt-2 text-slate-500">กรอกข้อมูลด้านล่างเพื่อเริ่มต้นใช้งาน</p>

            {/* กล่องข้อความสถานะ: แสดงข้อผิดพลาด/ความสำเร็จ */}
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

            {/* ฟอร์มกรอกข้อมูล */}
            <form onSubmit={handleRegister} className="mt-6 space-y-5">
              {/* Username: ใช้ในโปรไฟล์/โชว์ใต้โพสต์ */}
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

              {/* Email: ใช้ล็อกอิน/รีเซ็ตรหัสผ่าน */}
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

              {/* Password: มีปุ่มโชว์/ซ่อน + แถบประเมินความแข็งแรง */}
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

                {/* แถบความแข็งแรงของรหัสผ่าน (progress bar) */}
                <div className="mt-2">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${passBarWidth} ${passBarColor} transition-all`}></div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">ความปลอดภัยรหัสผ่าน: {passLabel}</div>
                </div>
              </div>

              {/* Confirm Password: ตรวจว่าตรงกับช่อง Password */}
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

                {/* แจ้งเตือนทันทีถ้ารหัสผ่านทั้งสองช่องไม่ตรงกัน */}
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-2 text-xs text-rose-600">รหัสผ่านไม่ตรงกัน</p>
                )}
              </div>

              {/* ปุ่มสมัครสมาชิก (ปิดชั่วคราวเมื่อกำลังส่ง) */}
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
                  "Create Account"  // ถ้าต้องการไทย: เปลี่ยนเป็น "สร้างบัญชี"
                )}
              </button>

              {/* ลิงก์ไปหน้าเข้าสู่ระบบ (กรณีมีบัญชีอยู่แล้ว) */}
              <p className="text-center text-sm text-slate-600">
                มีบัญชีอยู่แล้ว?{" "}
                <a href="/login" className="text-rose-600 font-semibold hover:underline">
                  Log in
                </a>
              </p>
            </form>
          </div>

          {/* ข้อความกำกับเล็ก ๆ ใต้หน้า */}
          <p className="mt-4 text-center text-xs text-slate-400">
            SWAPPO — แลกเปลี่ยนของกันแบบแฟร์ ๆ
          </p>
        </div>
      </div>
    </div>
  );
}
