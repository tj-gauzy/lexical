import type {LexicalEditor} from 'lexical';

import type {EditorPlugins} from '../Editor';
import type {SettingName} from '../appSettings';

/**
 * Boolean feature toggles — keys correspond 1-to-1 with the switches
 * rendered inside the <Settings /> panel.
 */
export type LexicalEditorComponents = Partial<Record<SettingName, boolean>>;

export type {EditorPlugins};

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
  /**
   * Optional feature plug-in flags forwarded to the editor shell.
   * Keys match the EditorPlugins interface (equations, mentions, toc, …).
   * Only supplied keys are applied; absent keys fall back to their defaults.
   */
  plugins?: EditorPlugins;
}

/**
 * Result returned by a host-provided equation dialog.
 * Returning `null` aborts the insertion (e.g. user cancelled).
 */
export interface EquationDialogResult {
  equation: string;
  inline: boolean;
}

/**
 * Optional host-provided equation dialog. When supplied, it replaces the
 * built-in KaTeX dialog used by the toolbar's "Insert Equation" button and
 * the slash-command picker — the host's promise resolves with the LaTeX
 * source and inline/block flag, and the editor dispatches
 * INSERT_EQUATION_COMMAND with that payload.
 */
export type EquationDialogProvider = (
  options: {initialEquation?: string; initialInline?: boolean},
) => Promise<EquationDialogResult | null>;

export interface LexicalEditorCallbacks {
  /**
   * Fired on every content change.
   * @param html       HTML serialization of the current content.
   * @param editorState  JSON serialization of the Lexical EditorState.
   */
  onChange?: (editor: LexicalEditor) => void;
  /**
   * Override the built-in equation insertion dialog. The host renders its own
   * UI (e.g. a MathLive editor inside the app's modal system) and resolves
   * with the LaTeX string + inline flag; the editor takes care of inserting
   * the node. Resolve with `null` to cancel.
   */
  equationDialog?: EquationDialogProvider;
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