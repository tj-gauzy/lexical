/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import './index.css';

import {useMergeRefs} from '@floating-ui/react';
import {$isCodeHighlightNode} from '@lexical/code';
import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  getDOMSelection,
  LexicalEditor,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import * as React from 'react';
import {Dispatch, useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import type {EditorPlugins} from '../../Editor';
import {useTranslate} from '../../context/LocalizationContext';
import {getDOMRangeRect} from '../../utils/getDOMRangeRect';
import {getSelectedNode} from '../../utils/getSelectedNode';
import {setFloatingElemPosition} from '../../utils/setFloatingElemPosition';
import {INSERT_INLINE_COMMAND} from '../CommentPlugin';

function TextFormatFloatingToolbar({
  editor,
  anchorElem,
  isLink,
  isBold,
  isItalic,
  isUnderline,
  isUppercase,
  isLowercase,
  isCapitalize,
  isCode,
  isStrikethrough,
  isSubscript,
  isSuperscript,
  isHighlight,
  setIsLinkEditMode,
  plugins = {},
  ref,
}: {
  editor: LexicalEditor;
  anchorElem: HTMLElement;
  isBold: boolean;
  isCode: boolean;
  isItalic: boolean;
  isLink: boolean;
  isUppercase: boolean;
  isLowercase: boolean;
  isCapitalize: boolean;
  isStrikethrough: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isUnderline: boolean;
  isHighlight: boolean;
  setIsLinkEditMode: Dispatch<boolean>;
  plugins?: EditorPlugins;
  ref?: React.Ref<HTMLDivElement | null>;
}): JSX.Element {
  const {comment = false} = plugins;
  const t = useTranslate();
  const popupCharStylesEditorRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergeRefs([popupCharStylesEditorRef, ref]);

  const insertLink = useCallback(() => {
    if (!isLink) {
      setIsLinkEditMode(true);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      setIsLinkEditMode(false);
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink, setIsLinkEditMode]);

  const insertComment = () => {
    editor.dispatchCommand(INSERT_INLINE_COMMAND, undefined);
  };

  function mouseMoveListener(e: MouseEvent) {
    if (
      popupCharStylesEditorRef?.current &&
      (e.buttons === 1 || e.buttons === 3)
    ) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== 'none') {
        const x = e.clientX;
        const y = e.clientY;
        const elementUnderMouse = document.elementFromPoint(x, y);

        if (!popupCharStylesEditorRef.current.contains(elementUnderMouse)) {
          // Mouse is not over the target element => not a normal click, but probably a drag
          popupCharStylesEditorRef.current.style.pointerEvents = 'none';
        }
      }
    }
  }
  function mouseUpListener(e: MouseEvent) {
    if (popupCharStylesEditorRef?.current) {
      if (popupCharStylesEditorRef.current.style.pointerEvents !== 'auto') {
        popupCharStylesEditorRef.current.style.pointerEvents = 'auto';
      }
    }
  }

  useEffect(() => {
    if (popupCharStylesEditorRef?.current) {
      document.addEventListener('mousemove', mouseMoveListener);
      document.addEventListener('mouseup', mouseUpListener);

      return () => {
        document.removeEventListener('mousemove', mouseMoveListener);
        document.removeEventListener('mouseup', mouseUpListener);
      };
    }
  }, [popupCharStylesEditorRef]);

  const $updateTextFormatFloatingToolbar = useCallback(() => {
    const selection = $getSelection();

    const popupCharStylesEditorElem = popupCharStylesEditorRef.current;
    const nativeSelection = getDOMSelection(editor._window);

    if (popupCharStylesEditorElem === null) {
      return;
    }

    const rootElement = editor.getRootElement();
    if (
      selection !== null &&
      nativeSelection !== null &&
      !nativeSelection.isCollapsed &&
      rootElement !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const rangeRect = getDOMRangeRect(nativeSelection, rootElement);

      setFloatingElemPosition(
        rangeRect,
        popupCharStylesEditorElem,
        anchorElem,
        isLink,
      );
    }
  }, [editor, anchorElem, isLink]);

  useEffect(() => {
    const scrollerElem = anchorElem.parentElement;

    const update = () => {
      editor.getEditorState().read(() => {
        $updateTextFormatFloatingToolbar();
      });
    };

    window.addEventListener('resize', update);
    if (scrollerElem) {
      scrollerElem.addEventListener('scroll', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      if (scrollerElem) {
        scrollerElem.removeEventListener('scroll', update);
      }
    };
  }, [editor, $updateTextFormatFloatingToolbar, anchorElem]);

  useEffect(() => {
    editor.getEditorState().read(() => {
      $updateTextFormatFloatingToolbar();
    });
    return mergeRegister(
      editor.registerUpdateListener(({editorState}) => {
        editorState.read(() => {
          $updateTextFormatFloatingToolbar();
        });
      }),

      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          $updateTextFormatFloatingToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, $updateTextFormatFloatingToolbar]);

  return (
    <div ref={mergedRef} className="floating-text-format-popup">
      {editor.isEditable() && (
        <>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'highlight');
            }}
            className={'popup-item spaced ' + (isHighlight ? 'active' : '')}
            title={t('floatingToolbar.highlight', 'Highlight')}
            aria-label={t('floatingToolbar.ariaHighlight', 'Format text with a highlight')}>
            <i className="format highlight" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            }}
            className={'popup-item spaced ' + (isBold ? 'active' : '')}
            title={t('floatingToolbar.bold', 'Bold')}
            aria-label={t('floatingToolbar.ariaBold', 'Format text as bold')}>
            <i className="format bold" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            }}
            className={'popup-item spaced ' + (isItalic ? 'active' : '')}
            title={t('floatingToolbar.italic', 'Italic')}
            aria-label={t('floatingToolbar.ariaItalic', 'Format text as italics')}>
            <i className="format italic" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            }}
            className={'popup-item spaced ' + (isUnderline ? 'active' : '')}
            title={t('floatingToolbar.underline', 'Underline')}
            aria-label={t('floatingToolbar.ariaUnderline', 'Format text to underlined')}>
            <i className="format underline" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
            }}
            className={'popup-item spaced ' + (isStrikethrough ? 'active' : '')}
            title={t('floatingToolbar.strikethrough', 'Strikethrough')}
            aria-label={t('floatingToolbar.ariaStrikethrough', 'Format text with a strikethrough')}>
            <i className="format strikethrough" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript');
            }}
            className={'popup-item spaced ' + (isSubscript ? 'active' : '')}
            title={t('floatingToolbar.subscript', 'Subscript')}
            aria-label={t('floatingToolbar.ariaSubscript', 'Format Subscript')}>
            <i className="format subscript" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript');
            }}
            className={'popup-item spaced ' + (isSuperscript ? 'active' : '')}
            title={t('floatingToolbar.superscript', 'Superscript')}
            aria-label={t('floatingToolbar.ariaSuperscript', 'Format Superscript')}>
            <i className="format superscript" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'uppercase');
            }}
            className={'popup-item spaced ' + (isUppercase ? 'active' : '')}
            title={t('floatingToolbar.uppercase', 'Uppercase')}
            aria-label={t('floatingToolbar.ariaUppercase', 'Format text to uppercase')}>
            <i className="format uppercase" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'lowercase');
            }}
            className={'popup-item spaced ' + (isLowercase ? 'active' : '')}
            title={t('floatingToolbar.lowercase', 'Lowercase')}
            aria-label={t('floatingToolbar.ariaLowercase', 'Format text to lowercase')}>
            <i className="format lowercase" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'capitalize');
            }}
            className={'popup-item spaced ' + (isCapitalize ? 'active' : '')}
            title={t('floatingToolbar.capitalize', 'Capitalize')}
            aria-label={t('floatingToolbar.ariaCapitalize', 'Format text to capitalize')}>
            <i className="format capitalize" />
          </button>
          <button
            type="button"
            onClick={() => {
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
            }}
            className={'popup-item spaced ' + (isCode ? 'active' : '')}
            title={t('floatingToolbar.code', 'Insert code block')}
            aria-label={t('floatingToolbar.ariaCode', 'Insert code block')}>
            <i className="format code" />
          </button>
          <button
            type="button"
            onClick={insertLink}
            className={'popup-item spaced ' + (isLink ? 'active' : '')}
            title={t('floatingToolbar.link', 'Insert link')}
            aria-label={t('floatingToolbar.ariaLink', 'Insert link')}>
            <i className="format link" />
          </button>
        </>
      )}
      {comment && (
        <button
          type="button"
          onClick={insertComment}
          className={'popup-item spaced insert-comment'}
          title={t('floatingToolbar.comment', 'Insert comment')}
          aria-label={t('floatingToolbar.ariaComment', 'Insert comment')}>
          <i className="format add-comment" />
        </button>
      )}
    </div>
  );
}

