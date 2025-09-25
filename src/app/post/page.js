"use client";
/**
 * PostItemUI (Client Component)
 * ---------------------------------------------------------
 * หน้าสร้าง “โพสต์แลกเปลี่ยนสิ่งของ”
 * งานหลัก:
 *  - ตรวจสอบสถานะล็อกอิน (Firebase Auth) และบังคับให้ล็อกอินก่อนโพสต์
 *  - รับข้อมูลฟอร์ม + รูปหลายรูป (ของที่นำมาแลก) + รูป 1 รูป (ของที่ต้องการแลก)
 *  - อัปโหลดรูปขึ้น Firebase Storage → ได้ URL
 *  - สร้างเอกสารโพสต์ใหม่ใน Firestore (items)
 * UX:
 *  - แสดงตัวอย่างรูป (preview), ปุ่มลบรูป, สถานะกำลังโพสต์, และข้อความแจ้งเตือน
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";   // ใช้เปลี่ยนหน้า (redirect) หลังโพสต์เสร็จ
import { motion } from "framer-motion";         // ทำอนิเมชันเข้า/จาง
import { Camera, Trash, ImageIcon, Send } from "lucide-react";

import { db, auth, storage } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

/* สไตล์พื้นฐานของ input/label เพื่อให้โค้ดอ่านง่ายขึ้น */
const inputBase =
  "w-full p-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-300";
const labelBase = "block text-sm font-semibold text-slate-700 mb-2";

/* ข้อกำหนดไฟล์รูป */
const MAX_MB = 10;  // จำกัดขนาดไฟล์ต่อรูป (MB)
const ALLOW_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

/**
 * uploadImage(file, folderName, uid)
 * ---------------------------------------------------------
 * อัปโหลดรูปขึ้น Firebase Storage แล้วคืนค่า downloadURL
 * - ตรวจสอบ: ต้องล็อกอินก่อน / ชนิดไฟล์ / ขนาดไฟล์
 * - ตั้งชื่อไฟล์ให้ปลอดภัย (safeName) + ใส่ timestamp ป้องกันซ้ำ
 * - แนบ metadata.contentType เพื่อการเสิร์ฟที่ถูกต้อง
 */
async function uploadImage(file, folderName, uid) {
  if (!file) return null;
  if (!uid) throw new Error("กรุณาล็อกอินก่อน");

  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`ไฟล์รูปใหญ่เกิน ${MAX_MB}MB`);
  }
  if (file.type && !ALLOW_TYPES.includes(file.type)) {
    throw new Error("ชนิดไฟล์ไม่รองรับ (รองรับ: jpg, png, webp, gif, heic)");
  }

  const safeName = file.name?.replace(/[^\w.\-]+/g, "_") || `image_${Date.now()}.jpg`;
  const filePath = `${folderName}/${Date.now()}_${safeName}`;
  const fileRef = storageRef(storage, filePath);
  const metadata = { contentType: file.type || "image/jpeg" };

  try {
    const snap = await uploadBytes(fileRef, file, metadata);
    const url = await getDownloadURL(snap.ref);
    return url;
  } catch (err) {
    console.error("upload error", {
      code: err?.code,
      message: err?.message,
      serverResponse: err?.serverResponse,
    });
    const msg =
      err?.code === "storage/unauthorized"
        ? "ไม่ได้รับอนุญาตให้อัปโหลด (เช็ค Storage Rules แล้วกด Publish)"
        : "อัปโหลดรูปไม่สำเร็จ";
    throw new Error(msg);
  }
}

