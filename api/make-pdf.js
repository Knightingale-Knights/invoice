// api/make-pdf.js
// Builds the Knightingale invoice PDF and returns { base64, filename }.
// Bubble feeds base64 into its existing Postmark call as the attachment.
// All design lives in ./_invoiceDoc.js (shared with the preview endpoint).

const { generatePdfBase64 } = require("./_invoiceDoc.js");

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
