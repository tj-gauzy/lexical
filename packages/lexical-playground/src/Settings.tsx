/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useMemo, useState} from 'react';

import {isDevPlayground} from './appSettings';
import {useTranslate} from './context/LocalizationContext';
import {useSettings} from './context/SettingsContext';
import Switch from './ui/Switch';

export default function Settings(): JSX.Element {
  const windowLocation = window.location;
  const {
    setOption,
    settings: {
      measureTypingPerf,
      isCollab,
      isRichText,
      hasNestedTables,
      hasFitNestedTables,
      isMaxLength,
      hasLinkAttributes,
      isCharLimit,
      isCharLimitUtf8,
      isAutocomplete,
      showTreeView,
      showNestedEditorTreeView,
      showTableOfContents,
      shouldUseLexicalContextMenu,
      shouldPreserveNewLinesInMarkdown,
      shouldAllowHighlightingWithBrackets,
      selectionAlwaysOnDisplay,
      isCodeHighlighted,
      isCodeShiki,
    },
  } = useSettings();
  const t = useTranslate();
  const [showSettings, setShowSettings] = useState(false);
  const [isSplitScreen, search] = useMemo(() => {
    const parentWindow = window.parent;
    const _search = windowLocation.search;
    const _isSplitScreen =
      parentWindow && parentWindow.location.pathname === '/split/';
    return [_isSplitScreen, _search];
  }, [windowLocation]);

  return (
    <>
      <button
        id="options-button"
        data-test-id="options-button"
        className={`editor-dev-button ${showSettings ? 'active' : ''}`}
        onClick={() => setShowSettings(!showSettings)}
      />
      {showSettings ? (
        <div className="switches">
          {isRichText && isDevPlayground && (
            <Switch
              onClick={() => {
                setOption('isCollab', !isCollab);
                window.location.reload();
              }}
              checked={isCollab}
              text={t('settings.collaboration', 'Collaboration')}
            />
          )}
          {isDevPlayground && (
            <Switch
              onClick={() => {
                if (isSplitScreen) {
                  window.parent.location.href = `/${search}`;
                } else {
                  window.location.href = `/split/${search}`;
                }
              }}
              checked={isSplitScreen}
              text={t('settings.splitScreen', 'Split Screen')}
            />
          )}
          <Switch
            onClick={() => setOption('measureTypingPerf', !measureTypingPerf)}
            checked={measureTypingPerf}
            text={t('settings.measurePerf', 'Measure Perf')}
          />
          <Switch
            onClick={() => setOption('showTreeView', !showTreeView)}
            checked={showTreeView}
            text={t('settings.debugView', 'Debug View')}
          />
          <Switch
            onClick={() =>
              setOption('showNestedEditorTreeView', !showNestedEditorTreeView)
            }
            checked={showNestedEditorTreeView}
            text={t('settings.nestedEditorsDebugView', 'Nested Editors Debug View')}
          />
          <Switch
            onClick={() => {
              setOption('isRichText', !isRichText);
              setOption('isCollab', false);
            }}
            checked={isRichText}
            text={t('settings.richText', 'Rich Text')}
          />
          <Switch
            onClick={() => {
              setOption('hasNestedTables', !hasNestedTables);
            }}
            checked={hasNestedTables}
            text={t('settings.nestedTables', 'Nested Tables')}
          />
          <Switch
            onClick={() => {
              setOption('hasFitNestedTables', !hasFitNestedTables);
            }}
            checked={hasFitNestedTables}
            text={t('settings.fitNestedTables', 'Fit nested tables')}
          />
          <Switch
            onClick={() => setOption('isCharLimit', !isCharLimit)}
            checked={isCharLimit}
            text={t('settings.charLimit', 'Char Limit')}
          />
          <Switch
            onClick={() => setOption('isCharLimitUtf8', !isCharLimitUtf8)}
            checked={isCharLimitUtf8}
            text={t('settings.charLimitUtf8', 'Char Limit (UTF-8)')}
          />
          <Switch
            onClick={() => setOption('hasLinkAttributes', !hasLinkAttributes)}
            checked={hasLinkAttributes}
            text={t('settings.linkAttributes', 'Link Attributes')}
          />
          <Switch
            onClick={() => setOption('isMaxLength', !isMaxLength)}
            checked={isMaxLength}
            text={t('settings.maxLength', 'Max Length')}
          />
          <Switch
            onClick={() => setOption('isAutocomplete', !isAutocomplete)}
            checked={isAutocomplete}
            text={t('settings.autocomplete', 'Autocomplete')}
          />
          <Switch
            onClick={() => {
              setOption('showTableOfContents', !showTableOfContents);
            }}
            checked={showTableOfContents}
            text={t('settings.tableOfContents', 'Table Of Contents')}
          />
          <Switch
            onClick={() => {
              setOption(
                'shouldUseLexicalContextMenu',
                !shouldUseLexicalContextMenu,
              );
            }}
            checked={shouldUseLexicalContextMenu}
            text={t('settings.useLexicalContextMenu', 'Use Lexical Context Menu')}
          />
          <Switch
            onClick={() => {
              setOption(
                'shouldPreserveNewLinesInMarkdown',
                !shouldPreserveNewLinesInMarkdown,
              );
            }}
            checked={shouldPreserveNewLinesInMarkdown}
            text={t('settings.preserveNewLinesInMarkdown', 'Preserve newlines in Markdown')}
          />
          <Switch
            onClick={() => {
              setOption(
                'shouldAllowHighlightingWithBrackets',
                !shouldAllowHighlightingWithBrackets,
              );
            }}
            checked={shouldAllowHighlightingWithBrackets}
            text={t('settings.useBracketsHighlighting', 'Use Brackets for Highlighting')}
          />

          <Switch
            onClick={() => {
              setOption('selectionAlwaysOnDisplay', !selectionAlwaysOnDisplay);
            }}
            checked={selectionAlwaysOnDisplay}
            text={t('settings.retainSelection', 'Retain selection')}
          />

          <Switch
            onClick={() => {
              setOption('isCodeHighlighted', !isCodeHighlighted);
            }}
            checked={isCodeHighlighted}
            text={t('settings.enableCodeHighlighting', 'Enable Code Highlighting')}
          />

          <Switch
            onClick={() => {
              setOption('isCodeShiki', !isCodeShiki);
            }}
            checked={isCodeShiki}
            text={t('settings.useShikiHighlighting', 'Use Shiki for Code Highlighting')}
          />
        </div>
      ) : null}
    </>
  );
}
