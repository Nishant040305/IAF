const Table = require('cli-table3');
const { AuditLogRepository } = require('../repositories');

async function viewAudits() {
    console.log('\n🔍 Fetching latest audit logs from ClickHouse...\n');
    const logs = await AuditLogRepository.find({}, { limit: 30, sort: { timestamp: -1 } });
    
    if (!logs || logs.length === 0) {
        console.log('No audit records found.\n');
        return;
    }

    const table = new Table({
        head: ['Time', 'Action', 'Resource', 'Admin Name', 'Explanatory Details'],
        colWidths: [22, 22, 15, 15, 40],
        wordWrap: true
    });

    logs.forEach(l => {
        const time = new Date(l.timestamp).toLocaleString();
        let detailsStr = '';
        try {
            const detailsObj = typeof l.details === 'string' ? JSON.parse(l.details || '{}') : (l.details || {});
            detailsStr = JSON.stringify(detailsObj);
        } catch(e) {
            detailsStr = String(l.details);
        }
        
        table.push([time, l.action, l.resourceType || l.resource_type, l.adminName || l.admin_name, detailsStr]);
    });

    console.log(table.toString() + '\n');
}

module.exports = { viewAudits };
