/**
 * Carries the host-supplied mention lookup (and click callback) through the
 * React tree so MentionsPlugin can source its typeahead candidates from the
 * host instead of the playground's dummy dataset.
 *
 * Three-state semantics:
 *  - undefined — no provider mounted (playground dev App): plugin falls back
 *    to its built-in dummy dataset so the upstream demo keeps working;
 *  - null — StandaloneApp mounted the provider but the host supplied no
 *    mentionLookup callback: the mentions feature is inert;
 *  - value — host-driven lookup.
 */

import * as React from 'react';
import {createContext, ReactNode, useContext} from 'react';

import type {MentionEntityType} from '../nodes/MentionNode';
import type {MentionCandidate} from '../standalone/types';

export interface MentionLookupValue {
  lookup: (query: string) => Promise<MentionCandidate[]>;
  onClick?: (mention: {
    id?: string;
    name: string;
    type: MentionEntityType;
  }) => void;
  /**
   * Text symbol rendered as the dropdown item icon (e.g. '·'). Plain string
   * only — JSX cannot cross the UMD boundary (host React ≠ engine React).
   * When omitted the playground's default user avatar icon is used.
   */
  icon?: string;
}

const Context = createContext<MentionLookupValue | null | undefined>(undefined);

export function MentionLookupProviderContext({
  value,
  children,
}: {
  value: MentionLookupValue | null;
  children: ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useMentionLookupProvider():
  | MentionLookupValue
  | null
  | undefined {
  return useContext(Context);
}
