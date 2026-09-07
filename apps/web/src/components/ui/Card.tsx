import { HTMLAttributes, ReactNode } from 'react';
import { cardAccentBar, cardClass } from './styles';

export default function Card({
  children,
  accent = false,
  className = '',
  padding = true,
  interactive = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  accent?: boolean;
  padding?: boolean;
  /** Soft lift on hover for clickable / focus cards */
  interactive?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`${cardClass} ${padding ? 'p-5 sm:p-6' : ''} ${
        interactive
          ? 'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_48px_-24px_hsl(222_28%_16%_/_0.22)]'
          : ''
      } ${className}`}
      {...props}
    >
      {accent && <div aria-hidden className={cardAccentBar} />}
      {children}
    </div>
  );
}
