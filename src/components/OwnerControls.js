// src/components/OwnerControls.js
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/config";
import { deleteItem } from "@/firebase/functions";

export default function OwnerControls({ item }) {
  const router = useRouter();
  const [uid, setUid] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub?.();
  }, []);

  if (!item?.id) return null;
  const isOwner = uid && (item?.user_id === uid || item?.uid === uid);
  if (!isOwner) return null;

  const onDelete = async () => {
    if (isDeleting) return;
    if (!confirm("ลบโพสต์นี้หรือไม่?")) return;
    setIsDeleting(true);
    try {
      const res = await deleteItem(item.id);
      if (res?.ok) {
        alert("ลบสำเร็จ");
        router.push("/");
      } else {
        alert(`ลบไม่สำเร็จ: ${res?.reason || "error"}`);
      }
    } catch (e) {
      console.error(e);
      alert("ลบไม่สำเร็จ");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => router.push(`/item/edit?id=${item.id}`)}  // ← เปลี่ยนมาใช้ query param
        className="px-3 py-1 rounded-xl bg-amber-500 text-white hover:opacity-90"
      >
        แก้ไข
      </button>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="px-3 py-1 rounded-xl bg-rose-600 text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isDeleting ? "กำลังลบ..." : "ลบ"}
      </button>
    </div>
  );
}
