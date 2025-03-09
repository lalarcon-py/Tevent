// backend/utils/adminLogger.js
const db = require('../models');

const logAdminAction = async (adminId, action, targetType, targetId, details) => {
  try {
    return await db.AdminLog.create({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - we don't want to fail the main operation if logging fails
  }
};

module.exports = {
  logAdminAction
};