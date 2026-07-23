/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from 'lexical';

/**
 * Kind of entity a mention references. Drives the yzx:// deep-link path used
 * by the markdown transformer and is handed back through onMentionClick.
 * Absent on a node means 'note' (the original, most common kind).
 */
export type MentionEntityType = 'note' | 'reference' | 'notebook';

const MENTION_ENTITY_TYPES: ReadonlyArray<MentionEntityType> = [
  'note',
  'reference',
  'notebook',
];

export function isMentionEntityType(
  value: unknown,
): value is MentionEntityType {
  return MENTION_ENTITY_TYPES.includes(value as MentionEntityType);
}

export type SerializedMentionNode = Spread<
  {
    mentionName: string;
    id?: string;
    entityType?: MentionEntityType;
  },
  SerializedTextNode
>;

function $convertMentionElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const textContent = domNode.textContent;
  const mentionName = domNode.getAttribute('data-lexical-mention-name');
  const mentionId = domNode.getAttribute('data-lexical-mention-id');
  const mentionType = domNode.getAttribute('data-lexical-mention-type');

  if (textContent !== null) {
    const node = $createMentionNode(
      typeof mentionName === 'string' ? mentionName : textContent,
      textContent,
      mentionId ?? undefined,
      isMentionEntityType(mentionType) ? mentionType : undefined,
    );
    return {
      node,
    };
  }

  return null;
}

const mentionBackgroundColor = 'rgba(24, 119, 232, 0.2)';
export class MentionNode extends TextNode {
  __mention: string;
  /** Referenced entity id (e.g. note-node guid); absent on legacy content. */
  __id?: string;
  /** Referenced entity kind; absent means 'note' (legacy default). */
  __entityType?: MentionEntityType;

  static getType(): string {
    return 'mention';
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(
      node.__mention,
      node.__text,
      node.__id,
      node.__entityType,
      node.__key,
    );
  }
  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(
      serializedNode.mentionName,
      undefined,
      serializedNode.id,
      serializedNode.entityType,
    ).updateFromJSON(serializedNode);
  }

  constructor(
    mentionName: string,
    text?: string,
    id?: string,
    entityType?: MentionEntityType,
    key?: NodeKey,
  ) {
    super(text ?? mentionName, key);
    this.__mention = mentionName;
    this.__id = id;
    this.__entityType = entityType;
  }

  getMentionName(): string {
    return this.getLatest().__mention;
  }

  getMentionId(): string | undefined {
    return this.getLatest().__id;
  }

  getMentionEntityType(): MentionEntityType {
    return this.getLatest().__entityType ?? 'note';
  }

  exportJSON(): SerializedMentionNode {
    const json: SerializedMentionNode = {
      ...super.exportJSON(),
      mentionName: this.__mention,
    };
    if (this.__id) {
      json.id = this.__id;
    }
    // 'note' stays implicit so pre-existing note mentions keep their exact
    // serialized shape.
    if (this.__entityType && this.__entityType !== 'note') {
      json.entityType = this.__entityType;
    }
    return json;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.style.backgroundColor = mentionBackgroundColor;
    dom.className = 'mention';
    dom.spellcheck = false;

    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span');
    element.setAttribute('data-lexical-mention', 'true');
    if (this.__text !== this.__mention) {
      element.setAttribute('data-lexical-mention-name', this.__mention);
    }
    if (this.__id) {
      element.setAttribute('data-lexical-mention-id', this.__id);
    }
    if (this.__entityType && this.__entityType !== 'note') {
      element.setAttribute('data-lexical-mention-type', this.__entityType);
    }
    element.textContent = this.__text;
    return {element};
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute('data-lexical-mention')) {
          return null;
        }
        return {
          conversion: $convertMentionElement,
          priority: 1,
        };
      },
    };
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createMentionNode(
  mentionName: string,
  textContent?: string,
  id?: string,
  entityType?: MentionEntityType,
): MentionNode {
  const mentionNode = new MentionNode(
    mentionName,
    textContent ?? mentionName,
    id,
    entityType,
  );
  mentionNode.setMode('segmented').toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
