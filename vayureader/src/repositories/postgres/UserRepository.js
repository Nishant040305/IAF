/**
 * User Repository (PostgreSQL)
 * 
 * @module repositories/postgres/UserRepository
 */

const PgBaseRepository = require('./PgBaseRepository');

const COLUMN_MAP = {
    _id: 'id',
    phoneNumber: 'phone_number',
    phone_number: 'phone_number',
    deviceId: 'device_id',
    previousDeviceId: 'previous_device_id',
    lastLogin: 'last_login',
    isBlocked: 'is_blocked',
    isVerified: 'is_verified',
    tokenVersion: 'token_version',
    securityQuestions: 'security_questions',
    createdByAdmin: 'created_by_admin',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
};

class UserRepository extends PgBaseRepository {
    constructor() {
        super('users', COLUMN_MAP);
    }

    _getUniqueColumn() {
        return 'phone_number';
    }

    /**
     * Override toJS to include compatibility shims for existing code.
     * Ensures _id is mapped for backward compat.
     */
    toJS(row) {
        const obj = super.toJS(row);
        if (obj && obj.id) {
            obj._id = obj.id;
        }
        return obj;
    }

    /**
     * Returns a safe user object for API responses.
     * (Replaces Mongoose instance method toSafeObject)
     */
    toSafeObject(user) {
        return {
            id: user.id || user._id,
            name: user.name,
            phone_number: user.phone_number,
            deviceId: user.deviceId || user.device_id
        };
    }

    /**
     * Find user by phone number.
     */
    async findByPhone(phoneNumber) {
        return this.findOne({ phone_number: phoneNumber });
    }

    /**
     * Increment token version (for logout/session invalidation).
     */
    async incrementTokenVersion(id) {
        return this.updateById(id, { $inc: { tokenVersion: 1 } });
    }
}

module.exports = new UserRepository();
