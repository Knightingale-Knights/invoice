// api/_ndisInvoiceDoc.js
// Shared NDIS (participant) invoice builder: shift + travel tables, combined total.
// Imported by api/make-ndis-pdf.js and api/preview-ndis.js. Editorial style,
// embedded Antic Didone + Geist fonts (in repo root via process.cwd()).
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
};

const PAGE_WIDTH = 595.28;
const MARGIN_X = 48;
const MARGIN_TOP = 42;
const MARGIN_BOTTOM = 42;
const RULE_W = PAGE_WIDTH - MARGIN_X * 2;
const FOOTER_BUFFER = 78;

const money = (n) => "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const label = (t) => ({ text: t.toUpperCase(), font: "GeistMedium", fontSize: 7, characterSpacing: 1.6, color: C.muted, margin: [0, 0, 0, 6] });
const key = (t) => ({ text: t, color: C.muted, fontSize: 8.5 });
const th = (t, align) => ({ text: t, font: "GeistMedium", fontSize: 7, characterSpacing: 1.2, color: C.muted, alignment: align || "center" });

// shared column widths for both tables (7 cols)
const TABLE_WIDTHS = ["14%", "13%", "18%", "*", "11%", "10%", "13%"];

function buildItemsTable(items, opts) {
  // opts.qtyFmt(row) -> displayed quantity (hours or distance)
  let totalQty = 0, subtotal = 0;
  const rows = items.map((r) => {
    const qty = Number(r.hours != null ? r.hours : r.distance) || 0;
    const rate = Number(r.rate) || 0;
    const sub = qty * rate;
    totalQty += qty; subtotal += sub;
    return [
      { text: r.date, fontSize: 8.5, alignment: "center" },
      { text: r.carer, fontSize: 8.5, alignment: "center" },
      { text: r.ndis_item, fontSize: 8, alignment: "center" },
      { text: r.ndis_description, fontSize: 8.5, alignment: "center" },
      { text: opts.qtyDisplay(qty), fontSize: 8.5, alignment: "center", fontFeatures: ["tnum"] },
      { text: money(rate), fontSize: 8.5, alignment: "center", fontFeatures: ["tnum"] },
      { text: money(sub), fontSize: 8.5, alignment: "center", fontFeatures: ["tnum"] },
    ];
  });
  return { rows, totalQty, subtotal };
}

