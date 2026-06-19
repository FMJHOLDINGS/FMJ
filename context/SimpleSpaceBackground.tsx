import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const SimpleSpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- 1. CANVAS BASED STARS (High Performance) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: any[] = [];


    
    let lastWidth = window.innerWidth; 
    
    const handleResize = () => {
      
      if (window.innerWidth !== lastWidth || stars.length === 0) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        lastWidth = window.innerWidth;
        initStars();

      } else {
        canvas.height = window.innerHeight;
      }
    };





    // තරු නිර්මාණය කිරීම (Data Only)
    const initStars = () => {
      const starCount = window.innerWidth < 768 ? 100 : 200; // Mobile වලට අඩුවෙන්
      stars = [];
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5, // තරුවේ ප්‍රමාණය
          alpha: Math.random(), // දීප්තිය
          speed: Math.random() * 0.05 + 0.02, // පාවෙන වේගය
          twinkleSpeed: Math.random() * 0.02 + 0.005, // නිවී දැල්වෙන වේගය
          twinkleDir: 1 // 1 = දැල්වෙනවා, -1 = නිවෙනවා
        });
      }
    };

    
    // Animation Loop (60 FPS Smooth)
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        // 1. Move Star Up (Parallax Drift)
        star.y -= star.speed;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }

        // 2. Twinkle Logic
        star.alpha += star.twinkleSpeed * star.twinkleDir;
        if (star.alpha > 1) { star.alpha = 1; star.twinkleDir = -1; }
        if (star.alpha < 0.2) { star.alpha = 0.2; star.twinkleDir = 1; }

        // 3. Draw Star
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.shadowBlur = star.radius * 2;
        ctx.shadowColor = "white";
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    // Initialize
    handleResize();
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // --- 2. OPTIMIZED BLOB ANIMATIONS ---
  const blobVariants = {
    animate: {
      scale: [1, 1.2, 0.9, 1.1, 1],
      x: [0, 50, -30, 20, 0],
      y: [0, -30, 50, -20, 0],
      opacity: [0.3, 0.5, 0.3, 0.6, 0.3],
      transition: {
        duration: 20,
        // ✅ FIX: "as const" එකතු කිරීම මගින් TypeScript දෝෂය මගහැරේ
        ease: "easeInOut" as const, 
        repeat: Infinity,
        repeatType: "mirror" as const
      }
    }
  };

  return (
    <div className="absolute inset-0 -z-10 bg-[#020617] overflow-hidden">
      
      {/* A. Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#02040a] via-[#070b1c] to-[#0d061f]" />

      {/* B. High Performance Canvas Stars */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 opacity-80"
      />

      {/* C. Optimized Nebulas (With will-change for performance) */}
      <motion.div 
        variants={blobVariants} animate="animate"
        className="absolute top-1/4 -left-1/4 w-[70%] h-[70%] bg-indigo-700/20 rounded-full blur-[60px] mix-blend-screen will-change-transform"
      />
      <motion.div 
        variants={blobVariants} animate="animate"
        className="absolute bottom-0 right-0 w-[60%] h-[60%] bg-violet-800/20 rounded-full blur-[70px] mix-blend-screen will-change-transform"
        style={{ animationDelay: '-5s' }}
      />
      
      {/* D. Lightweight Noise Overlay (Replaces heavy SVG filter) */}
      <div 
        className="absolute inset-0 z-50 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`
        }}
      />

    </div>
  );
};

export default SimpleSpaceBackground;