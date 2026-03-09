import { FeatherIcon } from './Icons';

interface BrandLogoProps {
  subtitle?: string;
}

export default function BrandLogo({
  subtitle = 'Your Creative Writing Studio',
}: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg flex items-center justify-center shadow-sm shrink-0">
        <FeatherIcon className="w-6 h-6 text-white" />
      </div>

      <div className="flex flex-col">
        <h1 className="text-xl font-semibold text-gray-800 leading-tight">
          StoryForge
        </h1>
        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
