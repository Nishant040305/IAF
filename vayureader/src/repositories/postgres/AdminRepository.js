/**
 * Admin Repository (PostgreSQL)
 * 
 * @module repositories/postgres/AdminRepository
 */

const PgBaseRepository = require('./PgBaseRepository');

const PERMISSIONS = [
    'manage_pdfs',
    'manage_dictionary',
    'manage_abbreviations',
    'manage_admins',
    'view_audit',
    'view_user_audit'
];

const COLUMN_MAP = {
    _id: 'id',
    passwordHash: 'password_hash',
    isVerified: 'is_verified',
    tokenVersion: 'token_version',
    securityQuestions: 'security_questions',
    createdBy: 'created_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

class AdminRepository extends PgBaseRepository {
    constructor() {
        super('admins', COLUMN_MAP);
        this.PERMISSIONS = PERMISSIONS;
    }

    _getUniqueColumn() {
        return 'contact';
    }

    toJS(row) {
        const obj = super.toJS(row);
        if (obj && obj.id) {
            obj._id = obj.id;
        }
        return obj;
    }

    /**
     * Returns a safe admin object for API responses.
     */
    toSafeObject(admin) {
        return {
            id: admin.id || admin._id,
            name: admin.name,
            contact: admin.contact,
            permissions: admin.permissions || [],
            isVerified: admin.isVerified !== undefined ? admin.isVerified : admin.is_verified
        };
    }

    /**
     * Check if admin has a specific permission.
     */
    hasPermission(admin, permission) {
        return (admin.permissions || []).includes(permission);
    }

    /**
     * Increment token version (for logout/session invalidation).
     */
    async incrementTokenVersion(id) {
        return this.updateById(id, { $inc: { tokenVersion: 1 } });
    }

    /**
     * Find admin by contact.
     */
    async findByContact(contact) {
        return this.findOne({ contact });
    }
}

const adminRepo = new AdminRepository();
// Expose PERMISSIONS as a static-like property
adminRepo.PERMISSIONS = PERMISSIONS;

module.exports = adminRepo;
