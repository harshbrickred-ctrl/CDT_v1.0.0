import { ButtonHTMLAttributes } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pressable } from '../../lib/motion';
import {
  btnDanger,
  btnGhost,
  btnPrimary,
  btnSecondary,
} from './styles';

const variants = {
  primary: btnPrimary,
  secondary: btnSecondary,
  danger: btnDanger,
  ghost: btnGhost,
} as const;

export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  disabled,
  onDrag: _onDrag,
  onDragStart: _onDragStart,
  onDragEnd: _onDragEnd,
  onAnimationStart: _onAnimationStart,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
}) {
  const prefersReducedMotion = useReducedMotion();
  void _onDrag;
  void _onDragStart;
  void _onDragEnd;
  void _onAnimationStart;

  return (
    <motion.button
      type={type}
      disabled={disabled}
      className={`${variants[variant]} ${className}`}
      whileHover={
        prefersReducedMotion || disabled ? undefined : pressable.whileHover
      }
      whileTap={
        prefersReducedMotion || disabled ? undefined : pressable.whileTap
      }
      transition={pressable.transition}
      {...props}
    >
      {children}
    </motion.button>
  );
}
