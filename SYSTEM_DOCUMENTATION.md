# Rose Buds Public School Portal - Complete System Documentation

## 🎯 System Overview

Rose Buds Public School Portal is a secure, role-based school management system that enables parents to manage school fees, students to view their records, teachers to monitor class information, and administrators to manage school operations.

---

## 📊 Portal Features

### **1. Parent Portal**

- **Access**: Parents login with their email and password
- **Two-Factor Authentication**: SMS OTP for enhanced security
- **Features**:
  - View child's fee information (total fees, paid amount, due amount)
  - Pay fees online through Razorpay UPI checkout
  - Download payment receipts
  - Track payment history
  - View all children linked to the account (for parents with multiple children)

### **2. Student Portal**

- **Access**: Students login with their email and password
- **Two-Factor Authentication**: SMS OTP for enhanced security
- **Features**:
  - View personal fee information
  - View class information
  - Access payment history

### **3. Teacher Portal**

- **Access**: Teachers login with their email and password
- **Features**:
  - View all students in their class
  - Track class fee status
  - Monitor paid and due fees by student
  - Access recent payment history for their class

### **4. Admin Portal (Separate /admin Route)**

- **Access**: Administrators use a dedicated admin login at `/admin`
- **Two-Factor Authentication**: SMS OTP for enhanced security
- **Features**:
  - Create new student and parent accounts
  - Edit school information (name, notice, bank details, UPI ID, etc.)
  - Publish news and gallery updates
  - View all students and their fee status
  - Monitor all payments
  - Export student data as CSV
  - View SMS message logs
  - Filter students by:
    - Payment status (paid/due/all)
    - Class
    - Student name or ID
  - Create bulk student accounts with automated credentials

---

## 🚀 How to Access the Portal

### **For Parents & Students**

1. **Navigate to Homepage**: Go to `http://localhost:3000`
2. **Click "Open Portal"**: In the header navigation or hero section
3. **Select Role**: Choose your role from the dropdown:
   - **Parent**: For fee payments and student monitoring
   - **Student**: To view personal records
   - **Teacher**: For class oversight
4. **Enter Credentials**:
   - Email address (provided by school)
   - Password (provided by school)
5. **Click Login**: System will verify credentials
6. **Receive OTP**: An SMS OTP will be sent to your registered mobile number
7. **Enter OTP**: Check your phone, retrieve the 6-digit OTP
8. **Access Portal**: After OTP verification, you'll see your dashboard

### **For Administrators**

1. **Navigate to Admin Portal**: Go to `http://localhost:3000/admin`
2. **Enter Admin Credentials**:
   - Email: `admin@rbps.test`
   - Password: `Admin@123`
3. **Click Login**: System will verify credentials
4. **Receive OTP**: An SMS OTP will be sent to the registered admin mobile
5. **Enter OTP**: Retrieve the 6-digit OTP from SMS
6. **Access Dashboard**: View all students, payments, and management options

---

## 🔐 Security Features

### **Two-Factor Authentication (2FA)**

- **Enabled for**: Parent, Student, and Admin roles
- **Method**: SMS OTP (One-Time Password)
- **Validity**: 5 minutes
- **Format**: 6-digit numeric code
- **Backup**: Demo mode displays OTP on screen for development/testing

### **Password Security**

- Passwords are hashed using SHA-256
- Credentials are never transmitted in plain text
- Session tokens are used for authentication

### **Session Management**

- Secure HTTP-only cookies
- SameSite=Lax policy
- Automatic logout on browser close

---

## 💳 Fee Payment System

### **Payment Process**

1. Parent logs into portal
2. Selects child and payment amount
3. Clicks "Pay with Razorpay UPI"
4. Redirected to Razorpay UPI checkout
5. Parent selects UPI app (Google Pay, PhonePe, Paytm, etc.)
6. Confirms payment
7. Receipt generated automatically

### **Supported Payment Methods**

- **UPI Apps**: Google Pay, PhonePe, Paytm, BHIM, Bank UPI apps
- **Disabled**: Cards, Wallets, Netbanking (school preference)

### **Payment Information**

- School UPI ID: `rosebudsschool@upi`
- Bank: State Bank of India
- Account: Rose Buds Public School
- Account Number: 123456789012
- IFSC: SBIN0001234

---

## 📋 Student Management (Admin)

### **Creating New Student Accounts**

