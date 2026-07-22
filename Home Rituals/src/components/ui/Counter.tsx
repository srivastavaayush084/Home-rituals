import { animate, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

type CounterProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
};

export function Counter({ value, suffix = '', prefix = '', duration = 1.2 }: CounterProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [duration, motionValue, value]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => setDisplayValue(latest));
    return () => unsubscribe();
  }, [rounded]);

  return <span>{prefix}{displayValue}{suffix}</span>;
}
