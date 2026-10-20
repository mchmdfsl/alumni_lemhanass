import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-semibold text-[#172033]"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            {leftIcon}
          </div>
        )}

        <input
          id={id}
          className={`
            h-11
            w-full
            rounded-lg
            border
            bg-white
            px-3.5
            text-sm
            text-[#172033]
            outline-none
            transition-all
            placeholder:text-[#94a3b8]
            hover:border-[#b9c2ce]
            focus:border-[#0b1f3a]
            focus:ring-4
            ${
              error
                ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                : "border-[#dbe1e8] focus:ring-[#0b1f3a]/5"
            }
            ${leftIcon ? "pl-10" : ""}
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}

      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
