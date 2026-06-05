// api/make-pdf.js
// Builds the editorial Knightingale invoice as an auto-height single-page PDF
// using pdfmake with embedded Antic Didone (logo) + Geist (body) fonts.
// Returns ONLY { base64, filename }. Bubble feeds base64 into its Postmark call.
//
// Fonts live in the repo ROOT (alongside package.json), resolved via process.cwd().

const path = require("path");
const PdfPrinter = require("pdfmake");

const ROOT = process.cwd();
const fontPath = (f) => path.join(ROOT, f);

const printer = new PdfPrinter({
  Geist: {
    normal: fontPath("Geist-Regular.ttf"),
    bold: fontPath("Geist-Bold.ttf"),
    italics: fontPath("Geist-Italic.ttf"),
    bolditalics: fontPath("Geist-Bold.ttf"),
  },
  GeistMedium: { normal: fontPath("Geist-Medium.ttf") },
  Antic: { normal: fontPath("AnticDidone-Regular.ttf") },
});

const C = { bg: "#F7F4EF", ink: "#1A1714", muted: "#9C9488", rule: "#D8D3CB", thanks: "#C4BDB3" };

const STATIC = {
  remitPhone: "0426 512 584",
  remitEmail: "care@knightingale.com.au",
  trusteeName: "The Trustee for Nebula Trust",
  abn: "50 405 424 095",
  acn: "674 982 293",
  eftBsb: "803-439",
  eftAccNo: "215 191 666",
  eftAccName: "The Trustee for Nebula Trust",
  knightAddress: "133/22 Kavanagh Street\nSouthbank VIC 3006",
  gstRate: 0.1,
};

const PAGE_WIDTH = 595.28;
const MARGIN_X = 48;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 42;
const RULE_W = PAGE_WIDTH - MARGIN_X * 2;
const FOOTER_BUFFER = 78; // doc.y reads before final footer block is placed

const money = (n) => "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (t) => ({ text: t.toUpperCase(), font: "GeistMedium", fontSize: 7, characterSpacing: 1.6, color: C.muted, margin: [0, 0, 0, 6] });
const key = (t) => ({ text: t, color: C.muted, fontSize: 8.5 });

