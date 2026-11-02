/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import * as React from 'react';
import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';

import Modal from '../ui/Modal';

// An optional owner can close its dialogs without recreating their components.
export const ModalResetContext = createContext(0);

export default function useModal(): [
  JSX.Element | null,
  (title: string, showModal: (onClose: () => void) => JSX.Element) => void,
] {
  const resetKey = useContext(ModalResetContext);
  const [modalContent, setModalContent] = useState<null | {
    resetKey: number;
    closeOnClickOutside: boolean;
    content: JSX.Element;
    title: string;
  }>(null);

  const onClose = useCallback(() => {
    setModalContent(current => current?.resetKey === resetKey ? null : current);
  }, [resetKey]);

  useEffect(() => {
    setModalContent(current => current?.resetKey === resetKey ? current : null);
  }, [resetKey]);

  const modal = useMemo(() => {
    if (modalContent === null || modalContent.resetKey !== resetKey) {
      return null;
    }
    const {title, content, closeOnClickOutside} = modalContent;
    return (
      <Modal
        onClose={onClose}
        title={title}
        closeOnClickOutside={closeOnClickOutside}>
        {content}
      </Modal>
    );
  }, [modalContent, onClose, resetKey]);

  const showModal = useCallback(
    (
      title: string,
      // eslint-disable-next-line no-shadow
      getContent: (onClose: () => void) => JSX.Element,
      closeOnClickOutside = false,
    ) => {
      setModalContent({
        resetKey,
        closeOnClickOutside,
        content: getContent(onClose),
        title,
      });
    },
    [onClose, resetKey],
  );

  return [modal, showModal];
}
