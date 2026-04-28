const AppError = require('../utils/AppError');

/**
 * Create a role guard middleware.
 * Restricts access to users with the specified role.
 * Must be used AFTER the authenticate middleware.
 * @param {string} role - Required role
 * @returns {Function} Express middleware
 */
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (req.user.role !== role) {
      return next(
        new AppError(`Access denied. ${role.charAt(0).toUpperCase() + role.slice(1)} role required.`, 403)
      );
    }

    next();
  };
}

const requireFarmer = requireRole('farmer');
const requireCustomer = requireRole('customer');
const requireAdmin = requireRole('admin');

module.exports = { requireFarmer, requireCustomer, requireAdmin, requireRole };
