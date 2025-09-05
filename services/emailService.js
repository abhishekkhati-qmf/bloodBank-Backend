const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate verification token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send email verification
const sendVerificationEmail = async (user, token) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '🔐 Verify Your Email - LifeLink Blood Bank',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; text-align: center;">Welcome to LifeLink!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi <strong>${user.name || user.organisationName || user.hospitalName || 'there'}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for registering with LifeLink Blood Bank. To complete your registration and access your account, please verify your email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;">
                ✅ Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #1976d2; font-size: 14px; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #2e7d32; margin: 0 0 10px 0;">What happens next?</h4>
              <ul style="color: #2e7d32; margin: 0; padding-left: 20px;">
                <li>Click the verification link above</li>
                <li>Your email will be verified instantly</li>
                <li>You can then log in to your account</li>
                <li>Start using LifeLink Blood Bank services</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("Error sending verification email: ", error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, token) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '🔑 Reset Your Password - LifeLink Blood Bank',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi <strong>${user.name || user.organisationName || user.hospitalName || 'there'}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              We received a request to reset your password for your LifeLink Blood Bank account. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;">
                🔑 Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If the button above doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #1976d2; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
            
            <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #e65100; margin: 0 0 10px 0;">Important Security Notes:</h4>
              <ul style="color: #e65100; margin: 0; padding-left: 20px;">
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your old password will remain unchanged</li>
                <li>Choose a strong, unique password</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              For security reasons, this password reset link will expire in 1 hour. If you need more time, you can request another reset link.
            </p>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("Error sending password reset email: ", error);
    return false;
  }
};

// Send camp notification email
const sendCampNotificationEmail = async (donor, camp) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: donor.email,
      subject: `🩸 Blood Donation Camp: ${camp.name} - LifeLink`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; text-align: center;">🩸 Blood Donation Camp</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi <strong>${donor.name}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              A new blood donation camp has been organized in your area! This is a great opportunity to save lives and contribute to your community.
            </p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin: 0 0 15px 0;">Camp Details:</h3>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Camp Name:</strong> ${camp.name}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Date:</strong> ${new Date(camp.date).toLocaleDateString()}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Time:</strong> ${camp.startTime} - ${camp.endTime}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Location:</strong> ${camp.location}, ${camp.city}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Blood Groups Needed:</strong> ${camp.bloodGroups.join(', ')}</p>
            </div>
            
            ${camp.description ? `
            <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #7b1fa2; margin: 0 0 10px 0;">Description:</h4>
              <p style="color: #7b1fa2; margin: 0; line-height: 1.6;">${camp.description}</p>
            </div>
            ` : ''}
            
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1976d2; margin: 0 0 15px 0;">Contact Information:</h4>
              <p style="color: #1976d2; margin: 5px 0;"><strong>Contact Person:</strong> ${camp.contactPerson}</p>
              <p style="color: #1976d2; margin: 5px 0;"><strong>Phone:</strong> ${camp.contactPhone}</p>
              <p style="color: #1976d2; margin: 5px 0;"><strong>Email:</strong> ${camp.contactEmail}</p>
              <p style="color: #1976d2; margin: 5px 0;"><strong>Organisation:</strong> ${camp.organisation?.organisationName || 'Blood Bank'}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #d32f2f; font-size: 18px; font-weight: bold;">
                Your blood group ${donor.bloodGroup} is needed!
              </p>
              <p style="color: #666; font-size: 16px;">
                Please contact the organisation to confirm your participation.
              </p>
            </div>
            
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #e65100; font-size: 14px;">
                This is an automated notification. Please respond directly to the organisation.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("Error sending camp notification email: ", error);
    return false;
  }
};

// Send donation request email to organisation
const sendDonationRequestEmail = async (organisation, donor, donationRequest) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: organisation.email,
      subject: `🩸 New Blood Donation Request - ${donor.bloodGroup} - LifeLink`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #d32f2f 0%, #ff9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; text-align: center;">🩸 New Blood Donation Request</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi <strong>${organisation.organisationName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              You have received a new blood donation request from a donor.
            </p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin: 0 0 15px 0;">Donor Details:</h3>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Name:</strong> ${donor.name}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Blood Group:</strong> ${donor.bloodGroup}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Contact:</strong> ${donor.phone || donor.email}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>City:</strong> ${donor.city}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Request Date:</strong> ${new Date(donationRequest.requestDate).toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #d32f2f; font-size: 18px; font-weight: bold;">
                Please review and respond to this donation request.
              </p>
              <p style="color: #666; font-size: 16px;">
                Log in to your LifeLink account to approve, reject, or request more information.
              </p>
            </div>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666;">
                This is an automated notification from LifeLink Blood Bank.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("Error sending donation request email: ", error);
    return false;
  }
};

// Send donation response email to donor
const sendDonationResponseEmail = async (donor, organisation, donationRequest) => {
  try {
    const transporter = createTransporter();
    
    const statusColors = {
      'approved': '#2e7d32',
      'rejected': '#d32f2f',
      'completed': '#1976d2',
      'cancelled': '#f57c00'
    };
    
    const statusText = {
      'approved': 'Approved',
      'rejected': 'Rejected',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: donor.email,
      subject: `📋 Donation Request ${statusText[donationRequest.status]} - LifeLink`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${statusColors[donationRequest.status]} 0%, #ff9800 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LifeLink</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Blood Bank Management System</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #333; text-align: center;">📋 Donation Request ${statusText[donationRequest.status]}</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Hi <strong>${donor.name}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Your blood donation request to <strong>${organisation.organisationName}</strong> has been <strong>${donationRequest.status}</strong>.
            </p>
            
            <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2e7d32; margin: 0 0 15px 0;">Request Details:</h3>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Blood Group:</strong> ${donationRequest.bloodGroup}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Organisation:</strong> ${organisation.organisationName}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Status:</strong> ${statusText[donationRequest.status]}</p>
              <p style="color: #2e7d32; margin: 5px 0;"><strong>Response Date:</strong> ${new Date(donationRequest.responseDate).toLocaleDateString()}</p>
              ${donationRequest.responseNotes ? `<p style="color: #2e7d32; margin: 5px 0;"><strong>Notes:</strong> ${donationRequest.responseNotes}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: ${statusColors[donationRequest.status]}; font-size: 18px; font-weight: bold;">
                ${donationRequest.status === 'approved' ? 'Please contact the organisation to schedule your donation.' : 
                  donationRequest.status === 'completed' ? 'Thank you for your donation!' : 
                  'Please contact the organisation for more information.'}
              </p>
            </div>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center;">
              <p style="margin: 0; color: #666;">
                This is an automated notification from LifeLink Blood Bank.
              </p>
            </div>
          </div>
          
          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; margin: 0; font-size: 12px;">
              © 2025 LifeLink Blood Bank. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("Error sending donation response email: ", error);
    return false;
  }
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendCampNotificationEmail,
  sendDonationRequestEmail,
  sendDonationResponseEmail,
};
