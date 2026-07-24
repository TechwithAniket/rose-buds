# Rose Buds Portal - Quick Start Guide

## 🚀 5-Minute Setup

### **Starting the Server**

```bash
cd rbps
npm start
```

Server runs on: `http://localhost:3000`

---

## 👨‍👩‍👧 For Parents

### **Step 1: Login**

1. Go to `http://localhost:3000`
2. Click "Open Portal" button
3. Select **Parent** from role dropdown
4. Enter email: `parent@rbps.test`
5. Enter password: `Parent@123`
6. Click **Login**

### **Step 2: Verify OTP**

1. SMS will be sent to your registered mobile
2. Enter the 6-digit OTP code
3. Click **Verify**

### **Step 3: View Dashboard**

- See your children's fees
- View payment history
- Download receipts

### **Step 4: Pay Fees**

1. Click "Pay Fees" button
2. Select child and amount
3. Click "Pay with Razorpay UPI"
4. Complete payment in UPI app
5. Receipt auto-generates

---

## 👨‍🎓 For Students

### **Step 1: Login**

1. Go to `http://localhost:3000`
2. Click "Open Portal" button
3. Select **Student** from role dropdown
4. Enter email: `student@rbps.test`
5. Enter password: `Student@123`
6. Click **Login**

### **Step 2: Verify OTP**

1. Receive 6-digit SMS code
2. Enter OTP
3. Click **Verify**

### **Step 3: View Records**

- See personal fee information
- View class details
- Check payment history

---

## 👨‍🏫 For Teachers

### **Step 1: Login**

1. Go to `http://localhost:3000`
2. Click "Open Portal" button
3. Select **Teacher** from role dropdown
4. Enter email: `teacher@rbps.test`
5. Enter password: `Teacher@123`
6. Click **Login**

### **Step 2: Verify OTP**

1. Receive 6-digit SMS code
2. Enter OTP
3. Click **Verify**

### **Step 3: View Class Data**

- See all students in class
- View fee status
- Monitor payments
- Check class summary

---

## 👨‍💼 For Administrators

### **Step 1: Go to Admin Portal**

1. Go to `http://localhost:3000/admin`
2. Enter email: `admin@rbps.test`
3. Enter password: `Admin@123`
4. Click **Login**

### **Step 2: Verify OTP**

1. Receive 6-digit SMS code
2. Enter OTP
3. Click **Verify**

### **Step 3: Access Admin Dashboard**

Shows 4 key metrics:

- **Students**: Total count
- **Paid Fees**: Total collected
- **Due Fees**: Outstanding amount
- **Payments**: Total transactions

### **Step 4: Common Admin Tasks**

#### **Create New Student Account**

1. Go to Admin Dashboard
2. Find "Create Student and Parent Accounts"
3. Fill in:
   - Student name, email, phone
   - Class
   - Parent name, email, phone
   - Total fees
   - Due date
4. Click "Create"
5. Credentials displayed for sharing

#### **View All Students**

1. Dashboard shows student table
2. Click on any student to view details
3. Use filters:
   - **All/Paid/Due**: Payment status
   - **Class**: Filter by class
   - **Search**: Find by name/ID

#### **Update School Information**

1. Scroll to School Information section
2. Edit school name, contact, announcements
3. Update bank details, UPI ID
4. Click "Save"

#### **Publish News**

1. Find News section
2. Enter title and description
3. Select category (Achievement, Sports, Campus, etc.)
4. Click "Publish"

#### **View Payments**

1. Check payment table
2. See transaction details
3. Reference numbers and dates

---

## 🔐 Demo Credentials

### **Parent Account**

```
Email: parent@rbps.test
Password: Parent@123
Mobile: +919876543213
```

### **Student Account**

```
Email: student@rbps.test
Password: Student@123
Mobile: +919876543212
```

### **Teacher Account**

```
Email: teacher@rbps.test
Password: Teacher@123
Mobile: +919876543211
```

### **Admin Account**

```
Email: admin@rbps.test
Password: Admin@123
Mobile: +919876543210
Portal: http://localhost:3000/admin
```

---

## 💡 Tips & Tricks

### **Faster Login Testing**

- Use demo credentials (no need to create accounts)
- OTP shown on screen in demo mode
- Test all features without actual SMS

### **Payment Testing**

- Use test UPI in Razorpay demo mode
- Payment completes instantly
- Receipt generated automatically

### **Mobile Testing**

- Open in mobile browser
- Responsive design adapts automatically
- Touch-friendly buttons and forms

### **Admin Operations**

- Filters at top of tables for quick search
- Bulk actions for multiple students
- Export data for records

---

## 🆘 Common Issues & Solutions

| Issue                  | Solution                                         |
| ---------------------- | ------------------------------------------------ |
| Can't login            | Check email/password, verify account exists      |
| OTP not received       | Check phone number, wait 2 minutes, use demo OTP |
| Payment failed         | Check UPI balance, verify internet, retry        |
| Can't see admin portal | Go to `http://localhost:3000/admin` directly     |
| Student not in list    | Admin must create account first                  |

---

## 📱 URLs Reference

| Purpose       | URL                           |
| ------------- | ----------------------------- |
| Main Portal   | `http://localhost:3000`       |
| Admin Portal  | `http://localhost:3000/admin` |
| Homepage      | `http://localhost:3000/`      |
| API Endpoints | `http://localhost:3000/api/*` |

---

## ✅ Test Checklist

- [ ] Parent login and payment
- [ ] Student view records
- [ ] Teacher check class
- [ ] Admin create student
- [ ] Admin update school info
- [ ] OTP verification
- [ ] Mobile responsiveness
- [ ] Logout functionality

---

## 🎯 Next Steps

1. Test each user role
2. Create real student accounts
3. Configure school information
4. Publish welcome news
5. Share parent credentials
6. Monitor payments
7. Generate reports

---

**Happy Using! 🎓**
