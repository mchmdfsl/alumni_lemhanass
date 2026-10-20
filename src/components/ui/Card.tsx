import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        border-b
        border-slate-100
        px-5
        py-4
        sm:px-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return (
    <div
      className={`
        px-5
        py-5
        sm:px-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}
