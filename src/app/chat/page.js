'use client';
/**
 * ChatPage (Client Component)
 * ---------------------------------------------------------
 * หน้านี้คือกล่องข้อความ/แชทส่วนตัวระหว่างผู้ใช้ 2 คน
 * ใช้ Firestore เก็บ 2 โครงสร้าง:
 *   - userChats/{uid}/chats/{otherUid}   → สรุปแต่ละห้องแชท (lastMessage, unreadCount, lastUpdated)
 *   - privateChats/{chatId}/messages     → ข้อความทั้งหมดในห้อง (text, senderId, createdAt)
 *
 * แนวคิด:
 *  - login state: ฟังสถานะล็อกอินแบบเรียลไทม์
 *  - chat list: ดึงรายชื่อคู่สนทนาของฉัน เรียงตาม lastUpdated ล่าสุด
 *  - messages: เปิดห้องไหน → subscribe ข้อความห้องนั้นตามเวลาเก่า→ใหม่
 *  - send: บันทึกข้อความ + อัปเดตกล่องจดหมายของทั้งสองฝั่ง (unread อีกฝั่ง +1)
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
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
  updateDoc,
  increment,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function ChatPage() {
  /* --------------------------- State --------------------------- */
  const [currentUser, setCurrentUser] = useState(null);   // ผู้ใช้ปัจจุบัน (null = ยังไม่ล็อกอิน)
  const [chatUsers, setChatUsers] = useState([]);         // รายชื่อคู่สนทนาทั้งหมดของฉัน (สรุป)
  const [selectedUser, setSelectedUser] = useState(null); // ผู้ใช้ที่ถูกเลือกเพื่อเปิดห้องสนทนา
  const [messages, setMessages] = useState([]);           // ข้อความในห้องที่เปิดอยู่
  const [text, setText] = useState('');                   // ช่องพิมพ์ข้อความ

  /* --------------------- ฟังสถานะการล็อกอิน -------------------- */
  useEffect(() => {
    // onAuthStateChanged: ยิงเมื่อผู้ใช้ล็อกอิน/ออก → อัปเดต currentUser
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u || null));
    return () => unsub(); // ยกเลิกฟังเมื่อออกจากหน้า
  }, []);

  /* ------------------------ รายชื่อคู่สนทนา ---------------------- */
  useEffect(() => {
    if (!currentUser) return;

    // เส้นทาง: userChats/{myUid}/chats — สรุปคู่สนทนาของฉัน
    const ref = collection(db, 'userChats', currentUser.uid, 'chats');
    const q = query(ref, orderBy('lastUpdated', 'desc')); // เรียงห้องล่าสุดก่อน

    // onSnapshot: รับอัปเดตแบบเรียลไทม์เมื่อมีการเปลี่ยนแปลง
    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // ดึงโปรไฟล์ของคู่สนทนาแต่ละคนแบบขนาน เพื่อเติม username/profilePic
      const merged = await Promise.all(
        rows.map(async (r) => {
          const uref = doc(db, 'users', r.userId);
          const usnap = await getDoc(uref);
          const u = usnap.exists() ? usnap.data() : {};
          return {
            id: r.userId,                                        // ใช้ userId เป็นตัวเลือกห้อง
            username: u?.username || 'ไม่ทราบชื่อ',              // คำไทยให้สอดคล้อง
            profilePic: u?.profilePic || '/images/profile-placeholder.jpg',
            lastMessage: r?.lastMessage || '',
            unreadCount: r?.unreadCount || 0,
          };
        })
      );
      setChatUsers(merged);
    });

    return () => unsub(); // ยกเลิกฟังเมื่อเปลี่ยนผู้ใช้/ออกจากหน้า
  }, [currentUser]);

  /* ---------------- ข้อความของห้องที่ถูกเลือก (messages) --------------- */
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    // chatId มาตรฐาน: เรียง uid สองฝั่งแล้วต่อด้วย '_' เพื่อให้ทั้งสองฝั่งชี้ที่โฟลเดอร์เดียวกันเสมอ
    const chatId = [currentUser.uid, selectedUser.id].sort().join('_');

    // ดึงข้อความทั้งหมดของห้องนี้ เรียงตามเวลาสร้าง (เก่า→ใหม่)
    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });

    // เมื่อเปิดห้องนี้ ให้รีเซ็ตจำนวน “ยังไม่ได้อ่าน” ของฉันเป็น 0
    // หมายเหตุ: ถ้ายังไม่มีเอกสาร myChatRef การ updateDoc จะล้มเหลว → จึง catch ไว้เงียบ ๆ
    const myChatRef = doc(db, 'userChats', currentUser.uid, 'chats', selectedUser.id);
    updateDoc(myChatRef, { unreadCount: 0 }).catch(() => {});

    return () => unsub(); // เลิกฟังเมื่อเปลี่ยนห้องหรือออก
  }, [currentUser, selectedUser]);

  /* -------------------------- ส่งข้อความ -------------------------- */
  async function handleSend() {
    const msg = text.trim();
    if (!msg || !currentUser || !selectedUser) return;

    const me = currentUser.uid;
    const other = selectedUser.id;
    const chatId = [me, other].sort().join('_'); // หลักการเดียวกับด้านบน

    // 1) เพิ่มข้อความใหม่ลงในกล่อง messages ของห้องนี้
    await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
      text: msg,
      senderId: me,
      receiverId: other,
      createdAt: serverTimestamp(), // ใช้เวลาจากเซิร์ฟเวอร์เพื่อความเที่ยงตรง/เรียงลำดับได้
    });

    // 2) อัปเซิร์ต (สร้างหรืออัปเดต) แถวสรุปห้องของ "ฉัน" → unread เป็น 0
    const myChatRef = doc(db, 'userChats', me, 'chats', other);
    await setDoc(
      myChatRef,
      {
        userId: other,
        lastMessage: msg,
        lastUpdated: serverTimestamp(),
        unreadCount: 0,
      },
      { merge: true } // merge: เก็บฟิลด์เดิมที่มีไว้ และอัปเดตเฉพาะที่ส่งมา
    );

    // 3) อัปเซิร์ตแถวสรุปห้องของ "อีกฝั่ง" → unread +1
    const otherChatRef = doc(db, 'userChats', other, 'chats', me);
    await setDoc(
      otherChatRef,
      {
        userId: me,
        lastMessage: msg,
        lastUpdated: serverTimestamp(),
        unreadCount: increment(1), // ให้ผู้รับเห็นจำนวนที่ยังไม่ได้อ่านเพิ่มขึ้น
      },
      { merge: true }
    );

    setText(''); // ล้างช่องพิมพ์หลังส่ง
  }

  /* ----------------------------- UI ----------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-100 py-6 px-3 sm:px-6">
      {/* โครงหลัก: กล่องแชทแบ่ง 2 ส่วน (Sidebar รายชื่อ ←→ หน้าต่างแชท) */}
      <div className="mx-auto flex h-[85vh] max-h-[960px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/75 shadow-2xl backdrop-blur-lg sm:h-[80vh] lg:flex-row lg:divide-x">
        {/* ---------------------- Sidebar: รายชื่อสนทนา ---------------------- */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden border-b border-white/60 bg-white/70 lg:w-80 lg:border-b-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">กล่องข้อความ</h2>
              <p className="text-xs text-slate-500">พูดคุยกับผู้ใช้ที่เคยแสดงความสนใจแลกเปลี่ยน</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-6 pt-1 space-y-2">
            {/* สถานะว่าง: ยังไม่มีประวัติสนทนา */}
            {chatUsers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-400">
                ยังไม่มีประวัติการสนทนา เริ่มจากการแสดงความสนใจในสินค้าก่อนนะ
              </div>
            )}

            {/* รายการคู่สนทนา (เรียงตามล่าสุด) */}
            {chatUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)} // เลือกห้อง → ไป subscribe ข้อความใน useEffect ด้านบน
                className={`group flex w-full items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left transition-all hover:border-rose-100 hover:bg-rose-50/60 ${
                  selectedUser?.id === u.id ? 'border-rose-200 bg-rose-50 shadow-sm' : ''
                }`}
              >
                <div className="relative">
                  {/* หมายเหตุ: ถ้าใช้รูปจากโดเมนภายนอก อย่าลืมตั้งค่า images.domains ใน next.config.js */}
                  <Image
                    src={u.profilePic}
                    alt={u.username}
                    width={44}
                    height={44}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium text-slate-800">{u.username}</p>
                    {u.unreadCount > 0 && (
                      <span className="min-w-[1.75rem] rounded-full bg-rose-500 px-2 py-0.5 text-center text-xs font-semibold text-white">
                        {u.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{u.lastMessage || 'เริ่มต้นสนทนากันเลย!'}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ------------------------- หน้าต่างแชท ------------------------- */}
        <section className="flex flex-1 flex-col bg-gradient-to-br from-white/70 via-slate-50 to-rose-50/60">
          {/* ส่วนหัว: ชื่อผู้ใช้ในห้อง / คำแนะนำเมื่อยังไม่เลือกห้อง */}
          <div className="flex items-center gap-3 border-b border-white/60 bg-white/70 px-5 py-4">
            {selectedUser ? (
              <>
                <Image
                  src={selectedUser.profilePic}
                  alt={selectedUser.username}
                  width={44}
                  height={44}
                  className="hidden h-11 w-11 rounded-full object-cover ring-2 ring-white shadow-sm sm:block"
                />
                <div>
                  <p className="text-base font-semibold text-slate-800">{selectedUser.username}</p>
                  <p className="text-xs text-slate-500">สนทนาแบบส่วนตัว</p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-base font-semibold text-slate-800">เลือกผู้ใช้เพื่อเริ่มแชท</p>
                <p className="text-xs text-slate-500">รายชื่อสนทนาจะแสดงทางด้านซ้าย</p>
              </div>
            )}
          </div>

          {/* โซนข้อความ: แสดงข้อความทั้งหมดของห้องที่เลือก */}
          <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6">
            {selectedUser && messages.length === 0 && (
              <div className="mx-auto max-w-xs rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">
                ยังไม่มีข้อความ เริ่มต้นทักทายเพื่อทำความรู้จักกันเลย!
              </div>
            )}

            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {messages.map((m) => {
                const isMine = m.senderId === currentUser?.uid; // ฉันเป็นคนส่งหรือไม่
                return (
                  <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-md ${
                        isMine
                          ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white' // ฟองคำพูดของฉัน
                          : 'bg-white/90 text-slate-700'                            // ฟองคำพูดของอีกฝั่ง
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* แถบพิมพ์และปุ่ม “ส่ง” (แสดงเมื่อมีการเลือกห้องแล้ว) */}
          {selectedUser && (
            <div className="border-t border-white/60 bg-white/80 px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-rose-200">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()} // กด Enter เพื่อส่ง
                  className="flex-1 bg-transparent px-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  placeholder="พิมพ์ข้อความ..."
                />
                <button
                  onClick={handleSend}
                  className="rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
                  disabled={!text.trim()} // ปิดปุ่มเมื่อไม่มีข้อความ
                >
                  ส่ง
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
