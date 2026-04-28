/**
 * Standalone wrapper around the Lexical playground editor.
 * Accepts config/callbacks as props instead of reading from URL params.
 * Intended as the root component for the imperative mount API in index.ts.
 */

import {
  AutoFocusExtension,
  ClearEditorExtension,
  DecoratorTextExtension,
  HorizontalRuleExtension,
  SelectionAlwaysOnDisplayExtension,
} from '@lexical/extension';
import {HashtagExtension} from '@lexical/hashtag';
import {HistoryExtension} from '@lexical/history';
import {$generateNodesFromDOM} from '@lexical/html';
import {ClickableLinkExtension, LinkExtension} from '@lexical/link';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {$convertFromMarkdownString, TRANSFORMERS} from '@lexical/markdown';
import {PlainTextExtension} from '@lexical/plain-text';
import {LexicalCollaboration} from '@lexical/react/LexicalCollaborationContext';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {configExtension, defineExtension, $getRoot, $insertNodes, LexicalEditor, type SerializedEditorState} from 'lexical';
import {type JSX, type MutableRefObject, type RefObject, useEffect, useMemo, useRef} from 'react';

import {buildHTMLConfig} from '../buildHTMLConfig';
import {FlashMessageContext} from '../context/FlashMessageContext';
import {SettingsContext, useSettings} from '../context/SettingsContext';
import {ToolbarContext} from '../context/ToolbarContext';
import Editor from '../Editor';
import {KeywordsExtension} from '../nodes/KeywordNode';
import PlaygroundNodes from '../nodes/PlaygroundNodes';
import {PlaygroundAutoLinkExtension} from '../plugins/AutoLinkExtension';
import {CodeHighlightExtension} from '../plugins/CodeHighlightExtension';
import {CollapsibleExtension} from '../plugins/CollapsibleExtension';
import {DateTimeExtension} from '../plugins/DateTimeExtension';
import {DragDropPasteExtension} from '../plugins/DragDropPasteExtension';
import {EmojisExtension} from '../plugins/EmojisExtension';
import {ImagesExtension} from '../plugins/ImagesExtension';
import {PlaygroundMarkdownShortcutsExtension} from '../plugins/MarkdownShortcutsExtension';
import {MaxLengthExtension} from '../plugins/MaxLengthPlugin';
import {PageBreakExtension} from '../plugins/PageBreakExtension';
import {PagesReactExtension} from '../plugins/PagesReactExtension';
import {SpecialTextExtension} from '../plugins/SpecialTextExtension';
import {TabFocusExtension} from '../plugins/TabFocusExtension';
import {TerseExportExtension} from '../plugins/TerseExportExtension';
import TypingPerfPlugin from '../plugins/TypingPerfPlugin';
import Settings from '../Settings';
import PlaygroundEditorTheme from '../themes/PlaygroundEditorTheme';
import {validateUrl} from '../utils/url';
import {OnChangePlugin} from './OnChangePlugin';
import type {LexicalEditorCallbacks, LexicalEditorConfig} from './types';

// ---------------------------------------------------------------------------
// Extension definitions (mirrors App.tsx — kept in sync)
// ---------------------------------------------------------------------------

const PlaygroundRichTextExtension = defineExtension({
  dependencies: [
    RichTextExtension,
    ImagesExtension,
    HorizontalRuleExtension,
    PageBreakExtension,
    TabFocusExtension,
    CollapsibleExtension,
    CodeHighlightExtension,
    configExtension(ListExtension, {shouldPreserveNumbering: false}),
    CheckListExtension,
    PlaygroundMarkdownShortcutsExtension,
    PageBreakExtension,
    PagesReactExtension,
  ],
  name: '@lexical/playground/RichText',
});

const AppExtension = defineExtension({
  dependencies: [
    AutoFocusExtension,
    ClearEditorExtension,
    DecoratorTextExtension,
    HistoryExtension,
    KeywordsExtension,
    HashtagExtension,
    DateTimeExtension,
    MaxLengthExtension,
    SpecialTextExtension,
    DragDropPasteExtension,
    EmojisExtension,
    configExtension(LinkExtension, {validateUrl}),
    PlaygroundAutoLinkExtension,
    ClickableLinkExtension,
    SelectionAlwaysOnDisplayExtension,
    TerseExportExtension,
  ],
  html: buildHTMLConfig(),
  name: '@lexical/playground',
  namespace: 'Playground',
  nodes: PlaygroundNodes,
  theme: PlaygroundEditorTheme,
});

// ---------------------------------------------------------------------------
// SetContentPlugin — exposes an imperative setter for the editor state
// ---------------------------------------------------------------------------

