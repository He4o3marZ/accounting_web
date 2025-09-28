const express = require('express');
const User = require('../models/User');
const Contact = require('../models/Contact');
const authRoutes = require('./auth');
const verifyToken = authRoutes.verifyToken;

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Apply admin middleware to all routes
router.use(verifyToken);
router.use(requireAdmin);

// Create user account
router.post('/create-user', async (req, res) => {
    try {
        const { email, password, firstName, lastName, company } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = new User({
            email,
            password,
            firstName,
            lastName,
            company
        });

        await user.save();

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                company: user.company
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all contact messages
router.get('/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update contact status
router.put('/contacts/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!contact) {
            return res.status(404).json({ message: 'Contact not found' });
        }
        
        res.json(contact);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalContacts = await Contact.countDocuments();
        const newContacts = await Contact.countDocuments({ status: 'new' });
        
        res.json({
            totalUsers,
            activeUsers,
            totalContacts,
            newContacts
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
