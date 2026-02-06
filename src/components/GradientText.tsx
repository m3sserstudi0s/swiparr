import { ReactNode } from 'react';

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
}

export default function GradientText({
  children,
  className = '',
  colors = ["#f0f0f0", "#999999"],
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to bottom, ${colors.join(', ')})`,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
  };

  return (
    <span 
      className={`inline-block font-bold ${className}`} 
      style={gradientStyle}
    >
      {children}
    </span>
  );
}