function SetContentPlugin({
  setterRef,
  editorRef,
  editor,
}: {
  setterRef: MutableRefObject<((state: string | object) => void) | null>;
  editorRef: MutableRefObject<LexicalEditor | null>;
  editor: LexicalEditor;
}): null {
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  useEffect(() => {
    setterRef.current = (state: string | object) => {
      try {
        if (typeof state === 'object' && state !== null) {
          editor.setEditorState(editor.parseEditorState(state as SerializedEditorState));
          return;
        }
        const trimmed = (state as string).trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          editor.setEditorState(editor.parseEditorState(trimmed));
        } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
          editor.update(() => {
            const dom = new DOMParser().parseFromString(trimmed, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            $getRoot().clear().select();
            $insertNodes(nodes);
          });
        } else {
          editor.update(() => {
            $convertFromMarkdownString(trimmed, TRANSFORMERS);
          });
        }
      } catch (e) {
        console.error('[LexicalEditor] Failed to set editor state:', e);
      }
    };
    return () => {
      setterRef.current = null;
    };
  }, [editor, setterRef]);

  return null;
}

// ---------------------------------------------------------------------------
// Inner component — reads settings from context, renders editor
// ---------------------------------------------------------------------------

interface StandaloneEditorInnerProps {
  showSettingsPanel: boolean;
  initialEditorStateRef: RefObject<string | undefined>;
  contentSetterRef: MutableRefObject<((state: string | object) => void) | null>;
  lexicalEditorRef: MutableRefObject<LexicalEditor | null>;
  callbacks?: LexicalEditorCallbacks;
}

function StandaloneEditorInner({
  showSettingsPanel,
  initialEditorStateRef,
  contentSetterRef,
  lexicalEditorRef,
  callbacks,
}: StandaloneEditorInnerProps): JSX.Element {
  const {
    settings: {isCollab, isRichText, measureTypingPerf},
  } = useSettings();

  const app = useMemo(
    () =>
      defineExtension({
        // initialEditorStateRef.current is captured once at mount; the ref
        // prevents the extension from being rebuilt on unrelated re-renders.
        $initialEditorState: isCollab
          ? null
          : (initialEditorStateRef.current ?? undefined),
        dependencies: [
          AppExtension,
          configExtension(HistoryExtension, {disabled: isCollab}),
          isRichText ? PlaygroundRichTextExtension : PlainTextExtension,
        ],
        name: '@lexical/playground/standalone',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCollab, isRichText],
  );

  const handleWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    const toolbar = target.matches('.toolbar') ? target : target.closest('.toolbar');
    if (toolbar) {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      (toolbar as HTMLElement).scrollLeft += e.deltaY;
    }
  };

  return (
    <LexicalCollaboration>
      <LexicalExtensionComposer extension={app} contentEditable={null}>
        <ToolbarContext>
          <div className="editor-shell" onWheel={handleWheel}>
            <Editor extraRender={editor => {
              return (
                <>
                  <SetContentPlugin setterRef={contentSetterRef} editorRef={lexicalEditorRef} editor={editor}/>
                  {callbacks?.onChange && (
                    <OnChangePlugin onChange={callbacks.onChange} editor={editor} />
                  )}
                </>
              );
            }}/>
          </div>
          
          {showSettingsPanel && <Settings />}
          {measureTypingPerf ? <TypingPerfPlugin /> : null}
        </ToolbarContext>
      </LexicalExtensionComposer>
    </LexicalCollaboration>
  );
}

// ---------------------------------------------------------------------------
// Public root component
// ---------------------------------------------------------------------------

interface StandaloneAppProps {
  config: LexicalEditorConfig;
  callbacks?: LexicalEditorCallbacks;
  contentSetterRef: MutableRefObject<((state: string | object) => void) | null>;
  lexicalEditorRef: MutableRefObject<LexicalEditor | null>;
}

export default function StandaloneApp({
  config,
  callbacks,
  contentSetterRef,
  lexicalEditorRef,
}: StandaloneAppProps): JSX.Element {
  const {components, showSettingsPanel = false, initialEditorState} = config;

  // Freeze the initial state so re-renders triggered by config.update() don't
  // attempt to re-apply it to an already-mounted editor.
  const initialEditorStateRef = useRef(initialEditorState);

  return (
    <SettingsContext initialSettings={components}>
      <FlashMessageContext>
        <StandaloneEditorInner
          showSettingsPanel={showSettingsPanel}
          initialEditorStateRef={initialEditorStateRef}
          contentSetterRef={contentSetterRef}
          lexicalEditorRef={lexicalEditorRef}
          callbacks={callbacks}
        />
      </FlashMessageContext>
    </SettingsContext>
  );
}
