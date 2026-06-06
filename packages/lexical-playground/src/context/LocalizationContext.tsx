/**
 * Carries a host-supplied translate function through the React tree so the
 * playground UI (toolbar, menus, dialogs, settings, etc.) can render localized
 * labels. The host (e.g. LexicalEditor.tsx) provides the implementation via
 * the `translate` field on LexicalEditorConfig; it is forwarded here through
 * StandaloneApp. When the host swaps in a new translate (e.g. on locale
 * change) the editor calls instance.update({translate}), which re-renders
 * StandaloneApp and propagates a new context value, re-rendering consumers.
 *
 * Default behavior when no translate is provided: return `defaultMessage`
 * unchanged so the editor still works standalone with its built-in English
 * labels.
 */

import * as React from 'react';
import {createContext, ReactNode, useCallback, useContext, useMemo} from 'react';

export type TranslateValues = Record<string, string | number>;

export type TranslateFn = (
  key: string,
  defaultMessage: string,
  values?: TranslateValues,
) => string;

const defaultTranslate: TranslateFn = (_key, defaultMessage, values) => {
  if (!values) return defaultMessage;
  return defaultMessage.replace(/\{(\w+)\}/g, (match, name) => {
    const v = values[name];
    return v === undefined ? match : String(v);
  });
};

const Context = createContext<TranslateFn>(defaultTranslate);

export function LocalizationContextProvider({
  translate,
  children,
}: {
  translate: TranslateFn | undefined;
  children: ReactNode;
}) {
  const value = translate ?? defaultTranslate;
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useTranslate(): TranslateFn {
  return useContext(Context);
}

/**
 * Returns a stable `t` callable bound to the current translate function.
 * Useful inside useMemo dependency arrays — pass the underlying TranslateFn
 * (from useTranslate) as a dep so memoized values recompute on locale change.
 */
export function useT(): TranslateFn {
  const translate = useTranslate();
  return useCallback<TranslateFn>(
    (key, defaultMessage, values) => translate(key, defaultMessage, values),
    [translate],
  );
}

/**
 * Bulk-translate helper for static label maps. Returns a memoized object
 * whose values are recomputed whenever the translate function changes.
 */
export function useTranslatedMap<T extends Record<string, [string, string]>>(
  map: T,
): Record<keyof T, string> {
  const translate = useTranslate();
  return useMemo(() => {
    const out = {} as Record<keyof T, string>;
    for (const k in map) {
      const [key, def] = map[k];
      out[k] = translate(key, def);
    }
    return out;
  }, [translate, map]);
}
