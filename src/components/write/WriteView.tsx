import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import { Scene } from './extensions/Scene';
import PovSidebar from './PovSidebar';

const CustomDocument = Document.extend({
  content: 'scene+',
});

export default function WriteView() {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false,
      }),
      CustomDocument,
      Scene,
    ],
    content: `
      <section data-type="scene" id="initial-scene" title="Prologue">
        <p>This paragraph is now inside a structural "Scene" node!</p>
      </section>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-slate focus:outline-none max-w-3xl mx-auto py-20',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-50/30">
      <main className="flex-1 overflow-y-auto bg-white shadow-sm border-x border-none custom-scrollbar">
        <EditorContent editor={editor} />
      </main>

      <aside className="w-80 flex-shrink-0 bg-slate-50/50">
        <PovSidebar />
      </aside>
    </div>
  );
}
