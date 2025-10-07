"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { isAdmin, adminUpdateUser, adminDeleteUserDoc } from "@/firebase/functions";
import {
  ArrowLeft,
  MoreHorizontal,
  Trash2,
  Save,
  User,
  Image as ImageIcon,
  Phone,
  Home,
  FileText,
} from "lucide-react";

/* -------- Reusable Field -------- */
const InfoField = ({ id, label, value, onChange, placeholder, Icon, type = "text" }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
      <Icon className="w-4 h-4 mr-2 text-gray-500" />
      {label}
    </label>
    {type === "textarea" ? (
      <textarea
        id={id}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
      />
    ) : (
      <input
        id={id}
        type={type}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    )}
  </div>
);

/* -------- Status -------- */
const StatusDisplay = ({ message, type = "loading" }) => (
  <div className="flex items-center justify-center h-screen">
    <div
      className={`p-6 rounded-lg shadow-md ${
        type === "error" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      {message}
    </div>
  </div>
);

export default function AdminEditUserClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const uid = sp.get("uid");

  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    profilePic: "",
    bio: "",
    phone: "",
    address: "",
  });

  // ตรวจสิทธิ์แอดมิน
  useEffect(() => {
    (async () => {
      try {
        const ok = await isAdmin().catch(() => false);
        setAllowed(ok);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // โหลดโปรไฟล์ผู้ใช้
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() };
        setProfile(data);
        setForm({
          username: data.username ?? "",
          displayName: data.displayName ?? "",
          profilePic: data.profilePic ?? "",
          bio: data.bio ?? "",
          phone: data.phone ?? "",
          address: data.address ?? "",
        });
      } else {
        setProfile(null);
      }
    })();
  }, [uid]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  };

  if (loading) return <StatusDisplay message="กำลังตรวจสอบสิทธิ์..." />;
  if (!allowed) return <StatusDisplay message="ต้องเป็นแอดมินเท่านั้น" type="error" />;
  if (!uid) return <StatusDisplay message="ไม่พบ UID ของผู้ใช้" type="error" />;
  if (!profile) return <StatusDisplay message="ไม่พบโปรไฟล์ของผู้ใช้" type="error" />;

  const onSave = async () => {
    setSaving(true);
    const res = await adminUpdateUser(uid, form);
    setSaving(false);
    if (res.ok) {
      alert("บันทึกโปรไฟล์สำเร็จ");
      router.push("/admin/users");
    } else {
      alert(`บันทึกไม่สำเร็จ: ${res.reason || "error"}`);
    }
  };

  const onDeleteDoc = async () => {
    if (
      confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารโปรไฟล์ของผู้ใช้นี้? (การกระทำนี้ไม่สามารถย้อนกลับได้)")
    ) {
      setDeleting(true);
      const res = await adminDeleteUserDoc(uid);
      setDeleting(false);
      if (res.ok) {
        alert("ลบเอกสารโปรไฟล์สำเร็จ");
        router.push("/admin/users");
      } else {
        alert(`ลบไม่สำเร็จ: ${res.reason || "error"}`);
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-3"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">แก้ไขข้อมูลสมาชิก</h1>
            <p className="text-sm text-gray-500 truncate">UID: {uid}</p>
          </div>
        </div>

        {/* Main fields */}
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <img
              src={
                form.profilePic ||
                `https://ui-avatars.com/api/?name=${form.displayName || form.username}&background=random`
              }
              alt="Profile Preview"
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=User&background=random`;
              }}
            />
            <div className="flex-grow space-y-4">
              {/* <InfoField
                id="displayName"
                label="ชื่อที่แสดง"
                value={form.displayName}
                onChange={handleInputChange}
                placeholder="เช่น John Doe"
                Icon={User}
              /> */}
              <InfoField
                id="username"
                label="ชื่อผู้ใช้"
                value={form.username}
                onChange={handleInputChange}
                placeholder="เช่น johndoe123"
                Icon={User}
              />
            </div>
          </div>

          <InfoField
            id="profilePic"
            label="URL รูปโปรไฟล์"
            value={form.profilePic}
            onChange={handleInputChange}
            placeholder="https://example.com/image.png"
            Icon={ImageIcon}
          />

          {/* Advanced toggle */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center mx-auto"
            >
              <MoreHorizontal className="w-4 h-4 mr-1" />
              {showAdvanced ? "ซ่อนข้อมูลเพิ่มเติม" : "แสดงข้อมูลเพิ่มเติม"}
            </button>
          </div>

          {/* Advanced fields */}
          {showAdvanced && (
            <div className="border-t pt-6 mt-6 space-y-4 animate-fade-in">
              <InfoField
                id="bio"
                label="เกี่ยวกับฉัน (Bio)"
                value={form.bio}
                onChange={handleInputChange}
                placeholder="แนะนำตัวเองสั้นๆ..."
                Icon={FileText}
                type="textarea"
              />
              <InfoField
                id="phone"
                label="เบอร์โทรศัพท์"
                value={form.phone}
                onChange={handleInputChange}
                placeholder="081-234-5678"
                Icon={Phone}
              />
              <InfoField
                id="address"
                label="ที่อยู่"
                value={form.address}
                onChange={handleInputChange}
                placeholder="123 ถ.สุขุมวิท กรุงเทพฯ"
                Icon={Home}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-8 mt-8 border-t">
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onDeleteDoc}
            disabled={deleting}
            className="w-full sm:w-auto sm:ml-auto flex items-center justify-center px-6 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            {deleting ? "กำลังลบ..." : "ลบโปรไฟล์"}
          </button>
        </div>
      </div>
    </main>
  );
}
