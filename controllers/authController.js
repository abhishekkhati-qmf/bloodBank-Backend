const userModel = require('../models/userModel.js')
const verificationModel = require('../models/verificationModel.js')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');
const { generateToken, sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService.js');

const registerController = async (req, res) => {
    try {
      // Donor age validation
      if (req.body.role === 'donor') {
        const ageNum = Number(req.body.age);
        if (!Number.isFinite(ageNum)) {
          return res.status(400).send({ success: false, message: 'Age is required for donors' });
        }
        if (ageNum < 18) {
          return res.status(400).send({ success: false, message: 'Donors must be at least 18 years old' });
        }
        if (!req.body.bloodGroup) {
          return res.status(400).send({ success: false, message: 'Blood group is required for donors' });
        }
      }

      const exisitingUser = await userModel.findOne({ email: req.body.email });
      //validation
      if (exisitingUser) {
        return res.status(200).send({
          success: false,
          message: "User ALready exists",
        });
      }
      //hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = hashedPassword;
      //rest data
      const user = new userModel(req.body);
      await user.save();

      // Create verification token
      const verificationToken = generateToken();
      const verification = new verificationModel({
        user: user._id,
        token: verificationToken,
        type: 'email_verification',
      });
      await verification.save();

      // Send verification email
      const emailSent = await sendVerificationEmail(user, verificationToken);
      
      return res.status(201).send({
        success: true,
        message: emailSent 
          ? "User registered successfully. Please check your email to verify your account." 
          : "User registered successfully. Please contact support for email verification.",
        user,
        requireVerification: true,
      });
    } catch (error) {
      console.log(error);
      res.status(500).send({
        success: false,
        message: "Error In Register API",
        error,
      });
    }
  };

const loginController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
    //check role
    if (user.role !== req.body.role) {
      return res.status(500).send({
        success: false,
        message: "role dosent match",
      });
    }
    //compare password
    const comparePassword = await bcrypt.compare(
      req.body.password,
      user.password
    );
    if (!comparePassword) {
      return res.status(500).send({
        success: false,
        message: "Invalid Credentials",
      });
    }
    
    // Check email verification status
    if (!user.emailVerified) {
      return res.status(403).send({
        success: false,
        message: "Please verify your email before logging in. Check your email for verification link.",
        requireVerification: true,
      });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    return res.status(200).send({
      success: true,
      message: "Login Successfully",
      token,
      user,
    });

  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error In Login API",
      error,
    });
  }
};

const currentUserController = async (req, res) => {
  try {
    const user = await userModel.findOne({ _id: req.user.userId });
    return res.status(200).send({
      success: true,
      message: "User Fetched Successfully",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "error in getting current user",
      error,
    });
  }
};

// Verify email
const verifyEmailController = async (req, res) => {
  try {
    const { token } = req.params;

    const verification = await verificationModel.findOne({
      token,
      type: 'email_verification',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).send({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Mark verification as used
    verification.used = true;
    verification.usedAt = new Date();
    await verification.save();

    // Update user email verification status
    await userModel.findByIdAndUpdate(verification.user, {
      emailVerified: true,
      emailVerifiedAt: new Date()
    });

    return res.status(200).send({
      success: true,
      message: "Email verified successfully. You can now log in to your account."
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Email Verification API",
      error,
    });
  }
};

// Forgot password
const forgotPasswordController = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found with this email"
      });
    }

    // Generate reset token
    const resetToken = generateToken();
    const verification = new verificationModel({
      user: user._id,
      token: resetToken,
      type: 'password_reset',
    });
    await verification.save();

    // Send reset email
    const emailSent = await sendPasswordResetEmail(user, resetToken);

    return res.status(200).send({
      success: true,
      message: emailSent 
        ? "Password reset link sent to your email" 
        : "Failed to send reset email. Please try again.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Forgot Password API",
      error,
    });
  }
};

// Reset password
const resetPasswordController = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const verification = await verificationModel.findOne({
      token,
      type: 'password_reset',
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      return res.status(400).send({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Mark verification as used
    verification.used = true;
    verification.usedAt = new Date();
    await verification.save();

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    await userModel.findByIdAndUpdate(verification.user, {
      password: hashedPassword
    });

    return res.status(200).send({
      success: true,
      message: "Password reset successfully. You can now log in with your new password."
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Reset Password API",
      error,
    });
  }
};

// Resend verification email
const resendVerificationController = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "User not found with this email"
      });
    }

    if (user.emailVerified) {
      return res.status(400).send({
        success: false,
        message: "Email is already verified"
      });
    }

    // Delete any existing unused verification tokens for this user
    await verificationModel.deleteMany({
      user: user._id,
      type: 'email_verification',
      used: false
    });

    // Generate new verification token
    const verificationToken = generateToken();
    const verification = new verificationModel({
      user: user._id,
      token: verificationToken,
      type: 'email_verification',
    });
    await verification.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(user, verificationToken);

    return res.status(200).send({
      success: true,
      message: emailSent 
        ? "Verification email sent successfully. Please check your email." 
        : "Failed to send verification email. Please try again.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Error In Resend Verification API",
      error,
    });
  }
};

module.exports = {
  registerController,
  loginController,
  currentUserController,
  verifyEmailController,
  forgotPasswordController,
  resetPasswordController,
  resendVerificationController
};