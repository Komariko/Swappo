"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { updateItem, deleteItem, isAdmin } from "@/firebase/functions";
import {
  FiSave,
  FiTrash2,
  FiArrowLeft,
  FiAlertTriangle,
  FiLoader,
} from "react-icons/fi"; //
// npm install react-icons

/** ===== ตัวเลือกคงที่ (Constants) ===== */
// เงื่อนไขสินค้า — ให้ตรงกับหน้าโพสต์ใหม่
const CONDITION_OPTIONS = [
  { value: "new",         label: "ใหม่" },
  { value: "used",        label: "มือสอง" },
  { value: "refurbished", label: "คืนสภาพ/ซ่อมแล้ว" },
];

/** หมวดหมู่ — ครอบคลุมเหมือนหน้าโพสต์ใหม่ (ค่า value เหมือนกัน) */
const CATEGORY_OPTIONS = [
  // อิเล็กทรอนิกส์
  { value: "electronics:phones",           label: "อิเล็กทรอนิกส์ • โทรศัพท์ & แท็บเล็ต" },
  { value: "electronics:wearables",        label: "อิเล็กทรอนิกส์ • สมาร์ทวอทช์/อุปกรณ์สวมใส่" },
  { value: "electronics:computers",        label: "อิเล็กทรอนิกส์ • คอมพิวเตอร์ & แล็ปท็อป" },
  { value: "electronics:peripherals",      label: "อิเล็กทรอนิกส์ • อุปกรณ์เสริมคอมพ์" },
  { value: "electronics:cameras",          label: "อิเล็กทรอนิกส์ • กล้องถ่ายรูป & เลนส์" },
  { value: "electronics:audio",            label: "อิเล็กทรอนิกส์ • เครื่องเสียง/หูฟัง" },
  { value: "electronics:gaming",           label: "อิเล็กทรอนิกส์ • เกมคอนโซล & อุปกรณ์" },
  { value: "electronics:networking",       label: "อิเล็กทรอนิกส์ • อุปกรณ์เครือข่าย/เราเตอร์" },
  { value: "electronics:appliances-small", label: "อิเล็กทรอนิกส์ • เครื่องใช้ไฟฟ้าขนาดเล็ก" },
  { value: "electronics:appliances-large", label: "อิเล็กทรอนิกส์ • เครื่องใช้ไฟฟ้าขนาดใหญ่" },
  { value: "electronics:general",          label: "อิเล็กทรอนิกส์ • อื่น ๆ" },

  // คอมพิวเตอร์ (ย่อยแยกละเอียด)
  { value: "pc:desktops",     label: "คอมพิวเตอร์ • เดสก์ท็อป/มินิพีซี/เซิร์ฟเวอร์" },
  { value: "pc:laptops",      label: "คอมพิวเตอร์ • โน้ตบุ๊ก/แมคบุ๊ก" },
  { value: "pc:monitors",     label: "คอมพิวเตอร์ • จอภาพ" },
  { value: "pc:parts",        label: "คอมพิวเตอร์ • ชิ้นส่วน (CPU/GPU/RAM/เมนบอร์ด)" },
  { value: "pc:storage",      label: "คอมพิวเตอร์ • สตอเรจ (HDD/SSD/NAS)" },
  { value: "pc:peripherals",  label: "คอมพิวเตอร์ • คีย์บอร์ด/เมาส์/ด๊องเกิล" },
  { value: "pc:general",      label: "คอมพิวเตอร์ • อื่น ๆ" },

  // บ้าน & เฟอร์นิเจอร์
  { value: "home:furniture", label: "บ้าน • เฟอร์นิเจอร์" },
  { value: "home:decor",     label: "บ้าน • ของแต่งบ้าน" },
  { value: "home:kitchen",   label: "บ้าน • เครื่องครัว" },
  { value: "home:lighting",  label: "บ้าน • โคมไฟ/หลอดไฟ" },
  { value: "home:storage",   label: "บ้าน • ชั้นวาง/กล่องจัดเก็บ" },
  { value: "home:cleaning",  label: "บ้าน • อุปกรณ์ทำความสะอาด" },
  { value: "home:general",   label: "บ้าน • อื่น ๆ" },

  // เครื่องมือช่าง & อุตสาหกรรม
  { value: "tools:hand",    label: "เครื่องมือ • เครื่องมือช่างมือ" },
  { value: "tools:power",   label: "เครื่องมือ • เครื่องมือไฟฟ้า" },
  { value: "tools:measure", label: "เครื่องมือ • อุปกรณ์วัด/งานไฟฟ้า" },
  { value: "tools:safety",  label: "เครื่องมือ • อุปกรณ์เซฟตี้" },
  { value: "tools:general", label: "เครื่องมือ • อื่น ๆ" },

  // สวน & กลางแจ้ง
  { value: "garden:plants",   label: "สวน/กลางแจ้ง • ต้นไม้/เมล็ด/ดิน" },
  { value: "garden:tools",    label: "สวน/กลางแจ้ง • อุปกรณ์ทำสวน" },
  { value: "outdoor:camping", label: "สวน/กลางแจ้ง • แคมปิ้ง/เดินป่า" },
  { value: "outdoor:fishing", label: "สวน/กลางแจ้ง • ตกปลา" },
  { value: "outdoor:general", label: "สวน/กลางแจ้ง • อื่น ๆ" },

  // กีฬา & จักรยาน
  { value: "sports:fitness",  label: "กีฬา • ฟิตเนส/อุปกรณ์ออกกำลัง" },
  { value: "sports:team",     label: "กีฬา • กีฬาทีม/ลูกบอล" },
  { value: "sports:water",    label: "กีฬา • กีฬาทางน้ำ" },
  { value: "bikes:bicycles",  label: "กีฬา • จักรยาน/สกู๊ตเตอร์" },
  { value: "bikes:parts",     label: "กีฬา • อะไหล่/อุปกรณ์จักรยาน" },
  { value: "sports:general",  label: "กีฬา • อื่น ๆ" },

  // ยานยนต์
  { value: "auto:car-parts",   label: "ยานยนต์ • อะไหล่รถยนต์" },
  { value: "auto:moto-parts",  label: "ยานยนต์ • อะไหล่มอเตอร์ไซค์" },
  { value: "auto:accessories", label: "ยานยนต์ • อุปกรณ์/ของแต่ง/ดูแลรักษา" },
  { value: "auto:tires",       label: "ยานยนต์ • ยาง/ล้อ" },
  { value: "auto:general",     label: "ยานยนต์ • อื่น ๆ" },

  // แฟชั่น
  { value: "fashion:men",        label: "แฟชั่น • เสื้อผ้าผู้ชาย" },
  { value: "fashion:women",      label: "แฟชั่น • เสื้อผ้าผู้หญิง" },
  { value: "fashion:kids",       label: "แฟชั่น • เสื้อผ้าเด็ก" },
  { value: "fashion:shoes",      label: "แฟชั่น • รองเท้า" },
  { value: "fashion:bags",       label: "แฟชั่น • กระเป๋า" },
  { value: "fashion:accessories",label: "แฟชั่น • แอ็กเซสซอรี" },
  { value: "fashion:jewelry",    label: "แฟชั่น • เครื่องประดับ" },
  { value: "fashion:watches",    label: "แฟชั่น • นาฬิกา" },
  { value: "fashion:general",    label: "แฟชั่น • อื่น ๆ" },

  // แม่ & เด็ก
  { value: "baby:gear",    label: "แม่ & เด็ก • รถเข็น/คาร์ซีท/อุปกรณ์" },
  { value: "baby:toys",    label: "แม่ & เด็ก • ของเล่นเด็ก" },
  { value: "baby:clothes", label: "แม่ & เด็ก • เสื้อผ้าเด็ก" },
  { value: "baby:general", label: "แม่ & เด็ก • อื่น ๆ" },

  // สัตว์เลี้ยง
  { value: "pet:supplies", label: "สัตว์เลี้ยง • อาหาร/ทราย/อุปกรณ์" },
  { value: "pet:grooming", label: "สัตว์เลี้ยง • กรูมมิ่ง/ดูแล" },
  { value: "pet:general",  label: "สัตว์เลี้ยง • อื่น ๆ" },

  // หนังสือ & ออฟฟิศ/การศึกษา
  { value: "books:books",     label: "หนังสือ/การศึกษา • หนังสือ/นิยาย/การ์ตูน" },
  { value: "books:textbooks", label: "หนังสือ/การศึกษา • ตำรา/การศึกษา" },
  { value: "office:stationery",label: "หนังสือ/การศึกษา • เครื่องเขียน/อุปกรณ์สำนักงาน" },
  { value: "office:printers",  label: "หนังสือ/การศึกษา • ปริ้นเตอร์/หมึก" },
  { value: "office:general",   label: "หนังสือ/การศึกษา • อื่น ๆ" },

  // ของเล่น & งานอดิเรก
  { value: "toys:toys",         label: "ของเล่น/งานอดิเรก • ของเล่น" },
  { value: "toys:boardgames",   label: "ของเล่น/งานอดิเรก • บอร์ดเกม/การ์ดเกม" },
  { value: "collectibles:figures",label: "ของเล่น/งานอดิเรก • ฟิกเกอร์/โมเดล/เลโก้" },
  { value: "hobby:crafts",      label: "ของเล่น/งานอดิเรก • งานฝีมือ/งานประดิษฐ์" },
  { value: "hobby:general",     label: "ของเล่น/งานอดิเรก • อื่น ๆ" },

  // ดนตรี & สตูดิโอ
  { value: "music:instruments", label: "ดนตรี • เครื่องดนตรี" },
  { value: "music:studio",      label: "ดนตรี • ไมค์/มิกเซอร์/อัดเสียง" },
  { value: "music:general",     label: "ดนตรี • อื่น ๆ" },

  // ศิลป์ & สะสม
  { value: "art:artworks",        label: "ศิลป์/สะสม • งานศิลป์/ภาพวาด/งานพิมพ์" },
  { value: "collectibles:antiques",label: "ศิลป์/สะสม • ของสะสม/ของเก่า" },
  { value: "collectibles:coins",   label: "ศิลป์/สะสม • เหรียญ/แสตมป์" },
  { value: "art:general",          label: "ศิลป์/สะสม • อื่น ๆ" },

  // ความงาม & สุขภาพ
  { value: "beauty:skincare", label: "ความงาม/สุขภาพ • สกินแคร์" },
  { value: "beauty:makeup",   label: "ความงาม/สุขภาพ • เมคอัพ" },
  { value: "beauty:hair",     label: "ความงาม/สุขภาพ • ดูแลผม" },
  { value: "health:devices",  label: "ความงาม/สุขภาพ • อุปกรณ์สุขภาพ" },
  { value: "beauty:general",  label: "ความงาม/สุขภาพ • อื่น ๆ" },

  // ท่องเที่ยว & ไลฟ์สไตล์
  { value: "travel:luggage",    label: "ท่องเที่ยว/ไลฟ์สไตล์ • กระเป๋าเดินทาง" },
  { value: "travel:accessories",label: "ท่องเที่ยว/ไลฟ์สไตล์ • อุปกรณ์ท่องเที่ยว" },
  { value: "lifestyle:general", label: "ท่องเที่ยว/ไลฟ์สไตล์ • อื่น ๆ" },

  // ดิจิทัล
  { value: "digital:software",  label: "ดิจิทัล • ซอฟต์แวร์/แอป" },
  { value: "digital:media",     label: "ดิจิทัล • สื่อดิจิทัล (ภาพ/เสียง)" },
  { value: "digital:game-keys", label: "ดิจิทัล • คีย์เกม/ไอเท็มในเกม" },
  { value: "digital:general",   label: "ดิจิทัล • อื่น ๆ" },

  // อื่น ๆ (ค่าเดิม)
  { value: "other", label: "อื่น ๆ (ค่าเดิม/กรอกเองในหน้าโพสต์ใหม่)" },
];

