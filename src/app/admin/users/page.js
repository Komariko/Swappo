// src/app/admin/users/page.js
import { Suspense } from "react";
import AdminUsersClient from "./AdminUsersClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลดรายชื่อผู้ใช้...</div>}>
      <AdminUsersClient />
    </Suspense>
  );
}
