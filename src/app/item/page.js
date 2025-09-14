import { Suspense } from "react";
import ItemClient from "./ItemClient";

function ItemSkeleton() {
  return (
    <>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="bg-white h-[520px] rounded-2xl border border-slate-200 shadow animate-pulse" />
        <div className="space-y-4">
          <div className="bg-white h-40 rounded-2xl border border-slate-200 shadow animate-pulse" />
          <div className="bg-white h-48 rounded-2xl border border-slate-200 shadow animate-pulse" />
        </div>
      </main>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ItemSkeleton />}>
      <ItemClient />
    </Suspense>
  );
}
