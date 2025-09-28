const express = require('express');
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact');
const config = require('../config');

const router = express.Router();

// Create email transporter
const transporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: false,
    auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASS
    }
});

// Submit contact form
router.post('/', async (req, res) => {
    try {
        const { name, email, company, phone, message } = req.body;

        // Save contact to database
        const contact = new Contact({
            name,
            email,
            company,
            phone,
            message
        });

        await contact.save();

        // Send email notification
        const mailOptions = {
            from: config.EMAIL_USER,
            to: config.ADMIN_EMAIL,
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Company:</strong> ${company || 'Not provided'}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({
            message: 'Thank you for your message! We will get back to you soon.'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
