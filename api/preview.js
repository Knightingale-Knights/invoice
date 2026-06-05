// api/preview.js
// Live design preview. Renders the invoice as an inline PDF in the browser
// using the SAME builder as make-pdf.js, so what you see here is exactly what
// gets emailed.
//
//   GET  /api/preview            -> renders built-in SAMPLE data
//   POST /api/preview (JSON body) -> renders your posted invoice data
//
// Refresh the URL after each commit to see design tweaks instantly.

const { createInvoiceDoc, SAMPLE } = require("./_invoiceDoc.js");

module.exports = (req, res) => {
  try {
    let data = SAMPLE;
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (body && body.invoice_number) data = body;
    }

    const doc = createInvoiceDoc(data);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=preview.pdf");
    doc.pipe(res);
    doc.end();
  } catch (err) {
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: "Preview failed", detail: String(err) });
  }
};