// สถานะ
const STATUS_OPTIONS = [
  { value: "available", label: "พร้อมแลก" },
  { value: "reserved",  label: "กำลังคุย/จอง" },
  { value: "traded",    label: "แลกเปลี่ยนแล้ว" },
  { value: "hidden",    label: "ซ่อน" },
];

// --- Helper Components ---
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-10">
    <FiLoader className="animate-spin text-4xl text-blue-500" />
  </div>
);

const ErrorMessage = ({ children }) => (
  <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-md flex items-center gap-3">
    <FiAlertTriangle className="text-xl" />
    <p>{children}</p>
  </div>
);

const FormField = ({ label, children }) => (
  <div>
    <label className="block mb-2 text-sm font-medium text-gray-700">
      {label}
    </label>
    {children}
  </div>
);

// --- Main Component ---
export default function ItemEditClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const id = sp.get("id");

  // --- States ---
  const [uid, setUid] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({
    item_give: "",
    item_receive: "",
    description: "",
    condition: "",
    category: "",
    status: "",
  });

  // --- Status States ---
  const [loading, setLoading] = useState(true);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // --- Effects ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
    return () => unsub?.();
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!uid) {
        setIsAdminUser(false);
        setCheckingAdmin(false);
        return;
      }
      setCheckingAdmin(true);
      const ok = await isAdmin().catch(() => false);
      setIsAdminUser(!!ok);
      setCheckingAdmin(false);
    };
    checkAdminStatus();
  }, [uid]);

  useEffect(() => {
    const fetchItem = async () => {
      if (!id) {
        setError("ไม่พบพารามิเตอร์ ID ของสินค้า");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "items", id));
        if (!snap.exists()) {
          setError("ไม่พบข้อมูลสินค้าชิ้นนี้");
          setItem(null);
        } else {
          const data = { id: snap.id, ...snap.data() };
          setItem(data);
          setForm({
            item_give: data.item_give ?? "",
            item_receive: data.item_receive ?? "",
            description: data.description ?? "",
            condition: data.condition ?? "",
            category: data.category ?? "",
            status: data.status ?? "available",
          });
        }
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  // --- Event Handlers ---
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prevForm) => ({ ...prevForm, [name]: value }));
  };

  const onSave = async () => {
    setSaving(true);
    const res = await updateItem(id, form);
    setSaving(false);
    if (res.ok) {
      router.push(`/item?id=${id}`);
    } else {
      setError(`บันทึกไม่สำเร็จ: ${res.reason || "เกิดข้อผิดพลาด"}`);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบโพสต์นี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;
    setDeleting(true);
    const res = await deleteItem(id);
    setDeleting(false);
    if (res.ok) {
      router.push(`/`);
    } else {
      setError(`ลบไม่สำเร็จ: ${res.reason || "เกิดข้อผิดพลาด"}`);
    }
  };

  /** ช่วยเรนเดอร์ option + รองรับค่าที่ไม่อยู่ในลิสต์ (เผื่อมีข้อมูลเก่า) */
  const renderOptions = (options, currentValue) => {
    const exists = options.some((o) => o.value === currentValue);
    return (
      <>
        {!currentValue && <option value="">-- โปรดเลือก --</option>}
        {!exists && currentValue && (
          <option value={currentValue}>{currentValue} (ค่าเดิม)</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </>
    );
  };

  // --- Render Logic ---
  if (loading || checkingAdmin) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <ErrorMessage>{error}</ErrorMessage>
      </div>
    );
  }

  const isOwner = uid && (item?.user_id === uid || item?.uid === uid);
  const canEdit = isOwner || isAdminUser;

  if (!canEdit) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <ErrorMessage>คุณไม่มีสิทธิ์แก้ไขโพสต์นี้</ErrorMessage>
      </div>
    );
  }

  const inputStyles = "w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition";
  const selectStyles = `${inputStyles} appearance-none`;

  return (
    <div className="bg-gray-50 min-h-screen p-4 md:p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden">
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">แก้ไขโพสต์</h1>

          {error && (
            <div className="mb-4">
               <ErrorMessage>{error}</ErrorMessage>
            </div>
          )}

          <div className="space-y-6">
            <FormField label="ของที่คุณมี">
              <input
                type="text"
                name="item_give"
                className={inputStyles}
                value={form.item_give}
                onChange={handleFormChange}
                placeholder="เช่น หนังสือการ์ตูน, หูฟังไร้สาย"
              />
            </FormField>

            <FormField label="ของที่คุณอยากได้">
              <input
                type="text"
                name="item_receive"
                className={inputStyles}
                value={form.item_receive}
                onChange={handleFormChange}
                placeholder="เช่น เมล็ดกาแฟ, เกม Nintendo Switch"
              />
            </FormField>

            <FormField label="รายละเอียดเพิ่มเติม">
              <textarea
                name="description"
                className={inputStyles}
                rows={5}
                value={form.description}
                onChange={handleFormChange}
                placeholder="บอกเล่ารายละเอียดของสินค้า สภาพ หรือข้อมูลอื่นๆ ที่จำเป็น"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="สภาพสินค้า">
                <select name="condition" className={selectStyles} value={form.condition} onChange={handleFormChange}>
                  {renderOptions(CONDITION_OPTIONS, form.condition)}
                </select>
              </FormField>

              <FormField label="หมวดหมู่">
                <select name="category" className={selectStyles} value={form.category} onChange={handleFormChange}>
                  {renderOptions(CATEGORY_OPTIONS, form.category)}
                </select>
              </FormField>
            </div>

            <FormField label="สถานะ">
              <select name="status" className={selectStyles} value={form.status} onChange={handleFormChange}>
                {renderOptions(STATUS_OPTIONS, form.status)}
              </select>
            </FormField>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving || deleting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <FiLoader className="animate-spin" />
            ) : (
              <FiSave />
            )}
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>

          <button
            onClick={() => router.back()}
            disabled={saving || deleting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition"
          >
            <FiArrowLeft />
            ยกเลิก
          </button>
          
          <div className="sm:ml-auto">
             <button
              onClick={onDelete}
              disabled={deleting || saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <FiLoader className="animate-spin" />
              ) : (
                <FiTrash2 />
              )}
              {deleting ? "กำลังลบ..." : "ลบโพสต์"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
