import React, { useState, useEffect } from 'react';
import { UserData } from './AuthContext'; // එකම ෆෝල්ඩරයේ (context) ඇති නිසා ./

// Dashboard එක context ෆෝල්ඩරයේ නිසා components ගැනීමට ../ භාවිතා කරයි
import DesktopLayout from '../components/DesktopLayout';
import MobileLayout from '../components/MobileLayout';

interface DashboardProps {
  user: UserData; 
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [zoomLevel, setZoomLevel] = useState(1);

  // --- SMART ZOOM LOGIC ---
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      let newZoom = 1.0; 

      if (width <= 480) {
          newZoom = 0.85; 
      } else if (width <= 1024) {
          newZoom = 0.90;
      } else if (width <= 1440) {
          newZoom = 0.95;
      } else {
          newZoom = 1.0;
      }

      setZoomLevel(newZoom);
      setIsMobile(width < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); 

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  
  return (
    <div className="w-full h-screen">
       {isMobile ? 
          <MobileLayout user={user} /> : 
          <DesktopLayout user={user} />
       }
    </div>
  );

};

export default Dashboard;