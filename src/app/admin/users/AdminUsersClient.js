"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { isAdmin, getAllUsers } from "@/firebase/functions";
import { Search, Users, Edit, Shield, UserCheck, ChevronRight, ArrowLeft } from "lucide-react"; // ✅ เพิ่ม ArrowLeft

// --- Components ---
const StatusDisplay = ({ message, type = "loading" }) => (
  <div className={`flex flex-col items-center justify-center h-screen bg-gray-50 text-center p-4 ${type === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
    {type === 'loading' && <div className="w-12 h-12 border-4 border-t-indigo-500 border-gray-200 rounded-full animate-spin mb-4"></div>}
    <p className="text-lg font-medium">{message}</p>
  </div>
);

const SearchBar = ({ value, onChange }) => (
  <div className="relative">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
    <input
      className="w-full p-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
      placeholder="ค้นหา: ชื่อ, อีเมล, หรือ UID..."
      value={value}
      onChange={onChange}
    />
  </div>
);

const UserRow = ({ user }) => {
  const isAdminRole = user.role === "admin";
  const RoleIcon = isAdminRole ? Shield : UserCheck;
  const roleColor = isAdminRole ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800";
  const avatarUrl = user.profilePic || `https://ui-avatars.com/api/?name=${user.displayName || user.username}&background=random`;

  return (
    <tr className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
      <td className="p-4">
        <div className="flex items-center space-x-4">
          <Image
            src={avatarUrl}
            alt="User Avatar"
            width={40}
            height={40}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="font-semibold text-gray-800">{user.displayName || user.username || "N/A"}</div>
            <div className="text-xs text-gray-500 break-all">{user.uid || user.id}</div>
          </div>
        </div>
      </td>
      <td className="p-4 text-gray-600 hidden md:table-cell">{user.email || "-"}</td>
      <td className="p-4 hidden sm:table-cell">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
          <RoleIcon className="w-3.5 h-3.5 mr-1.5" />
          {user.role || "user"}
        </span>
      </td>
      <td className="p-4 text-right">
        <Link
          href={`/admin/users/edit?uid=${user.id}`}
          className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-sm font-medium"
        >
          <Edit className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">แก้ไข</span>
          <ChevronRight className="w-4 h-4 sm:hidden ml-1" />
        </Link>
      </td>
    </tr>
  );
};

// --- Main ---
export default function AdminUsersClient() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const ok = await isAdmin();
        setAllowed(ok);
        if (ok) {
          const list = await getAllUsers();
          setUsers(list);
        }
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredUsers = useMemo(() => {
    const searchTerm = q.trim().toLowerCase();
    if (!searchTerm) return users;
    return users.filter(u =>
      (u.username || "").toLowerCase().includes(searchTerm) ||
      (u.displayName || "").toLowerCase().includes(searchTerm) ||
      (u.email || "").toLowerCase().includes(searchTerm) ||
      (u.uid || u.id || "").toLowerCase().includes(searchTerm)
    );
  }, [users, q]);

  if (loading) return <StatusDisplay message="กำลังโหลดข้อมูลผู้ใช้..." />;
  if (!allowed) return <StatusDisplay message="คุณไม่มีสิทธิ์เข้าถึงหน้านี้" type="error" />;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* ▼▼▼▼▼ ส่วนที่แก้ไข ▼▼▼▼▼ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้</h1>
            <p className="mt-1 text-sm text-gray-600">
              พบผู้ใช้ทั้งหมด <span className="font-semibold text-indigo-600">{users.length}</span> คน
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors shadow-sm self-start sm:self-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </Link>
        </div>
        {/* ▲▲▲▲▲ สิ้นสุดส่วนที่แก้ไข ▲▲▲▲▲ */}

        <div className="mb-6">
          <SearchBar value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-600">ผู้ใช้</th>
                  <th className="p-4 text-left font-semibold text-gray-600 hidden md:table-cell">อีเมล</th>
                  <th className="p-4 text-left font-semibold text-gray-600 hidden sm:table-cell">สิทธิ์ (Role)</th>
                  <th className="p-4 text-right font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => <UserRow key={u.id} user={u} />)
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      ไม่พบผู้ใช้ที่ตรงกับการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}