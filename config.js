module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/joautomation',
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@joautomation.com',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
    EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    EMAIL_PORT: process.env.EMAIL_PORT || 587,
    EMAIL_USER: process.env.EMAIL_USER || 'your_email@gmail.com',
    EMAIL_PASS: process.env.EMAIL_PASS || 'your_app_password',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || ''
};