export default function PostItemUI() {
  const router = useRouter();                 // ใช้เปลี่ยนหน้าเมื่อโพสต์สำเร็จ
  const [user, setUser] = useState(null);     // ผู้ใช้ปัจจุบัน (null = ยังไม่ล็อกอิน)
  const [authReady, setAuthReady] = useState(false); // รอ Auth ให้พร้อมเพื่อเรนเดอร์สถานะได้ถูกต้อง

  /* สถานะฟอร์ม/ปุ่มส่ง */
  const [message, setMessage] = useState("");           // ข้อความแจ้งเตือนผลลัพธ์/ข้อผิดพลาด
  const [isSubmitting, setIsSubmitting] = useState(false); // กันการกดซ้ำ/โชว์สถานะกำลังโพสต์

  /* ค่าฟอร์มหลัก */
  const [formData, setFormData] = useState({
    itemGive: "",
    itemReceive: "",
    description: "",
    category: "electronics:general",
    condition: "new",
    customCategory: "",
  });

  /* รูปที่อัปโหลดจากผู้ใช้ (ไฟล์จริง) */
  const [itemImages, setItemImages] = useState([]);      // รูปของ “สิ่งที่นำมาแลก” (หลายรูป)
  const [itemWantedImage, setItemWantedImage] = useState(null); // รูป “สิ่งที่ต้องการแลก” (1 รูป)
  const [previews, setPreviews] = useState([]);          // URL สำหรับพรีวิว (สร้างจาก File object)

  /**
   * ฟังสถานะการล็อกอิน (Auth)
   * -------------------------------------------------------
   * - ตั้ง persistence = localStorage (อยู่รอดระหว่างปิด/เปิดเบราว์เซอร์)
   * - onAuthStateChanged: อัปเดต state user แบบเรียลไทม์
   */
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  /**
   * สร้าง/ล้าง URL สำหรับแสดงตัวอย่างรูป (ของที่นำมาแลก)
   * - ใช้ URL.createObjectURL เพื่อพรีวิวไฟล์ท้องถิ่น
   * - ล้าง (revoke) เมื่อเปลี่ยนภาพ/ออกจากหน้าเพื่อไม่ให้หน่วยความจำค้าง
   */
  useEffect(() => {
    const urls = itemImages.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [itemImages]);

  /* อัปเดตค่าฟอร์มตามชื่อช่อง (name) */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * เลือกไฟล์รูป (2 ช่อง)
   * - #upload-give: เลือกหลายรูปของสิ่งที่นำมาแลก
   * - #upload-receive-1: เลือกรูปเดียวของสิ่งที่ต้องการแลก
   */
  const handleFileChange = (e) => {
    const { id, files } = e.target;
    if (id === "upload-give") {
      setItemImages(Array.from(files || []));
    } else if (id === "upload-receive-1") {
      setItemWantedImage(files?.[0] || null);
    }
  };

  /* ลบรูปจากรายการพรีวิว (ตาม index) */
  const removeImageAt = (index) => {
    setItemImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* รีเซ็ตฟอร์มและรูปทั้งหมด */
  const clearAll = () => {
    setFormData({
      itemGive: "",
      itemReceive: "",
      description: "",
      category: "electronics:general",
      condition: "new",
      customCategory: "",
    });
    setItemImages([]);
    setItemWantedImage(null);
    setMessage("");
  };

  /**
   * ส่งฟอร์มโพสต์
   * ขั้นตอน:
   *  1) กันกดซ้ำ / ล้างข้อความเดิม
   *  2) ตรวจความครบถ้วนของข้อมูล + บังคับแนบรูป
   *  3) อัปโหลดรูปทั้งหมดขึ้น Storage → ได้ URL
   *  4) บันทึกเอกสารโพสต์ใหม่ลง Firestore (items)
   *  5) นำทางกลับหน้าแรก (router.replace("/"))
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    const { itemGive, itemReceive, description, category, condition, customCategory } = formData;
    const finalCategory = category === "other" ? (customCategory || "").trim() : category;

    // ตรวจความครบถ้วนของฟอร์ม
    if (!itemGive || !itemReceive || !description || !finalCategory || !condition) {
      setMessage("❌ กรุณากรอกข้อมูลให้ครบถ้วน");
      setIsSubmitting(false);
      return;
    }
    // บังคับให้แนบรูปครบทั้งสองฝั่ง
    if (!itemImages.length || !itemWantedImage) {
      setMessage("❌ กรุณาแนบรูปภาพ");
      setIsSubmitting(false);
      return;
    }
    // ต้องล็อกอินก่อนโพสต์
    if (!user) {
      setMessage("❌ กรุณาล็อกอินก่อนโพสต์");
      setIsSubmitting(false);
      return;
    }

    try {
      const uid = user.uid;

      /* 3) อัปโหลดรูปทั้งหมด → เก็บ URL */
      const itemImageUrls = [];
      for (const imageFile of itemImages) {
        const url = await uploadImage(imageFile, `items/${uid}`, uid);
        if (url) itemImageUrls.push(url);
      }
      const wantedImageURL = await uploadImage(itemWantedImage, `items/${uid}/wanted`, uid);

      /* 4) สร้างเอกสารโพสต์ใน Firestore */
      await addDoc(collection(db, "items"), {
        item_give: formData.itemGive,
        item_receive: formData.itemReceive,
        description: formData.description,
        category: finalCategory,
        condition: formData.condition,
        createdAt: serverTimestamp(),
        user_id: uid,
        item_images: itemImageUrls,
        item_wanted_image: wantedImageURL,
        status: "available",
      });

      /* 5) โพสต์สำเร็จ → กลับหน้าแรก
       * - ใช้ replace() เพื่อไม่ให้ผู้ใช้กด Back แล้วกลับมาซ้ำโพสต์เดิม
       *   (ถ้าต้องการให้กดย้อนกลับได้ ให้เปลี่ยนเป็น router.push("/"))
       */
      router.replace("/");

    } catch (e) {
      console.error(e);
      setMessage(`❌ เกิดข้อผิดพลาดในการโพสต์: ${e?.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------------------------ UI ------------------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 py-8 px-4 sm:py-12 sm:px-6">
      <div className="max-w-6xl w-full mx-auto">
        {/* เงื่อนไขเรนเดอร์ 3 สถานะ: รอ Auth / ยังไม่ล็อกอิน / พร้อมโพสต์ */}
        {!authReady ? (
          <div className="text-center py-24 text-slate-500">กำลังตรวจสอบสถานะผู้ใช้…</div>
        ) : !user ? (
          <div className="text-center py-24">
            <p className="text-lg font-semibold mb-2">ต้องเข้าสู่ระบบก่อนโพสต์</p>
            <a href="/login" className="text-rose-600 underline">ไปหน้าเข้าสู่ระบบ</a>
          </div>
        ) : (
          <>
            {/* ส่วนหัว (มีอนิเมชันเลื่อนลง/จางเข้า) */}
            <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 md:mb-8">
              <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-extrabold text-rose-600">โพสต์แลกเปลี่ยนสิ่งของ</h1>
              <p className="mt-2 text-center text-sm sm:text-base text-slate-600">สร้างโพสต์สวย ๆ และค้นหาผู้แลกเปลี่ยนได้ง่าย</p>
            </motion.header>

            {/* ฟอร์มหลัก (มีอนิเมชันจางเข้า) */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
            >
              {/* LEFT: แบบฟอร์มข้อมูลและปุ่มอัปโหลด */}
              <div className="md:col-span-2 space-y-5 sm:space-y-6">
                {/* แถวชื่อสิ่งของ (ให้/ต้องการ) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className={labelBase}>ชื่อสิ่งของที่นำมาแลก</label>
                    <input
                      name="itemGive"
                      value={formData.itemGive}
                      onChange={handleInputChange}
                      placeholder="เช่น iPhone 12 สีดำ"
                      className={inputBase}
                    />
                  </div>

                  <div>
                    <label className={labelBase}>ชื่อสิ่งของที่ต้องการแลก</label>
                    <input
                      name="itemReceive"
                      value={formData.itemReceive}
                      onChange={handleInputChange}
                      placeholder="เช่น หูฟังไร้สาย"
                      className={inputBase}
                    />
                  </div>
                </div>

                {/* สภาพสินค้า + หมวดหมู่ (รองรับ “อื่น ๆ (กรอกเอง)”) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className={labelBase}>สภาพสินค้า</label>
                    <select name="condition" value={formData.condition} onChange={handleInputChange} className={inputBase}>
                      <option value="new">ใหม่</option>
                      <option value="used">มือสอง</option>
                      <option value="refurbished">คืนสภาพ/ซ่อมแล้ว</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelBase}>หมวดหมู่สินค้า</label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={inputBase + " appearance-none pr-10"}
                      >
                        {/* กลุ่มหมวดหมู่หลัก ๆ */}
                        <optgroup label="อิเล็กทรอนิกส์">
                          <option value="electronics:phones">โทรศัพท์ & อุปกรณ์</option>
                          <option value="electronics:computers">คอมพิวเตอร์ & แล็ปท็อป</option>
                          <option value="electronics:audio">เครื่องเสียง & หูฟัง</option>
                          <option value="electronics:appliances">เครื่องใช้ไฟฟ้าเล็ก</option>
                          <option value="electronics:general">อื่น ๆ (อิเล็กทรอนิกส์)</option>
                        </optgroup>

                        <optgroup label="บ้าน & เฟอร์นิเจอร์">
                          <option value="home:furniture">เฟอร์นิเจอร์</option>
                          <option value="home:decor">ของแต่งบ้าน</option>
                          <option value="home:kitchen">เครื่องครัว</option>
                        </optgroup>

                        <optgroup label="แฟชั่น">
                          <option value="clothes:men">เสื้อผ้าผู้ชาย</option>
                          <option value="clothes:women">เสื้อผ้าผู้หญิง</option>
                          <option value="clothes:children">เสื้อผ้าเด็ก</option>
                        </optgroup>

                        <optgroup label="งานอดิเรก & สันทนาการ">
                          <option value="books">หนังสือ</option>
                          <option value="sports">กีฬา</option>
                          <option value="toys">ของเล่น & เกม</option>
                          <option value="music">เครื่องดนตรี</option>
                        </optgroup>

                        <optgroup label="อื่น ๆ">
                          <option value="beauty">ความงาม</option>
                          <option value="automotive">ยานยนต์</option>
                          <option value="baby">สำหรับเด็ก</option>
                          <option value="pet">สัตว์เลี้ยง</option>
                          <option value="art">งานศิลป์ & ของสะสม</option>
                          <option value="office">ออฟฟิศ & การศึกษา</option>
                        </optgroup>

                        <option value="other">อื่น ๆ (กรอกเอง)</option>
                      </select>

                      {/* ช่องกรอกหมวดหมู่เอง เมื่อเลือก “อื่น ๆ (กรอกเอง)” */}
                      {formData.category === "other" && (
                        <input
                          name="customCategory"
                          value={formData.customCategory}
                          onChange={handleInputChange}
                          placeholder="ระบุหมวดหมู่ที่ต้องการ"
                          className={inputBase + " mt-3"}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* รายละเอียดเพิ่มเติม (ข้อความยาว) */}
                <div>
                  <label className={labelBase}>รายละเอียดเพิ่มเติม</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="บอกสภาพ รายละเอียด ข้อจำกัด หรือสิ่งที่ควรรู้"
                    className={inputBase + " min-h-[120px] resize-none"}
                  />
                </div>

                {/* ปุ่มเลือกไฟล์ + ปุ่มรีเซ็ต/โพสต์ */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {/* เลือกหลายรูปของสิ่งที่นำมาแลก */}
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-give").click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-2xl shadow hover:shadow-md transition w-full sm:w-auto"
                  >
                    <ImageIcon className="w-5 h-5" /> แนบรูปหลายรูป
                  </button>

                  {/* เลือกรูปเดียวของสิ่งที่ต้องการแลก */}
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-receive-1").click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl hover:bg-slate-50 transition w-full sm:w-auto"
                  >
                    <Camera className="w-4 h-4 text-slate-700" /> แนบรูปที่ต้องการแลก (1 รูป)
                  </button>

                  {/* รีเซ็ต/ส่งฟอร์ม */}
                  <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:items-center sm:ml-auto">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 w-full sm:w-auto"
                    >
                      รีเซ็ต
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-3 px-5 py-3 bg-rose-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60 w-full sm:w-auto"
                    >
                      {isSubmitting ? (
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>{isSubmitting ? "กำลังโพสต์..." : "โพสต์"}</span>
                    </button>
                  </div>
                </div>

                {/* แถบข้อความแจ้งเตือน (ผิดพลาด/คำแนะนำ) */}
                {message && <p className="mt-2 text-center text-sm text-rose-600 font-medium">{message}</p>}

                {/* อินพุตไฟล์จริง (ถูกซ่อนไว้) */}
                <input id="upload-give" type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                <input id="upload-receive-1" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* RIGHT: ตัวอย่างโพสต์ + ข้อมูลผู้ใช้ */}
              <aside className="flex flex-col items-stretch gap-4 md:col-span-1">
                {/* การ์ดพรีวิวรูป */}
                <div className="bg-gradient-to-br from-white to-rose-50 p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-700">ตัวอย่างโพสต์</h3>
                  <p className="text-sm text-slate-500 mt-1">ตรวจสอบภาพและข้อมูลก่อนโพสต์</p>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                    {previews.length > 0 ? (
                      previews.slice(0, 4).map((src, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden bg-slate-100">
                          <img src={src} alt={`preview-${i}`} className="object-cover w-full h-24 sm:h-28" />
                          <button
                            type="button"
                            onClick={() => removeImageAt(i)}
                            className="absolute top-2 right-2 bg-white/80 p-1 rounded-full shadow"
                          >
                            <Trash className="w-4 h-4 text-rose-600" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 flex flex-col items-center justify-center p-5 sm:p-6 border-2 border-dashed border-slate-200 rounded-xl">
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                        <p className="text-sm mt-2 text-slate-400">ยังไม่มีรูปที่แนบ</p>
                      </div>
                    )}

                    {/* พรีวิว “รูปที่ต้องการแลก” */}
                    <div className="col-span-2 mt-2">
                      <label className="text-sm font-medium text-slate-700">รูปที่ต้องการแลก</label>
                      <div className="mt-2 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                        {itemWantedImage ? (
                          // หมายเหตุ: การเรียก URL.createObjectURL ใน render จะสร้าง URL ใหม่ทุกครั้ง
                          // ถ้าต้องการประหยัดหน่วยความจำ ควร memoize และ revoke (ดูข้อเสนอแนะด้านล่าง)
                          <img src={URL.createObjectURL(itemWantedImage)} alt="wanted" className="object-cover w-full h-40 sm:h-48" />
                        ) : (
                          <div className="flex items-center justify-center p-5 sm:p-6 text-slate-400">ยังไม่มีรูปที่เลือก</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* การ์ดข้อมูลผู้ใช้ (แสดงอีเมล + วันที่วันนี้) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 text-sm text-slate-600 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500">ผู้ใช้</div>
                      <div className="font-medium text-slate-800">{user?.email ?? "ผู้เยี่ยมชม"}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">{new Date().toLocaleDateString("th-TH")}</div>
                  </div>
                </div>
              </aside>
            </motion.form>

            {/* ฟุตเตอร์สั้น ๆ */}
            <footer className="mt-8 text-center text-xs text-slate-400">
              SWAPPO — แพลตฟอร์มแลกเปลี่ยนของคนไทย
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
