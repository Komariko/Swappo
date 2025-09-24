"use client";
import { useEffect, useState } from "react";

export default function PreloaderOverlay({ variant = "blink" }) {
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const onDone = () => {
      setLeaving(true);
      const t = setTimeout(() => setShow(false), 380);
      return () => clearTimeout(t);
    };
    if (document.readyState === "complete") onDone();
    else window.addEventListener("load", onDone, { once: true });
    return () => window.removeEventListener("load", onDone);
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden={!show}
      aria-busy={show}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.7)",
        opacity: leaving ? 0 : 1,
        transition: "opacity .35s ease",
        pointerEvents: leaving ? "none" : "auto"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div className={`sprite ${variant === "blink" ? "sprite-blink" : "sprite-walk"}`} />
        <p style={{ color: "white", opacity: .9, fontSize: 14, letterSpacing: ".02em", margin: 0 }}>
          Loading…
        </p>
      </div>

      {/* CSS ฝังในคอมโพเนนต์ */}
      <style jsx>{`
        :root { --sprite-w: 256px; --sprite-h: 384px; }
        .sprite {
          width: var(--sprite-w);
          height: var(--sprite-h);
          image-rendering: pixelated;
          will-change: background-position;
        }
        /* Blink: 3 เฟรมแนวนอน */
        .sprite-blink {
          background: url("/sprites/blink.png") no-repeat 0 0 / 300% 100%;
          animation: blinkSteps 0.39s steps(3) infinite;
        }
        @keyframes blinkSteps {
          from { background-position-x: 0%; }
          to   { background-position-x: -200%; }
        }
        /* Walk: ค้าง idle นิดนึง */
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
        @media (prefers-reduced-motion: reduce) {
          .sprite-blink, .sprite-walk { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
