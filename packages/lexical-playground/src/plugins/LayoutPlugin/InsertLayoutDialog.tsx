/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {LexicalEditor} from 'lexical';
import * as React from 'react';
import {useState} from 'react';

import {useTranslate} from '../../context/LocalizationContext';
import Button from '../../ui/Button';
import DropDown, {DropDownItem} from '../../ui/DropDown';
import {INSERT_LAYOUT_COMMAND} from './LayoutPlugin';

const LAYOUTS: {label: string; labelKey: string; value: string}[] = [
  {label: '2 columns (equal width)', labelKey: 'layout.twoColumnsEqual', value: '1fr 1fr'},
  {label: '2 columns (25% - 75%)', labelKey: 'layout.twoColumns25And75', value: '1fr 3fr'},
  {label: '3 columns (equal width)', labelKey: 'layout.threeColumnsEqual', value: '1fr 1fr 1fr'},
  {label: '3 columns (25% - 50% - 25%)', labelKey: 'layout.threeColumns25_50_25', value: '1fr 2fr 1fr'},
  {label: '4 columns (equal width)', labelKey: 'layout.fourColumnsEqual', value: '1fr 1fr 1fr 1fr'},
];

export default function InsertLayoutDialog({
  activeEditor,
  onClose,
}: {
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const t = useTranslate();
  const [layout, setLayout] = useState(LAYOUTS[0].value);
  const selected = LAYOUTS.find((item) => item.value === layout);
  const buttonLabel = selected ? t(selected.labelKey, selected.label) : '';

  const onClick = () => {
    activeEditor.dispatchCommand(INSERT_LAYOUT_COMMAND, layout);
    onClose();
  };

  return (
    <>
      <DropDown
        buttonClassName="toolbar-item dialog-dropdown"
        buttonLabel={buttonLabel}>
        {LAYOUTS.map(({label, labelKey, value}) => (
          <DropDownItem
            key={value}
            className="item"
            onClick={() => setLayout(value)}>
            <span className="text">{t(labelKey, label)}</span>
          </DropDownItem>
        ))}
      </DropDown>
      <Button onClick={onClick}>{t('layout.insert', 'Insert')}</Button>
    </>
  );
}
