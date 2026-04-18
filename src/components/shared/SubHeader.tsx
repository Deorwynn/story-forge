const SubHeader = ({
  title,
  className = '',
}: {
  title: string;
  className?: string;
}) => (
  <div
    className={`col-span-full border-b-2 border-purple-200 rounded-md px-2 py-1 mb-6 mt-8 flex items-center gap-3 bg-purple-100 ${className}`}
  >
    <div className="w-1 h-4 bg-purple-500 rounded-full" aria-hidden="true" />

    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-[0.15em] ">
      {title}
    </h4>
  </div>
);

export default SubHeader;
