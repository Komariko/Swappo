'use client';

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
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div className="w-72 border-r overflow-y-auto">
        <h2 className="text-xl font-semibold p-4 border-b">แชท</h2>

        {chatUsers.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelectedUser(u)}
            className={`w-full text-left flex items-center gap-3 p-3 hover:bg-gray-100 ${
              selectedUser?.id === u.id ? 'bg-gray-100' : ''
            }`}
          >
            <Image
              src={u.profilePic}
              alt={u.username}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{u.username}</div>
              <div className="text-sm text-gray-500 truncate">{u.lastMessage}</div>
            </div>
            {u.unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {u.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="border-b px-4 py-3 font-semibold">
          {selectedUser ? selectedUser.username : 'เลือกผู้ใช้เพื่อเริ่มแชท'}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-sm px-4 py-2 rounded-lg text-white ${
                m.senderId === currentUser?.uid ? 'ml-auto bg-blue-500' : 'mr-auto bg-gray-400'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {selectedUser && (
          <div className="p-3 border-t flex gap-2 bg-white">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 border rounded-full px-4 py-2 outline-none"
              placeholder="พิมพ์ข้อความ..."
            />
            <button
              onClick={handleSend}
              className="bg-blue-500 text-white px-4 rounded-full disabled:opacity-50"
              disabled={!text.trim()}
            >
              ส่ง
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
