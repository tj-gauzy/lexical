import type {LexicalEditor} from 'lexical';

import type {SettingName} from '../appSettings';

/**
 * Boolean feature toggles — keys correspond 1-to-1 with the switches
 * rendered inside the <Settings /> panel.
 */
export type LexicalEditorComponents = Partial<Record<SettingName, boolean>>;

export interface LexicalEditorConfig {
  /** Feature module toggles (same keys as the Settings panel switches). */
  components?: LexicalEditorComponents;
  /** Render the settings toggle button/panel. Default: false. */
  showSettingsPanel?: boolean;
  /**
   * Initial editor content as a serialized Lexical EditorState JSON string
   * (the value previously returned by onChange's second argument).
   * When omitted the editor starts empty.
   */
  initialEditorState?: string;
}

export interface LexicalEditorCallbacks {
  /**
   * Fired on every content change.
   * @param html       HTML serialization of the current content.
   * @param editorState  JSON serialization of the Lexical EditorState.
   */
  onChange?: (editor: LexicalEditor) => void;
}

export interface LexicalEditorInstance {
  /** Re-render with a partial config update. */
  update: (config: Partial<LexicalEditorConfig>) => void;
  /** Unmount React root and clean up. */
  destroy: () => void;
  /**
   * Programmatically replace the editor content.
   * Accepts: serialized JSON string, JSON object, HTML string, or Markdown string.
   */
  setContent: (editorState: string | object) => void;
  /** Returns the underlying Lexical editor instance. */
  getEditor: () => LexicalEditor | null;
}