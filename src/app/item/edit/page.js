// ❌ อย่าใส่ "use client" ในไฟล์นี้
import { Suspense } from "react";
import ItemEditClient from "./ItemEditClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลด...</div>}>
      <ItemEditClient />
    </Suspense>
  );
}
