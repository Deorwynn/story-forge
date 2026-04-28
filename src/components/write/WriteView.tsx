import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import PovSidebar from './PovSidebar';

export default function WriteView() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: `<h2>Draft Start</h2><p>Welcome to the Forge editor. Start your story here...</p>`,
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none max-w-3xl mx-auto py-20',
      },
    },
  });

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50/30">
      {/* CENTER: The Editor Container */}
      <main className="flex-1 overflow-y-auto bg-white shadow-sm border-x border-slate-100 custom-scrollbar">
        <EditorContent editor={editor} />
      </main>

      {/* RIGHT: POV Reference */}
      <aside className="w-80 flex-shrink-0 bg-slate-50/50">
        <PovSidebar />
      </aside>
    </div>
  );
}
