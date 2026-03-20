 'use client';

import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
}

export function Button({ className, type = 'button', variant: _variant, ...props }: ButtonProps) {
  return <button type={type} className={className} {...props} />;
}
