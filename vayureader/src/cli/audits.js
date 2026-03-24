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
            
            // Custom smart-parser for Administrator Permission Changes
            if (detailsObj.changed === 'permissions' && Array.isArray(detailsObj.new) && Array.isArray(detailsObj.old)) {
                const added = detailsObj.new.filter(p => !detailsObj.old.includes(p));
                const removed = detailsObj.old.filter(p => !detailsObj.new.includes(p));
                
                let permStr = '• Roles Updated:\n';
                if (added.length) permStr += `   [+] Granted: ${added.join(', ')}\n`;
                if (removed.length) permStr += `   [-] Revoked: ${removed.join(', ')}\n`;
                if (!added.length && !removed.length) permStr += '   (=) No semantic changes.';
                
                detailsStr = permStr.trimEnd();
            } else {
                // Generic prettify for other JSON logs into a multi-line list
                const entries = Object.entries(detailsObj).filter(([k, v]) => v !== undefined && v !== null && k !== 'ip');
                if (entries.length === 0) {
                    detailsStr = '-';
                } else {
                    detailsStr = entries.map(([k, v]) => {
                        const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()); // camelCase to Phrase
                        return `• ${label}: ${val}`;
                    }).join('\n');
                }
            }
        } catch(e) {
            detailsStr = String(l.details);
        }
        
        table.push([time, l.action, l.resourceType || l.resource_type, l.adminName || l.admin_name, detailsStr]);
    });

    console.log(table.toString() + '\n');
}

module.exports = { viewAudits };
