import PovSidebar from './PovSidebar';

const WriteView = () => {
  return (
    <div className="flex h-full overflow-hidden bg-slate-50/30">
      {/* CENTER: The Editor */}
      <main className="flex-1 overflow-y-auto bg-white shadow-sm border-x border-slate-100">
        <div className="max-w-3xl mx-auto py-16 px-12 min-h-full">
          <h1 className="text-3xl font-serif text-slate-800 mb-8">
            Chapter One: The Beginning
          </h1>
          {/* Editor content... */}
        </div>
      </main>

      {/* RIGHT: POV Reference */}
      <PovSidebar />
    </div>
  );
};

export default WriteView;
