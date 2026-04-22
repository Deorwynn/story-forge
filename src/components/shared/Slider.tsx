interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export default function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  suffix = '',
}: SliderProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-end px-1">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </label>
        <span className="text-xs font-mono font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
          {value.toLocaleString()}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-600 transition-all"
      />
    </div>
  );
}
