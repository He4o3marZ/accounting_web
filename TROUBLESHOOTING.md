# 🔧 Troubleshooting Guide

## Login Issues Fixed ✅

### Issues Resolved:
1. **Deprecated meta tag warning** - Fixed by adding `mobile-web-app-capable`
2. **CSS selector error** - Fixed by validating href before querySelector
3. **404 login API error** - Fixed by enabling auth routes in TypeScript server

## 🚀 How to Start the Server

### Option 1: JavaScript Server (Recommended for login)
```bash
npm run start:js
# or
npm run dev:js
```

### Option 2: TypeScript Server (Now with auth routes)
```bash
npm run start:ts
# or
npm run dev:ts
```

### Option 3: Legacy Commands
```bash
# JavaScript server
npm start

# TypeScript server
npm run dev
```

## 🔐 Default Login Credentials

### Admin Account:
- **Email**: `admin@joautomation.com`
- **Password**: `admin123`

### Create Admin User:
```bash
node create-admin.js
```

## 🐛 Common Issues & Solutions

### 1. "Failed to load resource: 404 (Not Found)" for /api/auth/login
**Solution**: Make sure you're running the correct server:
- Use `npm start` for JavaScript server (has auth routes)
- Or use `npm run start:ts` for TypeScript server (now has auth routes enabled)

### 2. "Invalid credentials" error
**Solution**: 
- Make sure MongoDB is running
- Create admin user: `node create-admin.js`
- Use correct credentials: `admin@joautomation.com` / `admin123`

### 3. MongoDB connection error
**Solution**:
- Install MongoDB: `brew install mongodb-community` (Mac) or download from mongodb.com
- Start MongoDB: `mongod`
- Or use MongoDB Atlas cloud service

### 4. Camera not working on mobile
**Solution**:
- Make sure you're using HTTPS (required for camera access)
- Check browser permissions for camera access
- Try refreshing the page

### 5. File upload not working
**Solution**:
- Check file size (should be under 10MB)
- Supported formats: CSV, Excel, PDF, JPG, PNG
- Make sure server is running and accessible

## 🔍 Debug Mode

### Enable detailed logging:
```bash
DEBUG=* npm run start:js
```

### Check server status:
```bash
curl http://localhost:3000/health
```

### Test auth endpoint:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@joautomation.com","password":"admin123"}'
```

## 📱 Mobile Testing

### Test on mobile device:
1. Find your computer's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Access from mobile: `http://YOUR_IP:3000`
3. Test camera upload functionality

### Progressive Web App:
- Add to home screen on mobile
- Works offline for basic functionality
- Camera access requires HTTPS in production

## 🚨 Emergency Reset

### Reset everything:
```bash
# Stop all processes
pkill -f node

# Clear cache
npm run clean

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Restart MongoDB
brew services restart mongodb-community

# Start server
npm run start:js
```

## 📞 Support

If you're still having issues:
1. Check the browser console for errors
2. Check the server logs
3. Make sure all dependencies are installed
4. Verify MongoDB is running
5. Try the emergency reset above

---

**Last Updated**: $(date)
**Version**: 1.0.0