function buildContent(data) {
  const shift = buildItemsTable(data.shift_items || [], { qtyDisplay: (q) => q.toFixed(2) });
  const travel = buildItemsTable(data.travel_items || [], { qtyDisplay: (q) => q.toFixed(2) + "kms" });
  const totalGst = 0;
  const totalPayable = shift.subtotal + travel.subtotal + totalGst;

  const tableLayout = {
    hLineWidth: (i) => (i === 0 ? 0 : i === 1 ? 0.8 : 0.5),
    hLineColor: (i) => (i === 1 ? C.ink : C.rule),
    vLineWidth: () => 0,
    paddingTop: (i) => (i === 0 ? 0 : 7),
    paddingBottom: (i) => (i === 0 ? 6 : 7),
    paddingLeft: () => 3,
    paddingRight: () => 3,
  };
  const totalRowLayout = {
    hLineWidth: (i) => (i === 0 ? 0.8 : 0),
    hLineColor: () => C.ink,
    vLineWidth: () => 0,
    paddingTop: () => 8,
    paddingBottom: () => 8,
    paddingLeft: () => 3,
    paddingRight: () => 3,
  };

  const shiftHeader = [ th("SHIFT DATE"), th("CARER"), th("NDIS ITEM NO."), th("NDIS DESCRIPTION"), th("HOURS"), th("HOURLY RATE"), th("SUBTOTAL") ];
  const travelHeader = [ th("TRAVEL DATE"), th("CARER"), th("NDIS ITEM NO."), th("NDIS DESCRIPTION"), th("DISTANCE"), th("RATE"), th("SUBTOTAL") ];

  return [
    { text: "knightingale", font: "Antic", fontSize: 48, color: C.ink, margin: [0, 0, 0, 6] },
    { text: `${data.participant || ""}${data.ndis_number ? "   ·   NDIS " + data.ndis_number : ""}`, font: "GeistMedium", fontSize: 8, characterSpacing: 1, color: C.ink, margin: [0, 0, 0, 20] },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: RULE_W, y2: 0, lineWidth: 0.5, lineColor: C.rule }], margin: [0, 0, 0, 16] },
    {
      columns: [
        { width: "*", stack: [ label("Invoice"),
            { columns: [
              { width: 56, stack: [
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
            { text: [key("ABN  "), { text: STATIC.abn, fontSize: 9 }], lineHeight: 1.5 },
            { text: [key("ACN  "), { text: STATIC.acn, fontSize: 9 }], lineHeight: 1.5 },
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
          { text: [key("BSB   "), { text: STATIC.eftBsb }], fontSize: 9, lineHeight: 1.5 },
          { text: [key("Account   "), { text: STATIC.eftAccNo }], fontSize: 9, lineHeight: 1.5 },
          { text: [key("Name   "), { text: STATIC.eftAccName }], fontSize: 9, lineHeight: 1.5 } ] },
        { width: "*", stack: [ label("From"),
          { text: "knightingale", fontSize: 9, lineHeight: 1.5 },
          { text: STATIC.knightAddress, fontSize: 9, lineHeight: 1.5 } ] },
      ],
      columnGap: 24,
      margin: [0, 0, 0, 24],
    },

    // SHIFT / SUPPORT TABLE
    { text: "", font: "GeistMedium", fontSize: 7, characterSpacing: 1.6, color: C.muted, margin: [0, 0, 0, 8] },
    {
      table: { headerRows: 1, widths: TABLE_WIDTHS, body: [ shiftHeader, ...shift.rows ] },
      layout: tableLayout,
      margin: [0, 0, 0, 0],
    },
    {
      table: { widths: TABLE_WIDTHS, body: [[
        { text: "Support Total", font: "GeistMedium", fontSize: 9, colSpan: 4 }, {}, {}, {},
        { text: shift.totalQty.toFixed(2), font: "GeistMedium", fontSize: 9, alignment: "center", fontFeatures: ["tnum"] },
        { text: "" },
        { text: money(shift.subtotal), font: "GeistMedium", fontSize: 9, alignment: "center", fontFeatures: ["tnum"] },
      ]] },
      layout: totalRowLayout,
      margin: [0, 0, 0, 28],
    },

    // TRAVEL TABLE
    { text: "", font: "GeistMedium", fontSize: 7, characterSpacing: 1.6, color: C.muted, margin: [0, 0, 0, 8] },
    {
      table: { headerRows: 1, widths: TABLE_WIDTHS, body: [ travelHeader, ...travel.rows ] },
      layout: tableLayout,
      margin: [0, 0, 0, 0],
    },
    {
      table: { widths: TABLE_WIDTHS, body: [[
        { text: "Travel Total", font: "GeistMedium", fontSize: 9, colSpan: 4 }, {}, {}, {},
        { text: travel.totalQty.toFixed(2) + "kms", font: "GeistMedium", fontSize: 9, alignment: "center", fontFeatures: ["tnum"] },
        { text: "" },
        { text: money(travel.subtotal), font: "GeistMedium", fontSize: 9, alignment: "center", fontFeatures: ["tnum"] },
      ]] },
      layout: totalRowLayout,
      margin: [0, 0, 0, 20],
    },

    // GRAND TOTALS
    {
      table: { widths: TABLE_WIDTHS, body: [
        [
          { text: "Total GST", font: "GeistMedium", fontSize: 9, color: C.muted, colSpan: 6 }, {}, {}, {}, {}, {},
          { text: money(totalGst), fontSize: 9, alignment: "center", color: C.muted, fontFeatures: ["tnum"] },
        ],
      ] },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 6, paddingBottom: () => 6, paddingLeft: () => 3, paddingRight: () => 3 },
      margin: [0, 0, 0, 0],
    },
    {
      table: { widths: TABLE_WIDTHS, body: [
        [
          { text: "TOTAL PAYABLE", font: "GeistMedium", fontSize: 7, characterSpacing: 1.6, color: C.muted, alignment: "right", colSpan: 6 }, {}, {}, {}, {}, {},
          { text: "" },
        ],
        [
          { text: money(totalPayable), font: "Antic", fontSize: 30, color: C.ink, alignment: "right", colSpan: 7 }, {}, {}, {}, {}, {}, {},
        ],
      ] },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: (i) => (i === 0 ? 0 : 2), paddingBottom: () => 0, paddingLeft: () => 3, paddingRight: () => 3 },
      margin: [0, 12, 0, 8],
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


// Two-pass auto-height: measure content, then size the page to fit.
function createInvoiceDoc(data) {
  const measureDoc = makeDoc(data, 6000);
  const contentBottom = measureDoc.y;
  measureDoc.end();
  const pageHeight = Math.ceil(contentBottom + FOOTER_BUFFER + MARGIN_BOTTOM);
  return makeDoc(data, pageHeight);
}

function generatePdfBase64(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = createInvoiceDoc(data);
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      doc.on("error", reject);
      doc.end();
    } catch (err) { reject(err); }
  });
}

const desc = "Access Community Social and Rec Activ - Standard - Weekday Daytime";
const SAMPLE = {
  invoice_number: "1096", period_ending: "17/05/2026", invoice_date: "18/05/2026",
  payment_terms: "30 days", due_date: "17/06/2026",
  participant: "Debra Logozzo", ndis_number: "432197636",
  location_name: "Moira", location_address: "Level 3/42 Lakeview Dr, Scoresby\nVIC 3179, Australia",
  shift_items: [
    { date: "Mon, May 11th", carer: "Olly Davis", ndis_item: "04_104_0125_6_1", ndis_description: desc, hours: 5, rate: 70.23 },
    { date: "Wed, May 13th", carer: "Olly Davis", ndis_item: "04_104_0125_6_1", ndis_description: desc, hours: 3, rate: 70.23 },
    { date: "Fri, May 15th", carer: "Olly Davis", ndis_item: "04_104_0125_6_1", ndis_description: desc, hours: 5, rate: 70.23 },
  ],
  travel_items: [
    { date: "Mon, May 11th", carer: "Olly Davis", ndis_item: "04_590_0125_6_1", ndis_description: "Activity Based Transport", distance: 4.28, rate: 1 },
    { date: "Wed, May 13th", carer: "Olly Davis", ndis_item: "04_590_0125_6_1", ndis_description: "Activity Based Transport", distance: 2.51, rate: 1 },
    { date: "Fri, May 15th", carer: "Olly Davis", ndis_item: "04_590_0125_6_1", ndis_description: "Activity Based Transport", distance: 8.42, rate: 1 },
  ],
};

module.exports = { createInvoiceDoc, generatePdfBase64, SAMPLE };
