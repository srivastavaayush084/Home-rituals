import { ZoomIn } from 'lucide-react';
import { useState } from 'react';

type ImageZoomProps = {
  src: string;
  alt: string;
  className?: string;
};

export function ImageZoom({ src, alt, className = '' }: ImageZoomProps) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-[24px]">
      <img src={src} alt={alt} className={`${className} transition duration-500 ${zoomed ? 'scale-110' : 'scale-100'}`} />
      <button onClick={() => setZoomed((current) => !current)} className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-black shadow-sm backdrop-blur">
        <ZoomIn size={16} />
      </button>
    </div>
  );
}

