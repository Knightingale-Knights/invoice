// api/send-invoice.js
// Receives invoice JSON from Bubble, builds the PDF with pdfmake (no external
// PDF service), and sends it via Postmark template 40979457 with the PDF
// attached. Returns success/fail to Bubble.
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
//   "location_email": "accounts@mcleanlodge.com.au",
//   "participant": "Modika",
//   "line_items": [ { date, shift, carer, role, hours, rate }, ... ]
// }

const PdfPrinter = require("pdfmake");

const FROM_ADDRESS = "care@knightingale.com.au";
const POSTMARK_TEMPLATE_ID = 40979457;

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

// Standard 14 PDF fonts — no font files needed.
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

// Generate the PDF and return it as a base64 string.
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
  // CORS so Bubble's API Connector can call it without issue
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

    if (!data.invoice_number || !data.location_email) {
      res.status(400).json({ error: "Missing invoice_number or location_email" });
      return;
    }

    const token = process.env.POSTMARK_TOKEN;
    if (!token) {
      res.status(500).json({ error: "POSTMARK_TOKEN not set in environment" });
      return;
    }

    // 1. Build the PDF
    const pdfBase64 = await generatePdfBase64(data);
    const fileName = `${data.participant || "Invoice"} - Invoice ${data.invoice_number}.pdf`;

    // 2. Send via Postmark template with the PDF attached
    const pmResponse = await fetch("https://api.postmarkapp.com/email/withTemplate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: FROM_ADDRESS,
        To: data.location_email,
        TemplateId: POSTMARK_TEMPLATE_ID,
        TemplateModel: {
          location_name: data.location_name || "",
          participant: data.participant || "",
        },
        Attachments: [
          {
            Name: fileName,
            Content: pdfBase64,
            ContentType: "application/pdf",
          },
        ],
        MessageStream: "outbound",
      }),
    });

    const pmResult = await pmResponse.json();

    if (!pmResponse.ok || pmResult.ErrorCode) {
      res.status(502).json({ error: "Postmark send failed", detail: pmResult });
      return;
    }

    res.status(200).json({
      success: true,
      messageId: pmResult.MessageID,
      sentTo: data.location_email,
      fileName,
    });
  } catch (err) {
    res.status(500).json({ error: "Send failed", detail: String(err) });
  }
};
