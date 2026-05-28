import User from '../models/User.js';
import UserSessionLog from '../models/UserSessionLog.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const lowerEmail = email.toLowerCase();
    const user = await User.findOne({ 
      where: { email: lowerEmail },
      include: [{ model: User, as: 'manager', attributes: ['name'] }]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.activeStatus) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Log Session
      try {
        const uaString = req.headers['user-agent'] || '';
        const ua = uaString.toLowerCase();
        let device = 'Desktop';
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

        await UserSessionLog.create({
          userId: user.id,
          deviceType: device,
          browserName: browser,
          osName: os,
          loginTime: new Date()
        });
      } catch (err) {
        console.error('Session logging failed:', err.message);
      }

      const token = generateToken(res, user.id);
      res.json({
        _id: user.id, // Keep _id for frontend compatibility
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        designation: user.designation,
        employmentType: user.employmentType,
        managerName: user.manager?.name || 'N/A',
        firstTimeLogin: user.firstTimeLogin,
        shiftTime: user.shiftTime,
        timezone: user.timezone,
        token
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logoutUser = async (req, res) => {
  try {
    if (req.user) {
      const activeSession = await UserSessionLog.findOne({
        where: { userId: req.user.id, logoutTime: null },
        order: [['loginTime', 'DESC']]
      });
      if (activeSession) {
        activeSession.logoutTime = new Date();
        await activeSession.save();
      }
    }
  } catch (err) {
    console.error('Logout logging failed:', err.message);
  }

  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'User logged out' });
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (user && (await bcrypt.compare(oldPassword, user.password))) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.firstTimeLogin = false;
      await user.save();
      res.json({ message: 'Password updated successfully' });
    } else {
      res.status(401).json({ message: 'Invalid old password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
