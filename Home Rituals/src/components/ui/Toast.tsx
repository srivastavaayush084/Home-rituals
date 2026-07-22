import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type ToastProps = {
  message: string;
  onDismiss?: () => void;
  duration?: number;
};

export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/20 bg-[#44D62C] px-4 py-3 text-sm text-white shadow-lg">
      <CheckCircle2 size={16} />
      {message}
    </div>
  );
}

