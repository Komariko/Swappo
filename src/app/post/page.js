"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";   // ✅ เพิ่มเพื่อ redirect
import { motion } from "framer-motion";
import { Camera, Trash, ImageIcon, Send } from "lucide-react";

import { db, auth, storage } from "@/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

const inputBase =
  "w-full p-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-300";
const labelBase = "block text-sm font-semibold text-slate-700 mb-2";

const MAX_MB = 10;
const ALLOW_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];

/** อัปโหลดรูปขึ้น Storage แล้วคืน downloadURL (รับ uid จากภายนอก) */
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
        ? "ไม่ได้รับอนุญาตให้อัปโหลด (เช็ค Storage Rules + กด Publish)"
        : "อัปโหลดรูปไม่สำเร็จ";
    throw new Error(msg);
  }
}

export default function PostItemUI() {
  const router = useRouter();   // ✅ ใช้ router
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemGive: "",
    itemReceive: "",
    description: "",
    category: "electronics:general",
    condition: "new",
    customCategory: "",
  });

  const [itemImages, setItemImages] = useState([]); // Files[]
  const [itemWantedImage, setItemWantedImage] = useState(null); // File
  const [previews, setPreviews] = useState([]); // object URLs

  // รอสถานะ auth ให้พร้อมก่อน
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => { });
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u || null);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const urls = itemImages.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [itemImages]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { id, files } = e.target;
    if (id === "upload-give") {
      setItemImages(Array.from(files || []));
    } else if (id === "upload-receive-1") {
      setItemWantedImage(files?.[0] || null);
    }
  };

  const removeImageAt = (index) => {
    setItemImages((prev) => prev.filter((_, i) => i !== index));
  };

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage("");

    const { itemGive, itemReceive, description, category, condition, customCategory } = formData;
    const finalCategory = category === "other" ? (customCategory || "").trim() : category;

    if (!itemGive || !itemReceive || !description || !finalCategory || !condition) {
      setMessage("❌ กรุณากรอกข้อมูลให้ครบถ้วน");
      setIsSubmitting(false);
      return;
    }
    if (!itemImages.length || !itemWantedImage) {
      setMessage("❌ กรุณาแนบรูปภาพ");
      setIsSubmitting(false);
      return;
    }
    if (!user) {
      setMessage("❌ กรุณาล็อกอินก่อนโพสต์");
      setIsSubmitting(false);
      return;
    }

    try {
      const uid = user.uid;
      console.log("UID for upload =", uid);

      // อัปโหลดรูป
      const itemImageUrls = [];
      for (const imageFile of itemImages) {
        const url = await uploadImage(imageFile, `items/${uid}`, uid);
        if (url) itemImageUrls.push(url);
      }
      const wantedImageURL = await uploadImage(itemWantedImage, `items/${uid}/wanted`, uid);

      // เขียน Firestore
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

      // ✅ โพสต์สำเร็จ → กลับไปหน้าแรก
      router.replace("/");   // ใช้ push("/") ถ้าอยากให้กด back กลับมาหน้านี้ได้

    } catch (e) {
      console.error(e);
      setMessage(`❌ เกิดข้อผิดพลาดในการโพสต์: ${e?.message || e}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 py-8 px-4 sm:py-12 sm:px-6">
      <div className="max-w-6xl w-full mx-auto">
        {!authReady ? (
          <div className="text-center py-24 text-slate-500">กำลังตรวจสอบสถานะผู้ใช้…</div>
        ) : !user ? (
          <div className="text-center py-24">
            <p className="text-lg font-semibold mb-2">ต้องเข้าสู่ระบบก่อนโพสต์</p>
            <a href="/login" className="text-rose-600 underline">ไปหน้าเข้าสู่ระบบ</a>
          </div>
        ) : (
          <>
            <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 md:mb-8">
              <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-extrabold text-rose-600">โพสต์แลกเปลี่ยนสิ่งของ</h1>
              <p className="mt-2 text-center text-sm sm:text-base text-slate-600">สร้างโพสต์สวย ๆ และค้นหาผู้แลกเปลี่ยนได้ง่าย</p>
            </motion.header>

            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6"
            >
              {/* LEFT: FORM */}
              <div className="md:col-span-2 space-y-5 sm:space-y-6">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                  <div>
                    <label className={labelBase}>สภาพสิ่งของ</label>
                    <select name="condition" value={formData.condition} onChange={handleInputChange} className={inputBase}>
                      <option value="new">ใหม่</option>
                      <option value="used">มือสอง</option>
                      <option value="refurbished">คืนสภาพ/ซ่อมแล้ว</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelBase}>หมวดหมู่สิ่งของ</label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        className={inputBase + " appearance-none pr-10"}
                      >
                        {/* อิเล็กทรอนิกส์ */}
                        <optgroup label="อิเล็กทรอนิกส์">
                          <option value="electronics:phones">โทรศัพท์ & แท็บเล็ต</option>
                          <option value="electronics:wearables">สมาร์ทวอทช์/อุปกรณ์สวมใส่</option>
                          <option value="electronics:computers">คอมพิวเตอร์ & แล็ปท็อป</option>
                          <option value="electronics:peripherals">อุปกรณ์เสริมคอมพ์ (คีย์บอร์ด/เมาส์/ฮับ)</option>
                          <option value="electronics:cameras">กล้องถ่ายรูป & เลนส์</option>
                          <option value="electronics:audio">เครื่องเสียง/หูฟัง</option>
                          <option value="electronics:gaming">เกมคอนโซล & อุปกรณ์</option>
                          <option value="electronics:networking">เราเตอร์/อุปกรณ์เครือข่าย</option>
                          <option value="electronics:appliances-small">เครื่องใช้ไฟฟ้าขนาดเล็ก</option>
                          <option value="electronics:appliances-large">เครื่องใช้ไฟฟ้าขนาดใหญ่</option>
                          <option value="electronics:general">อื่น ๆ (อิเล็กทรอนิกส์)</option>
                        </optgroup>

                        {/* คอมพิวเตอร์ & อุปกรณ์ */}
                        <optgroup label="คอมพิวเตอร์ & อุปกรณ์">
                          <option value="pc:desktops">เดสก์ท็อป/มินิพีซี/เซิร์ฟเวอร์</option>
                          <option value="pc:laptops">โน้ตบุ๊ก/แมคบุ๊ก</option>
                          <option value="pc:monitors">จอภาพ</option>
                          <option value="pc:parts">ชิ้นส่วน (CPU/GPU/RAM/เมนบอร์ด)</option>
                          <option value="pc:storage">สตอเรจ (HDD/SSD/NAS)</option>
                          <option value="pc:peripherals">คีย์บอร์ด/เมาส์/ด๊องเกิล</option>
                          <option value="pc:general">อื่น ๆ (คอมพิวเตอร์)</option>
                        </optgroup>

                        {/* บ้าน & เฟอร์นิเจอร์ */}
                        <optgroup label="บ้าน & เฟอร์นิเจอร์">
                          <option value="home:furniture">เฟอร์นิเจอร์</option>
                          <option value="home:decor">ของแต่งบ้าน</option>
                          <option value="home:kitchen">เครื่องครัว/ภาชนะ</option>
                          <option value="home:lighting">โคมไฟ/หลอดไฟ</option>
                          <option value="home:storage">ชั้นวาง/กล่องจัดเก็บ</option>
                          <option value="home:cleaning">อุปกรณ์ทำความสะอาด</option>
                          <option value="home:general">อื่น ๆ (บ้าน)</option>
                        </optgroup>

                        {/* เครื่องมือช่าง & อุตสาหกรรม */}
                        <optgroup label="เครื่องมือช่าง & อุตสาหกรรม">
                          <option value="tools:hand">เครื่องมือช่างมือ</option>
                          <option value="tools:power">เครื่องมือไฟฟ้า</option>
                          <option value="tools:measure">อุปกรณ์วัด/งานไฟฟ้า</option>
                          <option value="tools:safety">อุปกรณ์เซฟตี้</option>
                          <option value="tools:general">อื่น ๆ (เครื่องมือ)</option>
                        </optgroup>

                        {/* สวน & กลางแจ้ง */}
                        <optgroup label="สวน & กลางแจ้ง">
                          <option value="garden:plants">ต้นไม้/เมล็ด/ดิน</option>
                          <option value="garden:tools">อุปกรณ์ทำสวน</option>
                          <option value="outdoor:camping">แคมปิ้ง/เดินป่า</option>
                          <option value="outdoor:fishing">ตกปลา</option>
                          <option value="outdoor:general">อื่น ๆ (สวน/กลางแจ้ง)</option>
                        </optgroup>

                        {/* กีฬา & จักรยาน */}
                        <optgroup label="กีฬา & จักรยาน">
                          <option value="sports:fitness">ฟิตเนส/อุปกรณ์ออกกำลัง</option>
                          <option value="sports:team">กีฬาทีม/ลูกบอล</option>
                          <option value="sports:water">กีฬาทางน้ำ</option>
                          <option value="bikes:bicycles">จักรยาน/สกู๊ตเตอร์</option>
                          <option value="bikes:parts">อะไหล่/อุปกรณ์จักรยาน</option>
                          <option value="sports:general">อื่น ๆ (กีฬา)</option>
                        </optgroup>

                        {/* ยานยนต์ */}
                        <optgroup label="ยานยนต์">
                          <option value="auto:car-parts">อะไหล่รถยนต์</option>
                          <option value="auto:moto-parts">อะไหล่มอเตอร์ไซค์</option>
                          <option value="auto:accessories">อุปกรณ์/ของแต่ง/ดูแลรักษา</option>
                          <option value="auto:tires">ยาง/ล้อ</option>
                          <option value="auto:general">อื่น ๆ (ยานยนต์)</option>
                        </optgroup>

                        {/* แฟชั่น */}
                        <optgroup label="แฟชั่น">
                          <option value="fashion:men">เสื้อผ้าผู้ชาย</option>
                          <option value="fashion:women">เสื้อผ้าผู้หญิง</option>
                          <option value="fashion:kids">เสื้อผ้าเด็ก</option>
                          <option value="fashion:shoes">รองเท้า</option>
                          <option value="fashion:bags">กระเป๋า</option>
                          <option value="fashion:accessories">แอ็กเซสซอรี</option>
                          <option value="fashion:jewelry">เครื่องประดับ</option>
                          <option value="fashion:watches">นาฬิกา</option>
                          <option value="fashion:general">อื่น ๆ (แฟชั่น)</option>
                        </optgroup>

                        {/* แม่ & เด็ก */}
                        <optgroup label="แม่ & เด็ก">
                          <option value="baby:gear">อุปกรณ์เด็ก/รถเข็น/คาร์ซีท</option>
                          <option value="baby:toys">ของเล่นเด็ก</option>
                          <option value="baby:clothes">เสื้อผ้าเด็ก</option>
                          <option value="baby:general">อื่น ๆ (แม่ & เด็ก)</option>
                        </optgroup>

                        {/* สัตว์เลี้ยง */}
                        <optgroup label="สัตว์เลี้ยง">
                          <option value="pet:supplies">อาหาร/ทราย/อุปกรณ์</option>
                          <option value="pet:grooming">กรูมมิ่ง/ดูแล</option>
                          <option value="pet:general">อื่น ๆ (สัตว์เลี้ยง)</option>
                        </optgroup>

                        {/* หนังสือ & ออฟฟิศ/การศึกษา */}
                        <optgroup label="หนังสือ & การศึกษา">
                          <option value="books:books">หนังสือ/นิยาย/การ์ตูน</option>
                          <option value="books:textbooks">ตำรา/การศึกษา</option>
                          <option value="office:stationery">เครื่องเขียน/อุปกรณ์สำนักงาน</option>
                          <option value="office:printers">ปริ้นเตอร์/หมึก</option>
                          <option value="office:general">อื่น ๆ (หนังสือ/ออฟฟิศ)</option>
                        </optgroup>

                        {/* ของเล่น & งานอดิเรก */}
                        <optgroup label="ของเล่น & งานอดิเรก">
                          <option value="toys:toys">ของเล่น</option>
                          <option value="toys:boardgames">บอร์ดเกม/การ์ดเกม</option>
                          <option value="collectibles:figures">ฟิกเกอร์/โมเดล/เลโก้</option>
                          <option value="hobby:crafts">งานฝีมือ/งานประดิษฐ์</option>
                          <option value="hobby:general">อื่น ๆ (งานอดิเรก)</option>
                        </optgroup>

                        {/* ดนตรี & สตูดิโอ */}
                        <optgroup label="ดนตรี & สตูดิโอ">
                          <option value="music:instruments">เครื่องดนตรี</option>
                          <option value="music:studio">ไมค์/มิกเซอร์/อัดเสียง</option>
                          <option value="music:general">อื่น ๆ (ดนตรี)</option>
                        </optgroup>

                        {/* ศิลป์ & สะสม */}
                        <optgroup label="ศิลป์ & สะสม">
                          <option value="art:artworks">งานศิลป์/ภาพวาด/งานพิมพ์</option>
                          <option value="collectibles:antiques">ของสะสม/ของเก่า</option>
                          <option value="collectibles:coins">เหรียญ/แสตมป์</option>
                          <option value="art:general">อื่น ๆ (ศิลป์/สะสม)</option>
                        </optgroup>

                        {/* ความงาม & สุขภาพ */}
                        <optgroup label="ความงาม & สุขภาพ">
                          <option value="beauty:skincare">สกินแคร์</option>
                          <option value="beauty:makeup">เมคอัพ</option>
                          <option value="beauty:hair">ดูแลผม</option>
                          <option value="health:devices">อุปกรณ์สุขภาพ (เครื่องวัด ฯลฯ)</option>
                          <option value="beauty:general">อื่น ๆ (ความงาม/สุขภาพ)</option>
                        </optgroup>

                        {/* ท่องเที่ยว & ไลฟ์สไตล์ */}
                        <optgroup label="ท่องเที่ยว & ไลฟ์สไตล์">
                          <option value="travel:luggage">กระเป๋าเดินทาง</option>
                          <option value="travel:accessories">อุปกรณ์ท่องเที่ยว</option>
                          <option value="lifestyle:general">อื่น ๆ (ไลฟ์สไตล์)</option>
                        </optgroup>

                        {/* ดิจิทัล */}
                        <optgroup label="ดิจิทัล">
                          <option value="digital:software">ซอฟต์แวร์/แอป</option>
                          <option value="digital:media">สื่อดิจิทัล (ภาพ/เสียง)</option>
                          <option value="digital:game-keys">คีย์เกม/ไอเท็มในเกม</option>
                          <option value="digital:general">อื่น ๆ (ดิจิทัล)</option>
                        </optgroup>

                        {/* ตัวเลือกกรอกเอง */}
                        <option value="other">อื่น ๆ (กรอกเอง)</option>
                      </select>

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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-give").click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-2xl shadow hover:shadow-md transition w-full sm:w-auto"
                  >
                    <ImageIcon className="w-5 h-5" /> แนบรูปหลายรูป
                  </button>

                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-receive-1").click()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl hover:bg-slate-50 transition w-full sm:w-auto"
                  >
                    <Camera className="w-4 h-4 text-slate-700" /> แนบรูปที่ต้องการแลก (1 รูป)
                  </button>

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

                {message && <p className="mt-2 text-center text-sm text-rose-600 font-medium">{message}</p>}

                {/* hidden inputs */}
                <input id="upload-give" type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                <input id="upload-receive-1" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* RIGHT: PREVIEW */}
              <aside className="flex flex-col items-stretch gap-4 md:col-span-1">
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

                    {/* wanted image preview */}
                    <div className="col-span-2 mt-2">
                      <label className="text-sm font-medium text-slate-700">รูปที่ต้องการแลก</label>
                      <div className="mt-2 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                        {itemWantedImage ? (
                          <img src={URL.createObjectURL(itemWantedImage)} alt="wanted" className="object-cover w-full h-40 sm:h-48" />
                        ) : (
                          <div className="flex items-center justify-center p-5 sm:p-6 text-slate-400">ยังไม่มีรูปที่เลือก</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

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

            <footer className="mt-8 text-center text-xs text-slate-400">
              SWAPPO — แพลตฟอร์มแลกเปลี่ยนของคนไทย
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
