import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  className?: string;
  icon?: ReactNode;
  onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, variant = 'primary', size = 'md', to, className = '', icon, onClick, ...props }: ButtonProps) {
  const hasHidden = className.split(' ').includes('hidden');
  const base = `${hasHidden ? '' : 'inline-flex'} items-center justify-center rounded-[6px] font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B8F3C] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none`;
  const variants = {
    primary: 'bg-[#44D62C] text-[#111827] hover:bg-[#3bc224] active:bg-[#35b11f] shadow-xs hover:shadow-sm border border-[#44D62C]',
    secondary: 'bg-transparent text-[#223229] border border-[#223229]/25 hover:bg-[#223229]/5 hover:border-[#223229]/40 active:bg-[#223229]/10 shadow-xs',
    ghost: 'bg-transparent text-[#223229] hover:bg-[#f4f4f5] active:bg-black/5',
  };
  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-7 text-sm sm:text-base',
  };
  const content = (
    <>
      {icon ? <span className="mr-2 inline-flex items-center shrink-0">{icon}</span> : null}
      <span>{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} onClick={onClick} {...props}>
      {content}
    </button>
  );
}