1. Login to Admin Portal at `/admin`
2. In the admin dashboard, find "Create Student and Parent Accounts"
3. Fill in required information:
   - **Student Name**: Full name
   - **Class**: Class designation (e.g., 8-A, 9-B)
   - **Student Email**: Unique email address
   - **Student Phone**: Contact number
   - **Parent Name**: Parent/Guardian name
   - **Parent Email**: Parent email address
   - **Parent Phone**: Parent contact number
   - **Total Fees**: Annual fee amount
   - **Paid Amount**: Initially paid amount (if any)
   - **Due Date**: Fee payment due date
4. Click "Create Accounts"
5. System generates unique Student ID automatically
6. Credentials are generated and displayed for sharing

### **Automatic Credentials**

- **Student**: Auto-generated password (changeable by school)
- **Parent**: Auto-generated password (changeable by school)
- **Email**: Used as login username

---

## 📊 Admin Dashboard Sections

### **1. Summary Metrics**

- Total number of students
- Total fees collected
- Outstanding due fees
- Total payments processed

### **2. Students Table**

- View all students with complete information
- Sort and filter options
- Payment status indicators

### **3. Filters & Search**

- **By Payment Status**: All, Due Fees, Paid Fees
- **By Class**: Filter by specific class
- **Search**: Find by student name or unique ID

### **4. Student Management**

- Create new accounts
- Edit student information
- Update fee amounts
- Track payment due dates

### **5. School Information Management**

- Update school name
- Edit announcements/notice
- Manage bank details
- Update contact information

### **6. Gallery & News**

- Publish school achievements
- Add campus photos
- Categorize content (Achievement, Sports, Campus, etc.)

### **7. Payment Records**

- View all transactions
- Track payment dates and amounts
- Reference numbers
- Payment methods

### **8. Message Log**

- Monitor all SMS communications
- View delivery status
- Track notification history

---

## 📱 Mobile Optimization

The portal is fully responsive and works on:

- **Desktop**: Full functionality
- **Tablet**: Optimized layout
- **Mobile**: Touch-friendly interface with simplified navigation

---

## 🔄 Data Flow

```
┌─────────────────┐
│   Homepage      │ (Public Website)
│  Information    │
└────────┬────────┘
         │
         ├──→ Parent/Student/Teacher Login ─→ OTP Verification ─→ Dashboard
         │
         └──→ Admin Portal (/admin) ─→ OTP Verification ─→ Admin Dashboard
```

---

## 📧 Credentials Reference

### **Demo Parent Account**

- Email: `parent@rbps.test`
- Password: `Parent@123`
- Mobile: +919876543213
- Children: Aarav Mehta (RBPS-2026-0001)

### **Demo Student Account**

- Email: `student@rbps.test`
- Password: `Student@123`
- Mobile: +919876543212
- Student ID: RBPS-2026-0001
- Class: 8-A

### **Demo Teacher Account**

- Email: `teacher@rbps.test`
- Password: `Teacher@123`
- Mobile: +919876543211
- Class: 8-A

### **Admin Account**

- Email: `admin@rbps.test`
- Password: `Admin@123`
- Mobile: +919876543210
- Access: `http://localhost:3000/admin`

---

## 🛠️ Technical Architecture

### **Frontend**

- **HTML5**: Semantic markup
- **CSS3**: Modern responsive design
- **JavaScript**: Pure vanilla JS (no frameworks)
- **Animations**: Smooth transitions and hover effects

### **Backend**

- **Node.js**: Server runtime
- **HTTP Module**: Built-in server
- **File System**: JSON-based database storage
- **Crypto**: SHA-256 password hashing

### **Database**

- **Format**: JSON
- **Location**: `/data/db.json`
- **Structure**:
  - Users (students, parents, teachers, admin)
  - Students
  - Payments
  - News
  - Messages
  - School Information

---

## 🔍 Key URL Routes

| Route              | Purpose                  | Access        |
| ------------------ | ------------------------ | ------------- |
| `/`                | Homepage & Public Portal | Public        |
| `/admin`           | Admin Login & Dashboard  | Admin Only    |
| `/api/login`       | Login endpoint           | Public        |
| `/api/request-otp` | Request OTP              | Pending Users |
| `/api/verify-otp`  | Verify OTP               | Pending Users |
| `/api/dashboard`   | User dashboard data      | Authenticated |
| `/api/students`    | Create new students      | Admin         |
| `/api/payments`    | Record payments          | Parent        |
| `/api/school`      | Update school info       | Admin         |
| `/api/news`        | Publish news             | Admin         |

---

## ⚡ Performance Features

- **Fast Load Times**: Optimized CSS and minimal JavaScript
- **Smooth Animations**: 300-400ms transitions for natural feel
- **Responsive Design**: Mobile-first approach
- **Efficient Rendering**: No re-renders on state changes
- **Lightweight**: No external dependencies (except Razorpay)

