export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[20px] bg-[#f4f4f5] ${className}`} />;
}

