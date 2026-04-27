import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Acknowledgement from '../models/Acknowledgement.js';
import { Op } from 'sequelize';

export const sendNotification = async (req, res) => {
  try {
    const { title, message, type, target, selectedUsers } = req.body;
    const senderId = req.user.id;

    if (target === 'everyone') {
      // Create one global notification record
      await Notification.create({ title, message, type, senderId, targetRole: 'all' });
    } else if (target === 'team') {
      // Create one team notification record
      await Notification.create({ title, message, type, senderId, targetRole: 'team' });
    } else if (target === 'selective' && selectedUsers?.length > 0) {
      // Create individual records for each selected user
      const notifications = selectedUsers.map(userId => ({
        title, message, type, senderId, receiverId: userId, targetRole: 'selective'
      }));
      await Notification.bulkCreate(notifications);
    }

    res.status(201).json({ message: 'Notification(s) sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const managerId = req.user.managerId;

    const notifications = await Notification.findAll({
      where: {
        [Op.or]: [
          { receiverId: userId },
          { targetRole: 'all' },
          { [Op.and]: [{ targetRole: 'team' }, { senderId: managerId }] }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['name', 'role'] },
        { 
          model: Acknowledgement, 
          as: 'acknowledgements', 
          where: { userId }, 
          required: false 
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { senderId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const acknowledgeNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const existing = await Acknowledgement.findOne({ where: { notificationId, userId } });
    if (existing) return res.status(400).json({ message: 'Already acknowledged' });

    await Acknowledgement.create({ notificationId, userId });
    
    // Also mark the notification as read for this user if it was a direct one
    const notification = await Notification.findByPk(notificationId);
    if (notification && notification.receiverId === userId) {
      notification.isRead = true;
      await notification.save();
    }

    res.status(201).json({ message: 'Acknowledged' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getNotificationStats = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const acks = await Acknowledgement.findAll({
      where: { notificationId },
      include: [{ model: User, attributes: ['name', 'role', 'employeeId'] }]
    });
    res.json(acks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
      res.json({ message: 'Marked as read' });
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
