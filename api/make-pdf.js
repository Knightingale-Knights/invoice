// api/make-pdf.js
// Receives invoice JSON from Bubble, builds the PDF with pdfmake (no external
// PDF service), and returns ONLY the base64 PDF string. Bubble then feeds this
// into its existing Postmark call as <base64_file_content>.
//
// POST body shape:
// {
//   "invoice_number": "1156",
//   "period_ending": "31/05/26",
//   "invoice_date": "01/06/26",
//   "payment_terms": "30 days",
//   "due_date": "30/06/26",
//   "location_name": "Mclean Lodge",
//   "location_address": "1 Little Princes Street\nTravancore, VIC, 3032",
//   "line_items": [ { date, shift, carer, role, hours, rate }, ... ]
// }
//
// Returns: { "base64": "<...>", "filename": "Invoice 1156.pdf" }

const PdfPrinter = require("pdfmake");

const STATIC = {
  remitPhone: "0426 512 584",
  remitEmail: "care@knightingale.com.au",
  trusteeName: "The Trustee for Nebula Trust",
  abn: "50 405 424 095",
  acn: "674 982 293",
  eftBsb: "803-439",
  eftAccNo: "215 191 666",
  eftAccName: "The Trustee for Nebula Trust",
  knightAddress: "133/22 Kavanagh Street\nSouthbank, VIC, 3006",
  gstRate: 0.1,
};

const printer = new PdfPrinter({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
  Times: {
    normal: "Times-Roman",
    bold: "Times-Bold",
    italics: "Times-Italic",
    bolditalics: "Times-BoldItalic",
  },
});

function money(n) {
  return "$" + Number(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildDocDefinition(data) {
  let totalHours = 0, subtotal = 0;
  const bodyRows = (data.line_items || []).map((r) => {
    const hours = Number(r.hours) || 0;
    const rate = Number(r.rate) || 0;
    const sub = hours * rate;
    totalHours += hours;
    subtotal += sub;
    return [
      { text: r.date, alignment: "left" },
      { text: r.shift, alignment: "left" },
      { text: r.carer, alignment: "left" },
      { text: r.role, alignment: "left" },
      { text: hours.toFixed(2), alignment: "right" },
      { text: money(rate), alignment: "right" },
      { text: money(sub), alignment: "right" },
    ];
  });
  const gst = subtotal * STATIC.gstRate;
  const totalPayable = subtotal + gst;

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: "Helvetica", fontSize: 9, color: "#213530" },
    content: [
      { text: "Knightingale", font: "Times", fontSize: 34, alignment: "center", margin: [0, 0, 0, 2] },
      { text: "Kind care for older adults", fontSize: 8, alignment: "center", color: "#4a5a54", characterSpacing: 1, margin: [0, 0, 0, 28] },
      { text: `${(data.location_name || "").toUpperCase()} INVOICE`, bold: true, fontSize: 10, alignment: "center", characterSpacing: 1, margin: [0, 0, 0, 28] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Invoice Remittances", bold: true, margin: [0, 0, 0, 4] },
              { text: [{ text: "Phone: ", bold: true }, STATIC.remitPhone] },
              { text: [{ text: "Email: ", bold: true }, STATIC.remitEmail] },
            ],
          },
          {
            width: "auto",
            stack: [
              { text: [{ text: "Number:  ", bold: true }, data.invoice_number || ""], margin: [0, 0, 0, 2] },
              { text: [{ text: "Period Ending:  ", bold: true }, data.period_ending || ""], margin: [0, 0, 0, 2] },
              { text: [{ text: "Invoice Date:  ", bold: true }, data.invoice_date || ""], margin: [0, 0, 0, 2] },
              { text: [{ text: "Payment Terms:  ", bold: true }, data.payment_terms || ""], margin: [0, 0, 0, 2] },
              { text: [{ text: "Due Date:  ", bold: true }, data.due_date || ""] },
            ],
            margin: [20, 0, 20, 0],
          },
          {
            width: "*",
            stack: [
              { text: STATIC.trusteeName, bold: true, margin: [0, 0, 0, 4] },
              { text: [{ text: "Trading as: ", bold: true }, "Knightingale"] },
              { text: [{ text: "ABN: ", bold: true }, STATIC.abn] },
              { text: [{ text: "ACN: ", bold: true }, STATIC.acn] },
            ],
          },
        ],
        margin: [0, 0, 0, 28],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: data.location_name || "", bold: true, margin: [0, 0, 0, 4] },
              { text: data.location_address || "" },
            ],
          },
          {
            width: "auto",
            stack: [
              { text: "Electronic Funds Transfer", bold: true, margin: [0, 0, 0, 4] },
              { text: [{ text: "BSB:  ", bold: true }, STATIC.eftBsb] },
              { text: [{ text: "ACC NO:  ", bold: true }, STATIC.eftAccNo] },
              { text: [{ text: "ACC NAME:  ", bold: true }, STATIC.eftAccName] },
            ],
            margin: [20, 0, 20, 0],
          },
          {
            width: "*",
            stack: [
              { text: "Knightingale", bold: true, margin: [0, 0, 0, 4] },
              { text: STATIC.knightAddress },
            ],
          },
        ],
        margin: [0, 0, 0, 36],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto", "auto", "auto", "auto"],
          body: [
            [
              { text: "Shift Date", bold: true },
              { text: "Shift", bold: true },
              { text: "Carer", bold: true },
              { text: "Role", bold: true },
              { text: "Hours", bold: true, alignment: "right" },
              { text: "Hourly Rate", bold: true, alignment: "right" },
              { text: "Subtotal", bold: true, alignment: "right" },
            ],
            ...bodyRows,
          ],
        },
        layout: {
          hLineWidth: (i) => (i === 0 || i === 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => "#213530",
          paddingTop: () => 7,
          paddingBottom: () => 7,
        },
        margin: [0, 0, 0, 4],
      },
      {
        table: {
          widths: ["*", "auto", "auto"],
          body: [
            [
              { text: "Totals", bold: true, alignment: "right" },
              { text: totalHours.toFixed(2), bold: true, alignment: "right" },
              { text: money(subtotal), bold: true, alignment: "right" },
            ],
            [
              { text: "Total GST", bold: true, alignment: "right" },
              { text: "", border: [false, false, false, false] },
              { text: money(gst), bold: true, alignment: "right" },
            ],
            [
              { text: "Total Payable", bold: true, alignment: "right" },
              { text: "", border: [false, false, false, false] },
              { text: money(totalPayable), bold: true, alignment: "right" },
            ],
          ],
        },
        layout: {
          hLineWidth: (i) => (i === 1 ? 1 : 0),
          vLineWidth: () => 0,
          hLineColor: () => "#213530",
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
      },
    ],
  };
}

function generatePdfBase64(data) {
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(buildDocDefinition(data));
      const chunks = [];
      pdfDoc.on("data", (chunk) => chunks.push(chunk));
      pdfDoc.on("end", () => resolve(Buffer.concat(chunks).toString("base64")));
      pdfDoc.on("error", reject);
      pdfDoc.end();
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

  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    if (!data.invoice_number) {
      res.status(400).json({ error: "Missing invoice_number" });
      return;
    }

    const base64 = await generatePdfBase64(data);
    const filename = `Invoice ${data.invoice_number}.pdf`;

    res.status(200).json({ base64, filename });
  } catch (err) {
    res.status(500).json({ error: "PDF generation failed", detail: String(err) });
  }
};
