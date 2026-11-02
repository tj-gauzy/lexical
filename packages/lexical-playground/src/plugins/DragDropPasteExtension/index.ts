/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {isMimeType, mediaFileReader} from '@lexical/utils';
import {COMMAND_PRIORITY_LOW, defineExtension} from 'lexical';

import {INSERT_IMAGE_COMMAND} from '../ImagesExtension';

const ACCEPTABLE_IMAGE_TYPES = [
  'image/',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/webp',
];

export const DragDropPasteExtension = defineExtension({
  name: '@lexical/playground/DragDropPaste',
  config: {
    // Optional observation only: the host decides whether saving waits for import.
    onImport: undefined as ((task: Promise<void>, cancel: () => void) => void) | undefined,
  },
  register: (editor, config, state) => {
    const signal = state.getSignal();
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        let cancelled = false;
        const task = (async (): Promise<void> => {
          const filesResult = await mediaFileReader(
            files,
            [ACCEPTABLE_IMAGE_TYPES].flatMap((x) => x),
          );
          if (cancelled || signal.aborted) return;
          for (const {file, result} of filesResult) {
            if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
              editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                altText: file.name,
                src: result,
              });
            }
          }
        })();
        // Cancellation suppresses insertion; mediaFileReader itself is not abortable.
        void task.catch(console.error);
        config.onImport?.(task, () => { cancelled = true; });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  },
});
