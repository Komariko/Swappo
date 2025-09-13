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

export const metadata = {
  title: "Swappo — แพลตฟอร์มแลกเปลี่ยนสิ่งของ",
  description: "Swappo แพลตฟอร์มแลกเปลี่ยนสิ่งของแบบแฟร์ ๆ สำหรับทุกคน",
  icons: {
    icon: "/images/swappo-icon.svg",       // ✅ favicon
    shortcut: "/images/swappo-icon.svg",
    apple: "/images/swappo-icon.svg",
  },
  openGraph: {
    title: "Swappo — แลกเปลี่ยนของกันแบบแฟร์ ๆ",
    description: "โพสต์สิ่งของที่อยากแลก และหาคนที่ต้องการสิ่งที่คุณมี",
    url: "https://swappo.vercel.app",       // ✅ เปลี่ยนเป็นโดเมนจริงเมื่อ deploy
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className="h-full bg-white text-slate-900">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {/* ✅ ใส่ Navbar ที่ import มา */}
        {/* <Navbar /> */}

        <main className="flex-1">{children}</main>

        {/* ✅ ใส่ Footer ถ้ามี */}
        {/* <Footer /> */}
      </body>
    </html>
  );
}
