import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Preloader: React.FC = () => {
  const [show, setShow] = useState(() => {
    // Check session storage immediately on initial render to prevent layout flash
    return !sessionStorage.getItem('homerituals-video-preloaded');
  });

  const [videoSrc] = useState(() => `/preloader.mp4?v=${Date.now()}`);

  useEffect(() => {
    if (!show) return;

    // Backup safety timeout to fade out after 6 seconds in case onEnded is delayed
    const timer = setTimeout(() => {
      handleFadeOut();
    }, 6000);

    return () => clearTimeout(timer);
  }, [show]);

  const handleFadeOut = () => {
    setShow(false);
    sessionStorage.setItem('homerituals-video-preloaded', 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FAF8F5]"
        >
          <video
            src={videoSrc}
            autoPlay
            muted
            playsInline
            onEnded={handleFadeOut}
            className="w-full h-full object-cover"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
