// Lightweight CSV utilities (no deps).
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { val += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { val += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(val); val = ""; }
      else if (c === "\n") { cur.push(val); rows.push(cur); cur = []; val = ""; }
      else if (c === "\r") { /* skip */ }
      else { val += c; }
    }
  }
  if (val.length > 0 || cur.length > 0) { cur.push(val); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

export function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) =>
    r.map((v) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(",")
  ).join("\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 0);
}
