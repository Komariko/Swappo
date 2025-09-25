// components/StatusChip.jsx
export default function StatusChip({ status = "available", className = "" }) {
  /**
   * คำอธิบายที่แสดงบนชิป
   * - available   → “ยังมีสินค้า”
   * - contacting  → “กำลังติดต่อ”
   * - completed   → “แลก/ขายแล้ว”
   */
  const LABEL = {
    available:  "ยังมีสินค้า",
    contacting: "กำลังติดต่อ",
    completed:  "แลก/ขายแล้ว",
  };

  /**
   * สีพื้น/เส้นขอบ/ตัวอักษร ของชิปแต่ละสถานะ (Tailwind classes)
   * - completed มีขีดฆ่า (line-through) ให้เห็นว่าปิดจบแล้ว
   */
  const CHIP_STYLE = {
    available:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    contacting: "bg-amber-50 text-amber-700 border-amber-200",
    completed:  "bg-slate-100 text-slate-600 border-slate-300 line-through",
    // fallback สีเทา เมื่อส่งสถานะที่ไม่มีในระบบมา
    _unknown:   "bg-slate-100 text-slate-600 border-slate-300",
  };

  /** จุดไฟบอกสถานะ (วงกลมเล็ก ๆ ด้านหน้า) */
  const DOT_STYLE = {
    available:  "bg-emerald-600",
    contacting: "bg-amber-600",
    completed:  "bg-slate-500",
    _unknown:   "bg-slate-500",
  };

  // สถานะที่ใช้จริง (ถ้าไม่รู้จัก ให้เป็น _unknown)
  const key = LABEL[status] ? status : "_unknown";
  const label = LABEL[status] || "ไม่ระบุสถานะ";

  return (
    <span
      // a11y: บอกผู้อ่านหน้าจอว่าเป็นป้ายสถานะ และอ่านออกเสียงได้
      role="status"
      aria-label={label}
      aria-live="polite"
      title={label}
      data-status={key} // เผื่อเทส/ยิง CSS ภายนอก
      className={[
        "inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] border",
        CHIP_STYLE[key],
        className,
      ].join(" ")}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_STYLE[key]}`} />
      {label}
    </span>
  );
}
