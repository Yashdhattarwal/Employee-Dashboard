import { useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const useActivityTracker = () => {
  const { user } = useContext(AuthContext);
  const workerRef = useRef(null);

  // Interaction logs (refs to avoid re-triggering effects)
  const clickCount = useRef(0);
  const keyCount = useRef(0);
  const scrollCount = useRef(0);
  const movementCount = useRef(0);
  const lastMoveTime = useRef(Date.now());
  const lastScrollTime = useRef(Date.now());

  // System-wide active state track (fallback to true initially)
  const isSystemActive = useRef(true);

  useEffect(() => {
    // 1. Only run tracking for logged-in, non-admin users
    if (!user || user.role === 'admin') {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
        workerRef.current = null;
      }
      return;
    }

    // --- SYSTEM WIDE IDLE DETECTION (Chrome/Edge IdleDetector API) ---
    let idleDetector = null;
    const initIdleDetector = async () => {
      if ('IdleDetector' in window) {
        try {
          const state = await IdleDetector.requestPermission();
          if (state === 'granted') {
            idleDetector = new IdleDetector();
            idleDetector.addEventListener('change', () => {
              // 'active' means user is actively interacting with their laptop (Word, Excel, anything!)
              isSystemActive.current = idleDetector.userState === 'active';
            });
            await idleDetector.start({
              threshold: 60000 // Minimum allowed threshold is 60 seconds
            });
          }
        } catch (err) {
          console.warn('System-wide IdleDetector failed to initialize:', err);
        }
      }
    };
    
    initIdleDetector();

    // --- LOCAL BROWSER WINDOW INTERACTION LISTENERS ---
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveTime.current > 100) {
        movementCount.current += 1;
        lastMoveTime.current = now;
      }
      // If we move inside the browser tab, we are definitely active
      isSystemActive.current = true;
    };

    const handleKeyDown = () => {
      keyCount.current += 1;
      isSystemActive.current = true;
    };

    const handleClick = () => {
      clickCount.current += 1;
      isSystemActive.current = true;
    };

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTime.current > 150) {
        scrollCount.current += 1;
        lastScrollTime.current = now;
      }
      isSystemActive.current = true;
    };

    // Attach local events
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('click', handleClick, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    // --- UN-THROTTLED INLINE WEB WORKER HEARTBEAT ---
    const workerCode = `
      let timer = null;
      self.onmessage = (e) => {
        if (e.data === 'start') {
          if (timer) clearInterval(timer);
          timer = setInterval(() => {
            self.postMessage('tick');
          }, 15000);
        } else if (e.data === 'stop') {
          if (timer) clearInterval(timer);
          timer = null;
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    workerRef.current = worker;

    worker.onmessage = async (e) => {
      if (e.data === 'tick') {
        try {
          const hasLocalActivity = (clickCount.current + keyCount.current + scrollCount.current + movementCount.current) > 0;
          
          // If the tab is visible/focused, or we detected local interactions, or system idle detector reports active
          const activeFlag = hasLocalActivity || (document.hasFocus() && document.visibilityState === 'visible') || isSystemActive.current;

          const payload = {
            currentPage: window.location.pathname || 'Home',
            clicks: clickCount.current,
            keys: keyCount.current,
            scrolls: scrollCount.current,
            movements: movementCount.current,
            isSystemActive: activeFlag
          };

          // Reset counts immediately
          clickCount.current = 0;
          keyCount.current = 0;
          scrollCount.current = 0;
          movementCount.current = 0;

          await axios.post('/api/productivity/heartbeat', payload, { withCredentials: true });
        } catch (err) {
          console.warn('Background heartbeat failed:', err.message);
        }
      }
    };

    worker.postMessage('start');

    return () => {
      // Cleanup events
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);

      // Cleanup worker
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [user]);
};

export default useActivityTracker;
