import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

export default function SceneComponent({ node, editor, getPos }: any) {
  const { title } = node.attrs;

  const isFocused =
    editor.state.selection.from >= getPos() &&
    editor.state.selection.to <= getPos() + node.nodeSize;

  return (
    <NodeViewWrapper className="scene-node-wrapper group relative mt-16 mb-8">
      {/* THE DIVIDER */}
      <div
        contentEditable={false}
        className={`mb-12 flex items-center justify-between gap-6 select-none transition-all duration-700 ease-in-out
                   ${isFocused ? 'opacity-100' : 'opacity-30 group-hover:opacity-80'}`}
      >
        {/* Left Side: Title & Short Line */}
        <div className="flex items-center gap-4 flex-1">
          <span
            className={`font-serif text-[11px] font-medium italic tracking-[0.25em] shrink-0 uppercase transition-colors duration-500
                           ${isFocused ? 'text-purple-500' : 'text-purple-300'}`}
          >
            {title || 'Untitled Scene'}
          </span>
          <div
            className={`h-[1px] w-full transition-all duration-500 bg-gradient-to-r from-purple-100 via-purple-200 to-transparent 
                          ${isFocused ? 'from-purple-300 via-purple-500' : ''}`}
          />
        </div>

        {/* Center: Ornament */}
        <svg
          width="120"
          height="30"
          viewBox="0 0 120 30"
          fill="none"
          className={`transition-all duration-1000 flex-shrink-0 drop-shadow-sm 
                        ${isFocused ? 'text-purple-500 scale-105' : 'text-purple-200'}`}
        >
          <path
            d="M60 5 C60 5 55 2 50 5 C40 10 35 25 20 25 C10 25 5 20 2 15 C5 10 12 8 18 12 M60 5 C60 5 65 2 70 5 C80 10 85 25 100 25 C110 25 115 20 118 15 C115 10 108 8 102 12"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M60 25 C60 25 52 28 45 22 C35 15 35 5 25 5 C15 5 5 12 5 15 M60 25 C60 25 68 28 75 22 C85 15 85 5 95 5 C105 5 115 12 115 15"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <path d="M60 2 L63 10 L60 18 L57 10 Z" fill="currentColor" />
          <circle cx="40" cy="15" r="1.5" fill="currentColor" />
          <circle cx="80" cy="15" r="1.5" fill="currentColor" />
        </svg>

        {/* Right Side: Long Fading Line */}
        <div
          className={`h-[1px] flex-1 bg-gradient-to-l from-transparent via-purple-200 to-purple-100 transition-all duration-500
                        ${isFocused ? 'via-purple-500 to-purple-300' : ''}`}
        />
      </div>

      {/* THE WRITING AREA */}
      <NodeViewContent className="prose prose-slate max-w-none min-h-[6rem] focus:outline-none text-slate-900" />
    </NodeViewWrapper>
  );
}
