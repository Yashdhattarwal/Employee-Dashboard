import { Op } from 'sequelize';
import ProductivityLog from '../models/ProductivityLog.js';
import UserSessionLog from '../models/UserSessionLog.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Break from '../models/Break.js';

// Parse User-Agent helper
const parseUserAgent = (uaString) => {
  if (!uaString) return { device: 'Desktop', browser: 'Chrome', os: 'Windows' };
  
  let device = 'Desktop';
  const ua = uaString.toLowerCase();
  if (/mobi|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    device = /ipad|tablet/i.test(ua) ? 'Tablet' : 'Mobile';
  }
  
  let browser = 'Chrome';
  if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  
  let os = 'Windows';
  if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';
  
  return { device, browser, os };
};

/**
 * Handle heartbeat checks from employees.
 * Throttled to send every 15 seconds.
 */
export const sendHeartbeat = async (req, res) => {
  try {
    const userId = req.user.id;
    const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
    
    // 1. Strict constraint: only track when clocked in!
    const attendance = await Attendance.findOne({
      where: { 
        userId, 
        date: todayStr,
        checkIn: { [Op.ne]: null },
        checkOut: null
      }
    });

    if (!attendance) {
      return res.status(200).json({ 
        trackingActive: false, 
        message: 'Tracking inactive because employee is not clocked in' 
      });
    }

    const { currentPage, clicks = 0, keys = 0, scrolls = 0, movements = 0 } = req.body;

    // Detect device, browser, OS
    const uaString = req.headers['user-agent'] || '';
    const { device, browser, os } = parseUserAgent(uaString);

    // 2. Find or create daily productivity log
    let [log, created] = await ProductivityLog.findOrCreate({
      where: { userId, date: todayStr },
      defaults: {
        userId,
        date: todayStr,
        deviceType: device,
        browserName: browser,
        osName: os,
        liveStatus: 'Active',
        lastHeartbeat: new Date()
      }
    });

    // 3. Accumulate interaction metrics & update actual browser/OS details
    log.deviceType = device;
    log.browserName = browser;
    log.osName = os;

    log.clickCount = (log.clickCount || 0) + parseInt(clicks, 10);
    log.keyCount = (log.keyCount || 0) + parseInt(keys, 10);
    log.scrollCount = (log.scrollCount || 0) + parseInt(scrolls, 10);
    log.movementCount = (log.movementCount || 0) + parseInt(movements, 10);
    
    if (currentPage) {
      log.currentPage = currentPage;
    }

    // 4. Calculate new live status: Active if laptop actively used (locally or system-wide), else Idle
    let status = 'Active';
    const totalInteractions = parseInt(clicks, 10) + parseInt(keys, 10) + parseInt(scrolls, 10) + parseInt(movements, 10);
    
    const isClientSystemActive = req.body.isSystemActive === true || req.body.isSystemActive === 'true';

    if (totalInteractions === 0 && !isClientSystemActive) {
      status = 'Idle';
    }

    log.liveStatus = status;
    log.lastHeartbeat = new Date();

    // Increment minutes
    if (status === 'Active') {
      log.activeMinutes = (log.activeMinutes || 0) + 0.25;
    } else {
      log.idleMinutes = (log.idleMinutes || 0) + 0.25;
    }

    await log.save();

    res.json({ 
      trackingActive: true, 
      liveStatus: status, 
      activeMinutes: log.activeMinutes, 
      idleMinutes: log.idleMinutes 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get currently active employees live tracking feed.
 * Accessible to Admin users only.
 */
export const getLiveMonitoring = async (req, res) => {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA');

    // Fetch only employees (non-admin role) who are currently clocked in
    const employees = await User.findAll({
      where: { 
        role: { [Op.ne]: 'admin' }
      },
      attributes: ['id', 'name', 'employeeId', 'designation', 'employmentType', 'profilePhoto', 'timezone'],
      include: [
        {
          model: Attendance,
          as: 'attendances',
          where: { 
            date: todayStr,
            checkIn: { [Op.ne]: null },
            checkOut: null
          },
          required: true // Strict filter for clocked-in users only
        },
        {
          model: ProductivityLog,
          as: 'productivityLogs',
          where: { date: todayStr },
          required: false
        }
      ]
    });

    const now = new Date();
    const liveFeed = await Promise.all(employees.map(async (emp) => {
      const att = emp.attendances && emp.attendances[0];
      let prod = emp.productivityLogs && emp.productivityLogs[0];

      let computedStatus = 'Away';
      let lastActive = null;
      let checkInTime = att ? att.checkIn : '-';

      if (prod) {
        lastActive = prod.lastHeartbeat;
        const secondsSinceHeartbeat = (now - new Date(prod.lastHeartbeat)) / 1000;
        if (secondsSinceHeartbeat <= 45) {
          computedStatus = prod.liveStatus;
        } else {
          computedStatus = 'Away'; // Laptop is off
          if (prod.liveStatus !== 'Away') {
            prod.liveStatus = 'Away';
            await prod.save();
          }
        }
      } else {
        // Query the latest login session log to get the real device, OS, and browser from login!
        const latestSession = await UserSessionLog.findOne({
          where: { userId: emp.id },
          order: [['loginTime', 'DESC']]
        });

        computedStatus = 'Away'; // No heartbeat yet, laptop is off
        prod = await ProductivityLog.create({
          userId: emp.id,
          date: todayStr,
          liveStatus: 'Away',
          activeMinutes: 0,
          idleMinutes: 0,
          deviceType: latestSession ? latestSession.deviceType : 'Desktop',
          browserName: latestSession ? latestSession.browserName : 'Chrome',
          osName: latestSession ? latestSession.osName : 'Windows',
          currentPage: 'Home',
          lastHeartbeat: new Date()
        });
      }

      const activeMin = prod ? parseFloat(prod.activeMinutes || 0) : 0;
      const idleMin = prod ? parseFloat(prod.idleMinutes || 0) : 0;
      const totalSession = activeMin + idleMin;
      const prodPercentage = totalSession > 0 ? Math.round((activeMin / totalSession) * 100) : 100;

      return {
        id: emp.id,
        name: emp.name,
        employeeId: emp.employeeId,
        profilePhoto: emp.profilePhoto,
        designation: emp.designation,
        timezone: emp.timezone || 'IST',
        status: computedStatus,
        clockInTime: checkInTime,
        lastActive: lastActive,
        currentPage: prod ? prod.currentPage : 'Home',
        deviceType: prod ? prod.deviceType : 'Desktop',
        browserName: prod ? prod.browserName : 'Chrome',
        osName: prod ? prod.osName : 'Windows',
        activeMinutes: Math.round(activeMin * 10) / 10,
        idleMinutes: Math.round(idleMin * 10) / 10,
        totalSessionMinutes: Math.round(totalSession * 10) / 10,
        productivityPercentage: prodPercentage
      };
    }));

    res.json(liveFeed);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Detailed employee productivity analytics.
 * Accessible to Admin users only.
 */
export const getDetailedAnalytics = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'employeeId', 'designation', 'profilePhoto', 'timezone', 'employmentType']
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const todayStr = new Date().toLocaleDateString('en-CA');

    // Auto-close stale sessions (browser or tab closed means session end)
    const activeSessions = await UserSessionLog.findAll({
      where: { userId, logoutTime: null }
    });

    if (activeSessions.length > 0) {
      const prodLog = await ProductivityLog.findOne({
        where: { userId, date: todayStr }
      });
      const now = new Date();
      let shouldClose = false;
      let closeTime = now;

      if (prodLog) {
        const secondsSinceHeartbeat = (now - new Date(prodLog.lastHeartbeat)) / 1000;
        if (secondsSinceHeartbeat > 45) {
          shouldClose = true;
          closeTime = prodLog.lastHeartbeat;
        }
      } else {
        // No heartbeat record today at all, close it
        shouldClose = true;
      }

      if (shouldClose) {
        await UserSessionLog.update(
          { logoutTime: closeTime },
          { where: { userId, logoutTime: null } }
        );
      }
    }

    // 1. Session logs
    const sessionLogs = await UserSessionLog.findAll({
      where: { userId },
      order: [['loginTime', 'DESC']],
      limit: 15
    });

    // 2. Attendance & Breaks (breaks during today)
    const todayAttendance = await Attendance.findOne({
      where: { userId, date: todayStr },
      include: [{ model: Break, as: 'breaks' }]
    });

    // 3. Historical logs (last 30 days)
    const historicalLogs = await ProductivityLog.findAll({
      where: { userId },
      order: [['date', 'ASC']],
      limit: 30
    });

    // Calculations
    let totalActiveMins = 0;
    let totalIdleMins = 0;
    let totalClicks = 0;
    let totalKeys = 0;

    historicalLogs.forEach(log => {
      totalActiveMins += parseFloat(log.activeMinutes || 0);
      totalIdleMins += parseFloat(log.idleMinutes || 0);
      totalClicks += log.clickCount || 0;
      totalKeys += log.keyCount || 0;
    });

    const historicalData = historicalLogs.map(log => {
      const active = parseFloat(log.activeMinutes || 0);
      const idle = parseFloat(log.idleMinutes || 0);
      const total = active + idle;
      return {
        date: log.date,
        activeMinutes: Math.round(active),
        idleMinutes: Math.round(idle),
        productivityScore: total > 0 ? Math.round((active / total) * 100) : 100,
        interactions: (log.clickCount || 0) + (log.keyCount || 0) + (log.scrollCount || 0)
      };
    });

    // Work consistency score (simple variance algorithm)
    const totalDays = historicalData.length;
    let consistencyScore = 80; // Baseline
    if (totalDays > 1) {
      const scores = historicalData.map(d => d.productivityScore);
      const mean = scores.reduce((s, x) => s + x, 0) / totalDays;
      const variance = scores.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / totalDays;
      const stdDev = Math.sqrt(variance);
      consistencyScore = Math.max(40, Math.min(100, Math.round(100 - (stdDev * 1.8))));
    }

    res.json({
      user,
      sessionLogs,
      todayAttendance,
      historicalSummary: {
        totalActiveMinutes: Math.round(totalActiveMins),
        totalIdleMinutes: Math.round(totalIdleMins),
        averageProductivity: (totalActiveMins + totalIdleMins) > 0 
          ? Math.round((totalActiveMins / (totalActiveMins + totalIdleMins)) * 100) 
          : 100,
        clickCount: totalClicks,
        keyCount: totalKeys,
        workConsistencyScore: consistencyScore
      },
      historicalData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Aggregated device and login analytics.
 * Accessible to Admin users only.
 */
export const getDeviceStats = async (req, res) => {
  try {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const logs = await ProductivityLog.findAll({
      where: { date: todayStr },
      attributes: ['deviceType', 'browserName', 'osName', 'userId']
    });

    // Device counts
    const devices = { Mobile: 0, Tablet: 0, Desktop: 0 };
    const browsers = {};
    const osTypes = {};

    logs.forEach(log => {
      devices[log.deviceType] = (devices[log.deviceType] || 0) + 1;
      browsers[log.browserName] = (browsers[log.browserName] || 0) + 1;
      osTypes[log.osName] = (osTypes[log.osName] || 0) + 1;
    });

    // Multiple simultaneous logins check (same user logging in on multiple devices within past hour)
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const activeSessions = await UserSessionLog.findAll({
      where: {
        loginTime: { [Op.gte]: oneHourAgo },
        logoutTime: null
      },
      include: [{ model: User, as: 'user', attributes: ['name', 'employeeId'] }]
    });

    res.json({
      deviceStats: {
        devices,
        browsers,
        osTypes
      },
      activeSessions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Export productivity records.
 * Accessible to Admin users only.
 */
export const exportProductivityReports = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const userWhere = {};
    if (department) {
      userWhere.designation = department; // We map department to designation in current model
    }

    const logs = await ProductivityLog.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        where: userWhere,
        attributes: ['name', 'employeeId', 'designation', 'timezone']
      }],
      order: [['date', 'DESC']]
    });

    const exportData = logs.map(log => {
      const active = parseFloat(log.activeMinutes || 0);
      const idle = parseFloat(log.idleMinutes || 0);
      const total = active + idle;
      const score = total > 0 ? Math.round((active / total) * 100) : 100;
      
      return {
        Date: log.date,
        Employee: log.user?.name || 'N/A',
        EmployeeID: log.user?.employeeId || 'N/A',
        Department: log.user?.designation || 'N/A',
        Timezone: log.user?.timezone || 'IST',
        ActiveHours: Math.round((active / 60) * 100) / 100,
        IdleHours: Math.round((idle / 60) * 100) / 100,
        ProductivityPercentage: score,
        Clicks: log.clickCount,
        Keys: log.keyCount,
        Browser: log.browserName,
        OS: log.osName,
        Device: log.deviceType
      };
    });

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get aggregated productivity trend metrics for Admin Dashboard
 * timeline: daily, weekly, monthly
 */
export const getDashboardTrend = async (req, res) => {
  try {
    const { employeeId, timeline = 'daily' } = req.query;

    const where = {};
    if (employeeId && employeeId !== 'all') {
      where.userId = employeeId;
    }

    const logs = await ProductivityLog.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['name', 'employeeId']
      }],
      order: [['date', 'ASC']]
    });

    const grouped = {};
    logs.forEach(log => {
      let key = log.date;
      if (timeline === 'weekly') {
        const d = new Date(log.date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));
        key = `Week of ${startOfWeek.toISOString().slice(5, 10)}`; // MM-DD format for labels
      } else if (timeline === 'monthly') {
        key = log.date.slice(0, 7); // YYYY-MM
      }

      if (!grouped[key]) {
        grouped[key] = {
          label: key,
          activeMinutes: 0,
          idleMinutes: 0,
          total: 0
        };
      }

      grouped[key].activeMinutes += parseFloat(log.activeMinutes || 0);
      grouped[key].idleMinutes += parseFloat(log.idleMinutes || 0);
    });

    const data = Object.values(grouped).map(item => {
      const active = Math.round(item.activeMinutes);
      const idle = Math.round(item.idleMinutes);
      const total = active + idle;
      return {
        label: item.label,
        active: active,
        idle: idle,
        productivityPercentage: total > 0 ? Math.round((active / total) * 100) : 100
      };
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
