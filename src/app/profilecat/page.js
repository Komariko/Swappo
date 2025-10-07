import { Suspense } from "react";
import ProfileCatClient from "./ProfileCatClient";

function ProfileCatSkeleton() {
  return (
    <main className="min-h-[calc(100vh-120px)] bg-slate-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6 flex gap-4">
          <div className="w-20 h-20 rounded-full bg-slate-200 animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-72 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-52 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-3">
              <div className="aspect-[4/3] bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-5 w-2/3 bg-slate-200 rounded mt-3 animate-pulse" />
              <div className="h-4 w-1/2 bg-slate-200 rounded mt-2 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<ProfileCatSkeleton />}>
      <ProfileCatClient />
    </Suspense>
  );
}