function useFloatingTextFormatToolbar(
  editor: LexicalEditor,
  anchorElem: HTMLElement,
  setIsLinkEditMode: Dispatch<boolean>,
  plugins: EditorPlugins,
): JSX.Element | null {
  const [isText, setIsText] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isUppercase, setIsUppercase] = useState(false);
  const [isLowercase, setIsLowercase] = useState(false);
  const [isCapitalize, setIsCapitalize] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isHighlight, setIsHighlight] = useState(false);

  const updatePopup = useCallback(() => {
    editor.getEditorState().read(() => {
      // Should not to pop up the floating toolbar when using IME input
      if (editor.isComposing()) {
        return;
      }
      const selection = $getSelection();
      const nativeSelection = getDOMSelection(editor._window);
      const rootElement = editor.getRootElement();

      if (
        nativeSelection !== null &&
        (!$isRangeSelection(selection) ||
          rootElement === null ||
          !rootElement.contains(nativeSelection.anchorNode))
      ) {
        setIsText(false);
        return;
      }

      if (!$isRangeSelection(selection)) {
        return;
      }

      const node = getSelectedNode(selection);

      // Update text format
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsUppercase(selection.hasFormat('uppercase'));
      setIsLowercase(selection.hasFormat('lowercase'));
      setIsCapitalize(selection.hasFormat('capitalize'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));
      setIsCode(selection.hasFormat('code'));
      setIsHighlight(selection.hasFormat('highlight'));

      // Update links
      const parent = node.getParent();
      if ($isLinkNode(parent) || $isLinkNode(node)) {
        setIsLink(true);
      } else {
        setIsLink(false);
      }

      if (
        !$isCodeHighlightNode(selection.anchor.getNode()) &&
        selection.getTextContent() !== ''
      ) {
        setIsText($isTextNode(node) || $isParagraphNode(node));
      } else {
        setIsText(false);
      }

      const rawTextContent = selection.getTextContent().replace(/\n/g, '');
      if (!selection.isCollapsed() && rawTextContent === '') {
        setIsText(false);
        return;
      }
    });
  }, [editor]);

  useEffect(() => {
    document.addEventListener('selectionchange', updatePopup);
    return () => {
      document.removeEventListener('selectionchange', updatePopup);
    };
  }, [updatePopup]);

  // Hide the popup while a drag is in progress. Otherwise it sits on top of
  // the drag image and the drop target, and re-renders from selectionchange
  // as the user drags. The popup re-appears once the drag ends (dragend) or
  // a drop completes on this page (drop).
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDragStart = () => {
      if (ref.current) {
        ref.current.style.display = 'none';
      }
    };
    const onDragEnd = () => {
      if (ref.current && ref.current.style.display === 'none') {
        ref.current.style.display = 'block';
      }
    };
    document.addEventListener('dragstart', onDragStart, true);
    document.addEventListener('dragend', onDragEnd, true);
    document.addEventListener('drop', onDragEnd, true);
    return () => {
      document.removeEventListener('dragstart', onDragStart, true);
      document.removeEventListener('dragend', onDragEnd, true);
      document.removeEventListener('drop', onDragEnd, true);
    };
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(() => {
        updatePopup();
      }),
      editor.registerRootListener(() => {
        if (editor.getRootElement() === null) {
          setIsText(false);
        }
      }),
    );
  }, [editor, updatePopup]);

  if (!isText || isLink) {
    return null;
  }

  return createPortal(
    <TextFormatFloatingToolbar
      editor={editor}
      anchorElem={anchorElem}
      ref={ref}
      isLink={isLink}
      isBold={isBold}
      isItalic={isItalic}
      isUppercase={isUppercase}
      isLowercase={isLowercase}
      isCapitalize={isCapitalize}
      isStrikethrough={isStrikethrough}
      isSubscript={isSubscript}
      isSuperscript={isSuperscript}
      isUnderline={isUnderline}
      isCode={isCode}
      isHighlight={isHighlight}
      setIsLinkEditMode={setIsLinkEditMode}
      plugins={plugins}
    />,
    anchorElem,
  );
}

export default function FloatingTextFormatToolbarPlugin({
  anchorElem = document.body,
  setIsLinkEditMode,
  plugins = {},
}: {
  anchorElem?: HTMLElement;
  setIsLinkEditMode: Dispatch<boolean>;
  plugins?: EditorPlugins;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  return useFloatingTextFormatToolbar(editor, anchorElem, setIsLinkEditMode, plugins);
}
