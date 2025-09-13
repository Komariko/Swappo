'use client';

import { useEffect, useRef, useState } from 'react';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u || null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!toUserId) return;
    const uref = doc(db, 'users', toUserId);
    getDoc(uref).then((s) => {
      setTargetUser(
        s.exists()
          ? s.data()
          : { username: 'ไม่พบผู้ใช้', profilePic: '/images/profile-placeholder.jpg' }
      );
    });
  }, [toUserId]);

  useEffect(() => {
    if (!currentUser || !toUserId) return;

    const chatId = [currentUser.uid, toUserId].sort().join('_');
    const q = query(
      collection(db, 'privateChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // autoscroll
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 50);
    });

    return () => unsub();
  }, [currentUser, toUserId]);

  async function handleSend() {
    const msg = text.trim();
    if (!msg || !currentUser || !toUserId) return;

    const me = currentUser.uid;
    const other = toUserId;
    const chatId = [me, other].sort().join('_');

    await addDoc(collection(db, 'privateChats', chatId, 'messages'), {
      text: msg,
      senderId: me,
      receiverId: other,
      createdAt: serverTimestamp(),
    });

    // my chat row
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

    // other chat row (+1)
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

    setText('');
  }

  return (
    <aside
      className={`fixed top-0 right-0 w-[320px] max-w-[90%] h-full bg-white border-l shadow-lg z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="bg-gradient-to-r from-[#ff6f61] to-[#ff886f] text-white p-4 font-bold flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img
            src={targetUser?.profilePic || '/images/profile-placeholder.jpg'}
            alt="profile"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm truncate max-w-[180px]">
            {targetUser?.username || '...'}
          </span>
        </div>
        <button onClick={onClose} aria-label="ปิดแชท">
          ✕
        </button>
      </div>

      <div ref={listRef} className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] px-4 py-2 rounded-xl text-sm ${
              m.senderId === currentUser?.uid
                ? 'bg-blue-500 text-white self-end'
                : 'bg-gray-200 text-gray-800 self-start'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          placeholder="พิมพ์ข้อความ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-2 border rounded-full text-sm outline-none"
          autoFocus
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
