import type {LexicalEditor} from 'lexical';

import type {TranslateFn} from '../context/LocalizationContext';
import type {EditorPlugins} from '../Editor';
import type {SettingName} from '../appSettings';

export type {TranslateFn};

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
  /**
   * Host-supplied translation function. Called as
   *   translate(key, defaultMessage, values?)
   * where `key` follows the `<group>.<label>` convention (e.g. `toolbar.bold`)
   * and `defaultMessage` is the built-in English label. The host adapter is
   * expected to map `key` into its locale namespace (typically by prefixing
   * `lexical.`). When omitted the editor falls back to `defaultMessage`
   * verbatim, so it still renders correctly with no host integration.
   *
   * To react to locale changes after mount, pass a new function reference to
   * instance.update({translate}); StandaloneApp will re-render and propagate
   * the change to every consumer via React context.
   */
  translate?: TranslateFn;
  /**
   * Injected font-family options for the toolbar font picker.
   * When non-empty, replaces the built-in Latin font list entirely.
   * Use `{value: '--separator--', name: ''}` to insert a visual divider
   * between groups (e.g. between basic fonts and installed fonts).
   * When omitted or an empty array, the built-in font list is used.
   */
  fonts?: {value: string; name: string}[];
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

import type {MentionEntityType} from '../nodes/MentionNode';

export type {MentionEntityType};

/**
 * Autocomplete candidate returned by the host's mention lookup.
 */
export interface MentionCandidate {
  /** Referenced entity id (e.g. note-node/reference/notebook guid). */
  id: string;
  /** Display name, without the leading '@'. */
  name: string;
  /**
   * Entity kind — drives the yzx:// deep-link path in markdown export and is
   * echoed back through onMentionClick. Defaults to 'note'.
   */
  type?: MentionEntityType;
  /**
   * Per-candidate icon symbol (plain text, e.g. '·' / '≡' / '▤'). Overrides
   * the feature-level `mentionIcon`; falls back to it (then to the built-in
   * avatar) when omitted.
   */
  icon?: string;
  /** Optional secondary text shown next to the name in the dropdown. */
  meta?: string;
}

export interface LexicalEditorCallbacks {
  /**
   * Fired on every content change.
   * @param html       HTML serialization of the current content.
   * @param editorState  JSON serialization of the Lexical EditorState.
   */
  onChange?: (editor: LexicalEditor) => void;
  /**
   * Enables the '@' mention typeahead and supplies its candidates. Called as
   * the user types after '@'. When omitted the mentions feature is inert in
   * standalone mode (no dummy-data fallback outside the playground dev app).
   */
  mentionLookup?: (query: string) => Promise<MentionCandidate[]>;
  /**
   * Fired when a mention node is clicked inside the editor. `id` is absent on
   * legacy mentions created before ids existed; `type` defaults to 'note'.
   */
  onMentionClick?: (mention: {
    id?: string;
    name: string;
    type: MentionEntityType;
  }) => void;
  /**
   * Text symbol shown as the icon of each mention dropdown item (e.g. '·').
   * Static display config read at mount alongside mentionLookup; when omitted
   * the built-in user avatar icon is used.
   */
  mentionIcon?: string;
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