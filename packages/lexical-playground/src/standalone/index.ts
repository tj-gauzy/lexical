/**
 * Imperative mount API for the Lexical playground editor.
 * Loaded via <script> tag; exposes window.LexicalEditor = { mountLexicalEditor }.
 *
 *   const editor = window.LexicalEditor.mountLexicalEditor(
 *     document.getElementById('editor'),
 *     { components: { showTreeView: false, isRichText: true }, showSettingsPanel: false },
 *     { onChange: (html, state) => console.log(html) },
 *   );
 *   editor.update({ components: { showTableOfContents: true } });
 *   editor.destroy();
 *
 * Utility functions (also on window.LexicalEditor):
 *   toHTML(editorOrState)         — returns HTML string; accepts LexicalEditor or getEditorState().toJSON()
 *   fromHTML(html)                — returns Lexical JSON string parsed from HTML
 *   toMarkdown(editorOrState)     — returns Markdown string; accepts LexicalEditor or getEditorState().toJSON()
 *   fromMarkdown(md)              — returns Lexical JSON string parsed from Markdown
 */

import '../index.css';

import {$generateHtmlFromNodes, $generateNodesFromDOM} from '@lexical/html';
import {createHeadlessEditor} from '@lexical/headless';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
} from '@lexical/markdown';
import {$getRoot, $insertNodes} from 'lexical';
import type {LexicalEditor, SerializedEditorState} from 'lexical';
import React from 'react';
import {createRoot} from 'react-dom/client';

import PlaygroundNodes from '../nodes/PlaygroundNodes';
import StandaloneApp from './StandaloneApp';
import type {
  LexicalEditorCallbacks,
  LexicalEditorConfig,
  LexicalEditorInstance,
} from './types';
import PlaygroundEditorTheme from "../themes/PlaygroundEditorTheme";

let HeadLessEditor: null | LexicalEditor = null;

const CreateHeadlessEditor = () => {
  if (!HeadLessEditor) {
    HeadLessEditor = createHeadlessEditor({nodes: PlaygroundNodes, theme: PlaygroundEditorTheme});
  }
  return HeadLessEditor;
}


// ---------------------------------------------------------------------------
// Utility: resolve editor from LexicalEditor instance or serialized state
// ---------------------------------------------------------------------------

type EditorInput = LexicalEditor | SerializedEditorState;

function isLexicalEditor(input: EditorInput): input is LexicalEditor {
  return typeof (input as LexicalEditor).read === 'function';
}

function resolveEditor(input: EditorInput): LexicalEditor {
  if (isLexicalEditor(input)) {
    return input;
  }
  const headless = CreateHeadlessEditor();
  headless.setEditorState(headless.parseEditorState(input));
  return headless;
}

// ---------------------------------------------------------------------------
// Utility: toHTML
// ---------------------------------------------------------------------------

function toHTML(input: EditorInput): string {
  const editor = resolveEditor(input);
  return editor.read(() => $generateHtmlFromNodes(editor));
}

// ---------------------------------------------------------------------------
// Utility: fromHTML
// Parses an HTML string into a Lexical editor state and returns its JSON.
// ---------------------------------------------------------------------------

function fromHTML(html: string): string {
  const editor = CreateHeadlessEditor();
  const dom = new DOMParser().parseFromString(html, 'text/html');
  editor.update(
    () => {
      const nodes = $generateNodesFromDOM(editor, dom);
      $getRoot().clear().select();
      $insertNodes(nodes);
    },
    {discrete: true},
  );
  return JSON.stringify(editor.getEditorState());
}

// ---------------------------------------------------------------------------
// Utility: toMarkdown
// ---------------------------------------------------------------------------

function toMarkdown(input: EditorInput): string {
  const editor = resolveEditor(input);
  return editor.read(() => $convertToMarkdownString(TRANSFORMERS));
}

// ---------------------------------------------------------------------------
// Utility: fromMarkdown
// Parses a Markdown string into a Lexical editor state and returns its JSON.
// ---------------------------------------------------------------------------

function fromMarkdown(md: string): string {
  const editor = CreateHeadlessEditor();
  editor.update(
    () => {
      $convertFromMarkdownString(md, TRANSFORMERS);
    },
    {discrete: true},
  );
  return JSON.stringify(editor.getEditorState());
}

// ---------------------------------------------------------------------------
// mountLexicalEditor
// ---------------------------------------------------------------------------

function mountLexicalEditor(
  container: HTMLElement,
  config: LexicalEditorConfig = {},
  callbacks?: LexicalEditorCallbacks,
): LexicalEditorInstance {
  const root = createRoot(container);

  let currentConfig = config;
  let currentCallbacks = callbacks;

  // Populated by SetContentPlugin once the Lexical composer context is ready.
  const contentSetterRef: React.MutableRefObject<
    ((state: string | object) => void) | null
  > = {current: null};

  // Populated by SetContentPlugin with the underlying LexicalEditor.
  const lexicalEditorRef: React.MutableRefObject<LexicalEditor | null> = {
    current: null,
  };

  function render() {
    root.render(
      React.createElement(StandaloneApp, {
        callbacks: currentCallbacks,
        config: currentConfig,
        contentSetterRef,
        lexicalEditorRef,
      }),
    );
  }

  render();

  return {
    destroy() {
      root.unmount();
    },
    getEditor() {
      return lexicalEditorRef.current;
    },
    setContent(editorState: string | object) {
      contentSetterRef.current?.(editorState);
    },
    update(newConfig) {
      currentConfig = {...currentConfig, ...newConfig};
      render();
    },
  };
}

// ---------------------------------------------------------------------------
// Explicit global registration
//
// IIFE format relies on `var LexicalEditor = (function(){...})()` at the
// top level of the script. That assignment is implicit and can fail when:
//   1. The script is loaded with type="module" (var becomes module-scoped)
//   2. The IIFE factory throws before completing (process not defined, etc.)
//
// Explicitly writing to globalThis here makes the global registration a
// deliberate side-effect inside the bundle itself, independent of the IIFE
// wrapper behavior.
// ---------------------------------------------------------------------------
if (typeof globalThis !== 'undefined') {
  (globalThis as any).LexicalEditor = {
    fromHTML,
    fromMarkdown,
    mountLexicalEditor,
    toHTML,
    toMarkdown,
  };
}
