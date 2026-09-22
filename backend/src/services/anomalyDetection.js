const db = require('../db/pool');

/**
 * Runs anomaly detection across all active expense transactions in the database.
 * Computes the 6-month trailing mean + 2*stddev per category (with sample size >= 4).
 * Updates transactions: sets is_flagged_unusual = true and flag_reason for outliers.
 * Resets transactions that are no longer outliers to is_flagged_unusual = false.
 */
async function detectAnomalies() {
  try {
    const flagQuery = `
      WITH category_stats AS (
          SELECT
              user_id,
              category_id,
              AVG(amount) AS avg_amount,
              STDDEV_POP(amount) AS stddev_amount,
              COUNT(*) AS sample_size
          FROM active_transactions
          WHERE type = 'expense'
            AND txn_date >= (CURRENT_DATE - INTERVAL '6 months')
          GROUP BY user_id, category_id
          HAVING COUNT(*) >= 4
      ),
      flagged AS (
          SELECT
              t.id,
              CONCAT(
                  c.name, ' expense of ₹', t.amount,
                  ' is significantly higher than the historical average of ₹',
                  ROUND(cs.avg_amount::numeric, 2),
                  ' (', cs.sample_size, ' past transactions)'
              ) AS flag_reason
          FROM active_transactions t
          JOIN category_stats cs ON cs.user_id = t.user_id AND cs.category_id = t.category_id
          JOIN categories c ON c.id = t.category_id
          WHERE t.type = 'expense'
            AND t.amount > (cs.avg_amount + 2 * cs.stddev_amount)
      )
      UPDATE transactions t
      SET is_flagged_unusual = true,
          flag_reason = f.flag_reason
      FROM flagged f
      WHERE t.id = f.id;
    `;

    const resetQuery = `
      WITH category_stats AS (
          SELECT
              user_id,
              category_id,
              AVG(amount) AS avg_amount,
              STDDEV_POP(amount) AS stddev_amount,
              COUNT(*) AS sample_size
          FROM active_transactions
          WHERE type = 'expense'
            AND txn_date >= (CURRENT_DATE - INTERVAL '6 months')
          GROUP BY user_id, category_id
          HAVING COUNT(*) >= 4
      ),
      flagged AS (
          SELECT t.id
          FROM active_transactions t
          JOIN category_stats cs ON cs.user_id = t.user_id AND cs.category_id = t.category_id
          WHERE t.type = 'expense'
            AND t.amount > (cs.avg_amount + 2 * cs.stddev_amount)
      )
      UPDATE transactions
      SET is_flagged_unusual = false,
          flag_reason = NULL
      WHERE is_flagged_unusual = true
        AND id NOT IN (SELECT id FROM flagged);
    `;

    await db.query(resetQuery);
    const result = await db.query(flagQuery);

    console.log(`[CRON] Anomaly detection job executed successfully.`);
    return { success: true, count: result.rowCount };
  } catch (err) {
    console.error('[CRON] Anomaly detection job error:', err.message);
  }
}

/**
 * Initializes recurring anomaly detection job.
 * Default interval: every 10 minutes (600,000ms).
 */
function startAnomalyCron(intervalMs = 10 * 60 * 1000) {
  console.log(`⏱️  Anomaly detection CRON scheduled to run every ${intervalMs / 1000}s`);
  // Run immediately on boot
  detectAnomalies();
  // Set recurring interval
  const timer = setInterval(detectAnomalies, intervalMs);
  if (timer.unref) timer.unref(); // Allow node process to exit cleanly if needed
  return timer;
}

module.exports = {
  detectAnomalies,
  startAnomalyCron
};
