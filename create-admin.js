// Script to create admin user
const mongoose = require('mongoose');
const User = require('./models/User');
const config = require('./config');

async function createAdmin() {
    try {
        console.log('🔧 Creating admin user...');
        
        // Connect to MongoDB
        await mongoose.connect(config.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: config.ADMIN_EMAIL });
        if (existingAdmin) {
            console.log('✅ Admin user already exists');
            console.log(`Email: ${config.ADMIN_EMAIL}`);
            console.log(`Password: ${config.ADMIN_PASSWORD}`);
            return;
        }
        
        // Create admin user
        const admin = new User({
            email: config.ADMIN_EMAIL,
            password: config.ADMIN_PASSWORD,
            firstName: 'Admin',
            lastName: 'User',
            company: 'JoAutomation',
            role: 'admin'
        });
        
        await admin.save();
        
        console.log('✅ Admin user created successfully!');
        console.log(`Email: ${config.ADMIN_EMAIL}`);
        console.log(`Password: ${config.ADMIN_PASSWORD}`);
        console.log('\n🔐 You can now login to the admin panel at:');
        console.log('http://localhost:3000/admin.html');
        
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createAdmin();


