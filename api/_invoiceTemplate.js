// _invoiceTemplate.js
// Shared invoice HTML builder. Used by BOTH the preview endpoint and the
// PDF/send endpoint, so what you verify on screen is exactly what gets emailed.
//
// All money math lives here so Bubble only ever sends raw row data
// (hours + rate as numbers). GST is 10% of the subtotal.

// ---- Static business details (single entity: The Trustee for Nebula Trust) ----
// If a second entity ever needs different details, these can be moved into the
// incoming payload instead. For now they are constant on every invoice.
const STATIC = {
  brandName: "Knightingale",
  tagline: "Kind care for older adults",
  remitPhone: "0426 512 584",
  remitEmail: "care@knightingale.com.au",
  trusteeName: "The Trustee for Nebula Trust",
  tradingAs: "Knightingale",
  abn: "50 405 424 095",
  acn: "674 982 293",
  eftBsb: "803-439",
  eftAccNo: "215 191 666",
  eftAccName: "The Trustee for Nebula Trust",
  knightAddress: "133/22 Kavanagh Street\nSouthbank, VIC, 3006",
  gstRate: 0.10,
};

// ---- Helpers ----
function money(n) {
  return "$" + Number(n).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function num(n, dp = 2) {
  return Number(n).toLocaleString("en-AU", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Turn a "\n"-containing string into <br>-separated escaped HTML
function multiline(s) {
  return esc(s).replace(/\n/g, "<br>");
}

// ---- Math ----
// Returns { rows, totalHours, subtotal, gst, totalPayable }
function computeTotals(lineItems) {
  let totalHours = 0;
  let subtotal = 0;
  const rows = (lineItems || []).map((item) => {
    const hours = Number(item.hours) || 0;
    const rate = Number(item.rate) || 0;
    const lineSubtotal = hours * rate;
    totalHours += hours;
    subtotal += lineSubtotal;
    return { ...item, hours, rate, lineSubtotal };
  });
  const gst = subtotal * STATIC.gstRate;
  const totalPayable = subtotal + gst;
  return { rows, totalHours, subtotal, gst, totalPayable };
}

// ---- Template ----
function buildInvoiceHTML(data) {
  const d = data || {};
  const { rows, totalHours, subtotal, gst, totalPayable } = computeTotals(d.line_items);

  const rowsHTML = rows.map((r) => `
        <tr>
          <td class="c-date">${esc(r.date)}</td>
          <td class="c-shift">${esc(r.shift)}</td>
          <td class="c-carer">${esc(r.carer)}</td>
          <td class="c-role">${esc(r.role)}</td>
          <td class="c-num">${num(r.hours)}</td>
          <td class="c-num">${money(r.rate)}</td>
          <td class="c-num">${money(r.lineSubtotal)}</td>
        </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invoice ${esc(d.invoice_number)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@400;500;600;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    background: #ffffff;
    color: #213530;
    font-family: 'Montserrat', -apple-system, sans-serif;
    font-size: 11px;
    line-height: 1.5;
  }

  .page {
    width: 800px;
    min-height: 1100px;
    margin: 0 auto;
    padding: 48px 56px;
    background: #fff;
    position: relative;
  }

  /* Header */
  .brand {
    text-align: center;
    margin-bottom: 36px;
  }
  .brand h1 {
    font-family: 'Cormorant Garamond', serif;
    font-weight: 500;
    font-size: 46px;
    letter-spacing: 0.5px;
    color: #213530;
  }
  .brand .tagline {
    font-size: 10px;
    letter-spacing: 1px;
    color: #4a5a54;
    margin-top: 2px;
  }

  .invoice-title {
    text-align: center;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 1px;
    margin-bottom: 32px;
  }

  /* Three-column header grid */
  .header-grid {
    display: grid;
    grid-template-columns: 1fr 1.1fr 1fr;
    gap: 24px;
    margin-bottom: 36px;
  }
  .header-grid .label { font-weight: 600; }
  .meta-row { display: grid; grid-template-columns: auto 1fr; gap: 8px; }
  .meta-row .label { white-space: nowrap; }
  .block-title { font-weight: 700; margin-bottom: 6px; }

  /* Second grid: facility / EFT / Knightingale */
  .detail-grid {
    display: grid;
    grid-template-columns: 1fr 1.1fr 1fr;
    gap: 24px;
    margin-bottom: 44px;
  }
  .detail-grid .eft-row { display: grid; grid-template-columns: auto 1fr; gap: 8px; }

  /* Line items table */
  table { width: 100%; border-collapse: collapse; }
  thead th {
    font-weight: 700;
    text-align: left;
    padding: 8px 6px;
    border-bottom: 1.5px solid #213530;
    white-space: nowrap;
  }
  tbody td { padding: 14px 6px; }
  .c-num { text-align: right; }
  thead th.c-num { text-align: right; }

  /* Totals */
  .totals-divider { border-top: 1.5px solid #213530; }
  .totals { margin-top: 4px; }
  .totals-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 24px;
    padding: 6px 6px;
  }
  .totals-row .t-label { text-align: right; font-weight: 700; }
  .totals-row .t-val { text-align: right; font-weight: 700; min-width: 90px; }
  .totals-row.bold .t-val { font-weight: 700; }
  .first-total { font-weight: 700; }
</style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <h1>${esc(STATIC.brandName)}</h1>
      <div class="tagline">${esc(STATIC.tagline)}</div>
    </div>

    <div class="invoice-title">${esc(d.location_name).toUpperCase()} INVOICE</div>

    <div class="header-grid">
      <div>
        <div class="block-title">Invoice Remittances</div>
        <div><span class="label">Phone:</span> ${esc(STATIC.remitPhone)}</div>
        <div><span class="label">Email:</span> ${esc(STATIC.remitEmail)}</div>
      </div>
      <div>
        <div class="meta-row"><span class="label">Number:</span><span>${esc(d.invoice_number)}</span></div>
        <div class="meta-row"><span class="label">Period Ending:</span><span>${esc(d.period_ending)}</span></div>
        <div class="meta-row"><span class="label">Invoice Date:</span><span>${esc(d.invoice_date)}</span></div>
        <div class="meta-row"><span class="label">Payment Terms:</span><span>${esc(d.payment_terms)}</span></div>
        <div class="meta-row"><span class="label">Due Date:</span><span>${esc(d.due_date)}</span></div>
      </div>
      <div>
        <div class="block-title">${esc(STATIC.trusteeName)}</div>
        <div><span class="label">Trading as:</span> ${esc(STATIC.tradingAs)}</div>
        <div><span class="label">ABN:</span> ${esc(STATIC.abn)}</div>
        <div><span class="label">ACN:</span> ${esc(STATIC.acn)}</div>
      </div>
    </div>

    <div class="detail-grid">
      <div>
        <div class="block-title">${esc(d.location_name)}</div>
        <div>${multiline(d.location_address)}</div>
      </div>
      <div>
        <div class="block-title">Electronic Funds Transfer</div>
        <div class="eft-row"><span class="label">BSB:</span><span>${esc(STATIC.eftBsb)}</span></div>
        <div class="eft-row"><span class="label">ACC NO:</span><span>${esc(STATIC.eftAccNo)}</span></div>
        <div class="eft-row"><span class="label">ACC NAME:</span><span>${esc(STATIC.eftAccName)}</span></div>
      </div>
      <div>
        <div class="block-title">${esc(STATIC.brandName)}</div>
        <div>${multiline(STATIC.knightAddress)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="c-date">Shift Date</th>
          <th class="c-shift">Shift</th>
          <th class="c-carer">Carer</th>
          <th class="c-role">Role</th>
          <th class="c-num">Hours</th>
          <th class="c-num">Hourly Rate</th>
          <th class="c-num">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rowsHTML}
      </tbody>
    </table>

    <div class="totals-divider"></div>
    <div class="totals">
      <div class="totals-row">
        <span class="t-label">Totals</span>
        <span class="t-val">${num(totalHours)}</span>
        <span class="t-val">${money(subtotal)}</span>
      </div>
      <div class="totals-row">
        <span class="t-label">Total GST</span>
        <span class="t-val"></span>
        <span class="t-val">${money(gst)}</span>
      </div>
      <div class="totals-row bold">
        <span class="t-label">Total Payable</span>
        <span class="t-val"></span>
        <span class="t-val">${money(totalPayable)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildInvoiceHTML, computeTotals, STATIC };
