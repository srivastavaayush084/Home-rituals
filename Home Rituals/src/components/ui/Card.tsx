import { type ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return <div className={`rounded-[24px] border border-[#aabda2]/40 bg-white/90 p-6 shadow-[0_20px_60px_rgba(34,50,41,0.08)] backdrop-blur ${className}`}>{children}</div>;
}

