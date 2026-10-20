import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-[#0b1f3a] text-white hover:bg-[#123b68] focus:ring-[#0b1f3a]/20",
    secondary:
      "bg-[#c9a227] text-white hover:bg-[#b28b16] focus:ring-[#c9a227]/20",
    outline:
      "border border-[#0b1f3a]/20 bg-white text-[#0b1f3a] hover:bg-[#0b1f3a]/5 focus:ring-[#0b1f3a]/10",
    danger:
      "bg-[#9e1b32] text-white hover:bg-[#82152a] focus:ring-[#9e1b32]/20",
    ghost:
      "bg-transparent text-[#0b1f3a] hover:bg-[#0b1f3a]/5 focus:ring-[#0b1f3a]/10",
  };

  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-5 text-sm",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-lg
        font-semibold
        transition-all
        duration-200
        focus:outline-none
        focus:ring-4
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Memproses...
        </>
      ) : (
        children
      )}
    </button>
  );
}
