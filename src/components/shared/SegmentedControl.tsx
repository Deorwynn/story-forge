interface Option {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: Option[];
  activeValue: string;
  onChange: (value: any) => void;
  fullWidth?: boolean;
}

export default function SegmentedControl({
  options,
  activeValue,
  onChange,
  fullWidth = false,
  ...props
}: SegmentedControlProps) {
  return (
    <div
      {...props}
      role="radiogroup"
      className={`flex bg-slate-100 p-1 rounded-xl border border-slate-200 ${fullWidth ? 'w-full' : 'w-fit'}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
            activeValue === opt.value
              ? 'bg-white text-purple-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
