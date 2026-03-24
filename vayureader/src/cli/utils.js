const { getPool } = require('../config/database');
const { redisClient } = require('../config/redis');

async function shutdown() {
    console.log('\nClosing secure database connections...');
    try {
        // Wait gracefully so the Node event loop has 500ms to flush the audit queue into Redis
        await new Promise(resolve => setTimeout(resolve, 500));
        if (redisClient && redisClient.isOpen) await redisClient.quit();
        const pool = getPool();
        if (pool) await pool.end();
    } catch (e) {
        // Silent
    }
    console.log('✅ Goodbye!\n');
    process.exit(0);
}

module.exports = { shutdown };
