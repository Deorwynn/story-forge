import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import SceneComponent from './SceneComponent';

export const Scene = Node.create({
  name: 'scene',
  group: 'block',
  content: 'block+',
  defining: true,

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
});
