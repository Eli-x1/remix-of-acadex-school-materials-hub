// Print-based PDF export. No native deps; uses browser's "Save as PDF".
export function exportHTMLToPDF(title: string, bodyHTML: string) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;color:#0f172a}
  h1{font-size:20px;margin:0 0 4px}
  .meta{color:#64748b;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
  th{background:#f1f5f9;font-weight:600}
  tr:nth-child(even) td{background:#fafafa}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600}
  .b-c{background:#dcfce7;color:#166534}
  .b-p{background:#fef3c7;color:#854d0e}
  .b-o{background:#fee2e2;color:#991b1b}
  .summary{display:flex;gap:16px;margin:8px 0 16px}
  .summary div{flex:1;border:1px solid #e2e8f0;padding:10px;border-radius:8px}
  .summary b{font-size:18px;display:block}
  @media print { @page { margin: 14mm; } }
</style></head><body>${bodyHTML}
<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),200);});</script>
</body></html>`);
  w.document.close();
}

export function statusBadgeHTML(status: string) {
  const cls = status === "completed" ? "b-c" : status === "overdue" ? "b-o" : "b-p";
  const label = status === "completed" ? "Brought" : status === "overdue" ? "Overdue" : "Pending";
  return `<span class="badge ${cls}">${label}</span>`;
}

export function escapeHTML(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
