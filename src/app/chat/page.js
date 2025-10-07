'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [chatUsers, setChatUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  // login state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  // my chat list
  useEffect(() => {
    if (!currentUser) return;

    const ref = collection(db, 'userChats', currentUser.uid, 'chats');
    const q = query(ref, orderBy('lastUpdated', 'desc'));

    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // fetch user profiles in parallel
      const merged = await Promise.all(
        rows.map(async (r) => {
          const uref = doc(db, 'users', r.userId);
          const usnap = await getDoc(uref);
          const u = usnap.exists() ? usnap.data() : {};
          return {
            id: r.userId,
            username: u?.username || 'Unknown',
            profilePic: u?.profilePic || '/images/profile-placeholder.jpg',
            lastMessage: r?.lastMessage || '',
            unreadCount: r?.unreadCount || 0,
          };
        })
      );
      setChatUsers(merged);
    });

    return () => unsub();
  }, [currentUser]);

  // messages for selected conversation
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    const chatId = [currentUser.uid, selectedUser.id].sort().join('_');
    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
    });

    // reset my unread to 0 when opening
    const myChatRef = doc(db, 'userChats', currentUser.uid, 'chats', selectedUser.id);
    updateDoc(myChatRef, { unreadCount: 0 }).catch(() => {});

    return () => unsub();
  }, [currentUser, selectedUser]);

  async function handleSend() {
    const msg = text.trim();
    if (!msg || !currentUser || !selectedUser) return;

    const me = currentUser.uid;
    const other = selectedUser.id;
    const chatId = [me, other].sort().join('_');

    // add message
    await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
      text: msg,
      senderId: me,
      receiverId: other,
      createdAt: serverTimestamp(),
    });

    // upsert my chat row (unread 0)
    const myChatRef = doc(db, 'userChats', me, 'chats', other);
    await setDoc(
      myChatRef,
      {
        userId: other,
        lastMessage: msg,
        lastUpdated: serverTimestamp(),
        unreadCount: 0,
      },
      { merge: true }
    );

    // upsert other chat row (unread +1)
    const otherChatRef = doc(db, 'userChats', other, 'chats', me);
    await setDoc(
      otherChatRef,
      {
        userId: me,
        lastMessage: msg,
        lastUpdated: serverTimestamp(),
        unreadCount: increment(1),
      },
      { merge: true }
    );

    setText('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-sky-100 py-6 px-3 sm:px-6">
      <div className="mx-auto flex h-[85vh] max-h-[960px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/75 shadow-2xl backdrop-blur-lg sm:h-[80vh] lg:flex-row lg:divide-x">
        {/* Sidebar */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden border-b border-white/60 bg-white/70 lg:w-80 lg:border-b-0">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">กล่องข้อความ</h2>
              <p className="text-xs text-slate-500">พูดคุยกับผู้ใช้ที่เคยสนใจแลกเปลี่ยน</p>
            </div>

            {/* ปุ่มกลับหน้าหลัก */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-rose-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              aria-label="กลับหน้าหลัก"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">กลับหน้าหลัก</span>
              <span className="sm:hidden">กลับ</span>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-6 pt-1 space-y-2">
            {chatUsers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-6 text-center text-sm text-slate-400">
                ยังไม่มีประวัติการสนทนา เริ่มจากการส่งความสนใจในสินค้าก่อนนะ
              </div>
            )}

            {chatUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`group flex w-full items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left transition-all hover:border-rose-100 hover:bg-rose-50/60 ${
                  selectedUser?.id === u.id ? 'border-rose-200 bg-rose-50 shadow-sm' : ''
                }`}
              >
                <div className="relative">
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

        {/* Chat window */}
        <section className="flex flex-1 flex-col bg-gradient-to-br from-white/70 via-slate-50 to-rose-50/60">
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

          <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6">
            {selectedUser && messages.length === 0 && (
              <div className="mx-auto max-w-xs rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">
                ยังไม่มีข้อความ เริ่มต้นทักทายเพื่อทำความรู้จักกันเลย!
              </div>
            )}

            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              {messages.map((m) => {
                const isMine = m.senderId === currentUser?.uid;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm sm:max-w-md ${
                        isMine
                          ? 'bg-gradient-to-r from-rose-500 to-rose-400 text-white'
                          : 'bg-white/90 text-slate-700'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedUser && (
            <div className="border-t border-white/60 bg-white/80 px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-rose-200">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  className="flex-1 bg-transparent px-1 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                  placeholder="พิมพ์ข้อความ..."
                />
                <button
                  onClick={handleSend}
                  className="rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-300"
                  disabled={!text.trim()}
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
