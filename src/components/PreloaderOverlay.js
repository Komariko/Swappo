"use client";
import { useEffect, useRef, useState } from "react";

/**
 * PreloaderOverlay
 * หน้ากากโหลดแบบสไปรต์ (blink / walk)
 * โผล่มาแค่ตอนโหลดหน้าแรก แล้วค่อยเฟดหายไปเอง
 */
export default function PreloaderOverlay({ variant = "blink" }) {
  // show = ควรแสดงโอเวอร์เลย์ไหม / leaving = กำลังเฟดออกหรือยัง
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  // เก็บไอดี timeout ไว้ล้างตอน unmount (กัน memory leak)
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    // เรียกตอน "หน้าโหลดเสร็จ" เพื่อเริ่มเฟดออก แล้วซ่อนทิ้ง
    const onDone = () => {
      setLeaving(true);
      // รอให้แอนิเมชันจบก่อนค่อยถอด overlay
      fadeTimerRef.current = setTimeout(() => setShow(false), 380);
    };

    // รองรับกรณีหน้าเด้งกลับจาก bfcache (บางที 'load' ไม่ยิง)
    const onPageShow = (e) => {
      if (e.persisted) onDone();
    };

    // ป้องกันใช้บน SSR (แต่ไฟล์นี้เป็น client อยู่แล้ว—กันพลาดไว้)
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // ถ้าหน้าพร้อมแล้วก็เฟดเลย ไม่งั้นรอฟัง 'load'
    if (document.readyState === "complete") {
      onDone();
    } else {
      window.addEventListener("load", onDone, { once: true });
      window.addEventListener("pageshow", onPageShow, { once: true });
    }

    // ล้าง event + timeout ตอนคอมโพเนนต์ถูกถอด
    return () => {
      window.removeEventListener("load", onDone);
      window.removeEventListener("pageshow", onPageShow);
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, []);

  if (!show) return null;

  return (
    <div
      // a11y: แจ้งผู้ช่วยอ่านหน้าจอว่ากำลังโหลด และซ่อนเมื่อหาย
      role="status"
      aria-hidden={!show}
      aria-busy={show}
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.7)",
        opacity: leaving ? 0 : 1,
        transition: "opacity .35s ease",
        // ตอนกำลังเฟดออก ไม่บล็อกการคลิกข้างหลัง
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {/* กล่องสไปรต์: สลับคลาสตามโหมด blink/walk */}
        <div className={`sprite ${variant === "blink" ? "sprite-blink" : "sprite-walk"}`} />
        <p style={{ color: "white", opacity: 0.9, fontSize: 14, letterSpacing: ".02em", margin: 0 }}>
          Loading…
        </p>
      </div>

      {/* CSS ฝังในคอมโพเนนต์ (ใช้ภาพจาก /public/sprites/...) */}
      <style jsx>{`
        :root { --sprite-w: 256px; --sprite-h: 384px; }
        .sprite {
          width: var(--sprite-w);
          height: var(--sprite-h);
          image-rendering: pixelated;          /* ให้ภาพพิกเซลคม ๆ */
          will-change: background-position;    /* ช่วยให้แอนิเมชันลื่น */
        }

        /* โหมดกระพริบตา: 3 เฟรมเรียงแนวนอน */
        .sprite-blink {
          background: url("/sprites/blink.png") no-repeat 0 0 / 300% 100%;
          animation: blinkSteps 0.39s steps(3) infinite;
        }
        @keyframes blinkSteps {
          from { background-position-x: 0%; }
          to   { background-position-x: -200%; }
        }

        /* โหมดเดิน: เว้นจังหวะ idle เล็กน้อยให้ดูมีชีวิต */
        .sprite-walk {
          background: url("/sprites/walk.png") no-repeat 0 0 / 300% 100%;
          animation: walkHold 0.6s linear infinite;
        }
        @keyframes walkHold {
          0%, 25% { background-position-x: 0%; }
          50%     { background-position-x: -100%; }
          75%     { background-position-x: -200%; }
          100%    { background-position-x: 0%; }
        }

        /* เคารพผู้ใช้ที่ปิดแอนิเมชัน */
        @media (prefers-reduced-motion: reduce) {
          .sprite-blink, .sprite-walk { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
