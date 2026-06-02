// api/preview.js
// Renders the invoice as HTML in the browser so you can visually check the
// data before any PDF is generated or any email is sent.
//
//   GET  /api/preview   -> renders built-in sample data (quick deploy check)
//   POST /api/preview   -> renders the JSON invoice payload you send it
//
// Uses the EXACT same buildInvoiceHTML as the send endpoint, so what you see
// here is what gets emailed.

const { buildInvoiceHTML } = require("./_invoiceTemplate.js");

const SAMPLE = {
  invoice_number: "1156",
  period_ending: "31/05/26",
  invoice_date: "01/06/26",
  payment_terms: "30 days",
  due_date: "30/06/26",
  location_name: "Mclean Lodge",
  location_address: "1 Little Princes Street\nTravancore, VIC, 3032",
  location_email: "accounts@mcleanlodge.com.au",
  participant: "Modika",
  line_items: [
    { date: "Mon, May 25th", shift: "730 - 1530", carer: "Modika Karki", role: "EN", hours: 7.5, rate: 70 },
    { date: "Mon, May 25th", shift: "730 - 1530", carer: "Gagandeep Kaur", role: "EN", hours: 7.5, rate: 70 },
    { date: "Mon, May 25th", shift: "2215 - 745", carer: "Winnie Osuma", role: "EN", hours: 9, rate: 85 },
    { date: "Tue, May 26th", shift: "730 - 1530", carer: "Modika Karki", role: "EN", hours: 7.5, rate: 70 },
    { date: "Tue, May 26th", shift: "1530 - 2230", carer: "Modika Karki", role: "EN", hours: 6.5, rate: 77 },
    { date: "Thu, May 28th", shift: "730 - 1530", carer: "Bhumika Bhumika", role: "PCA", hours: 7.5, rate: 60 },
    { date: "Thu, May 28th", shift: "1515 - 2230", carer: "Gagandeep Kaur", role: "EN", hours: 6.75, rate: 77 },
    { date: "Fri, May 29th", shift: "800 - 1300", carer: "Bhumika Bhumika", role: "CL", hours: 5, rate: 60 },
  ],
};

module.exports = (req, res) => {
  try {
    let data;
    if (req.method === "POST") {
      // Vercel parses JSON bodies automatically when Content-Type is application/json.
      // Fall back to manual parse if it arrived as a string.
      data = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (!data || !data.invoice_number) {
        res.status(400).json({ error: "No invoice data in request body." });
        return;
      }
    } else {
      data = SAMPLE;
    }

    const html = buildInvoiceHTML(data);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    res.status(500).json({ error: "Preview failed", detail: String(err) });
  }
};
