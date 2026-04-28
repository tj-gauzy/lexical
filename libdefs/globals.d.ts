declare module '*.css';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.png';
declare module '*.svg';
declare module 'prismjs/components/prism-*';

declare var __DEV__: boolean;

// ---------------------------------------------------------------------------
// lexical/lexical-editor — pre-built standalone bundle type declarations.
// Mirrors engines/lexical/packages/lexical-playground/src/standalone/types.ts.
// Keep SettingName in sync with appSettings.ts when new settings are added.
// ---------------------------------------------------------------------------

declare module 'lexical/lexical-editor' {
  type SettingName =
    | 'emptyEditor'
    | 'hasFitNestedTables'
    | 'hasLinkAttributes'
    | 'hasNestedTables'
    | 'isAutocomplete'
    | 'isCharLimit'
    | 'isCharLimitUtf8'
    | 'isCodeHighlighted'
    | 'isCodeShiki'
    | 'isCollab'
    | 'isMaxLength'
    | 'isRichText'
    | 'listStrictIndent'
    | 'measureTypingPerf'
    | 'selectionAlwaysOnDisplay'
    | 'shouldAllowHighlightingWithBrackets'
    | 'shouldDisableFocusOnClickChecklist'
    | 'shouldPreserveNewLinesInMarkdown'
    | 'shouldUseLexicalContextMenu'
    | 'showNestedEditorTreeView'
    | 'showTableOfContents'
    | 'showTreeView'
    | 'tableCellBackgroundColor'
    | 'tableCellMerge'
    | 'tableHorizontalScroll'
    | 'useCollabV2';

  export type LexicalEditorComponents = Partial<Record<SettingName, boolean>>;

  export interface LexicalEditorConfig {
    components?: LexicalEditorComponents;
    showSettingsPanel?: boolean;
    initialEditorState?: string;
  }

  export interface LexicalEditorCallbacks {
    onChange?: (html: string, editorState: string) => void;
  }

  export interface LexicalEditorInstance {
    update: (config: Partial<LexicalEditorConfig>) => void;
    destroy: () => void;
    setContent: (editorState: string) => void;
  }

  export function mountLexicalEditor(
    container: HTMLElement,
    config: LexicalEditorConfig,
    callbacks?: LexicalEditorCallbacks,
  ): LexicalEditorInstance;
}
