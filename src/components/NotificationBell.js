'use client'
import { useEffect, useMemo, useRef, useState } from "react";
import { db, auth } from "@/firebase/config";
import {
  collection, query, where, orderBy, limit, onSnapshot,
  updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Bell, Check, CircleX } from "lucide-react";

function timeAgo(ts){
  const d = ts?.toDate ? ts.toDate() : null;
  if(!d) return "";
  const s = Math.floor((Date.now() - d.getTime())/1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s/60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s/3600)} ชม.ที่แล้ว`;
  return `${Math.floor(s/86400)} วันที่แล้ว`;
}

export default function NotificationBell(){
  const [uid, setUid] = useState(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const menuRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", uid),
      where("type", "==", "interest"),
      orderBy("createdAt", "desc"),
      limit(15)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    const handle = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const unread = useMemo(() => rows.filter(r => !r.read && !r.handled).length, [rows]);

  if (!uid) return null;

  async function markRead(id) {
    await updateDoc(doc(db, "notifications", id), { read: true, readAt: serverTimestamp() });
  }
  async function confirmContacting(n) {
    // 1) อัปเดตสถานะ item
    await updateDoc(doc(db, "items", n.itemId), {
      status: "contacting",
      statusUpdatedAt: serverTimestamp(),
    });
    // 2) ปิดแจ้งเตือน
    await updateDoc(doc(db, "notifications", n.id), {
      handled: true,
      read: true,
      handledAt: serverTimestamp(),
    });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border bg-white hover:bg-slate-50"
        title="แจ้งเตือน"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
          <div className="px-4 py-3 border-b font-semibold">แจ้งเตือน</div>
          <div className="divide-y">
            {rows.length === 0 && (
              <div className="p-4 text-sm text-slate-500">ยังไม่มีแจ้งเตือน</div>
            )}
            {rows.map((n) => (
              <div key={n.id} className="p-3 text-sm flex gap-3 items-start">
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{n.title || "มีคนสนใจโพสต์ของคุณ"}</div>
                  <div className="text-slate-600 mt-0.5">{n.body || ""}</div>
                  {n.itemId && (
                    <div className="mt-1 text-xs">
                      รายการ: <a className="text-rose-600 hover:underline" href={`/items/${n.itemId}`}>ดูโพสต์</a>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.handled && (
                    <button
                      onClick={() => confirmContacting(n)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      title="ยืนยันเป็นกำลังติดต่อ"
                    >
                      <Check className="w-4 h-4" /> ยืนยัน
                    </button>
                  )}
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-600 hover:bg-slate-50"
                      title="ทำเป็นอ่านแล้ว"
                    >
                      <CircleX className="w-4 h-4" /> อ่านแล้ว
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
