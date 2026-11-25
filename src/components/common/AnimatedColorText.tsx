import React from 'react';
import { useColorAnimation } from '../../context/ColorAnimationContext';

interface AnimatedColorTextProps {
  text: string;
  className?: string;
  baseDelay?: number;
  delayStep?: number;
}

export const AnimatedColorText: React.FC<AnimatedColorTextProps> = ({
  text,
  className = '',
  baseDelay = 0,
  delayStep = 0.15
}) => {
  const { isColorAnimEnabled } = useColorAnimation();

  if (!isColorAnimEnabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`inline-flex flex-wrap items-baseline ${className}`}>
      {text.split('').map((char, index) => {
        if (char === ' ') {
          return <span key={index}>&nbsp;</span>;
        }
        return (
          <span
            key={index}
            className="color-anim-letter inline-block"
            style={{
              animationDelay: `${baseDelay + index * delayStep}s`
            }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
};
