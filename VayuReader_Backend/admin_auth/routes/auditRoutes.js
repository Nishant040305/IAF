const express = require('express');
const router = express.Router();
const { verifyAdminToken } = require('../adminAuthController');
const AuditLog = require('../models/AuditLog');

// GET /api/audit/logs - Get all audit logs (protected)
router.get('/logs', verifyAdminToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      action, 
      resourceType, 
      adminName,
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (adminName) filter.adminName = { $regex: adminName, $options: 'i' };
    
    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/audit/stats - Get audit statistics (protected)
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: {
            action: '$action',
            resourceType: '$resourceType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.resourceType',
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count'
            }
          },
          total: { $sum: '$count' }
        }
      }
    ]);

    const adminStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$adminName',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        byResourceType: stats,
        topAdmins: adminStats,
        totalLogs: await AuditLog.countDocuments()
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

