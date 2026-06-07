import {createContext, useContext, type JSX, type ReactNode} from 'react';

export const FONT_SEPARATOR_VALUE = '--separator--';

export type FontOption = {value: string; name: string};

type FontsContextShape = {
  fonts: FontOption[];
};

const FontsContext = createContext<FontsContextShape>({fonts: []});

export function FontsContextProvider({
  fonts,
  children,
}: {
  fonts?: FontOption[];
  children: ReactNode;
}): JSX.Element {
  return (
    <FontsContext.Provider value={{fonts: fonts ?? []}}>
      {children}
    </FontsContext.Provider>
  );
}

export function useFontFamilyOptions(): FontOption[] {
  return useContext(FontsContext).fonts;
}
