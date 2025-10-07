// (แก้ไขแล้ว) src/app/item/page.js หรือไฟล์หน้ารายการที่คุณแปะมา
"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { getUserProfile } from "@/firebase/functions";

// --- Components ---
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StatusChip from "@/components/StatusChip";
import InterestButton from "@/components/InterestButton";
import OwnerStatusPanel from "@/components/OwnerStatusPanel";
import OwnerControls from "@/components/OwnerControls";
import AdminControls from "@/components/AdminControls";

// --- Icons ---
import {
  Share2,
  ArrowLeft,
  Tag,
  Wrench,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  User,
  Image as ImageIcon,
} from "lucide-react";

// --- Helper Function ---
function timeAgo(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (!d || isNaN(d.getTime())) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(s / 86400)} วันที่แล้ว`;
}

/* ==== หมวดหมู่ไทย (อิง optgroup/option ที่หน้าโพสต์) ==== */
// NOTE: key ของ subs คือ "รหัสหมวดเต็ม" (prefix:sub) ที่เก็บลง Firestore
const CATEGORY_TREE = {
  electronics: {
    label: "อิเล็กทรอนิกส์",
    subs: {
      "electronics:phones": "โทรศัพท์ & แท็บเล็ต",
      "electronics:wearables": "สมาร์ทวอทช์/อุปกรณ์สวมใส่",
      "electronics:computers": "คอมพิวเตอร์ & แล็ปท็อป",
      "electronics:peripherals": "อุปกรณ์เสริมคอมพ์ (คีย์บอร์ด/เมาส์/ฮับ)",
      "electronics:cameras": "กล้องถ่ายรูป & เลนส์",
      "electronics:audio": "เครื่องเสียง/หูฟัง",
      "electronics:gaming": "เกมคอนโซล & อุปกรณ์",
      "electronics:networking": "เราเตอร์/อุปกรณ์เครือข่าย",
      "electronics:appliances-small": "เครื่องใช้ไฟฟ้าขนาดเล็ก",
      "electronics:appliances-large": "เครื่องใช้ไฟฟ้าขนาดใหญ่",
      "electronics:general": "อื่น ๆ (อิเล็กทรอนิกส์)",
    },
  },

  pc: {
    label: "คอมพิวเตอร์ & อุปกรณ์",
    subs: {
      "pc:desktops": "เดสก์ท็อป/มินิพีซี/เซิร์ฟเวอร์",
      "pc:laptops": "โน้ตบุ๊ก/แมคบุ๊ก",
      "pc:monitors": "จอภาพ",
      "pc:parts": "ชิ้นส่วน (CPU/GPU/RAM/เมนบอร์ด)",
      "pc:storage": "สตอเรจ (HDD/SSD/NAS)",
      "pc:peripherals": "คีย์บอร์ด/เมาส์/ด๊องเกิล",
      "pc:general": "อื่น ๆ (คอมพิวเตอร์)",
    },
  },

  home: {
    label: "บ้าน & เฟอร์นิเจอร์",
    subs: {
      "home:furniture": "เฟอร์นิเจอร์",
      "home:decor": "ของแต่งบ้าน",
      "home:kitchen": "เครื่องครัว/ภาชนะ",
      "home:lighting": "โคมไฟ/หลอดไฟ",
      "home:storage": "ชั้นวาง/กล่องจัดเก็บ",
      "home:cleaning": "อุปกรณ์ทำความสะอาด",
      "home:general": "อื่น ๆ (บ้าน)",
    },
  },

  tools: {
    label: "เครื่องมือช่าง & อุตสาหกรรม",
    subs: {
      "tools:hand": "เครื่องมือช่างมือ",
      "tools:power": "เครื่องมือไฟฟ้า",
      "tools:measure": "อุปกรณ์วัด/งานไฟฟ้า",
      "tools:safety": "อุปกรณ์เซฟตี้",
      "tools:general": "อื่น ๆ (เครื่องมือ)",
    },
  },

  garden_outdoor: {
    label: "สวน & กลางแจ้ง",
    subs: {
      "garden:plants": "ต้นไม้/เมล็ด/ดิน",
      "garden:tools": "อุปกรณ์ทำสวน",
      "outdoor:camping": "แคมปิ้ง/เดินป่า",
      "outdoor:fishing": "ตกปลา",
      "outdoor:general": "อื่น ๆ (สวน/กลางแจ้ง)",
    },
  },

  sports_bikes: {
    label: "กีฬา & จักรยาน",
    subs: {
      "sports:fitness": "ฟิตเนส/อุปกรณ์ออกกำลัง",
      "sports:team": "กีฬาทีม/ลูกบอล",
      "sports:water": "กีฬาทางน้ำ",
      "bikes:bicycles": "จักรยาน/สกู๊ตเตอร์",
      "bikes:parts": "อะไหล่/อุปกรณ์จักรยาน",
      "sports:general": "อื่น ๆ (กีฬา)",
    },
  },

  auto: {
    label: "ยานยนต์",
    subs: {
      "auto:car-parts": "อะไหล่รถยนต์",
      "auto:moto-parts": "อะไหล่มอเตอร์ไซค์",
      "auto:accessories": "อุปกรณ์/ของแต่ง/ดูแลรักษา",
      "auto:tires": "ยาง/ล้อ",
      "auto:general": "อื่น ๆ (ยานยนต์)",
    },
  },

  fashion: {
    label: "แฟชั่น",
    subs: {
      "fashion:men": "เสื้อผ้าผู้ชาย",
      "fashion:women": "เสื้อผ้าผู้หญิง",
      "fashion:kids": "เสื้อผ้าเด็ก",
      "fashion:shoes": "รองเท้า",
      "fashion:bags": "กระเป๋า",
      "fashion:accessories": "แอ็กเซสซอรี",
      "fashion:jewelry": "เครื่องประดับ",
      "fashion:watches": "นาฬิกา",
      "fashion:general": "อื่น ๆ (แฟชั่น)",
    },
  },

  baby: {
    label: "แม่ & เด็ก",
    subs: {
      "baby:gear": "อุปกรณ์เด็ก/รถเข็น/คาร์ซีท",
      "baby:toys": "ของเล่นเด็ก",
      "baby:clothes": "เสื้อผ้าเด็ก",
      "baby:general": "อื่น ๆ (แม่ & เด็ก)",
    },
  },

  pet: {
    label: "สัตว์เลี้ยง",
    subs: {
      "pet:supplies": "อาหาร/ทราย/อุปกรณ์",
      "pet:grooming": "กรูมมิ่ง/ดูแล",
      "pet:general": "อื่น ๆ (สัตว์เลี้ยง)",
    },
  },

  books_office: {
    label: "หนังสือ & การศึกษา",
    subs: {
      "books:books": "หนังสือ/นิยาย/การ์ตูน",
      "books:textbooks": "ตำรา/การศึกษา",
      "office:stationery": "เครื่องเขียน/อุปกรณ์สำนักงาน",
      "office:printers": "ปริ้นเตอร์/หมึก",
      "office:general": "อื่น ๆ (หนังสือ/ออฟฟิศ)",
    },
  },

  toys_hobby: {
    label: "ของเล่น & งานอดิเรก",
    subs: {
      "toys:toys": "ของเล่น",
      "toys:boardgames": "บอร์ดเกม/การ์ดเกม",
      "collectibles:figures": "ฟิกเกอร์/โมเดล/เลโก้",
      "hobby:crafts": "งานฝีมือ/งานประดิษฐ์",
      "hobby:general": "อื่น ๆ (งานอดิเรก)",
    },
  },

  music: {
    label: "ดนตรี & สตูดิโอ",
    subs: {
      "music:instruments": "เครื่องดนตรี",
      "music:studio": "ไมค์/มิกเซอร์/อัดเสียง",
      "music:general": "อื่น ๆ (ดนตรี)",
    },
  },

  art_collectibles: {
    label: "ศิลป์ & สะสม",
    subs: {
      "art:artworks": "งานศิลป์/ภาพวาด/งานพิมพ์",
      "collectibles:antiques": "ของสะสม/ของเก่า",
      "collectibles:coins": "เหรียญ/แสตมป์",
      "art:general": "อื่น ๆ (ศิลป์/สะสม)",
    },
  },

  beauty_health: {
    label: "ความงาม & สุขภาพ",
    subs: {
      "beauty:skincare": "สกินแคร์",
      "beauty:makeup": "เมคอัพ",
      "beauty:hair": "ดูแลผม",
      "health:devices": "อุปกรณ์สุขภาพ (เครื่องวัด ฯลฯ)",
      "beauty:general": "อื่น ๆ (ความงาม/สุขภาพ)",
    },
  },

  travel_lifestyle: {
    label: "ท่องเที่ยว & ไลฟ์สไตล์",
    subs: {
      "travel:luggage": "กระเป๋าเดินทาง",
      "travel:accessories": "อุปกรณ์ท่องเที่ยว",
      "lifestyle:general": "อื่น ๆ (ไลฟ์สไตล์)",
    },
  },

  digital: {
    label: "ดิจิทัล",
    subs: {
      "digital:software": "ซอฟต์แวร์/แอป",
      "digital:media": "สื่อดิจิทัล (ภาพ/เสียง)",
      "digital:game-keys": "คีย์เกม/ไอเท็มในเกม",
      "digital:general": "อื่น ๆ (ดิจิทัล)",
    },
  },
};

const CONDITION_TH = {
  new: "ใหม่",
  used: "มือสอง",
  refurbished: "คืนสภาพ/ซ่อมแล้ว",
  "like-new": "สภาพดีมาก",
  "for-parts": "เสีย/อะไหล่",
};

/** แปลงค่าหมวดที่เก็บใน Firestore -> ชื่อไทยสวย ๆ */
function toThaiCategory(cat) {
  if (!cat) return "ไม่ระบุ";
  const raw = String(cat).trim();
  if (raw === "other") return "อื่น ๆ";
  if (raw === "custom") return "อื่น ๆ (กำหนดเอง)";

  // 1) แมตช์แบบ "prefix:sub" ตรง ๆ
  for (const majorKey of Object.keys(CATEGORY_TREE)) {
    const { label: majorLabel, subs } = CATEGORY_TREE[majorKey];
    if (subs[raw]) return `${majorLabel} • ${subs[raw]}`;
  }

  // 2) ถ้าให้มาเป็นชื่อหมวดใหญ่ (ข้อมูลเก่า) เช่น "electronics"
  if (CATEGORY_TREE[raw]) return CATEGORY_TREE[raw].label;

  // 3) ถ้าเป็นแค่ prefix (เช่น "garden") ให้หาว่า prefix นี้อยู่ในหมวดใหญ่ไหน
  const prefix = raw.split(":")[0];
  for (const majorKey of Object.keys(CATEGORY_TREE)) {
    const { label: majorLabel, subs } = CATEGORY_TREE[majorKey];
    if (Object.keys(subs).some((k) => k.startsWith(`${prefix}:`))) {
      return majorLabel;
    }
  }

  // 4) ฟอลแบ็ก: คืนค่าที่กรอกมา (รองรับ custom ที่เป็นข้อความไทย)
  return raw;
}

function toThaiCondition(cond) {
  if (!cond) return "ไม่ระบุ";
  return CONDITION_TH[cond] || cond;
}

/** Toast Notification สำหรับการคัดลอกลิงก์ */
function CopyLinkToast({ show, onDismiss }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onDismiss, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-rose-600 text-white transition-all duration-300 transform ${
        show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      } z-50`}
    >
      <Check size={20} className="text-white" />
      <span className="font-medium">คัดลอกลิงก์สำเร็จ!</span>
    </div>
  );
}

