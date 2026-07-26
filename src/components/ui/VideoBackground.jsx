import { useRef, useEffect } from 'react';

export default function VideoBackground() {
  const videoRef = useRef(null);

  useEffect(() => {
    // Ensure video plays
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay may be blocked, fallback to poster
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster="/stock-photo-bengal-tiger.webp"
      className="fixed inset-0 w-full h-full object-cover z-[-2]"
      src="/background.mp4"
    >
      {/* Fallback for browsers that can't play video */}
      <img
        src="/stock-photo-bengal-tiger.webp"
        alt="Background"
        className="fixed inset-0 w-full h-full object-cover"
      />
    </video>
  );
}

