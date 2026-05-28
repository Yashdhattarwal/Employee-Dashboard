import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import ProductivityLog from '../models/ProductivityLog.js';
import UserSessionLog from '../models/UserSessionLog.js';
import { Op } from 'sequelize';

/**
 * Intelligent Semantic Parser & Dynamic Database Analytics Compiler for DashMind
 */
export const processDashMindQuery = async (queryText, user) => {
  const query = (queryText || '').toLowerCase().trim();
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

  // Helper to fetch target user list based on RBAC hierarchy
  const getTargetUserIds = async () => {
    if (user.role === 'admin') {
      const allUsers = await User.findAll({ attributes: ['id'] });
      return allUsers.map(u => u.id);
    } else if (user.role === 'manager') {
      const reportingUsers = await User.findAll({
        where: {
          [Op.or]: [{ id: user.id }, { managerId: user.id }]
        },
        attributes: ['id']
      });
      return reportingUsers.map(u => u.id);
    } else if (user.role === 'team_lead' || user.role === 'tl') {
      if (!user.teamId) return [user.id];
      const teamUsers = await User.findAll({
        where: {
          [Op.or]: [{ id: user.id }, { teamId: user.teamId }]
        },
        attributes: ['id']
      });
      return teamUsers.map(u => u.id);
    } else {
      // Regular employee can ONLY access their own data
      return [user.id];
    }
  };

  // Helper to restrict general inquiries for regular employees
  const restrictEmployeeAccess = () => {
    if (user.role === 'employee') {
      return {
        authorized: false,
        type: 'text',
        speech: "Sorry, you are not authorized to access organization-wide metrics. I can only show your own personal work statistics.",
        data: null
      };
    }
    return null;
  };

  // Heuristic semantic intents
  const isGreeting = /\b(hi|hello|hey|greetings|who are you|what can you do|help)\b/.test(query);
  const isLateQuery = /\b(late|tardy|missed start|delayed)\b/.test(query);
  const isAbsentQuery = /\b(absent|not checked in|missing|who is absent)\b/.test(query);
  const isProductivityQuery = /\b(productivity|performance|lowest productivity|team productivity|efficient)\b/.test(query);
  const isHoursQuery = /\b(hours|work hours|overtime|compare work hours|working hours)\b/.test(query);
  const isLeavesQuery = /\b(leave|leaves|vacation|time off|pending leaves)\b/.test(query);
  const isMyPerformance = /\b(my weekly performance|my productivity|my trend|my statistics|my metrics)\b/.test(query);
  const isAttendanceReport = /\b(generate attendance report|attendance logs|attendance report|attendance list)\b/.test(query);

  try {
    const targetUserIds = await getTargetUserIds();

    // 1. GREETINGS & HELP INTENT
    if (isGreeting) {
      return {
        authorized: true,
        type: 'text',
        speech: `Hello ${user.name}! I am DashMind, your intelligent workforce analytics assistant. How can I help you analyze attendance, productivity, work consistency, or leave approvals today?`,
        data: {
          text: `Hello **${user.name}**!\n\nI am **DashMind**, your dedicated professional AI analytics assistant. I can help you query, visualize, and generate reports on your workforce data in real time.\n\n**Try asking me questions like:**\n* "Who logged in late today?" (Managers/Admins)\n* "Show attendance trend for this month"\n* "Which team has lowest productivity?"\n* "Show my weekly performance graph"\n* "How many leaves are pending approval?"\n* "Generate attendance report"`
        }
      };
    }

    // 2. MY WEEKLY PERFORMANCE GRAPH (Available to everyone for their own data)
    if (isMyPerformance) {
      const logs = await ProductivityLog.findAll({
        where: {
          userId: user.id,
          date: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
          }
        },
        order: [['date', 'ASC']]
      });

      if (logs.length === 0) {
        return {
          authorized: true,
          type: 'text',
          speech: "I could not find any tracked productivity metrics for you over the last seven days.",
          data: { text: "No tracked productivity records available for the last 7 days. Make sure to clock in and work to record logs!" }
        };
      }

      const chartData = logs.map(l => ({
        date: l.date,
        activeMinutes: Math.round((l.activeMinutes || 0) * 10) / 10,
        idleMinutes: Math.round((l.idleMinutes || 0) * 10) / 10,
        totalInteractions: (l.clickCount || 0) + (l.keyCount || 0) + (l.scrollCount || 0)
      }));

      return {
        authorized: true,
        type: 'line',
        speech: "Here is your weekly work performance and active minutes graph. Your active tracking is rendered in green.",
        chartDetails: {
          xKey: 'date',
          lines: [
            { key: 'activeMinutes', name: 'Active Minutes', color: '#10b981' },
            { key: 'idleMinutes', name: 'Idle Minutes', color: '#64748b' }
          ]
        },
        data: chartData
      };
    }

    // 3. LATE LOGINS TODAY (RBAC restricted)
    if (isLateQuery) {
      const restriction = restrictEmployeeAccess();
      if (restriction) return restriction;

      // Late means checkIn time is greater than standard shiftTime (default '09:00 AM')
      const lateAttendances = await Attendance.findAll({
        where: {
          date: todayStr,
          userId: { [Op.in]: targetUserIds }
        },
        include: [{ model: User, as: 'user', attributes: ['name', 'employeeId', 'designation', 'shiftTime'] }]
      });

      const lateList = lateAttendances.filter(att => {
        if (!att.checkIn) return false;
        // Basic late threshold check: checkIn after standard shiftTime
        const checkInMin = parseTimeToMinutes(att.checkIn);
        const shiftMin = parseTimeToMinutes(att.user ? att.user.shiftTime : '09:00 AM');
        return checkInMin > shiftMin;
      });

      if (lateList.length === 0) {
        return {
          authorized: true,
          type: 'kpi',
          speech: "Outstanding! No employees reporting to you have logged in late today.",
          data: [
            { title: "Late Logins Today", value: "0", color: "emerald", description: "All employees checked in on time!" }
          ]
        };
      }

      const tableData = lateList.map(att => ({
        Employee: att.user.name,
        ID: att.user.employeeId,
        Designation: att.user.designation,
        'Shift Start': att.user.shiftTime,
        'Check-In': att.checkIn,
        Status: 'Late'
      }));

      return {
        authorized: true,
        type: 'table',
        speech: `${lateList.length} employees checked in late today. Displaying the list now.`,
        columns: ['Employee', 'ID', 'Designation', 'Shift Start', 'Check-In', 'Status'],
        data: tableData
      };
    }

    // 4. ABSENTEES TODAY (RBAC restricted)
    if (isAbsentQuery) {
      const restriction = restrictEmployeeAccess();
      if (restriction) return restriction;

      // Absentees means no attendance record today or status is 'Absent'
      const activeEmployees = await User.findAll({
        where: {
          id: { [Op.in]: targetUserIds },
          role: { [Op.ne]: 'admin' }
        },
        attributes: ['id', 'name', 'employeeId', 'designation', 'shiftTime']
      });

      const todayAttendances = await Attendance.findAll({
        where: { date: todayStr }
      });

      const checkedInUserIds = todayAttendances.map(a => a.userId);
      const absentList = activeEmployees.filter(emp => !checkedInUserIds.includes(emp.id));

      if (absentList.length === 0) {
        return {
          authorized: true,
          type: 'kpi',
          speech: "Great news! Every employee is present today. No absences recorded.",
          data: [
            { title: "Absentees Today", value: "0", color: "emerald", description: "100% attendance rate today!" }
          ]
        };
      }

      const tableData = absentList.map(emp => ({
        Employee: emp.name,
        ID: emp.employeeId,
        Designation: emp.designation,
        'Shift Time': emp.shiftTime,
        Status: 'Absent'
      }));

      return {
        authorized: true,
        type: 'table',
        speech: `${absentList.length} employees are absent today. Generating detail list.`,
        columns: ['Employee', 'ID', 'Designation', 'Shift Time', 'Status'],
        data: tableData
      };
    }

    // 5. PRODUCTIVITY INTENTS (Charts comparing team/individuals)
    if (isProductivityQuery) {
      const restriction = restrictEmployeeAccess();
      if (restriction) return restriction;

      const logs = await ProductivityLog.findAll({
        where: {
          date: todayStr,
          userId: { [Op.in]: targetUserIds }
        },
        include: [{ model: User, as: 'user', attributes: ['name', 'designation', 'teamId'] }]
      });

      if (logs.length === 0) {
        return {
          authorized: true,
          type: 'text',
          speech: "No active live sessions are currently logged for productivity comparison today.",
          data: { text: "No tracked sessions recorded today yet." }
        };
      }

      // Group logs by team/designation
      const groups = {};
      logs.forEach(l => {
        const key = l.user ? (l.user.designation || 'Staff') : 'Staff';
        if (!groups[key]) {
          groups[key] = { name: key, active: 0, idle: 0, count: 0 };
        }
        groups[key].active += parseFloat(l.activeMinutes || 0);
        groups[key].idle += parseFloat(l.idleMinutes || 0);
        groups[key].count += 1;
      });

      const chartData = Object.values(groups).map(g => {
        const total = g.active + g.idle;
        return {
          Team: g.name,
          'Productivity %': total > 0 ? Math.round((g.active / total) * 100) : 100,
          'Active Minutes': Math.round(g.active * 10) / 10
        };
      });

      // Sort to find the lowest
      chartData.sort((a, b) => a['Productivity %'] - b['Productivity %']);

      return {
        authorized: true,
        type: 'bar',
        speech: "Here is the live team productivity comparison. Displaying lowest to highest.",
        chartDetails: {
          xKey: 'Team',
          bars: [
            { key: 'Productivity %', color: '#10b981' }
          ]
        },
        data: chartData
      };
    }

    // 6. COMPARE WORK HOURS & OVERTIME INTENTS
    if (isHoursQuery) {
      const restriction = restrictEmployeeAccess();
      if (restriction) return restriction;

      const logs = await ProductivityLog.findAll({
        where: {
          date: todayStr,
          userId: { [Op.in]: targetUserIds }
        },
        include: [{ model: User, as: 'user', attributes: ['name'] }]
      });

      if (logs.length === 0) {
        return {
          authorized: true,
          type: 'text',
          speech: "No working hours recorded for any employee yet today.",
          data: { text: "No active session minutes tracked today." }
        };
      }

      const tableData = logs.map(l => {
        const act = parseFloat(l.activeMinutes || 0);
        const idl = parseFloat(l.idleMinutes || 0);
        const tot = act + idl;
        return {
          Employee: l.user ? l.user.name : 'Unknown',
          'Active Time (mins)': Math.round(act * 10) / 10,
          'Idle Time (mins)': Math.round(idl * 10) / 10,
          'Total Tracking (mins)': Math.round(tot * 10) / 10,
          Productivity: tot > 0 ? `${Math.round((act / tot) * 100)}%` : '100%'
        };
      });

      return {
        authorized: true,
        type: 'table',
        speech: "Here is the comparison table for currently logged working minutes.",
        columns: ['Employee', 'Active Time (mins)', 'Idle Time (mins)', 'Total Tracking (mins)', 'Productivity'],
        data: tableData
      };
    }

    // 7. PENDING LEAVES (KPI + Table)
    if (isLeavesQuery) {
      const queryOptions = {
        where: { status: 'Pending' },
        include: [{ model: User, as: 'user', attributes: ['name', 'employeeId', 'designation'] }]
      };

      if (user.role !== 'admin') {
        queryOptions.where.userId = { [Op.in]: targetUserIds };
      }

      const pendingLeaves = await Leave.findAll(queryOptions);

      if (pendingLeaves.length === 0) {
        return {
          authorized: true,
          type: 'kpi',
          speech: "All clear! You have zero pending leave requests requiring approval.",
          data: [
            { title: "Pending Leaves", value: "0", color: "emerald", description: "All leave requests processed!" }
          ]
        };
      }

      const tableData = pendingLeaves.map(l => ({
        Employee: l.user ? l.user.name : 'Unknown',
        Type: l.type,
        'From Date': l.fromDate.toISOString().slice(0, 10),
        'To Date': l.toDate.toISOString().slice(0, 10),
        Reason: l.reason,
        Status: 'Pending Approval'
      }));

      return {
        authorized: true,
        type: 'table',
        speech: `You have ${pendingLeaves.length} pending leave requests requiring approval.`,
        columns: ['Employee', 'Type', 'From Date', 'To Date', 'Reason', 'Status'],
        data: tableData
      };
    }

    // 8. GENERATE ATTENDANCE REPORT
    if (isAttendanceReport) {
      const queryOptions = {
        where: {
          userId: { [Op.in]: targetUserIds },
          date: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')
          }
        },
        include: [{ model: User, as: 'user', attributes: ['name', 'employeeId', 'designation'] }],
        order: [['date', 'DESC']],
        limit: 100
      };

      const attendanceLogs = await Attendance.findAll(queryOptions);

      if (attendanceLogs.length === 0) {
        return {
          authorized: true,
          type: 'text',
          speech: "I could not find any attendance logs in the system for the last thirty days.",
          data: { text: "No historical attendance records located." }
        };
      }

      const tableData = attendanceLogs.map(l => ({
        Employee: l.user ? l.user.name : 'Unknown',
        ID: l.user ? l.user.employeeId : '-',
        Date: l.date,
        Status: l.status,
        'Check-In': l.checkIn || '-',
        'Check-Out': l.checkOut || '-'
      }));

      return {
        authorized: true,
        type: 'table',
        speech: `Generated attendance report for the last thirty days containing ${attendanceLogs.length} entries.`,
        columns: ['Employee', 'ID', 'Date', 'Status', 'Check-In', 'Check-Out'],
        data: tableData
      };
    }

    // ==========================================
    // 9. AUTOMATIC SELF-LEARNING ADAPTIVE COMPILER
    // ==========================================
    
    // Step A: Detect target user dynamically by searching names in the User table
    const allUsers = await User.findAll({ attributes: ['id', 'name', 'employeeId'] });
    let matchedUser = null;
    for (const u of allUsers) {
      const nameParts = u.name.toLowerCase().split(/\s+/);
      // Check if the query contains any part of their name (first name / last name)
      if (nameParts.some(part => part.length > 2 && query.includes(part))) {
        matchedUser = u;
        break;
      }
    }

    // Step B: If no user is matched, default to the current logged-in user for self-inquiry
    const queryTargetUser = matchedUser || user;

    // Step C: Strict RBAC Privacy Validation for dynamic inquiries
    if (queryTargetUser.id !== user.id && user.role === 'employee') {
      return {
        authorized: false,
        type: 'text',
        speech: `Sorry, you are not authorized to access metrics for ${queryTargetUser.name}.`,
        data: { text: `Sorry, you are not authorized to access metrics for **${queryTargetUser.name}**.` }
      };
    }
    // Ensure TL/Managers are only querying members reporting to them
    if (queryTargetUser.id !== user.id && user.role !== 'admin') {
      if (!targetUserIds.includes(queryTargetUser.id)) {
        return {
          authorized: false,
          type: 'text',
          speech: `Sorry, you are not authorized to access information for ${queryTargetUser.name} as they are outside your reporting structure.`,
          data: { text: `Sorry, you are not authorized to access information for **${queryTargetUser.name}**.` }
        };
      }
    }

    // Step D: Detect Date Bounds dynamically
    let targetDateStr = todayStr;
    let timeframeLabel = "today";
    if (query.includes("yesterday")) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDateStr = yesterday.toLocaleDateString('en-CA');
      timeframeLabel = "yesterday";
    }

    // Step E: Match exact intent (e.g. logout time, login time, check-in, etc.)
    const isLogoutIntent = /\b(logout|log out|logoff|logged out|checked out|checkout)\b/.test(query);
    const isLoginIntent = /\b(login|log in|logon|logged in|checked in|checkin)\b/.test(query);
    const isAttendanceStatus = /\b(attendance|status|present|absent)\b/.test(query);

    if (isLogoutIntent) {
      const record = await Attendance.findOne({
        where: { userId: queryTargetUser.id, date: targetDateStr }
      });
      if (record && record.checkOut) {
        return {
          authorized: true,
          type: 'text',
          speech: `${queryTargetUser.name} logged out ${timeframeLabel} at ${record.checkOut}.`,
          data: {
            text: `### 🕒 Dynamic Logout Event Located\n\n* **Employee**: **${queryTargetUser.name}**\n* **Date / Timeframe**: ${timeframeLabel} (${targetDateStr})\n* **Logout Time**: **${record.checkOut}**\n* **Status**: Successfully Checked Out`
          }
        };
      } else {
        return {
          authorized: true,
          type: 'text',
          speech: `No logout log found for ${queryTargetUser.name} ${timeframeLabel}.`,
          data: {
            text: `No logout log recorded for **${queryTargetUser.name}** on **${targetDateStr}** (${timeframeLabel}). They may still be clocked in or did not check out.`
          }
        };
      }
    }

    if (isLoginIntent) {
      const record = await Attendance.findOne({
        where: { userId: queryTargetUser.id, date: targetDateStr }
      });
      if (record && record.checkIn) {
        return {
          authorized: true,
          type: 'text',
          speech: `${queryTargetUser.name} logged in ${timeframeLabel} at ${record.checkIn}.`,
          data: {
            text: `### 🕒 Dynamic Login Event Located\n\n* **Employee**: **${queryTargetUser.name}**\n* **Date / Timeframe**: ${timeframeLabel} (${targetDateStr})\n* **Login Time**: **${record.checkIn}**\n* **Status**: Present`
          }
        };
      } else {
        return {
          authorized: true,
          type: 'text',
          speech: `No login check-in found for ${queryTargetUser.name} ${timeframeLabel}.`,
          data: {
            text: `No check-in record located for **${queryTargetUser.name}** on **${targetDateStr}** (${timeframeLabel}).`
          }
        };
      }
    }

    if (isAttendanceStatus) {
      const record = await Attendance.findOne({
        where: { userId: queryTargetUser.id, date: targetDateStr }
      });
      const status = record ? record.status : 'Absent';
      return {
        authorized: true,
        type: 'text',
        speech: `${queryTargetUser.name}'s attendance status for ${timeframeLabel} is ${status}.`,
        data: {
          text: `### 📊 Dynamic Attendance Status\n\n* **Employee**: **${queryTargetUser.name}**\n* **Date**: ${targetDateStr} (${timeframeLabel})\n* **Status**: **${status}**`
        }
      };
    }

    // FALLBACK / REASONING AGENT RESPONSE
    return {
      authorized: true,
      type: 'text',
      speech: "I understand your query but need a little more detail. I can retrieve real-time tables, comparative line/bar charts, absentees, and pending approvals.",
      data: {
        text: `I understood your query: "${queryText}"\n\nTo give you the most exact corporate visualization, please try phrasing it like:\n* "Who is absent today?"\n* "Who logged in late today?"\n* "Show my weekly performance graph"\n* "Leaves pending approval"`
      }
    };

  } catch (error) {
    console.error('DashMind Analytics Engine Failure:', error);
    return {
      authorized: true,
      type: 'text',
      speech: "I encountered an database processing error while compiling your analytics report.",
      data: { text: `Error: ${error.message}` }
    };
  }
};

// Auxiliary parsing helpers
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};
