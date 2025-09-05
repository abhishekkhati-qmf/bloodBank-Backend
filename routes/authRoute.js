const express = require('express');
const { 
  registerController,
  loginController,
  currentUserController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
  resendVerificationController
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

//Register || POST
router.post("/register", registerController);

//LOGIN || POST
router.post("/login", loginController);

//GET CURR USER || GET
router.get('/current-user', authMiddleware, currentUserController );

//VERIFY EMAIL || GET
router.get('/verify-email/:token', verifyEmailController);

//FORGOT PASSWORD || POST
router.post('/forgot-password', forgotPasswordController);

//RESET PASSWORD || POST
router.post('/reset-password', resetPasswordController);

//RESEND VERIFICATION EMAIL || POST
router.post('/resend-verification', resendVerificationController);

module.exports = router;