---

## 🔒 Privacy & Compliance

- **Data Protection**: Passwords hashed with SHA-256
- **Secure Transmission**: HTTPS recommended for production
- **Session Security**: HTTP-only cookies
- **OTP Security**: 5-minute expiration
- **Message Logging**: SMS audit trail
- **Role-Based Access**: Users see only their data

---

## 🌟 User Experience Highlights

### **Modern Design**

- Contemporary color scheme (green, blue, pink gradients)
- Smooth animations on page load
- Hover effects for interactive elements
- Professional typography and spacing

### **Intuitive Navigation**

- Clear section headings
- Logical information hierarchy
- Easy-to-find login buttons
- Dedicated admin portal link

### **Accessibility**

- Semantic HTML structure
- Color contrast compliance
- Keyboard navigation support
- Form validation with clear errors

---

## 🚨 Troubleshooting

### **Login Issues**

- Verify email is correct (case-insensitive)
- Check password hasn't been changed
- Ensure mobile number is registered for OTP
- OTP must be entered within 5 minutes

### **Payment Issues**

- Ensure sufficient balance in UPI account
- Check internet connection
- Verify UPI app is installed and updated
- Contact school for payment status

### **Account Access**

- If account not created, contact school office
- School admin creates accounts manually
- Cannot self-register as parent/student
- Teacher accounts created by admin

### **OTP Not Received**

- Check phone number in account
- Verify SMS is not blocked
- Wait 1-2 minutes for SMS delivery
- Use demo OTP shown on screen (if in demo mode)

---

## 📞 Support & Contact

**School Contact Information**

- **Address**: Opp. Gayatri Temple, Raj Avenue, Kale Road, Chheharta, Amritsar
- **Phone**: +91 94630 11687
- **Email**: sims_rosebuds@yahoo.com
- **Hours**: Summer 07:40 AM - 02:00 PM | Winter 08:15 AM - 02:30 PM

**For Portal Support**

- Contact school office during business hours
- Email for urgent issues
- Visit school for account creation/reset

---

## ✅ System Testing Checklist

- [x] Login functionality for all roles
- [x] OTP verification working
- [x] Fee payment processing
- [x] Student data management
- [x] Admin dashboard functions
- [x] Responsive mobile design
- [x] Session management
- [x] Logout functionality
- [x] Admin separate portal at /admin
- [x] Admin-specific content removed from homepage

---

## 🎨 Design Features

### **Color Scheme**

- **Primary**: Green (#059669) - Trust, growth, secure
- **Secondary**: Blue (#3b82f6) - Calm, reliable
- **Accent**: Red (#dc2626) - Alerts, important info
- **Background**: Soft gradients for modern look

### **Typography**

- **Headlines**: Bold, gradient text (up to 4.5rem)
- **Body**: Clear, readable sans-serif (14-16px)
- **Spacing**: Consistent margins and padding

### **Interactive Elements**

- Smooth hover transitions (300-400ms)
- Elevation effects on cards
- Gradient buttons with shadows
- Color change feedback

---

## 📄 File Structure

```
rbps/
├── server.js              # Backend server
├── package.json           # Dependencies
├── data/
│   └── db.json           # Database
├── public/
│   ├── index.html        # Main portal homepage
│   ├── admin.html        # Admin login & dashboard
│   ├── app.js            # Frontend logic
│   ├── admin.js          # Admin portal logic
│   ├── styles.css        # Styling
│   ├── assets/
│   │   └── rose-buds-logo.png
│   └── ...
└── artifacts/            # (Optional storage)
```

---

## 🎓 Getting Started Guide

### **First Time Setup**

1. Admin creates parent and student accounts
2. Credentials are provided to families
3. Parents and students login with provided credentials
4. OTP verification secures access
5. Dashboard shows personalized information

### **For New Parents**

1. Contact school office for account creation
2. Receive email with login credentials
3. Go to `http://localhost:3000`
4. Click "Open Portal"
5. Login with provided email and password
6. Verify OTP sent to registered mobile
7. Access fee information and make payments

### **For School Administrators**

1. Go to `http://localhost:3000/admin`
2. Login with admin credentials
3. Verify OTP
4. Access admin dashboard
5. Create new accounts, manage fees, publish news

---

## 🔜 Future Enhancements

- SMS reminders for overdue fees
- Payment installment plans
- Student progress reports
- Parent-teacher communication
- Mobile app version
- Email notifications
- Advanced analytics
- Multiple payment methods

---

**Document Version**: 1.0  
**Last Updated**: June 9, 2026  
**System Status**: ✅ Live and Operational