// ============== Main Component ==============
export default function ItemClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id");

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // For Share Button tooltip
  const shareButtonRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUid(u?.uid || null);
      setAuthReady(true);
    });
    return () => unsub?.();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchItem = async () => {
      if (!id) {
        setItem(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "items", id));
        if (cancelled) return;

        if (!snap.exists()) {
          setItem(null);
        } else {
          const data = { id: snap.id, ...snap.data() };
          if (!data.status) data.status = "available";

          const profile = await getUserProfile(data.user_id).catch(() => null);
          data.profileUsername = profile?.username || "ผู้ใช้";
          data.profilePic =
            profile?.profilePic || "/images/profile-placeholder.jpg";

          setItem(data);
          setCurrentImageIndex(0);
        }
      } catch (error) {
        console.error("Failed to fetch item:", error);
        setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchItem();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isOwner = useMemo(
    () => !!currentUid && (item?.user_id === currentUid || item?.uid === currentUid),
    [currentUid, item?.user_id, item?.uid]
  );

  const images = Array.isArray(item?.item_images) ? item.item_images : [];
  const activeImg = images[currentImageIndex] || "/img/default-placeholder.jpg";

  // ====== รูป "สิ่งที่ต้องการแลก" (รองรับเดี่ยว/หลายรูป) ======
  const wantedImages = useMemo(() => {
    if (Array.isArray(item?.item_wanted_images) && item?.item_wanted_images.length > 0) {
      return item.item_wanted_images;
    }
    return item?.item_wanted_image ? [item.item_wanted_image] : [];
  }, [item?.item_wanted_images, item?.item_wanted_image]);

  const [showWantedViewer, setShowWantedViewer] = useState(false);
  const [wantedIndex, setWantedIndex] = useState(0);

  const openWantedAt = (i = 0) => {
    setWantedIndex(i);
    setShowWantedViewer(true);
  };
  const closeWanted = () => setShowWantedViewer(false);
  const nextWanted = () =>
    setWantedIndex((p) =>
      wantedImages.length ? (p + 1) % wantedImages.length : 0
    );
  const prevWanted = () =>
    setWantedIndex((p) =>
      wantedImages.length ? (p - 1 + wantedImages.length) % wantedImages.length : 0
    );

  useEffect(() => {
    if (!showWantedViewer) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeWanted();
      if (e.key === "ArrowRight") nextWanted();
      if (e.key === "ArrowLeft") prevWanted();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showWantedViewer, wantedImages.length]);

  const handleShare = async () => {
    const shareData = {
      title: item.item_give || "Swappo",
      text: `ดูของแลกชิ้นนี้: ${item.item_give}`,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShowCopyToast(true);
      }
    } catch (err) {
      console.error("Share failed:", err);
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShowCopyToast(true);
      } catch (clipErr) {
        console.error("Clipboard write failed:", clipErr);
      }
    } finally {
      setShowTooltip(false);
    }
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % (images.length || 1));
  };
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + (images.length || 1)) % (images.length || 1));
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-120px)] bg-slate-50 flex items-center justify-center p-4 md:p-6">
          <div className="max-w-6xl mx-auto w-full grid gap-8 lg:grid-cols-[2fr_1fr]">
            {/* Left Skeleton */}
            <div className="space-y-6">
              <div className="h-12 w-3/4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
              <div className="w-full aspect-[4/3] bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl animate-pulse"></div>
              <div className="flex gap-3">
                <div className="w-24 h-18 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
                <div className="w-24 h-18 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
                <div className="w-24 h-18 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse hidden sm:block"></div>
              </div>
              <div className="h-8 w-1/3 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
                <div className="h-4 w-4/5 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse"></div>
              </div>
              <div className="h-20 bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl animate-pulse"></div>
            </div>
            {/* Right Skeleton */}
            <div className="space-y-6">
              <div className="w-full h-36 bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl animate-pulse"></div>
              <div className="w-full h-48 bg-gradient-to-r from-slate-200 to-slate-100 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // --- Render Not Found State ---
  if (!item) {
    return (
      <>
        <Header />
        <main className="min-h-[calc(100vh-120px)] bg-slate-50 flex items-center justify-center p-4 md:p-6">
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center border-t-4 border-rose-500">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">ไม่พบโพสต์นี้</h2>
            <p className="text-slate-600 mb-6">
              โพสต์ที่คุณกำลังมองหาอาจถูกลบไปแล้วหรือไม่เคยมีอยู่
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeft size={18} /> กลับสู่หน้าหลัก
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // --- Render Main Content ---
  return (
    <>
      <Header />
      <div className="bg-slate-50 min-h-[calc(100vh-120px)] pb-10">
        <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          {/* LEFT COLUMN: Item Details */}
          <section className="space-y-6">
            {/* --- Hero Section: Title and Basic Info --- */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-grow">
                <StatusChip status={item.status || "available"} />
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2 leading-tight">
                  {item.item_give || "ไม่มีชื่อ"}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Tag size={16} className="text-slate-400" /> {toThaiCategory(item.category)}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <Wrench size={16} className="text-slate-400" /> {toThaiCondition(item.condition)}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={14} /> โพสต์เมื่อ {timeAgo(item.createdAt)}
                  </span>
                </div>
              </div>
              <div className="relative">
                <button
                  ref={shareButtonRef}
                  onClick={handleShare}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full border bg-white hover:bg-slate-100 transition shadow-sm hover:shadow-md active:bg-slate-200"
                >
                  <Share2 size={18} />
                  <span className="font-semibold text-slate-700">แชร์</span>
                </button>
                {showTooltip && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-10 transition-opacity duration-200 opacity-0 animate-fade-in-up"
                    style={{ animationFillMode: "forwards" }}
                  >
                    คัดลอกลิงก์
                  </div>
                )}
              </div>
            </div>

            {/* --- Image Gallery --- */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border shadow-sm">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                {/* Main Image */}
                {images.length > 0 ? (
                  images.map((src, idx) => (
                    <img
                      key={src + idx}
                      src={src}
                      alt={`รูปสิ่งของ ${idx + 1}`}
                      className={`w-full h-full object-contain absolute top-0 left-0 transition-opacity duration-300 ease-in-out bg-black ${
                        currentImageIndex === idx ? "opacity-100" : "opacity-0"
                      }`}
                      onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                    />
                  ))
                ) : (
                  <img
                    src="/img/default-placeholder.jpg"
                    alt="ไม่มีรูปภาพ"
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Navigation Buttons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-slate-700 p-2 rounded-full shadow-md transition-all duration-200"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/70 hover:bg-white text-slate-700 p-2 rounded-full shadow-md transition-all duration-200"
                      aria-label="Next image"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                  {images.map((src, idx) => (
                    <button
                      key={`thumb-${idx}`}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-24 h-18 rounded-lg overflow-hidden transition-all duration-200 border-2 ${
                        currentImageIndex === idx
                          ? "border-rose-500 ring-2 ring-rose-300"
                          : "border-slate-200 hover:border-rose-300"
                      }`}
                    >
                      <img
                        src={src}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
                      />
                    </button>
                  ))}
                  {images.length > 4 && (
                    <button className="flex-shrink-0 w-24 h-18 rounded-lg border-2 border-slate-300 bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-medium hover:bg-slate-200 transition">
                      <ImageIcon size={20} className="mb-1" /> ดูทั้งหมด
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* --- Description --- */}
            <div className="bg-white p-6 rounded-2xl border border-l-4 border-rose-500 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-800 mb-3">รายละเอียดสิ่งของ</h2>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-base">
                {item.description || "ไม่มีรายละเอียดสิ่งของให้แสดง"}
              </p>

              {/* --- สิ่งที่ต้องการแลก: ข้อความ + แกลเลอรีรูป --- */}
              {(item.item_receive || wantedImages.length > 0) && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h3 className="font-semibold text-slate-800 text-lg mb-2">สิ่งที่ต้องการแลก:</h3>

                  {/* ข้อความ */}
                  {item.item_receive && (
                    <p className="text-slate-700 font-medium bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-lg inline-block shadow-sm">
                      {item.item_receive}
                    </p>
                  )}

                  {/* แกลเลอรีรูป */}
                  {wantedImages.length > 0 && (
                    <div className="mt-4">
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {wantedImages.map((src, idx) => (
                          <button
                            key={`want-thumb-${idx}`}
                            onClick={() => openWantedAt(idx)}
                            className={`flex-shrink-0 w-24 h-18 rounded-lg overflow-hidden transition-all duration-200 border-2 ${
                              wantedIndex === idx && showWantedViewer
                                ? "border-rose-500 ring-2 ring-rose-300"
                                : "border-slate-200 hover:border-rose-300"
                            }`}
                            title="แตะเพื่อดูภาพใหญ่"
                          >
                            <img
                              src={src || "/img/default-placeholder.jpg"}
                              alt={`รูปสิ่งที่ต้องการแลก ${idx + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) =>
                                (e.currentTarget.src = "/img/default-placeholder.jpg")
                              }
                            />
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">แตะรูปเพื่อดูภาพใหญ่</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* --- Owner Info --- */}
            <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 group hover:bg-slate-50 transition-colors duration-200">
              <img
                src={item.profilePic}
                alt={item.profileUsername}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-200"
                onError={(e) => (e.currentTarget.src = "/images/profile-placeholder.jpg")}
              />
              <div>
                <p className="text-sm text-slate-500">โพสต์โดย</p>
                <p className="font-bold text-xl text-slate-800 group-hover:text-rose-600 transition-colors duration-200">
                  {item.profileUsername}
                </p>

                {item?.user_id ? (
                  <Link
                    href={`/profilecat?uid=${encodeURIComponent(item.user_id)}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1
                               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-400 rounded"
                    prefetch
                    aria-label={`ดูโปรไฟล์ของ ${item?.profileUsername ?? "ผู้ใช้"}`}
                  >
                    <User size={14} aria-hidden="true" />
                    <span>ดูโปรไฟล์</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm text-slate-400 mt-1 cursor-not-allowed">
                    <User size={14} aria-hidden="true" />
                    <span>ดูโปรไฟล์</span>
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Actions and Controls */}
          <aside className="space-y-6 lg:sticky lg:top-24 h-fit">
            {authReady && !isOwner && (
              <div className="bg-white p-5 rounded-2xl border shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 mb-3">สนใจแลกเปลี่ยนกับสิ่งของชิ้นนี้?</h2>
                <p className="text-sm text-slate-600 mb-5">
                  กดปุ่มด้านล่างเพื่อส่งข้อความแจ้งความสนใจถึงเจ้าของโพสต์ได้เลย!
                </p>
                <InterestButton item={item} />
              </div>
            )}

            {authReady && isOwner && (
              <div className="bg-white rounded-2xl border shadow-sm">
                <div className="p-5 border-b border-slate-200">
                  <h2 className="text-xl font-bold text-slate-800">จัดการโพสต์ของคุณ</h2>
                  <p className="text-sm text-slate-600 mt-1">อัปเดตสถานะหรือแก้ไขข้อมูล</p>
                </div>
                <div className="p-5 space-y-4">
                  <OwnerStatusPanel
                    item={item}
                    onChanged={(s) => setItem((prev) => ({ ...prev, status: s }))}
                  />
                  <OwnerControls item={item} />
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col items-center gap-4">
              {authReady && <AdminControls item={item} />}

              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ArrowLeft size={18} /> กลับสู่หน้าหลัก
              </button>
            </div>
          </aside>
        </main>
      </div>

      {/* ===== Lightbox: ดูภาพใหญ่ของ "สิ่งที่ต้องการแลก" ===== */}
      {showWantedViewer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeWanted}
          role="dialog"
          aria-modal="true"
          aria-label="ภาพสิ่งที่ต้องการแลก"
        >
          <div
            className="relative w-full max-w-4xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeWanted}
              className="absolute -top-10 right-0 md:top-2 md:right-2 p-2 rounded-full bg-white/90 text-slate-800 shadow hover:bg-white"
              aria-label="ปิด"
            >
              <X size={18} />
            </button>

            {wantedImages.length > 1 && (
              <>
                <button
                  onClick={prevWanted}
                  className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-slate-800 shadow hover:bg-white"
                  aria-label="ภาพก่อนหน้า"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={nextWanted}
                  className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 text-slate-800 shadow hover:bg-white"
                  aria-label="ภาพถัดไป"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div className="w-full h-full rounded-lg overflow-hidden bg-black">
              <img
                src={wantedImages[wantedIndex] || "/img/default-placeholder.jpg"}
                alt={`ภาพสิ่งที่ต้องการแลก ${wantedIndex + 1}`}
                className="w-full h-full object-contain select-none"
                onError={(e) => (e.currentTarget.src = "/img/default-placeholder.jpg")}
              />
            </div>

            {wantedImages.length > 1 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs">
                {wantedIndex + 1} / {wantedImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      <CopyLinkToast show={showCopyToast} onDismiss={() => setShowCopyToast(false)} />
      <Footer />
    </>
  );
}
