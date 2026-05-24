/**
 * Carries an optional host-supplied equation dialog through the React tree so
 * the toolbar and slash-command picker can detect it and skip their built-in
 * KaTeX modal in favour of the host's UI.
 */

import * as React from 'react';
import {createContext, ReactNode, useContext} from 'react';

import type {EquationDialogProvider} from '../standalone/types';

const Context = createContext<EquationDialogProvider | null>(null);

export function EquationDialogProviderContext({
  value,
  children,
}: {
  value: EquationDialogProvider | null | undefined;
  children: ReactNode;
}) {
  return <Context.Provider value={value ?? null}>{children}</Context.Provider>;
}

export function useEquationDialogProvider(): EquationDialogProvider | null {
  return useContext(Context);
}
