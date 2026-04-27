# RTN Employee Dashbord

A modern, enterprise-grade Staff Management Dashboard web application built using the MERN stack (MongoDB, Express, React, Node.js) with Tailwind CSS. 

## Tech Stack
- **Frontend**: React.js, Tailwind CSS, React Router DOM, Axios, Lucide React (Icons)
- **Backend**: Node.js, Express.js, MongoDB (Mongoose), JSON Web Tokens (JWT), bcryptjs

## Directory Structure
- `/frontend` - React application
- `/backend` - Express REST API

## Database Schema (MongoDB Collections)
1. **Users**
   - `_id`, `name`, `email`, `password` (hashed), `role` (admin/manager/employee), `managerId` (ref: User), `teamId`, `activeStatus`, `firstTimeLogin`
2. **Attendance**
   - `_id`, `userId` (ref: User), `markedBy` (ref: User), `date`, `status` (Present/Absent/Half Day/Leave), `checkIn`, `checkOut`, `remarks`
3. **Leaves**
   - `_id`, `userId` (ref: User), `managerId` (ref: User), `type`, `fromDate`, `toDate`, `reason`, `status` (Pending/Approved/Rejected)
4. **Tickets**
   - `_id`, `userId` (ref: User), `assignedTo` (ref: User), `subject`, `description`, `priority` (Low/Medium/High/Critical), `status` (Open/In Progress/Resolved/Escalated), `comments`

## API Structure

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /change-password` - First-time or regular password reset

### Users (`/api/users`)
- `POST /` - Create employee/manager account (Admin only)
- `GET /` - Get all users (Admin only)
- `GET /team` - Get assigned team members (Manager only)
- `PUT /:id/status` - Activate/Deactivate user (Admin only)

### Attendance (`/api/attendance`)
- `GET /my` - View self attendance
- `GET /team` - View team attendance (Manager only)
- `GET /all` - View all attendance (Admin only)
- `POST /` - Mark/edit attendance (Manager/Admin only)

### Leaves (`/api/leaves`)
- `POST /` - Apply for leave
- `GET /my` - View own leaves
- `GET /team` - View team leave requests (Manager only)
- `GET /all` - View all leave requests (Admin only)
- `PUT /:id/status` - Approve/Reject leave (Manager/Admin only)

### Tickets (`/api/tickets`)
- `POST /` - Raise a ticket
- `GET /my` - View own tickets
- `GET /team` - View team tickets (Manager only)
- `GET /all` - View all tickets (Admin only)
- `PUT /:id/status` - Update ticket status
- `POST /:id/comments` - Add comment to ticket
- `PUT /:id/escalate` - Escalate to admin (Manager only)

## Setup & Running Locally

### 1. Database Setup
Ensure MongoDB is running locally on `mongodb://127.0.0.1:27017` or update the `MONGODB_URI` in `backend/.env`.

### 2. Install Dependencies
Open two terminals.
```bash
# Terminal 1 - Backend
cd backend
npm install

# Terminal 2 - Frontend
cd frontend
npm install
```

### 3. Seed Admin User
Once the backend is running, you can seed the first admin user by visiting:
`http://localhost:5000/api/seed` in your browser or making a GET request.
- **Admin Email**: admin@employeeportal.com
- **Admin Password**: admin123

### 4. Start the Application
```bash
# Terminal 1 - Backend (Runs on port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (Runs on port 5173)
cd frontend
npm run dev
```

### Important Logic Rules Implemented
- Manager cannot edit own attendance: Checked in `attendanceController.markAttendance` route.
- Admin can edit anyone attendance.
- Escalate Ticket: Re-assigns the ticket directly to the Admin user (`ticketController.escalateTicket`).
- Role-based Protected Routes on frontend redirect unauthorized access immediately.
