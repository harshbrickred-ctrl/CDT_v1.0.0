import { SelectHTMLAttributes } from 'react';
import { fieldClass, labelClass } from './styles';

export default function Select({
  label,
  id,
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
      )}
      <select id={id} className={fieldClass} {...props}>
        {children}
      </select>
    </div>
  );
}
