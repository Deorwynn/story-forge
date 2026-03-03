export default function TopNav() {
  const menus = [
    'Write',
    'Revisions',
    'Plot',
    'Characters',
    'Worldbuilding',
    'Research',
    'Braindump',
  ];
  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#d8b4fe] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">StoryForge</h1>
            <p className="text-[10px] text-slate-400">
              Your Creative Writing Studio
            </p>
          </div>
        </div>
        <nav className="flex gap-6">
          {menus.map((m) => (
            <button
              key={m}
              className={`text-sm font-medium cursor-pointer ${m === 'Characters' ? 'text-[#9333ea] border-b-2 border-[#9333ea] h-14' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {m}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
