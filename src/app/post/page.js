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
    setPersistence(auth, browserLocalPersistence).catch(() => {});
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        {!authReady ? (
          <div className="text-center py-24 text-slate-500">กำลังตรวจสอบสถานะผู้ใช้…</div>
        ) : !user ? (
          <div className="text-center py-24">
            <p className="text-lg font-semibold mb-2">ต้องเข้าสู่ระบบก่อนโพสต์</p>
            <a href="/login" className="text-rose-600 underline">ไปหน้าเข้าสู่ระบบ</a>
          </div>
        ) : (
          <>
            <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
              <h1 className="text-center text-4xl md:text-5xl font-extrabold text-rose-600">โพสต์แลกเปลี่ยนสิ่งของ</h1>
              <p className="mt-2 text-center text-slate-600">สร้างโพสต์สวย ๆ และค้นหาผู้แลกเปลี่ยนได้ง่าย</p>
            </motion.header>

            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* LEFT: FORM */}
              <div className="md:col-span-2 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-give").click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-2xl shadow hover:shadow-md transition"
                  >
                    <ImageIcon className="w-5 h-5" /> แนบรูปหลายรูป
                  </button>

                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-receive-1").click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-2xl hover:bg-slate-50 transition"
                  >
                    <Camera className="w-4 h-4 text-slate-700" /> แนบรูปที่ต้องการแลก (1 รูป)
                  </button>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="px-4 py-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50"
                    >
                      รีเซ็ต
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-3 px-5 py-3 bg-rose-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition disabled:opacity-60"
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

                {message && <p className="text-center text-sm text-rose-600 font-medium">{message}</p>}

                {/* hidden inputs */}
                <input id="upload-give" type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                <input id="upload-receive-1" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* RIGHT: PREVIEW */}
              <aside className="flex flex-col items-stretch gap-4 md:col-span-1">
                <div className="bg-gradient-to-br from-white to-rose-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-700">ตัวอย่างโพสต์</h3>
                  <p className="text-sm text-slate-500 mt-1">ตรวจสอบภาพและข้อมูลก่อนโพสต์</p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {previews.length > 0 ? (
                      previews.slice(0, 4).map((src, i) => (
                        <div key={i} className="relative rounded-xl overflow-hidden bg-slate-100">
                          <img src={src} alt={`preview-${i}`} className="object-cover w-full h-28" />
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
                      <div className="col-span-2 flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                        <ImageIcon className="w-10 h-10 text-slate-300" />
                        <p className="text-sm mt-2 text-slate-400">ยังไม่มีรูปที่แนบ</p>
                      </div>
                    )}

                    {/* wanted image preview */}
                    <div className="col-span-2 mt-2">
                      <label className="text-sm font-medium text-slate-700">รูปที่ต้องการแลก</label>
                      <div className="mt-2 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                        {itemWantedImage ? (
                          <img src={URL.createObjectURL(itemWantedImage)} alt="wanted" className="object-cover w-full h-40" />
                        ) : (
                          <div className="flex items-center justify-center p-6 text-slate-400">ยังไม่มีรูปที่เลือก</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-100 text-sm text-slate-600 shadow-sm">
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
