import {$generateHtmlFromNodes} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import { LexicalEditor } from 'lexical';
import {useEffect, useRef} from 'react';

interface Props {
  onChange: (editor: LexicalEditor) => void;
  editor: LexicalEditor;
  /** Throttle delay in ms. Defaults to 300. */
  throttleMs?: number;
}

export function OnChangePlugin({onChange, throttleMs = 300, editor}: Props): null {

  // Always-current ref so the listener closure never captures a stale callback,
  // and the subscription effect does not need to re-run when onChange changes.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = editor.registerUpdateListener(({editorState}) => {
      if (timerId !== null) clearTimeout(timerId);
      timerId = setTimeout(() => {
        timerId = null;
        editorState.read(() => {
          onChangeRef.current(editor);
        });
      }, throttleMs);
    });

    return () => {
      if (timerId !== null) clearTimeout(timerId);
      unsubscribe();
    };
  }, [editor, throttleMs]);

  return null;
}
