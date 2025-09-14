'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, auth } from '@/firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { CircleDot, MessageSquare, CheckCircle2, Loader2, Info } from 'lucide-react';

const LABEL = {
  available: 'ยังมีสินค้า',
  contacting: 'กำลังติดต่อ',
  completed: 'แลก/ขายแล้ว',
};

const STYLES = {
  available: {
    ring: 'ring-emerald-300/70',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: <CircleDot className="w-4 h-4" />,
  },
  contacting: {
    ring: 'ring-amber-300/70',
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  completed: {
    ring: 'ring-rose-300/70',
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export default function OwnerStatusPanel({ item, onChanged }) {
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  // ✅ เรียก useMemo "เสมอ" เพื่อไม่ให้ลำดับ Hooks เปลี่ยน
  const steps = useMemo(
    () => [
      { key: 'available',  label: LABEL.available,  ...STYLES.available  },
      { key: 'contacting', label: LABEL.contacting, ...STYLES.contacting },
      { key: 'completed',  label: LABEL.completed,  ...STYLES.completed  },
    ],
    []
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid || null);
      setAuthReady(true);
    });
    return () => unsub && unsub();
  }, []);

  const current  = item?.status || 'available';
  const isOwner  = authReady && !!uid && item?.user_id === uid;

  if (!isOwner) return null;

  async function setStatus(status) {
    if (busy || status === current) return;
    setBusy(true);
    setSaved(false);
    try {
      await updateDoc(doc(db, 'items', item.id), {
        status,
        statusUpdatedAt: serverTimestamp(),
      });
      onChanged?.(status);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e) {
      console.error(e);
      alert(e?.message || 'อัปเดตสถานะไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800">สถานะโพสต์ของคุณ</div>
        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Info className="w-3.5 h-3.5" />
          อัปเดตเพื่อให้ผู้สนใจเห็นสถานะล่าสุด
        </div>
      </div>

      {/* stepper */}
      <div className="mt-3 relative">
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full" />
        <div className="relative grid grid-cols-3">
          {steps.map((s) => {
            const active = current === s.key;
            return (
              <div key={s.key} className="flex flex-col items-center">
                <div
                  className={[
                    'z-10 flex items-center justify-center w-7 h-7 rounded-full border bg-white',
                    active ? s.border + ' ' + s.bg : 'border-slate-300',
                  ].join(' ')}
                >
                  {s.icon}
                </div>
                <div className="mt-2 text-[11px] text-slate-600">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* segmented control */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {steps.map((s) => {
          const active = current === s.key;
          return (
            <button
              key={s.key}
              disabled={busy}
              onClick={() => setStatus(s.key)}
              className={[
                'w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm transition',
                active
                  ? `${s.bg} ${s.text} ${s.border} ring-2 ${s.ring}`
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                busy && 'opacity-60 cursor-not-allowed',
              ].join(' ')}
              title={s.label}
            >
              {busy && active ? <Loader2 className="w-4 h-4 animate-spin" /> : s.icon}
              <span className="font-medium">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[12px]">
        <div className="text-slate-500">
          อัปเดตล่าสุด:{' '}
          <span className="font-medium">
            {item?.statusUpdatedAt?.toDate
              ? item.statusUpdatedAt.toDate().toLocaleString('th-TH')
              : '—'}
          </span>
        </div>
        {saved && (
          <div className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            บันทึกแล้ว ✔
          </div>
        )}
      </div>
    </div>
  );
}
