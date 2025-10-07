export default function StatusChip({ status = "available" }) {
  const LABEL = { available: "ยังมีสิ่งของ", contacting: "กำลังติดต่อ", completed: "แลก/ขายแล้ว" };
  const COLOR = {
    available: "bg-emerald-50 text-emerald-700 border-emerald-200",
    contacting: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-slate-100 text-slate-600 border-slate-300 line-through",
  };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] border ${COLOR[status] || ""}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status==='available'?'bg-emerald-600':status==='contacting'?'bg-amber-600':'bg-slate-500'}`} />
      {LABEL[status] || status}
    </span>
  );
}
