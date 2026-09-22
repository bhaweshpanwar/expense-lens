require('dotenv').config();
const app = require('./app');
const pool = require('./db/pool');

const PORT = process.env.PORT || 5000;

const { startAnomalyCron } = require('./services/anomalyDetection');

async function startServer() {
  try {
    // Test DB Connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Start background anomaly detection CRON
    startAnomalyCron();

    app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
}

startServer();
