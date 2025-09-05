const jwt = require("jsonwebtoken");
const userModel = require('../models/userModel.js');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and email is verified
    const user = await userModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    if (!user.emailVerified) {
      return res.status(403).json({ 
        message: "Email verification required. Please verify your email before accessing this resource.",
        requireVerification: true 
      });
    }
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ 
        message: "Your account has been blocked. Please contact the administrator.",
        accountBlocked: true 
      });
    }
    
    req.user = decoded;
    next();
  } 
  catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
