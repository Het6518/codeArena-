const prisma = require('../config/prisma');

// Must run after authMiddleware. The role is read from the database rather than the
// JWT so that demoting an admin takes effect immediately.
const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access is required',
      });
    }

    req.user.role = user.role;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = requireAdmin;
