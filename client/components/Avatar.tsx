
import React from 'react';
import { avatarColor, avatarUrl } from '../services/avatar';

interface Props {
  name: string;
  size?: number;
  className?: string;
}

// Colored initial as the base; the generated avatar image layers on top.
// If the image fails to load (offline), the initial remains visible.
const Avatar: React.FC<Props> = ({ name, size = 24, className = '' }) => {
  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: avatarColor(name) }}
    >
      <span
        className="absolute font-black text-white"
        style={{ fontSize: Math.round(size * 0.42) }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <img
        src={avatarUrl(name)}
        alt=""
        loading="lazy"
        className="relative w-full h-full object-cover"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
};

export default Avatar;
