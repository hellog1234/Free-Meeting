import React from 'react';
import { Video } from 'lucide-react';
import { Link } from '../context/RouterContext';

interface LogoProps {
  className?: string;
  isWhite?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', isWhite = false }) => {
  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 font-bold tracking-tight text-xl select-none group ${className}`}>
      <div className="w-9 h-9 rounded-xl bg-[#528d5a] flex items-center justify-center text-white shadow-sm shadow-[#528d5a]/20 group-hover:bg-[#43754a] transition-colors">
        <Video className="w-5 h-5 text-white" strokeWidth={2.3} />
      </div>
      <span className={`font-['Outfit'] font-extrabold text-xl tracking-tight ${isWhite ? 'text-white' : 'text-[#1e291f]'}`}>
        Free<span className="text-[#528d5a]">Meet</span>
      </span>
    </Link>
  );
};
