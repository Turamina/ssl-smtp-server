// Moved from project root. Backend for SSLCommerz payment gateway integration.
const express = require('express');
const SSLCommerzPayment = require('sslcommerz-lts');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());

const store_id = 'algor685c511224e18';
const store_passwd = 'algor685c511224e18@ssl';
const is_live = false; // false for sandbox, true for live

// Initiate payment session
app.post('/api/initiate-payment', async (req, res) => {
    const frontendBaseUrl = req.headers.origin || 'http://localhost:3000';
    const orderData = {
        ...req.body,
        store_id,
        store_passwd,
        success_url: `${frontendBaseUrl}/payment-success`,
        fail_url: `${frontendBaseUrl}/payment-failed`,
        cancel_url: `${frontendBaseUrl}/payment-canceled`,
        ipn_url: 'http://localhost:3030/ipn',
        // Disable EMI to prevent API errors
        emi_option: 0,
        emi_max_inst_option: 0,
        emi_selected_inst: 0,
        // Add required fields to prevent API errors
        shipping_method: req.body.shipping_method || 'Courier',
        product_name: req.body.product_name || 'Online Order',
        product_category: req.body.product_category || 'General',
        product_profile: req.body.product_profile || 'general'
    };
    
    console.log('Initiating payment with data:', JSON.stringify(orderData, null, 2));
    
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    try {
        const apiResponse = await sslcz.init(orderData);
        console.log('SSL Commerz response:', apiResponse);
        
        if (apiResponse.GatewayPageURL) {
            res.json({ success: true, GatewayPageURL: apiResponse.GatewayPageURL });
        } else {
            console.error('No GatewayPageURL in response:', apiResponse);
            res.status(400).json({ success: false, error: apiResponse.failedreason || 'No GatewayPageURL returned' });
        }
    } catch (err) {
        console.error('SSL Commerz error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Validate payment (for IPN or after redirect)
app.post('/api/validate-payment', async (req, res) => {
    const { val_id } = req.body;
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    try {
        const data = await sslcz.validate({ val_id });
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Health check route for backend
app.get('/', (req, res) => {
    res.send('SSLCommerz backend is running.');
});

// Serve React build for production (commented out to avoid conflicts in development)
// app.use(express.static(path.join(__dirname, 'build')));
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

// --- SSLCommerz DEMO/TEST ROUTE for direct gateway testing ---
app.get('/test-ssl-gateway', (req, res) => {
    const SSLCommerzPayment = require('sslcommerz-lts');
    const store_id = 'algor685c511224e18';
    const store_passwd = 'algor685c511224e18@ssl';
    const is_live = false;
    const data = {
        total_amount: 100,
        currency: 'BDT',
        tran_id: 'REF' + Date.now(),
        success_url: 'http://localhost:3030/success',
        fail_url: 'http://localhost:3030/fail',
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        // Disable EMI to prevent API errors
        emi_option: 0,
        emi_max_inst_option: 0,
        emi_selected_inst: 0,
        shipping_method: 'Courier',
        product_name: 'Test Product',
        product_category: 'Test',
        product_profile: 'general',
        cus_name: 'Test User',
        cus_email: 'test@example.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Test User',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
    };
    const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
    sslcz.init(data).then(apiResponse => {
        let GatewayPageURL = apiResponse.GatewayPageURL;
        if (GatewayPageURL) {
            res.redirect(GatewayPageURL);
            console.log('Redirecting to: ', GatewayPageURL);
        } else {
            res.send('Failed to get GatewayPageURL: ' + JSON.stringify(apiResponse));
        }
    });
});

// Email OTP sending endpoint
app.post('/api/send-otp', async (req, res) => {
    try {
        const { to, otp, type, userType, emailConfig } = req.body;
        
        console.log(`Sending OTP email to: ${to}, OTP: ${otp}, Type: ${type}, UserType: ${userType}`);
        
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailConfig.auth.user,
                pass: emailConfig.auth.pass
            }
        });
        
        // Email template
        const getEmailTemplate = (otp, type, userType) => {
            const actionText = type === 'signin' ? 'Sign In' : 'Account Registration';
            const accountType = userType === 'farmer' ? 'Farmer' : 'Customer';
            
            return {
                subject: `Next Gen Farm - ${actionText} Verification Code`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
                        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #2c5530; margin: 0;">🌱 Next Gen Farm</h1>
                                <p style="color: #666; margin: 5px 0;">Sustainable Agriculture Solutions</p>
                            </div>
                            
                            <h2 style="color: #2c5530; text-align: center;">${actionText} Verification</h2>
                            
                            <p style="color: #333; font-size: 16px;">Hello ${accountType},</p>
                            
                            <p style="color: #333; font-size: 16px;">
                                You are receiving this email because you requested ${type === 'signin' ? 'to sign in to' : 'to create an account with'} Next Gen Farm.
                            </p>
                            
                            <div style="background-color: #f0f8f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                                <p style="color: #2c5530; font-size: 18px; margin: 0 0 10px 0;">Your verification code is:</p>
                                <h1 style="color: #2c5530; font-size: 36px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
                                <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">This code will expire in 5 minutes</p>
                            </div>
                            
                            <p style="color: #333; font-size: 16px;">
                                Enter this code in the verification form to complete your ${type === 'signin' ? 'sign in' : 'registration'}.
                            </p>
                            
                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
                                <p style="color: #856404; margin: 0; font-size: 14px;">
                                    <strong>Security Notice:</strong> If you didn't request this verification, please ignore this email. 
                                    Never share your verification code with anyone.
                                </p>
                            </div>
                            
                            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                                <p style="color: #999; font-size: 12px; margin: 0;">
                                    This is an automated message from Next Gen Farm. Please do not reply to this email.
                                </p>
                                <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                                    © 2025 Next Gen Farm. All rights reserved.
                                </p>
                            </div>
                        </div>
                    </div>
                `
            };
        };
        
        const emailTemplate = getEmailTemplate(otp, type, userType);
        
        // Send email
        const mailOptions = {
            from: `"Next Gen Farm" <${emailConfig.auth.user}>`,
            to: to,
            subject: emailTemplate.subject,
            html: emailTemplate.html
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        res.json({
            success: true,
            message: 'OTP email sent successfully',
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Error sending OTP email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const port = 3030;
app.listen(port, () => {
    console.log(`SSLCommerz backend running at http://localhost:${port}`);
});
