import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ✅ ตั้งค่าให้ Next รู้ base URL เพื่อแก้ warning metadataBase */
export const metadata = {
  metadataBase: new URL("https://nako-9e4b6.web.app"),
  title: {
    default: "Swappo — แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
    template: "%s | Swappo",
  },
  description: "Swappo แพลตฟอร์มแลกเปลี่ยนสิ่งของแบบแฟร์ ๆ สำหรับทุกคน",
  icons: {
    icon: "/images/swappo-icon.svg",
    shortcut: "/images/swappo-icon.svg",
    apple: "/images/swappo-icon.svg",
  },
  openGraph: {
    title: "Swappo — แลกเปลี่ยนของกันแบบแฟร์ ๆ",
    description: "โพสต์สิ่งของที่อยากแลก และหาคนที่ต้องการสิ่งที่คุณมี",
    url: "/",                  // จะ resolve เป็น absolute ด้วย metadataBase
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
    card: "summary",
    title: "Swappo",
    description: "แพลตฟอร์มแลกเปลี่ยนสิ่งของของคนไทย",
    images: ["/images/swappo-icon.svg"],
  },
  alternates: {
    canonical: "/",
  },
};

/* (ทางเลือก) ตั้ง theme color ของ address bar มือถือ */
export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className="h-full bg-white text-slate-900">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
