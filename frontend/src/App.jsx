import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Attendance from './pages/Attendance';
import TeamAttendance from './pages/TeamAttendance';
import Leaves from './pages/Leaves';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Payroll from './pages/Payroll';
import useActivityTracker from './hooks/useActivityTracker';
import WorkTracking from './pages/WorkTracking';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const RoleBasedRoute = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'manager' || user.role === 'teamlead') return <Navigate to="/manager" replace />;
  return <Navigate to="/employee" replace />;
};

function App() {
  useActivityTracker();
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<RoleBasedRoute />} />

        <Route element={<Layout />}>
          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/work-tracking" element={<ProtectedRoute allowedRoles={['admin']}><WorkTracking /></ProtectedRoute>} />
          <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><Attendance /></ProtectedRoute>} />
          <Route path="/admin/team-attendance" element={<ProtectedRoute allowedRoles={['admin']}><TeamAttendance /></ProtectedRoute>} />
          <Route path="/admin/leaves" element={<ProtectedRoute allowedRoles={['admin']}><Leaves /></ProtectedRoute>} />
          <Route path="/admin/tickets" element={<ProtectedRoute allowedRoles={['admin']}><Tickets /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><Notifications /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="/admin/payroll" element={<ProtectedRoute allowedRoles={['admin']}><Payroll /></ProtectedRoute>} />

          {/* Manager & Team Lead Routes */}
          <Route path="/manager" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><ManagerDashboard /></ProtectedRoute>} />
          <Route path="/manager/attendance" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><Attendance /></ProtectedRoute>} />
          <Route path="/manager/team-attendance" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><TeamAttendance /></ProtectedRoute>} />
          <Route path="/manager/leaves" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><Leaves /></ProtectedRoute>} />
          <Route path="/manager/notifications" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><Notifications /></ProtectedRoute>} />
          <Route path="/manager/tickets" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><Tickets /></ProtectedRoute>} />
          <Route path="/manager/team" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><Users /></ProtectedRoute>} />
          <Route path="/manager/payroll" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'teamlead']}><Payroll /></ProtectedRoute>} />

          {/* General Routes */}
          <Route path="/profile" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Employee Routes */}
          <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/employee/attendance" element={<ProtectedRoute allowedRoles={['employee']}><Attendance /></ProtectedRoute>} />
          <Route path="/employee/leaves" element={<ProtectedRoute allowedRoles={['employee']}><Leaves /></ProtectedRoute>} />
          <Route path="/employee/tickets" element={<ProtectedRoute allowedRoles={['employee']}><Tickets /></ProtectedRoute>} />
          <Route path="/employee/payroll" element={<ProtectedRoute allowedRoles={['employee']}><Payroll /></ProtectedRoute>} />
          <Route path="/employee/notifications" element={<ProtectedRoute allowedRoles={['employee']}><Notifications /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