function buildContent(data) {
  let totalHours = 0, subtotal = 0;
  const rows = (data.line_items || []).map((r) => {
    const hours = Number(r.hours) || 0;
    const rate = Number(r.rate) || 0;
    const sub = hours * rate;
    totalHours += hours; subtotal += sub;
    return [
      { text: r.date, fontSize: 9 },
      { text: r.shift, fontSize: 9 },
      { text: r.carer, fontSize: 9 },
      { text: r.role, fontSize: 9, alignment: "center" },
      { text: hours.toFixed(2), fontSize: 9, alignment: "right" },
      { text: money(rate), fontSize: 9, alignment: "right" },
      { text: money(sub), fontSize: 9, alignment: "right" },
    ];
  });
  const gst = subtotal * STATIC.gstRate;
  const totalPayable = subtotal + gst;
  const th = (t, align) => ({ text: t, font: "GeistMedium", fontSize: 7, characterSpacing: 1.4, color: C.muted, alignment: align || "left" });

  return [
    { text: "TAX INVOICE", font: "GeistMedium", fontSize: 8, characterSpacing: 2, color: C.muted, margin: [0, 0, 0, 10] },
    { text: "Knightingale", font: "Antic", fontSize: 48, color: C.ink, margin: [0, 0, 0, 20] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: RULE_W, y2: 0, lineWidth: 0.5, lineColor: C.rule }], margin: [0, 0, 0, 16] },
    {
      columns: [
        { width: "*", stack: [ label("Invoice"),
            { columns: [
              { width: 72, stack: [
                { text: "Number", color: C.muted, fontSize: 9 },
                { text: "Period end", color: C.muted, fontSize: 9 },
                { text: "Date", color: C.muted, fontSize: 9 },
                { text: "Terms", color: C.muted, fontSize: 9 },
                { text: "Due", color: C.muted, fontSize: 9 },
              ], lineHeight: 1.7 },
              { width: "*", stack: [
                { text: data.invoice_number || "", fontSize: 9 },
                { text: data.period_ending || "", fontSize: 9 },
                { text: data.invoice_date || "", fontSize: 9 },
                { text: data.payment_terms || "", fontSize: 9 },
                { text: data.due_date || "", fontSize: 9 },
              ], lineHeight: 1.7 },
            ] },
        ] },
        { width: "*", stack: [ label("Enquiries"),
            { text: "Invoice Remittances", fontSize: 9, lineHeight: 1.5 },
            { text: STATIC.remitPhone, fontSize: 9, lineHeight: 1.5 },
            { text: STATIC.remitEmail, fontSize: 9, lineHeight: 1.5 },
        ] },
        { width: "*", stack: [ label("Entity"),
            { text: STATIC.trusteeName, fontSize: 9, lineHeight: 1.5 },
            { text: "Trading as Knightingale", fontSize: 9, lineHeight: 1.5 },
            { text: [key("ABN "), { text: STATIC.abn, fontSize: 9 }], lineHeight: 1.5 },
            { text: [key("ACN "), { text: STATIC.acn, fontSize: 9 }], lineHeight: 1.5 },
        ] },
      ],
      columnGap: 24,
      margin: [0, 0, 0, 8],
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: RULE_W, y2: 0, lineWidth: 0.5, lineColor: C.rule }], margin: [0, 0, 0, 12] },
    {
      columns: [
        { width: "*", stack: [ label("Billed to"),
          { text: data.location_name || "", fontSize: 9, lineHeight: 1.5 },
          { text: data.location_address || "", fontSize: 9, lineHeight: 1.5 } ] },
        { width: "*", stack: [ label("Payment via EFT"),
          { text: [key("BSB "), { text: STATIC.eftBsb }], fontSize: 9, lineHeight: 1.5 },
          { text: [key("Account "), { text: STATIC.eftAccNo }], fontSize: 9, lineHeight: 1.5 },
          { text: [key("Name "), { text: STATIC.eftAccName }], fontSize: 9, lineHeight: 1.5 } ] },
        { width: "*", stack: [ label("From"),
          { text: "Knightingale", fontSize: 9, lineHeight: 1.5 },
          { text: STATIC.knightAddress, fontSize: 9, lineHeight: 1.5 } ] },
      ],
      columnGap: 24,
      margin: [0, 0, 0, 20],
    },
    {
      table: {
        headerRows: 1,
        widths: ["18%", "15%", "*", "8%", "10%", "13%", "15%"],
        body: [
          [ th("SHIFT DATE"), th("SHIFT"), th("CARER"), th("ROLE", "center"), th("HOURS", "right"), th("RATE/HR", "right"), th("SUBTOTAL", "right") ],
          ...rows,
        ],
      },
      layout: {
        hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.8 : 0.5),
        hLineColor: (i) => (i === 1 ? C.ink : C.rule),
        vLineWidth: () => 0,
        paddingTop: (i) => (i === 0 ? 0 : 5),
        paddingBottom: (i) => (i === 0 ? 6 : 5),
        paddingLeft: () => 0,
        paddingRight: () => 0,
      },
      margin: [0, 0, 0, 12],
    },
    {
      columns: [
        { width: "*", text: "" },
        { width: 220, stack: [
          { columns: [ { width: "*", text: "Totals", font: "GeistMedium", fontSize: 9 },
                       { width: "auto", text: `${totalHours.toFixed(2)}     ${money(subtotal)}`, font: "GeistMedium", fontSize: 9, alignment: "right" } ], margin: [0, 0, 0, 8] },
          { columns: [ { width: "*", text: "GST", fontSize: 9, color: C.muted },
                       { width: "auto", text: money(gst), fontSize: 9, alignment: "right" } ], margin: [0, 0, 0, 10] },
          { text: "TOTAL PAYABLE", font: "GeistMedium", fontSize: 7, characterSpacing: 1.6, color: C.muted, alignment: "right", margin: [0, 0, 0, 4] },
          { text: money(totalPayable), font: "Antic", fontSize: 32, color: C.ink, alignment: "right" },
        ] },
      ],
      margin: [0, 0, 0, 8],
    },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: RULE_W, y2: 0, lineWidth: 0.5, lineColor: C.rule }], margin: [0, 0, 0, 10] },
    {
      columns: [
        { width: "*", stack: [
          label("Kind care for older adults"),
          { text: [key("Web    "), { text: "knightingale.com.au" }], fontSize: 9, lineHeight: 1.8 },
          { text: [key("Email  "), { text: STATIC.remitEmail }], fontSize: 9, lineHeight: 1.8 },
          { text: [key("Phone  "), { text: STATIC.remitPhone }], fontSize: 9, lineHeight: 1.8 },
        ] },
        { width: "*", stack: [ { text: "Thank you.", font: "Antic", fontSize: 18, color: C.thanks, alignment: "right", margin: [0, 20, 0, 0] } ] },
      ],
      columnGap: 24,
    },
  ];
}

function makeDoc(data, pageHeight) {
  return printer.createPdfKitDocument({
    pageSize: { width: PAGE_WIDTH, height: pageHeight },
    pageMargins: [MARGIN_X, MARGIN_TOP, MARGIN_X, MARGIN_BOTTOM],
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: PAGE_WIDTH, h: pageHeight, color: C.bg }] }),
    defaultStyle: { font: "Geist", fontSize: 9, color: C.ink, lineHeight: 1.15 },
    content: buildContent(data),
  });
}

function generatePdfBase64(data) {
  return new Promise((resolve, reject) => {
    try {
      // Pass 1: measure content bottom on a very tall page.
      const measureDoc = makeDoc(data, 5000);
      const contentBottom = measureDoc.y;
      measureDoc.end();
      const pageHeight = Math.ceil(contentBottom + FOOTER_BUFFER + MARGIN_BOTTOM);

      // Pass 2: render at fitted height and collect base64.
      const doc = makeDoc(data, pageHeight);
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      doc.on("error", reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!data.invoice_number) { res.status(400).json({ error: "Missing invoice_number" }); return; }

    const base64 = await generatePdfBase64(data);
    const filename = `Invoice ${data.invoice_number}.pdf`;
    res.status(200).json({ base64, filename });
  } catch (err) {
    res.status(500).json({ error: "PDF generation failed", detail: String(err) });
  }
};
