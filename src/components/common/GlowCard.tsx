import React from 'react';

export interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  onClick?: () => void;
  variant?: '2xl' | '3xl';
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
  id?: string;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  innerClassName = '',
  onClick,
  variant = '2xl',
  style,
  innerStyle,
  id
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      id={id}
      onClick={onClick}
      style={style}
      className={`glow-card-wrapper ${variant === '3xl' ? 'glow-card-wrapper-3xl' : ''} ${
        isClickable ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div
        style={innerStyle}
        className={`glow-card-inner ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
};
