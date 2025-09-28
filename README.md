# JoAutomation - AI-Powered Accounting Platform

JoAutomation is a comprehensive accounting automation platform powered by Amwali AI bot. It allows users to upload CSV/Excel files or capture documents with their camera, process them with AI, and generate professional PDF invoices with expense alerts and cashflow projections.

## ✨ Key Features

### 🏠 Modern Landing Page
- **Mobile-first responsive design** with smooth animations
- **Multilingual support** (English/Arabic) with RTL layout
- **Interactive contact form** with real-time validation
- **User registration and login system** with JWT authentication
- **Email notifications** for contact form submissions

### 📱 Mobile-Friendly Dashboard
- **Camera upload functionality** - Take photos of documents directly
- **Drag & drop file upload** for CSV/Excel/PDF files
- **Real-time progress tracking** with visual indicators
- **Interactive financial charts** using Chart.js
- **Smart expense alerts** and notifications
- **Responsive design** optimized for all devices
- **AI-powered data processing** with Amwali bot

### 🔧 Enhanced Admin Panel
- **Mobile-responsive sidebar** with collapsible navigation
- **User account management** with role-based access
- **Contact form message management** with status tracking
- **System statistics dashboard** with real-time metrics
- **Modern UI components** with smooth animations

### 🤖 Advanced AI Processing
- **Automatic file parsing** for CSV/Excel/PDF/image files
- **Intelligent expense and income categorization**
- **Cashflow analysis and projections**
- **Smart alert generation** for unusual patterns
- **Data validation and error handling**
- **Multi-agent processing pipeline**

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **TypeScript** for type safety and better development experience
- **MongoDB** with Mongoose for data persistence
- **PostgreSQL** with Prisma ORM for advanced queries
- **JWT** tokens for secure authentication
- **Redis** for caching and session management

### Frontend
- **Modern HTML5** with semantic markup
- **CSS3** with Flexbox and Grid layouts
- **Vanilla JavaScript** with ES6+ features
- **Chart.js** for interactive data visualization
- **Font Awesome** for consistent iconography
- **Responsive design** with mobile-first approach

### File Processing
- **Multer** for file upload handling
- **XLSX** for Excel file processing
- **CSV-parser** for CSV file parsing
- **PDF-lib** for PDF generation and manipulation
- **Tesseract.js** for OCR processing
- **Sharp** for image optimization

### AI & Machine Learning
- **OpenAI GPT-4** for intelligent data processing
- **Google Cloud Vision API** for advanced OCR
- **Multi-agent processing** pipeline
- **Adaptive learning** system for improved accuracy

### Mobile Features
- **Camera API** integration for document capture
- **Progressive Web App** capabilities
- **Touch-friendly** interface design
- **Offline support** for core functionality

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd joautomation
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/joautomation
   JWT_SECRET=your_jwt_secret_key_here
   ADMIN_EMAIL=admin@joautomation.com
   ADMIN_PASSWORD=admin123
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   mongod
   ```

5. **Run the application**
   ```bash
   npm start
   ```

6. **Access the application**
   - Main website: http://localhost:3000
   - Admin panel: http://localhost:3000/admin.html

## Usage

### For Users

1. **Register/Login**: Create an account or login to access the dashboard
2. **Upload Data**: Upload your CSV or Excel accounting files
3. **AI Processing**: Let Amwali bot process your data automatically
4. **View Analysis**: Review financial insights, charts, and alerts
5. **Generate PDFs**: Create professional invoices and reports

### For Admins

1. **Admin Login**: Use admin credentials to access the admin panel
2. **User Management**: Create and manage user accounts
3. **Contact Management**: Review and respond to contact form submissions
4. **System Monitoring**: View dashboard statistics and system health

## File Format Support

The platform supports the following file formats for accounting data:
- CSV files (.csv)
- Excel files (.xlsx, .xls)

### Expected CSV/Excel Format

Your accounting files should contain columns for:
- Date (date of transaction)
- Description (transaction description)
- Amount (positive for income, negative for expenses)
- Category (expense category)
- Vendor/Source (vendor name or income source)

Example:
```csv
Date,Description,Amount,Category,Vendor
2024-01-01,Office Supplies,-150.00,Office,Office Depot
2024-01-02,Client Payment,2500.00,Income,ABC Corp
2024-01-03,Software License,-99.00,Software,Microsoft
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Admin
- `POST /api/admin/create-user` - Create user account
- `GET /api/admin/users` - Get all users
- `GET /api/admin/contacts` - Get all contacts
- `PUT /api/admin/contacts/:id` - Update contact status
- `GET /api/admin/dashboard` - Get dashboard stats

### Accounting
- `POST /api/accounting/upload` - Upload accounting file
- `GET /api/accounting/data` - Get user's accounting data
- `POST /api/accounting/generate-pdf/:id` - Generate PDF invoice

### Contact
- `POST /api/contact` - Submit contact form

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- File upload validation
- CORS protection
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact us through the contact form on the website or email admin@joautomation.com.

## Changelog

### Version 1.0.0
- Initial release
- User authentication system
- File upload and processing
- AI-powered data analysis
- PDF invoice generation
- Admin panel
- Contact form system
- Responsive design

---

**JoAutomation** - Powered by Amwali AI 🤖


