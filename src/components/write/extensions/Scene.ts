import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SceneComponent from './SceneComponent';

export const Scene = Node.create({
  name: 'scene',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: null },
      title: { default: 'Untitled Scene' },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-type="scene"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, { 'data-type': 'scene' }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SceneComponent);
  },

  addKeyboardShortcuts() {
    return {
      // BACKSPACE: Forceful but controlled deletion
      Backspace: ({ editor }) => {
        const { selection, doc } = editor.state;
        const { $from, empty } = selection;

        // Only intervene if we are at the very start of the scene
        if (!empty || $from.parentOffset !== 0) return false;

        // If this is the ONLY scene in the doc, don't delete it (prevents empty doc errors)
        if (doc.childCount <= 1 && $from.depth === 1) return false;

        return editor.chain().deleteNode('scene').focus().run();
      },

      // ENTER: Simple breakout
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.content.size > 0) return false;

        // If we are on an empty line inside a scene, "split" into a new one
        if (editor.isActive('scene')) {
          return editor
            .chain()
            .lift('scene') // Break out of the current one
            .insertContent({ type: 'scene', content: [{ type: 'paragraph' }] })
            .focus()
            .run();
        }
        return false;
      },
    };
  },
});
