// app/layout.jsx

// 1) โหลดฟอนต์จาก Google แบบ next/font
// - Geist: ฟอนต์ตัวหนังสือปกติ
// - Geist_Mono: ฟอนต์ตัวพิมพ์ดีด (monospace)
// ข้อดีของ next/font: แพ็กฟอนต์แบบอัตโนมัติ, ลด FOUT/FOIT, ใส่เป็น CSS variable ได้
import { Geist, Geist_Mono } from "next/font/google";

// 2) สไตล์รวมทั้งแอป (Tailwind + global CSS)
import "./globals.css";

// 3) Overlay หน้าจอโหลด (พรีโหลดเดอร์) ที่เราทำไว้เองใน components
import PreloaderOverlay from "../components/PreloaderOverlay.js";

// ---------- ตั้งค่าฟอนต์เป็น CSS variables เพื่อนำไปใช้ทั้งระบบ ----------
// หมายเหตุ: ตัวเลือก subsets = ["latin"] เพียงพอสำหรับ UI (หากต้องการตัวอักษรอื่นค่อยเพิ่ม)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ---------- METADATA ของหน้า (สำหรับ <head>) ----------
// ใช้กับ App Router (Next.js 13+): กำหนด title, description, OG/Twitter Cards ฯลฯ
// จุดสำคัญ:
// - metadataBase: บอก base URL ให้ Next เพื่อเลี่ยง warning เวลาเราใช้ path แบบ relative
// - openGraph.url / alternates.canonical ใช้ path แล้ว Next จะ resolve ให้เป็น absolute ด้วย metadataBase
/* ✅ ตั้งค่าให้ Next รู้จัก base URL เพื่อลดคำเตือนเรื่อง metadataBase */
export const metadata = {
  metadataBase: new URL("https://nako-9e4b6.web.app"),
  title: {
    // title เริ่มต้นของทุกหน้า
    default: "Swappo — แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    // ถ้าหน้าไหนกำหนด title เอง จะถูกนำมาแทนที่ %s | Swappo
    template: "%s | Swappo",
  },
  description: "Swappo แพลตฟอร์มแลกเปลี่ยนสิ่งของแบบแฟร์ ๆ สำหรับทุกคน",
  icons: {
    // ไอคอนหลักของเว็บไซต์ (เช็กว่าพาธ /images/swappo-icon.svg พร้อมใช้งาน)
    icon: "/images/swappo-icon.svg",
    shortcut: "/images/swappo-icon.svg",
    apple: "/images/swappo-icon.svg",
  },
  openGraph: {
    // ข้อมูลเวลาแชร์ลิงก์บน Facebook/LINE ฯลฯ
    title: "Swappo — แลกเปลี่ยนของกันแบบแฟร์ ๆ",
    description: "โพสต์สิ่งของที่อยากแลก และหาคนที่ต้องการสิ่งที่คุณมี",
    url: "/",                  // จะถูกแปลงเป็น absolute จาก metadataBase
    siteName: "Swappo",
    images: [
      {
        url: "/images/swappo-icon.svg",
        width: 512,
        height: 512,
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    // การ์ดสำหรับเวลาแชร์บน Twitter/X
    card: "summary",
    title: "Swappo",
    description: "แพลตฟอร์มแลกเปลี่ยนสิ่งของของคนไทย",
    images: ["/images/swappo-icon.svg"],
  },
  alternates: {
    // canonical ช่วยเรื่อง SEO (หน้าโฮมใช้ “/” แล้ว Next จะทำ absolute ให้เอง)
    canonical: "/",
  },
};

// ---------- VIEWPORT (ตัวเลือก) ----------
// กำหนดสีแถบ address bar บนมือถือ (บางเบราว์เซอร์รองรับ)
export const viewport = {
  themeColor: "#ffffff",
};

// ---------- ROOT LAYOUT (โครงสร้างหลักของทุกหน้า) ----------
// สิ่งที่ทำ:
// - ใส่ lang="th" เพื่อ SEO/Accessibility
// - preload รูปสไปรต์ที่ใช้ในพรีโหลดเดอร์ เพื่อให้แสดงไว
// - ใส่ตัวโหลด (PreloaderOverlay) หน้าจอ: สามารถเปลี่ยน variant เป็น "walk" ได้
// - ผูก CSS variable ฟอนต์ไว้ที่ body
export default function RootLayout({ children }) {
  return (
    <html lang="th" className="h-full bg-white text-slate-900">
      <head>
        {/* ✅ พรีโหลดรูปสไปรต์ให้พรีโหลดเดอร์ขึ้นไวและไม่กระตุก */}
        <link rel="preload" as="image" href="/sprites/blink.png" />
        <link rel="preload" as="image" href="/sprites/walk.png" />
      </head>
      <body
        className={
          `${geistSans.variable} ${geistMono.variable} ` + // ผูก CSS variables ของฟอนต์
          "antialiased min-h-screen flex flex-col"          // สไตล์ฐานของแอป
        }
      >
        {/* ✅ ตัวโหลด (preloader overlay): ใช้ตอนเพจ/ข้อมูลกำลังมา */}
        {/* เปลี่ยน variant เป็น "walk" ได้ตามธีมของหน้า */}
        <PreloaderOverlay variant="blink" />

        {/* คอนเทนต์ของแต่ละหน้า (Page Components) จะถูกเรนเดอร์ในพื้นที่นี้ */}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
