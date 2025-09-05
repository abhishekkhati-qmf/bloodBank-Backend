const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await userModel.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // Get admin credentials from environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    if (!adminEmail || !adminPassword) {
      console.log('⚠️  Admin credentials not found in environment variables');
      console.log('   Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Create admin user (email verification will be required)
    const adminUser = new userModel({
      role: 'admin',
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      address: 'System',
      phone: 'N/A',
      emailVerified: false, // Admin must verify email before login
    });

    await adminUser.save();

    // Create verification token for admin
    const verificationModel = require('../models/verificationModel');
    const { generateToken, sendVerificationEmail } = require('../services/emailService');
    
    const verificationToken = generateToken();
    const verification = new verificationModel({
      user: adminUser._id,
      token: verificationToken,
      type: 'email_verification',
    });
    await verification.save();

    // Send verification email to admin
    const emailSent = await sendVerificationEmail(adminUser, verificationToken);

    console.log('✅ Admin user created successfully');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);
    console.log(emailSent 
      ? '   📧 Verification email sent! Admin must verify email before login.'
      : '   ⚠️  Failed to send verification email. Admin will need manual verification.');
    console.log('   Please check your email and verify your account before logging in');
    
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
  }
};

module.exports = seedAdmin;
