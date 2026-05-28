import { useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useActivityTracker = () => {
  const { user } = useContext(AuthContext);
  const intervalRef = useRef(null);

  // Interaction logs (refs to avoid re-triggering effects)
  const clickCount = useRef(0);
  const keyCount = useRef(0);
  const scrollCount = useRef(0);
  const movementCount = useRef(0);
  const lastMoveTime = useRef(Date.now());
  const lastScrollTime = useRef(Date.now());

  useEffect(() => {
    // 1. Only run tracking for logged-in, non-admin users
    if (!user || user.role === 'admin') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Event listeners
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveTime.current > 100) { // Throttle mousemove to 100ms
        movementCount.current += 1;
        lastMoveTime.current = now;
      }
    };

    const handleKeyDown = () => {
      keyCount.current += 1;
    };

    const handleClick = () => {
      clickCount.current += 1;
    };

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime.current > 150) { // Throttle scroll to 150ms
        scrollCount.current += 1;
        lastScrollTime.current = now;
      }
    };

    // Attach listeners
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 2. Start heartbeat interval every 15 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const isAway = document.visibilityState === 'hidden' || !document.hasFocus();
        const payload = {
          currentPage: window.location.pathname || 'Home',
          clicks: clickCount.current,
          keys: keyCount.current,
          scrolls: scrollCount.current,
          movements: movementCount.current,
          isAway
        };

        // Reset counts immediately to prevent race conditions during async post
        clickCount.current = 0;
        keyCount.current = 0;
        scrollCount.current = 0;
        movementCount.current = 0;

        await axios.post('/api/productivity/heartbeat', payload, { withCredentials: true });
      } catch (err) {
        // Silent catch to prevent console clutter during network switches/disconnects
        console.warn('Activity tracker heartbeat failed:', err.message);
      }
    }, 15000);

    return () => {
      // Cleanup
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);
};

export default useActivityTracker;
