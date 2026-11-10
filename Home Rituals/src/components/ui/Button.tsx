import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  to?: string;
  className?: string;
  icon?: ReactNode;
  onClick?: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  className = '',
  icon,
  onClick,
  ...props
}: ButtonProps) {
  const hasHidden = className.split(' ').includes('hidden');
  const base = `${hasHidden ? '' : 'inline-flex'} items-center justify-center font-medium tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A43] disabled:opacity-50 disabled:pointer-events-none cursor-pointer`;
  
  const variants = {
    primary: 'bg-[#14291D] text-[#FBF9F5] hover:bg-[#203D2D] active:scale-[0.98] shadow-sm hover:shadow',
    secondary: 'bg-[#F5F1EA] text-[#14291D] border border-[#E8E4DC] hover:bg-[#ECE6DC] hover:border-[#D5CFC3] active:scale-[0.98]',
    ghost: 'bg-transparent text-[#14291D] hover:bg-[#14291D]/5 active:scale-[0.98]',
    outline: 'border border-[#14291D] text-[#14291D] hover:bg-[#14291D] hover:text-[#FBF9F5] active:scale-[0.98]',
  };
  
  const sizes = {
    sm: 'px-4 py-2 text-xs rounded-full',
    md: 'px-5 py-2.5 text-sm rounded-full',
    lg: 'px-7 py-3.5 text-base rounded-full',
  };

  const content = (
    <>
      {icon ? <span className="mr-2 inline-flex items-center">{icon}</span> : null}
      {children}
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
