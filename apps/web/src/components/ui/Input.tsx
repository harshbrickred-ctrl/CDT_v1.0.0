import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { labelClass } from './styles';

export default function Input({
  label,
  icon,
  trailing,
  id,
  className = '',
  onFocus,
  onBlur,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      )}
      <div
        className={`flex items-center gap-2 rounded-lg border bg-background px-3 transition-all duration-200 ${
          focused
            ? 'border-primary/60 shadow-[0_0_0_3px_hsl(38_92%_46%_/_0.12)]'
            : 'border-border hover:border-border/80'
        }`}
      >
        {icon && (
          <span
            className={`shrink-0 transition-colors ${
              focused ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {trailing}
      </div>
    </div>
  );
}
