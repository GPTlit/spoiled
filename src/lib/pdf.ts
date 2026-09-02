/** Print-to-PDF export. Uses the browser print engine so Arabic shaping and RTL are correct. */
export type PdfPage = { content: string; imageUrl?: string | null };

export function exportPdf(opts: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  pages: PdfPage[];
  rtl?: boolean;
}) {
  const dir = opts.rtl ? "rtl" : "ltr";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const cover = opts.coverUrl
    ? `<section class="page cover"><img src="${opts.coverUrl}" alt="" /><h1>${esc(opts.title)}</h1>${
        opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ""
      }</section>`
    : `<section class="page cover text"><h1>${esc(opts.title)}</h1>${
        opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ""
      }</section>`;

  const body = opts.pages
    .map(
      (p, i) =>
        `<section class="page">${p.imageUrl ? `<img class="illus" src="${p.imageUrl}" alt="" />` : ""}<pre>${esc(
          p.content ?? "",
        )}</pre><footer>${i + 1}</footer></section>`,
    )
    .join("");

  const html = `<!doctype html><html dir="${dir}"><head><meta charset="utf-8" />
<title>${esc(opts.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: "Times New Roman", "Noto Naskh Arabic", Georgia, serif; color:#111; direction:${dir}; }
  .page { page-break-after: always; position: relative; min-height: 240mm; }
  .page:last-child { page-break-after: auto; }
  .cover { display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
  .cover img { max-width: 100%; max-height: 170mm; object-fit: contain; }
  .cover h1 { font-size: 30pt; margin: 14mm 0 4mm; }
  .cover p { font-size: 12pt; color:#555; margin:0; }
  .illus { display:block; width:100%; max-height:110mm; object-fit:cover; margin-bottom:8mm; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 12pt; line-height: 1.7; margin:0; }
  footer { position:absolute; bottom:0; width:100%; text-align:center; font-size:9pt; color:#888; }
</style></head><body>${cover}${body}</body></html>`;

  const w = window.open("", "_blank");
  if (!w) throw new Error("Allow pop-ups to export the PDF.");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/** Split long text into printable pages of roughly `perPage` characters, on paragraph breaks. */
export function paginate(text: string, perPage = 2600): string[] {
  const paras = text.split(/\n{2,}/);
  const pages: string[] = [];
  let buf = "";
  for (const p of paras) {
    if (buf.length + p.length > perPage && buf) {
      pages.push(buf.trim());
      buf = "";
    }
    buf += (buf ? "\n\n" : "") + p;
  }
  if (buf.trim()) pages.push(buf.trim());
  return pages.length ? pages : [""];
}
