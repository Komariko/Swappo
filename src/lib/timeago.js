export function timeAgo(dateOrMs) {
  const d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
  const seconds = Math.floor((Date.now() - (d?.getTime?.() ?? 0)) / 1000);
  if (!isFinite(seconds) || seconds < 0) return "";
  if (seconds < 60) return "ไม่กี่วินาทีที่แล้ว";
  if (seconds < 3600) return `${Math.floor(seconds/60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)} ชั่วโมงที่แล้ว`;
  if (seconds < 2592000) return `${Math.floor(seconds/86400)} วันที่แล้ว`;
  const months = Math.floor(seconds/2592000);
  if (months < 12) return `${months} เดือนที่แล้ว`;
  return `${Math.floor(months/12)} ปีที่แล้ว`;
}
