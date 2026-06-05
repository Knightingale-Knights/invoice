// api/make-ndis-pdf.js
// Builds the NDIS (participant) invoice PDF — shift + travel tables, combined
// total — and returns { base64, filename }. The second Bubble workflow feeds
// base64 into its Postmark call as the attachment.
// Design lives in ./_ndisInvoiceDoc.js.

const { generatePdfBase64 } = require("./_ndisInvoiceDoc.js");

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
