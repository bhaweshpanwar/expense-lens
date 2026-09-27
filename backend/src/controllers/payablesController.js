const db = require('../db/pool');

/**
 * Helper to ensure safe numbers
 */
const toNum = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
};

/**
 * GET /api/payables/summary
 * Computes AP liability metrics, aging schedule (30-60-90 days), and urgent due date alerts
 */
const getPayablesSummary = async (req, res, next) => {
  try {
    const userId = req.userId;

    // 1. Fetch all active transactions with payables info
    const query = `
      SELECT
        t.id,
        t.amount,
        COALESCE(t.amount_paid, 0) as amount_paid,
        t.payment_status,
        t.txn_date,
        t.due_date,
        t.credit_terms_days,
        COALESCE(v.name, 'Unknown Vendor') as vendor_name,
        COALESCE(c.name, 'Other') as category_name,
        (t.due_date - CURRENT_DATE) as days_diff
      FROM transactions t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.is_deleted = false
      ORDER BY t.due_date ASC NULLS LAST, t.txn_date DESC
    `;

    const result = await db.query(query, [userId]);
    const txns = result.rows;

    let totalOutstanding = 0;
    let overdueAmount = 0;
    let dueIn7Days = 0;
    let dueIn30Days = 0;
    let settledThisMonth = 0;

    const agingBuckets = {
      overdue_90_plus: 0,
      overdue_61_90: 0,
      overdue_31_60: 0,
      overdue_1_30: 0,
      due_0_15: 0,
      due_16_30: 0,
      due_31_plus: 0
    };

    const alerts = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const t of txns) {
      const amount = toNum(t.amount);
      const paid = toNum(t.amount_paid);
      const outstanding = Math.max(0, amount - paid);
      const daysDiff = t.days_diff !== null ? parseInt(t.days_diff, 10) : null;

      // Settled this month check
      if (t.payment_status === 'paid' && t.txn_date) {
        const txnDate = new Date(t.txn_date);
        if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
          settledThisMonth += amount;
        }
      }

      // Only evaluate unpaid or partially paid for liabilities
      if (t.payment_status === 'pending' || t.payment_status === 'partially_paid') {
        if (outstanding > 0) {
          totalOutstanding += outstanding;

          if (daysDiff !== null) {
            if (daysDiff < 0) {
              // Overdue
              const overdueDays = Math.abs(daysDiff);
              overdueAmount += outstanding;

              if (overdueDays > 90) agingBuckets.overdue_90_plus += outstanding;
              else if (overdueDays >= 61) agingBuckets.overdue_61_90 += outstanding;
              else if (overdueDays >= 31) agingBuckets.overdue_31_60 += outstanding;
              else agingBuckets.overdue_1_30 += outstanding;

              // Overdue alert
              alerts.push({
                id: t.id,
                vendor_name: t.vendor_name,
                category_name: t.category_name,
                amount,
                outstanding,
                due_date: t.due_date,
                days_diff: daysDiff,
                status: 'overdue',
                urgency: overdueDays > 30 ? 'high' : 'medium'
              });
            } else {
              // Upcoming due
              if (daysDiff <= 7) dueIn7Days += outstanding;
              if (daysDiff > 7 && daysDiff <= 30) dueIn30Days += outstanding;

              if (daysDiff <= 15) agingBuckets.due_0_15 += outstanding;
              else if (daysDiff <= 30) agingBuckets.due_16_30 += outstanding;
              else agingBuckets.due_31_plus += outstanding;

              // Due soon alert (within 7 days)
              if (daysDiff <= 7) {
                alerts.push({
                  id: t.id,
                  vendor_name: t.vendor_name,
                  category_name: t.category_name,
                  amount,
                  outstanding,
                  due_date: t.due_date,
                  days_diff: daysDiff,
                  status: 'due_soon',
                  urgency: daysDiff <= 3 ? 'high' : 'medium'
                });
              }
            }
          } else {
            // No due date set, bucket into due_0_15
            agingBuckets.due_0_15 += outstanding;
          }
        }
      }
    }

    // Sort alerts: most overdue first, then closest upcoming due date
    alerts.sort((a, b) => a.days_diff - b.days_diff);

    // Format aging schedule array for Recharts
    const agingSchedule = [
      { bucket: '>90d Overdue', amount: Math.round(agingBuckets.overdue_90_plus), type: 'critical' },
      { bucket: '61-90d Overdue', amount: Math.round(agingBuckets.overdue_61_90), type: 'critical' },
      { bucket: '31-60d Overdue', amount: Math.round(agingBuckets.overdue_31_60), type: 'warning' },
      { bucket: '1-30d Overdue', amount: Math.round(agingBuckets.overdue_1_30), type: 'warning' },
      { bucket: 'Due 0-15d', amount: Math.round(agingBuckets.due_0_15), type: 'upcoming' },
      { bucket: 'Due 16-30d', amount: Math.round(agingBuckets.due_16_30), type: 'upcoming' },
      { bucket: 'Due 31d+', amount: Math.round(agingBuckets.due_31_plus), type: 'safe' }
    ];

    res.json({
      success: true,
      data: {
        metrics: {
          total_outstanding: Math.round(totalOutstanding * 100) / 100,
          overdue_amount: Math.round(overdueAmount * 100) / 100,
          due_in_7_days: Math.round(dueIn7Days * 100) / 100,
          due_in_30_days: Math.round(dueIn30Days * 100) / 100,
          settled_this_month: Math.round(settledThisMonth * 100) / 100
        },
        aging_schedule: agingSchedule,
        alerts: alerts.slice(0, 8) // Top 8 urgent alerts
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payables
 * Returns filtered list of payable invoices with status, due date, outstanding balances
 */
const getPayables = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        t.id,
        t.amount,
        COALESCE(t.amount_paid, 0) as amount_paid,
        GREATEST(0, t.amount - COALESCE(t.amount_paid, 0)) as outstanding_amount,
        t.payment_status,
        t.txn_date,
        t.due_date,
        t.credit_terms_days,
        t.payment_date,
        t.notes,
        COALESCE(v.name, 'Unknown Vendor') as vendor_name,
        COALESCE(t.vendor_gstin, v.gstin, '') as vendor_gstin,
        COALESCE(c.name, 'Other') as category_name,
        (t.due_date - CURRENT_DATE) as days_diff
      FROM transactions t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 AND t.is_deleted = false
    `;

    const params = [userId];
    let paramIdx = 2;

    if (status === 'pending') {
      query += ` AND t.payment_status = 'pending'`;
    } else if (status === 'partially_paid') {
      query += ` AND t.payment_status = 'partially_paid'`;
    } else if (status === 'paid') {
      query += ` AND t.payment_status = 'paid'`;
    } else if (status === 'overdue') {
      query += ` AND t.payment_status IN ('pending', 'partially_paid') AND t.due_date < CURRENT_DATE`;
    } else if (status === 'unpaid') {
      query += ` AND t.payment_status IN ('pending', 'partially_paid')`;
    }

    if (search) {
      query += ` AND (v.name ILIKE $${paramIdx} OR t.notes ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    // Default sorting: unpaid/overdue first, then by due date ascending
    query += ` ORDER BY
      CASE
        WHEN t.payment_status IN ('pending', 'partially_paid') AND t.due_date < CURRENT_DATE THEN 1
        WHEN t.payment_status IN ('pending', 'partially_paid') THEN 2
        ELSE 3
      END,
      t.due_date ASC NULLS LAST,
      t.txn_date DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;

    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        amount: toNum(row.amount),
        amount_paid: toNum(row.amount_paid),
        outstanding_amount: toNum(row.outstanding_amount),
        payment_status: row.payment_status,
        txn_date: row.txn_date,
        due_date: row.due_date,
        credit_terms_days: row.credit_terms_days || 0,
        payment_date: row.payment_date,
        notes: row.notes,
        vendor_name: row.vendor_name,
        vendor_gstin: row.vendor_gstin,
        category_name: row.category_name,
        days_diff: row.days_diff !== null ? parseInt(row.days_diff, 10) : null,
        is_overdue: row.payment_status !== 'paid' && row.due_date && row.days_diff < 0
      }))
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payables/:id/record-payment
 * Records full or partial settlement against a payable invoice
 */
const recordPayment = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount_paid_now, payment_date, payment_method, notes } = req.body;

    const payNow = toNum(amount_paid_now);
    if (payNow <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be greater than zero.' });
    }

    // Verify ownership & fetch current transaction
    const txnRes = await db.query(
      `SELECT id, amount, COALESCE(amount_paid, 0) as amount_paid, payment_status, notes
       FROM transactions
       WHERE id = $1 AND user_id = $2 AND is_deleted = false`,
      [id, userId]
    );

    if (txnRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payable invoice not found.' });
    }

    const txn = txnRes.rows[0];
    const totalAmount = toNum(txn.amount);
    const prevPaid = toNum(txn.amount_paid);
    const newPaid = Math.min(totalAmount, prevPaid + payNow);
    const newStatus = (newPaid >= totalAmount) ? 'paid' : 'partially_paid';
    const payDate = payment_date || new Date().toISOString().split('T')[0];

    // Append payment note if provided
    let updatedNotes = txn.notes || '';
    if (payment_method || notes) {
      const auditNote = ` [Paid ₹${payNow}${payment_method ? ` via ${payment_method}` : ''} on ${payDate}${notes ? `: ${notes}` : ''}]`;
      updatedNotes = (updatedNotes + auditNote).trim();
    }

    const updateRes = await db.query(
      `UPDATE transactions
       SET amount_paid = $1,
           payment_status = $2,
           payment_date = $3,
           notes = $4,
           updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING id, amount, amount_paid, payment_status, due_date, payment_date, notes`,
      [newPaid, newStatus, payDate, updatedNotes, id, userId]
    );

    res.json({
      success: true,
      message: newStatus === 'paid' ? 'Invoice fully settled!' : 'Partial payment recorded.',
      data: updateRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayablesSummary,
  getPayables,
  recordPayment
};
