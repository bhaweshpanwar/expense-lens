const db = require('../db/pool');
const { calculateGst } = require('../utils/gstCalculator');

/**
 * GET /api/tax/gst-summary
 * Computes aggregate GST metrics for the user
 */
const getGstSummary = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    // Base query for active transactions in the given period
    let query = `
      SELECT
        t.is_gst_bill,
        t.amount,
        t.taxable_amount,
        t.cgst_amount,
        t.sgst_amount,
        t.igst_amount,
        t.itc_eligible,
        t.gst_rate,
        COALESCE(v.name, 'Unknown') as vendor_name,
        COALESCE(t.vendor_gstin, v.gstin, 'N/A') as vendor_gstin
      FROM transactions t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      WHERE t.user_id = $1 AND t.is_deleted = false
    `;

    const params = [req.userId];
    let paramIdx = 2;

    if (from) {
      query += ` AND t.txn_date >= $${paramIdx++}`;
      params.push(from);
    }

    if (to) {
      query += ` AND t.txn_date <= $${paramIdx++}`;
      params.push(to);
    }

    const result = await db.query(query, params);
    const txns = result.rows;

    const toNum = (val) => {
      const n = parseFloat(val);
      return Number.isFinite(n) ? n : 0;
    };

    // Aggregate Metrics
    const metrics = txns.reduce((acc, curr) => {
      const totalTax = toNum(curr.cgst_amount) + toNum(curr.sgst_amount) + toNum(curr.igst_amount);
      const txnAmount = toNum(curr.amount);

      acc.total_expenses += txnAmount;
      if (curr.is_gst_bill) {
        acc.gst_registered_spend += txnAmount;
        acc.total_taxable_value += toNum(curr.taxable_amount);
        acc.total_gst_paid += totalTax;
        if (curr.itc_eligible) {
          acc.eligible_itc += totalTax;
        } else {
          acc.blocked_itc += totalTax;
        }
      } else {
        acc.unregistered_spend += txnAmount;
      }
      return acc;
    }, {
      total_expenses: 0,
      gst_registered_spend: 0,
      unregistered_spend: 0,
      total_taxable_value: 0,
      total_gst_paid: 0,
      eligible_itc: 0,
      blocked_itc: 0
    });

    // Rate Breakdown
    const rateMap = {};
    [0, 5, 12, 18, 28].forEach(rate => {
      rateMap[rate] = { count: 0, taxable_amount: 0, total_tax: 0 };
    });

    txns.forEach(t => {
      const rateNum = toNum(t.gst_rate);
      if (t.is_gst_bill && rateMap[rateNum] !== undefined) {
        const tax = toNum(t.cgst_amount) + toNum(t.sgst_amount) + toNum(t.igst_amount);
        rateMap[rateNum].count++;
        rateMap[rateNum].taxable_amount += toNum(t.taxable_amount);
        rateMap[rateNum].total_tax += tax;
      }
    });

    // Vendor Summary
    const vendorMap = {};
    txns.forEach(t => {
      const vName = t.vendor_name || 'Unknown';
      if (!vendorMap[vName]) {
        vendorMap[vName] = {
          vendor_name: vName,
          vendor_gstin: t.vendor_gstin || 'N/A',
          taxable_value: 0,
          tax_paid: 0,
          itc_status: 'Mixed'
        };
      }
      const tax = toNum(t.cgst_amount) + toNum(t.sgst_amount) + toNum(t.igst_amount);
      vendorMap[vName].taxable_value += toNum(t.taxable_amount);
      vendorMap[vName].tax_paid += tax;

      if (t.is_gst_bill) {
        const currentStatus = t.itc_eligible ? 'Eligible' : 'Blocked';
        if (vendorMap[vName].itc_status === 'Mixed') {
          vendorMap[vName].itc_status = currentStatus;
        } else if (vendorMap[vName].itc_status !== currentStatus) {
          vendorMap[vName].itc_status = 'Mixed';
        }
      }
    });

    res.json({
      success: true,
      data: {
        metrics,
        rate_breakdown: Object.entries(rateMap).map(([rate, val]) => ({
          rate: `${rate}%`,
          ...val
        })),
        vendor_summary: Object.values(vendorMap)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/tax/export-gstr2b
 * Generates RFC-4180 compliant CSV for GSTR-2B report
 */
const exportGstr2bCsv = async (req, res, next) => {
  try {
    const { from, to } = req.query;

    let query = `
      SELECT t.txn_date, t.id as voucher_id, COALESCE(v.name, 'Unknown') as vendor_name,
             COALESCE(t.vendor_gstin, v.gstin, '') as vendor_gstin,
             COALESCE(c.name, 'Other') as category, t.taxable_amount, t.gst_rate, t.cgst_amount,
             t.sgst_amount, t.igst_amount, t.amount as total_invoice_value, t.itc_eligible
      FROM transactions t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.is_deleted = false AND t.is_gst_bill = true
    `;

    const params = [req.userId];
    let paramIdx = 2;

    if (from) {
      query += ` AND t.txn_date >= $${paramIdx++}`;
      params.push(from);
    }
    if (to) {
      query += ` AND t.txn_date <= $${paramIdx++}`;
      params.push(to);
    }

    const result = await db.query(query, params);

    // CSV Header
    const headers = [
      "Date", "Voucher ID", "Vendor / Payee", "Vendor GSTIN", "Category",
      "Taxable Value (₹)", "GST Rate (%)", "CGST (₹)", "SGST (₹)", "IGST (₹)",
      "Total Invoice Value (₹)", "ITC Eligibility"
    ];

    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const line = [
        `"${row.txn_date}"`,
        `"${row.voucher_id}"`,
        `"${(row.vendor_name || '').replace(/"/g, '""')}"`,
        `"${(row.vendor_gstin || '').replace(/"/g, '""')}"`,
        `"${(row.category || '').replace(/"/g, '""')}"`,
        row.taxable_amount || 0,
        row.gst_rate || 0,
        row.cgst_amount || 0,
        row.sgst_amount || 0,
        row.igst_amount || 0,
        row.total_invoice_value || 0,
        `"${row.itc_eligible ? 'Eligible' : 'Blocked'}"`
      ];
      csvRows.push(line.join(','));
    });

    const csvString = csvRows.join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ExpenseLens_GSTR2B_Report.csv"');
    res.status(200).send(csvString);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGstSummary,
  exportGstr2bCsv
};
