import { type ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return <div className={`rounded-[8px] border border-[#223229]/10 bg-white p-6 shadow-xs transition-shadow duration-200 ${className}`}>{children}</div>;
}

