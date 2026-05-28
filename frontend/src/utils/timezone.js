/**
 * Converts a UTC/ISO timestamp to the user's preferred timezone (IST or EST)
 * and appends the timezone label.
 *
 * @param {string} isoString - Absolute ISO timestamp
 * @param {string} fallbackString - Original server clock time (e.g. "09:00 AM")
 * @param {string} userTimezone - Logged-in user's timezone preference ("IST" or "EST")
 */
export const convertToUserTimezone = (isoString, fallbackString, userTimezone = 'IST') => {
  if (!isoString) {
    if (!fallbackString || fallbackString === '--:--' || fallbackString === '-') return fallbackString || '-';
    return `${fallbackString} (IST)`;
  }

  const tz = userTimezone === 'EST' ? 'America/New_York' : 'Asia/Kolkata';
  const label = userTimezone === 'EST' ? 'EST' : 'IST';
  
  try {
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) return fallbackString || '-';
    
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return `${timeStr} (${label})`;
  } catch (err) {
    console.error('Error converting timezone:', err);
    return fallbackString || '-';
  }
};

/**
 * Converts a standard clock time string (assumed to be in IST)
 * to the user's preferred timezone (IST or EST).
 *
 * @param {string} clockTimeStr - Original clock time (e.g. "09:00 AM")
 * @param {string} userTimezone - Logged-in user's timezone preference ("IST" or "EST")
 */
export const convertClockTimeToUserTimezone = (clockTimeStr, userTimezone = 'IST') => {
  if (!clockTimeStr || clockTimeStr === '--:--' || clockTimeStr === '-') return clockTimeStr || '-';
  if (userTimezone === 'IST') return `${clockTimeStr} (IST)`;
  
  try {
    const cleanT = clockTimeStr.replace(/(AM|PM)/gi, '').trim();
    const parts = cleanT.split(':');
    if (parts.length < 2) return `${clockTimeStr} (IST)`;
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (clockTimeStr.toUpperCase().includes('PM') && h < 12) h += 12;
    if (clockTimeStr.toUpperCase().includes('AM') && h === 12) h = 0;
    
    // Construct date relative to today in India (IST)
    const now = new Date();
    // India is UTC + 5.5 hours. Get the midnight in UTC of today
    const indiaDateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' });
    const d = new Date(indiaDateStr);
    d.setHours(h, m, 0, 0);
    
    // Shift from IST (UTC+5.5) back to absolute UTC timestamp
    const utcMs = d.getTime() - (5.5 * 60 * 60 * 1000);
    
    // Format to America/New_York (EST/EDT)
    const estTimeStr = new Date(utcMs).toLocaleTimeString('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    return `${estTimeStr} (EST)`;
  } catch (err) {
    console.error('Error converting clock time:', err);
    return `${clockTimeStr} (IST)`;
  }
};
