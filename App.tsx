import React, { useState, useEffect } from 'react';
import DesktopLayout from './components/DesktopLayout';
import MobileLayout from './components/MobileLayout';

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [zoomLevel, setZoomLevel] = useState(1);

  // --- SMART ZOOM LOGIC ---
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      let newZoom = 1.0; // Default 100%

      if (width <= 480) {
          // කුඩා ෆෝන් සඳහා: 85% (15% reduction)
          // මෙය මගින් තිරයේ වැඩි විස්තර ප්‍රමාණයක් පෙන්වයි.
          newZoom = 0.85; 
      } else if (width <= 1024) {
          // ටැබ්ලට් සහ ලොකු ෆෝන්: 90% (10% reduction)
          newZoom = 0.90;
      } else if (width <= 1440) {
          // ලැප්ටොප්: 95% (5% reduction)
          newZoom = 0.95;
      } else {
          // ලොකු මොනිටර්: 100% (No reduction)
          newZoom = 1.0;
      }

      setZoomLevel(newZoom);
      setIsMobile(width < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    // මුළු ඇප් එකම මෙම div එක තුල zoom වේ
    // (any) type casting භාවිතා කර ඇත්තේ zoom property එක TS වල සම්මත නොවන නිසාය
    <div style={{ zoom: zoomLevel, width: '100%', height: '100%' } as any}>
       {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </div>
  );
};

export default App;