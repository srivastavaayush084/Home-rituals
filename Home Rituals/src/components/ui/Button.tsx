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
  const base = 'inline-flex items-center justify-center rounded-full font-semibold tracking-[0.02em] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-black/20';
  const variants = {
    primary: 'bg-[#44D62C] text-white hover:bg-[#44D62C] shadow-lg shadow-[#44D62C]/20',
    secondary: 'bg-[#7a9683] text-white hover:bg-[#44D62C] shadow-lg shadow-[#7a9683]/20',
    ghost: 'bg-transparent text-black hover:bg-[#f4f4f5]',
  };
  const sizes = { sm: 'px-4 py-2 text-sm', md: 'px-6 py-3 text-sm', lg: 'px-8 py-4 text-base' };
  const content = (
    <>
      {icon ? <span className="mr-2">{icon}</span> : null}
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
