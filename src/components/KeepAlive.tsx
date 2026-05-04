import { useEffect } from 'react';

/**
 * Component that pings the backend periodically to prevent Render from spinning down
 * while the user has the application open.
 */
const KeepAlive = () => {
  useEffect(() => {
    // Ping every 4 minutes (Render Free spins down after 15 mins of inactivity)
    const INTERVAL_MS = 4 * 60 * 1000;
    
    const pingBackend = async () => {
      try {
        let apiUrl = import.meta.env.VITE_API_URL || 'https://wa-companion.onrender.com';
        // Clean URL: remove trailing slashes or dots
        apiUrl = apiUrl.replace(/[\/\.]+$/, '');
        
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          // Use mode 'no-cors' if we just want to trigger activity without needing the response body
          // But here we'll use normal fetch as /health should support CORS
          mode: 'cors',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (response.ok) {
          console.debug('[KeepAlive] 💓 Backend heartbeat successful');
        }
      } catch (error) {
        console.warn('[KeepAlive] 💔 Backend heartbeat failed:', error);
      }
    };

    // Initial ping
    pingBackend();

    // Set up interval
    const interval = setInterval(pingBackend, INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
};

export default KeepAlive;
