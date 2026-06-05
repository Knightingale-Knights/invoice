// api/preview-ndis.js
// Live design preview for the NDIS template. Renders inline PDF in the browser
// using the SAME builder as make-ndis-pdf.js.
//
//   GET  /api/preview-ndis            -> built-in SAMPLE data
//   POST /api/preview-ndis (JSON)     -> your posted invoice data
//
// Refresh after each commit to see tweaks. No email, real embedded fonts.

const { createInvoiceDoc, SAMPLE } = require("./_ndisInvoiceDoc.js");

module.exports = (req, res) => {
  try {
    let data = SAMPLE;
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (body && body.invoice_number) data = body;
    }

    const doc = createInvoiceDoc(data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=preview-ndis.pdf");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    doc.pipe(res);
    doc.end();
  } catch (err) {
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Preview failed", detail: String(err) });
  }
};
