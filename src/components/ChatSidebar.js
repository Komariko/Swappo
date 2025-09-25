'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { auth, db } from '@/firebase/config';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  increment,
} from 'firebase/firestore';

export default function ChatSidebar({ toUserId, isOpen, onClose }) {
  // ====== สเตตหลักของแชท ======
  const [currentUser, setCurrentUser] = useState(null); // ผู้ใช้ที่ล็อกอินอยู่ (ฝั่งเรา)
  const [targetUser, setTargetUser]   = useState(null); // ผู้ใช้คู่สนทนา (ปลายทาง)
  const [messages, setMessages]       = useState([]);   // ข้อความในห้องสนทนานี้
  const [text, setText]               = useState('');   // ข้อความที่กำลังพิมพ์

  // ====== ตัวอ้างอิง DOM เพื่อทำงานกับสกอลล์/โฟกัส/กับดักโฟกัส ======
  const listRef = useRef(null);                    // กล่องที่แสดงข้อความ → ใช้ auto scroll
  const panelRef = useRef(null);                   // แพเนลทั้งแถบ → ใช้ทำ focus trap
  const inputRef = useRef(null);                   // ช่องพิมพ์ → โฟกัสเมื่อเปิดแชท
  const lastFocusedBeforeOpenRef = useRef(null);   // เก็บ element ที่โฟกัสก่อนเปิดแชท

  // ====== ตรวจสถานะการล็อกอินแบบเรียลไทม์ ======
  useEffect(() => {
    // หมายเหตุ: ถ้าโปรเจกต์ใช้ Firebase v9 (modular) จริง ๆ แนะนำเขียนแบบ
    // onAuthStateChanged(auth, cb) โดย import จาก 'firebase/auth'
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  // ====== โหลดข้อมูลโปรไฟล์ของ "คู่สนทนา" จาก userId ที่ส่งเข้ามา ======
  useEffect(() => {
    if (!toUserId) return;
    const uref = doc(db, 'users', toUserId);
    getDoc(uref).then((s) => {
      setTargetUser(
        s.exists()
          ? s.data() // มีในฐาน → ดึง username/profilePic ใช้โชว์หัวแชท
          : { username: 'ไม่พบผู้ใช้', profilePic: '/images/profile-placeholder.jpg' } // กัน null
      );
    });
  }, [toUserId]);

  // ====== subscribe ข้อความของห้องแชทนี้แบบเรียลไทม์ ======
  useEffect(() => {
    if (!currentUser || !toUserId) return;

    // สร้าง chatId ให้เหมือนกันทั้งสองฝั่ง: เรียง uid แล้ว join ด้วย "_" (ป้องกันฝั่งละ id)
    const chatId = [currentUser.uid, toUserId].sort().join('_');

    // อ่านคอลเลกชันข้อความของห้องนี้และเรียงเวลาจากเก่า→ใหม่
    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    // onSnapshot → ได้ข้อความใหม่เมื่อมีการเพิ่ม/เปลี่ยนที่ Firestore
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // เลื่อนลงล่างสุดอัตโนมัติเล็กน้อยหลังอัปเดตรายการ
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, 50);
    });

    return () => unsub();
  }, [currentUser, toUserId]);

  // ====== จัดการโฟกัส/การเข้าถึง (A11y) ตอนเปิด/ปิดแชท ======
  useEffect(() => {
    if (isOpen) {
      // จำ element ที่โฟกัสอยู่ก่อนเปิด เพื่อคืนโฟกัสตอนปิด
      lastFocusedBeforeOpenRef.current = document.activeElement;
      // โฟกัสช่องพิมพ์ เมื่อแผงแชทเปิด
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    } else {
      // ปิดแล้ว: เอาโฟกัสออกจาก element ในแผง แล้วคืนให้ element เดิม
      const active = document.activeElement;
      if (active && panelRef.current?.contains(active)) active.blur();
      lastFocusedBeforeOpenRef.current?.focus?.();
    }
  }, [isOpen]);

  // ====== ปิดด้วย ESC + ทำ focus trap ในแพเนล ======
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      // ปิดด้วยปุ่ม ESC
      if (e.key === 'Escape') {
        e.stopPropagation();
        safeClose();
      }

      // focus trap: วนโฟกัสอยู่ใน aside นี้
      if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0];
        const last  = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [isOpen]
  );

  // ผูก keydown ตอนเปิด และถอดตอนปิด (ใช้ capture เพื่อให้มาก่อน handler อื่น)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => handleKeyDown(e);
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [isOpen, handleKeyDown]);

  // ปุ่มปิดแบบ "ปลอดภัย": เอาโฟกัสออกและเรียก onClose (จากพาเรนต์)
  const safeClose = () => {
    const active = document.activeElement;
    if (active && panelRef.current?.contains(active)) active.blur();
    onClose?.();
  };

  // ====== ส่งข้อความ ======
  async function handleSend() {
    const msg = text.trim();
    if (!msg || !currentUser || !toUserId) return;

    const me    = currentUser.uid;
    const other = toUserId;
    const chatId = [me, other].sort().join('_');

    // 1) เพิ่มเอกสารข้อความลงคอลเลกชันห้องแชท (เก็บผู้ส่ง/ผู้รับ/เวลา)
    await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
      text: msg,
      senderId: me,
      receiverId: other,
      createdAt: serverTimestamp(),
    });

    // 2) อัปเดต/สร้างแถว chat ของ "ฉัน" (unread = 0 เพราะเป็นฝั่งคนพิมพ์)
    await setDoc(
      doc(db, 'userChats', me, 'chats', other),
      {
        userId: other,
        lastMessage: msg,
        lastUpdated: serverTimestamp(),
        unreadCount: 0,
      },
      { merge: true }
    );

    // 3) อัปเดต/สร้างแถว chat ของ "อีกฝั่ง" (เพิ่ม unread +1)
    await setDoc(
      doc(db, 'userChats', other, 'chats', me),
      {
        userId: me,
        lastMessage: msg,
        lastUpdated: serverTimestamp(),
        unreadCount: increment(1),
      },
      { merge: true }
    );

    // 4) ล้างกล่องข้อความและโฟกัสกลับไปที่อินพุต
    setText('');
    inputRef.current?.focus();
  }

  return (
    // ====== แถบข้าง (Sidebar) ของแชทแบบสไลด์ขวา → ซ้าย ======
    <aside
      ref={panelRef}
      role="dialog"                 // ช่วยบอก screen reader ว่านี่คือ dialog
      aria-label="แชทส่วนตัว"
      aria-hidden={!isOpen}         // ปิด/เปิดเชิงบอกเครื่องช่วยฟัง
      /* inert: ทำให้ element ด้านในไม่โฟกัส/ไม่โต้ตอบเมื่อ isOpen = false
         หมายเหตุ: บราวเซอร์หลักรองรับแล้ว แต่อาจมีเคสเก่า ๆ ต้องเช็ก */
      inert={!isOpen}
      className={`fixed top-0 right-0 w-[320px] max-w-[90%] h-full bg-white border-l shadow-lg z-50
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'}`}
    >
      {/* ส่วนหัว: ชื่อ/รูปคู่สนทนา + ปุ่มปิด */}
      <div className="bg-gradient-to-r from-[#ff6f61] to-[#ff886f] text-white p-4 font-bold flex justify-between items-center">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={targetUser?.profilePic || '/images/profile-placeholder.jpg'}
            alt="profile"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm truncate max-w-[180px]">
            {targetUser?.username || '...'}
          </span>
        </div>
        <button onClick={safeClose} aria-label="ปิดแชท" className="p-1 rounded hover:bg-white/10">
          ✕
        </button>
      </div>

      {/* ลิสต์ข้อความ: สลับสีฟองแชทตามผู้ส่ง พร้อม auto scroll ลงล่าง */}
      <div ref={listRef} className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] px-4 py-2 rounded-xl text-sm break-words
              ${m.senderId === currentUser?.uid
                ? 'bg-blue-500 text-white self-end'   // ของฉัน → ฟองสีน้ำเงิน ชิดขวา
                : 'bg-gray-200 text-gray-800 self-start'}`} // ของเขา → ฟองสีเทา ชิดซ้าย
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* แถบพิมพ์ข้อความ + ปุ่มส่ง */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="พิมพ์ข้อความ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-2 border rounded-full text-sm outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="px-4 py-2 bg-[#ff6f61] text-white rounded-full hover:bg-[#e55b4e] text-sm disabled:opacity-50"
        >
          ส่ง
        </button>
      </div>
    </aside>
  );
}
