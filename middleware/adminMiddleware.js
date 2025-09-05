const userModel = require("../models/userModel");
module.exports = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.userId);
    console.log('Admin middleware - User found:', user ? { id: user._id, role: user.role, email: user.email } : 'No user found');
    
    //check admin
    if (user?.role !== "admin") {
      console.log('Admin middleware - Access denied. User role:', user?.role);
      return res.status(401).send({
        success: false,
        message: "Auth Failed - Admin access required",
      });
    } else {
      console.log('Admin middleware - Access granted');
      next();
    }
  } catch (error) {
    console.log('Admin middleware error:', error);
    return res.status(401).send({
      success: false,
      message: "Auth Failed, ADMIN API",
      error: error.message,
    });
  }
};