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
    <div className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2.5 rounded-[6px] border border-black/10 bg-[#44D62C] px-4 py-2.5 text-sm font-semibold text-[#111] shadow-lg">
      <CheckCircle2 size={16} />
      <span>{message}</span>
    </div>
  );
}

