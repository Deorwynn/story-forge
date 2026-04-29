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
      Backspace: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        // If we are at the very start of a scene and hit backspace
        if (empty && $from.parentOffset === 0 && $from.depth > 1) {
          // If the scene is empty, just delete it
          if ($from.parent.content.size === 0) {
            return editor.chain().deleteSelection().run();
          }

          // Otherwise, let the default behavior (merging) happen
          // "Confirmation Modal" to be implemented
          return false;
        }
        return false;
      },
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) return false;

        const isInsideScene = editor.isActive('scene');
        if (!isInsideScene) return false;

        const isCurrentLineEmpty = $from.parent.content.size === 0;

        if (isCurrentLineEmpty) {
          return editor
            .chain()
            .lift('scene')
            .insertContent({
              type: 'scene',
              attrs: { title: 'New Scene' },
              content: [{ type: 'paragraph' }],
            })
            .focus()
            .run();
        }
        return false;
      },
    };
  },
});
