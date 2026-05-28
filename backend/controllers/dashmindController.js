import { processDashMindQuery } from '../services/dashmindService.js';

/**
 * DashMind Intelligence Controller
 */
export const queryDashMind = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: 'Query string is required.' });
    }

    const response = await processDashMindQuery(query, req.user);
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
