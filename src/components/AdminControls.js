// src/components/AdminControls.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin, deleteItem } from "@/firebase/functions";

export default function AdminControls({ item }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ok = await isAdmin();
      if (mounted) setAdmin(ok);
    })();
    return () => { mounted = false; };
  }, []);

  if (!admin || !item?.id) return null;

  const onDelete = async () => {
    if (!confirm("ลบโพสต์นี้ (โดยแอดมิน)?")) return;
    const res = await deleteItem(item.id);
    if (res.ok) {
      alert("ลบสำเร็จ");
      router.push("/");
    } else {
      alert(`ลบไม่สำเร็จ: ${res.reason || "error"}`);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => router.push(`/item/edit?id=${item.id}`)}
        className="px-3 py-1 rounded-xl bg-indigo-600 text-white hover:opacity-90"
        title="แก้ไขโพสต์ (แอดมิน)"
      >
        แก้ไข (แอดมิน)
      </button>
      <button
        onClick={onDelete}
        className="px-3 py-1 rounded-xl bg-indigo-950 text-white hover:opacity-90"
        title="ลบโพสต์ (แอดมิน)"
      >
        ลบ (แอดมิน)
      </button>
    </div>
  );
}
