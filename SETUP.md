# JoAutomation Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

### 2. Installation

```bash
# Clone or download the project
cd joautomation

# Install dependencies
npm install

# Test the setup
npm run test-setup

# Create admin user
npm run create-admin

# Start the application
npm start
```

### 3. Access the Application

- **Main Website**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin.html

### 4. Default Admin Credentials

- **Email**: admin@joautomation.com
- **Password**: admin123

## Detailed Setup

### MongoDB Setup

#### Windows
1. Download MongoDB from https://www.mongodb.com/try/download/community
2. Install MongoDB
3. Start MongoDB service:
   ```cmd
   net start MongoDB
   ```

#### macOS
```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Linux (Ubuntu/Debian)
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Environment Configuration

1. Copy `config.js` and modify the settings:
   ```javascript
   module.exports = {
       MONGODB_URI: 'mongodb://localhost:27017/joautomation',
       JWT_SECRET: 'your_secure_jwt_secret_here',
       ADMIN_EMAIL: 'admin@joautomation.com',
       ADMIN_PASSWORD: 'your_secure_admin_password',
       EMAIL_HOST: 'smtp.gmail.com',
       EMAIL_PORT: 587,
       EMAIL_USER: 'your_email@gmail.com',
       EMAIL_PASS: 'your_app_password'
   };
   ```

2. For email functionality, set up Gmail App Password:
   - Go to Google Account settings
   - Enable 2-factor authentication
   - Generate an App Password for the application
   - Use this password in EMAIL_PASS

### Testing the Application

1. **Test Setup**:
   ```bash
   npm run test-setup
   ```

2. **Create Admin User**:
   ```bash
   npm run create-admin
   ```

3. **Start Application**:
   ```bash
   npm start
   ```

4. **Test with Sample Data**:
   - Register a new user account
   - Upload the provided `sample_data.csv` file
   - Check the AI processing and PDF generation

## File Structure

```
joautomation/
├── public/                 # Frontend files
│   ├── index.html         # Landing page
│   ├── dashboard.html     # User dashboard
│   └── admin.html         # Admin panel
├── models/                # Database models
│   ├── User.js
│   ├── AccountingData.js
│   └── Contact.js
├── routes/                # API routes
│   ├── auth.js
│   ├── admin.js
│   ├── accounting.js
│   └── contact.js
├── uploads/               # File uploads (created automatically)
├── server.js              # Main server file
├── config.js              # Configuration
├── package.json           # Dependencies
├── sample_data.csv        # Sample data for testing
├── test-setup.js          # Setup test script
├── create-admin.js        # Admin user creation script
└── README.md              # Documentation
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Ensure MongoDB is running
   - Check the MONGODB_URI in config.js
   - Verify MongoDB is accessible on port 27017

2. **Port Already in Use**:
   - Change the PORT in server.js
   - Kill existing processes using the port

3. **Email Not Working**:
   - Check Gmail App Password setup
   - Verify EMAIL_USER and EMAIL_PASS in config.js
   - Check firewall settings

4. **File Upload Issues**:
   - Ensure uploads/ directory exists
   - Check file permissions
   - Verify file format (CSV/Excel only)

### Logs and Debugging

- Check console output for error messages
- MongoDB logs: Check system logs or MongoDB log files
- Application logs: Displayed in console when running `npm start`

## Security Notes

- Change default admin credentials
- Use strong JWT secrets
- Set up proper email authentication
- Consider using environment variables for production
- Implement HTTPS in production
- Regular security updates

## Production Deployment

1. Use environment variables instead of config.js
2. Set up proper database security
3. Configure reverse proxy (nginx)
4. Set up SSL certificates
5. Use PM2 for process management
6. Set up monitoring and logging

## Support

For issues and questions:
- Check the README.md for detailed documentation
- Review the troubleshooting section
- Check console logs for error messages
- Ensure all dependencies are installed correctly


