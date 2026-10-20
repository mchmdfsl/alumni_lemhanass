import { SelectHTMLAttributes } from "react";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

export default function Select({
  label,
  options,
  error,
  placeholder = "Pilih...",
  id,
  className = "",
  ...props
}: SelectProps) {
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

      <select
        id={id}
        className={`
          h-11
          w-full
          appearance-none
          rounded-lg
          border
          bg-white
          px-3.5
          text-sm
          text-[#172033]
          outline-none
          transition-all
          focus:border-[#0b1f3a]
          focus:ring-4
          focus:ring-[#0b1f3a]/5
          ${error ? "border-red-300" : "border-[#dbe1e8]"}
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}
