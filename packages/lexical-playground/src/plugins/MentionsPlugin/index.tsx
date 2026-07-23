/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  MenuTextMatch,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  $getNearestNodeFromDOMNode,
  CLICK_COMMAND,
  COMMAND_PRIORITY_LOW,
  TextNode,
} from 'lexical';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {
  type MentionLookupValue,
  useMentionLookupProvider,
} from '../../context/MentionLookupContext';
import {
  $createMentionNode,
  $isMentionNode,
  type MentionEntityType,
} from '../../nodes/MentionNode';

/**
 * Internal menu entry. Host-supplied candidates always carry an id
 * (MentionCandidate); the playground's dummy dataset provides names only.
 */
type MentionEntry = {
  id?: string;
  name: string;
  meta?: string;
  type?: MentionEntityType;
  icon?: string;
};

const PUNCTUATION =
  '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
const NAME = '\\b[A-Z][^\\s' + PUNCTUATION + ']';

const DocumentMentionsRegex = {
  NAME,
  PUNCTUATION,
};

const PUNC = DocumentMentionsRegex.PUNCTUATION;

const TRIGGERS = ['@'].join('');

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = '[^' + TRIGGERS + PUNC + '\\s]';

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
  '(?:' +
  '\\.[ |$]|' + // E.g. "r. " in "Mr. Smith"
  ' |' + // E.g. " " in "Josh Duck"
  '[' +
  PUNC +
  ']|' + // E.g. "-' in "Salier-Hellendag"
  ')';

const LENGTH_LIMIT = 75;

// Characters accepted as the context preceding an '@' trigger. Latin prose
// always separates a mention with whitespace, but CJK prose has no word
// spacing — "参见@节点" must trigger too — so CJK ideographs, CJK punctuation
// and full-width forms are valid leading context as well. Letters/digits stay
// excluded so email-like text ("a@b") never triggers.
const TRIGGER_LEAD =
  '(^|\\s|\\(|[\\u3000-\\u303f\\u4e00-\\u9fff\\uff00-\\uffef])';

const AtSignMentionsRegex = new RegExp(
  TRIGGER_LEAD +
    '(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    VALID_JOINS +
    '){0,' +
    LENGTH_LIMIT +
    '})' +
    ')$',
);

// 50 is the longest alias length limit.
const ALIAS_LENGTH_LIMIT = 50;

// Regex used to match alias.
const AtSignMentionsRegexAliasRegex = new RegExp(
  TRIGGER_LEAD +
    '(' +
    '[' +
    TRIGGERS +
    ']' +
    '((?:' +
    VALID_CHARS +
    '){0,' +
    ALIAS_LENGTH_LIMIT +
    '})' +
    ')$',
);

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

const dummyMentionsData = [
  'Aayla Secura',
  'Adi Gallia',
  'Admiral Dodd Rancit',
  'Admiral Firmus Piett',
  'Admiral Gial Ackbar',
  'Admiral Ozzel',
  'Admiral Raddus',
  'Admiral Terrinald Screed',
  'Admiral Trench',
  'Admiral U.O. Statura',
  'Agen Kolar',
  'Agent Kallus',
  'Aiolin and Morit Astarte',
  'Aks Moe',
  'Almec',
  'Alton Kastle',
  'Amee',
  'AP-5',
  'Armitage Hux',
  'Artoo',
  'Arvel Crynyd',
  'Asajj Ventress',
  'Aurra Sing',
  'AZI-3',
  'Bala-Tik',
  'Barada',
  'Bargwill Tomder',
  'Baron Papanoida',
  'Barriss Offee',
  'Baze Malbus',
  'Bazine Netal',
  'BB-8',
  'BB-9E',
  'Ben Quadinaros',
  'Berch Teller',
  'Beru Lars',
  'Bib Fortuna',
  'Biggs Darklighter',
  'Black Krrsantan',
  'Bo-Katan Kryze',
  'Boba Fett',
  'Bobbajo',
  'Bodhi Rook',
  'Borvo the Hutt',
  'Boss Nass',
  'Bossk',
  'Breha Antilles-Organa',
  'Bren Derlin',
  'Brendol Hux',
  'BT-1',
  'C-3PO',
  'C1-10P',
  'Cad Bane',
  'Caluan Ematt',
  'Captain Gregor',
  'Captain Phasma',
  'Captain Quarsh Panaka',
  'Captain Rex',
  'Carlist Rieekan',
  'Casca Panzoro',
  'Cassian Andor',
  'Cassio Tagge',
  'Cham Syndulla',
  'Che Amanwe Papanoida',
  'Chewbacca',
  'Chi Eekway Papanoida',
  'Chief Chirpa',
  'Chirrut Îmwe',
  'Ciena Ree',
  'Cin Drallig',
  'Clegg Holdfast',
  'Cliegg Lars',
  'Coleman Kcaj',
  'Coleman Trebor',
  'Colonel Kaplan',
  'Commander Bly',
  'Commander Cody (CC-2224)',
  'Commander Fil (CC-3714)',
  'Commander Fox',
  'Commander Gree',
  'Commander Jet',
  'Commander Wolffe',
  'Conan Antonio Motti',
  'Conder Kyl',
  'Constable Zuvio',
  'Cordé',
  'Cpatain Typho',
  'Crix Madine',
  'Cut Lawquane',
  'Dak Ralter',
  'Dapp',
  'Darth Bane',
  'Darth Maul',
  'Darth Tyranus',
  'Daultay Dofine',
  'Del Meeko',
  'Delian Mors',
  'Dengar',
  'Depa Billaba',
  'Derek Klivian',
  'Dexter Jettster',
  'Dineé Ellberger',
  'DJ',
  'Doctor Aphra',
  'Doctor Evazan',
  'Dogma',
  'Dormé',
  'Dr. Cylo',
  'Droidbait',
  'Droopy McCool',
  'Dryden Vos',
  'Dud Bolt',
  'Ebe E. Endocott',
  'Echuu Shen-Jon',
  'Eeth Koth',
  'Eighth Brother',
  'Eirtaé',
  'Eli Vanto',
  'Ellé',
  'Ello Asty',
  'Embo',
  'Eneb Ray',
  'Enfys Nest',
  'EV-9D9',
  'Evaan Verlaine',
  'Even Piell',
  'Ezra Bridger',
  'Faro Argyus',
  'Feral',
  'Fifth Brother',
  'Finis Valorum',
  'Finn',
  'Fives',
  'FN-1824',
  'FN-2003',
  'Fodesinbeed Annodue',
  'Fulcrum',
  'FX-7',
  'GA-97',
  'Galen Erso',
  'Gallius Rax',
  'Garazeb "Zeb" Orrelios',
  'Gardulla the Hutt',
  'Garrick Versio',
  'Garven Dreis',
  'Gavyn Sykes',
  'Gideon Hask',
  'Gizor Dellso',
  'Gonk droid',
  'Grand Inquisitor',
  'Greeata Jendowanian',
  'Greedo',
  'Greer Sonnel',
  'Grievous',
  'Grummgar',
  'Gungi',
  'Hammerhead',
  'Han Solo',
  'Harter Kalonia',
  'Has Obbit',
  'Hera Syndulla',
  'Hevy',
  'Hondo Ohnaka',
  'Huyang',
  'Iden Versio',
  'IG-88',
  'Ima-Gun Di',
  'Inquisitors',
  'Inspector Thanoth',
  'Jabba',
  'Jacen Syndulla',
  'Jan Dodonna',
  'Jango Fett',
  'Janus Greejatus',
  'Jar Jar Binks',
  'Jas Emari',
  'Jaxxon',
  'Jek Tono Porkins',
  'Jeremoch Colton',
  'Jira',
  'Jobal Naberrie',
  'Jocasta Nu',
  'Joclad Danva',
  'Joh Yowza',
  'Jom Barell',
  'Joph Seastriker',
  'Jova Tarkin',
  'Jubnuk',
  'Jyn Erso',
  'K-2SO',
  'Kanan Jarrus',
  'Karbin',
  'Karina the Great',
  'Kes Dameron',
  'Ketsu Onyo',
  'Ki-Adi-Mundi',
  'King Katuunko',
  'Kit Fisto',
  'Kitster Banai',
  'Klaatu',
  'Klik-Klak',
  'Korr Sella',
  'Kylo Ren',
  'L3-37',
  'Lama Su',
  'Lando Calrissian',
  'Lanever Villecham',
  'Leia Organa',
  'Letta Turmond',
  'Lieutenant Kaydel Ko Connix',
  'Lieutenant Thire',
  'Lobot',
  'Logray',
  'Lok Durd',
  'Longo Two-Guns',
  'Lor San Tekka',
  'Lorth Needa',
  'Lott Dod',
  'Luke Skywalker',
  'Lumat',
  'Luminara Unduli',
  'Lux Bonteri',
  'Lyn Me',
  'Lyra Erso',
  'Mace Windu',
  'Malakili',
  'Mama the Hutt',
  'Mars Guo',
  'Mas Amedda',
  'Mawhonic',
  'Max Rebo',
  'Maximilian Veers',
  'Maz Kanata',
  'ME-8D9',
  'Meena Tills',
  'Mercurial Swift',
  'Mina Bonteri',
  'Miraj Scintel',
  'Mister Bones',
  'Mod Terrik',
  'Moden Canady',
  'Mon Mothma',
  'Moradmin Bast',
  'Moralo Eval',
  'Morley',
  'Mother Talzin',
  'Nahdar Vebb',
  'Nahdonnis Praji',
  'Nien Nunb',
  'Niima the Hutt',
  'Nines',
  'Norra Wexley',
  'Nute Gunray',
  'Nuvo Vindi',
  'Obi-Wan Kenobi',
  'Odd Ball',
  'Ody Mandrell',
  'Omi',
  'Onaconda Farr',
  'Oola',
  'OOM-9',
  'Oppo Rancisis',
  'Orn Free Taa',
  'Oro Dassyne',
  'Orrimarko',
  'Osi Sobeck',
  'Owen Lars',
  'Pablo-Jill',
  'Padmé Amidala',
  'Pagetti Rook',
  'Paige Tico',
  'Paploo',
  'Petty Officer Thanisson',
  'Pharl McQuarrie',
  'Plo Koon',
  'Po Nudo',
  'Poe Dameron',
  'Poggle the Lesser',
  'Pong Krell',
  'Pooja Naberrie',
  'PZ-4CO',
  'Quarrie',
  'Quay Tolsite',
  'Queen Apailana',
  'Queen Jamillia',
  'Queen Neeyutnee',
  'Qui-Gon Jinn',
  'Quiggold',
  'Quinlan Vos',
  'R2-D2',
  'R2-KT',
  'R3-S6',
  'R4-P17',
  'R5-D4',
  'RA-7',
  'Rabé',
  'Rako Hardeen',
  'Ransolm Casterfo',
  'Rappertunie',
  'Ratts Tyerell',
  'Raymus Antilles',
  'Ree-Yees',
  'Reeve Panzoro',
  'Rey',
  'Ric Olié',
  'Riff Tamson',
  'Riley',
  'Rinnriyin Di',
  'Rio Durant',
  'Rogue Squadron',
  'Romba',
  'Roos Tarpals',
  'Rose Tico',
  'Rotta the Hutt',
  'Rukh',
  'Rune Haako',
  'Rush Clovis',
  'Ruwee Naberrie',
  'Ryoo Naberrie',
  'Sabé',
  'Sabine Wren',
  'Saché',
  'Saelt-Marae',
  'Saesee Tiin',
  'Salacious B. Crumb',
  'San Hill',
  'Sana Starros',
  'Sarco Plank',
  'Sarkli',
  'Satine Kryze',
  'Savage Opress',
  'Sebulba',
  'Senator Organa',
  'Sergeant Kreel',
  'Seventh Sister',
  'Shaak Ti',
  'Shara Bey',
  'Shmi Skywalker',
  'Shu Mai',
  'Sidon Ithano',
  'Sifo-Dyas',
  'Sim Aloo',
  'Siniir Rath Velus',
  'Sio Bibble',
  'Sixth Brother',
  'Slowen Lo',
  'Sly Moore',
  'Snaggletooth',
  'Snap Wexley',
  'Snoke',
  'Sola Naberrie',
  'Sora Bulq',
  'Strono Tuggs',
  'Sy Snootles',
  'Tallissan Lintra',
  'Tarfful',
  'Tasu Leech',
  'Taun We',
  'TC-14',
  'Tee Watt Kaa',
  'Teebo',
  'Teedo',
  'Teemto Pagalies',
  'Temiri Blagg',
  'Tessek',
  'Tey How',
  'Thane Kyrell',
  'The Bendu',
  'The Smuggler',
  'Thrawn',
  'Tiaan Jerjerrod',
  'Tion Medon',
  'Tobias Beckett',
  'Tulon Voidgazer',
  'Tup',
  'U9-C4',
  'Unkar Plutt',
  'Val Beckett',
  'Vanden Willard',
  'Vice Admiral Amilyn Holdo',
  'Vober Dand',
  'WAC-47',
  'Wag Too',
  'Wald',
  'Walrus Man',
  'Warok',
  'Wat Tambor',
  'Watto',
  'Wedge Antilles',
  'Wes Janson',
  'Wicket W. Warrick',
  'Wilhuff Tarkin',
  'Wollivan',
  'Wuher',
  'Wullf Yularen',
  'Xamuel Lennox',
  'Yaddle',
  'Yarael Poof',
  'Yoda',
  'Zam Wesell',
  'Zev Senesca',
  'Ziro the Hutt',
  'Zuckuss',
];

const dummyLookupService = {
  search(string: string, callback: (results: Array<string>) => void): void {
    setTimeout(() => {
      const results = dummyMentionsData.filter((mention) =>
        mention.toLowerCase().includes(string.toLowerCase()),
      );
      callback(results);
    }, 500);
  },
};

function useMentionLookupService(
  mentionString: string | null,
  provider: MentionLookupValue | undefined,
) {
  const [results, setResults] = useState<Array<MentionEntry>>([]);

  // Per-editor-instance cache (the module-level Map it replaces was shared
  // across every editor and could never be invalidated). Reset whenever the
  // host swaps its lookup implementation.
  const cacheRef = useRef<Map<string, Array<MentionEntry>>>(new Map());
  const lookupRef = useRef(provider?.lookup);
  if (lookupRef.current !== provider?.lookup) {
    lookupRef.current = provider?.lookup;
    cacheRef.current = new Map();
  }

  useEffect(() => {
    if (mentionString == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }

    const cache = cacheRef.current;
    const cachedResults = cache.get(mentionString);
    if (cachedResults !== undefined) {
      setResults(cachedResults);
      return;
    }

    let cancelled = false;
    if (provider) {
      provider
        .lookup(mentionString)
        .then((candidates) => {
          if (cancelled) {
            return;
          }
          cache.set(mentionString, candidates);
          setResults(candidates);
        })
        .catch((error) => {
          if (!cancelled) {
            console.error('[MentionsPlugin] mention lookup failed:', error);
          }
        });
    } else {
      // No provider mounted at all (playground dev app) — dummy dataset.
      dummyLookupService.search(mentionString, (names) => {
        if (cancelled) {
          return;
        }
        const candidates = names.map((name): MentionEntry => ({name}));
        cache.set(mentionString, candidates);
        setResults(candidates);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [mentionString, provider]);

  return results;
}

function checkForAtSignMentions(
  text: string,
  minMatchLength: number,
): MenuTextMatch | null {
  let match = AtSignMentionsRegex.exec(text);

  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }
  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];

    const matchingString = match[3];
    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
  return checkForAtSignMentions(text, 1);
}

class MentionTypeaheadOption extends MenuOption {
  id?: string;
  name: string;
  meta?: string;
  entityType?: MentionEntityType;
  picture: JSX.Element;

  constructor(entry: MentionEntry, picture: JSX.Element) {
    super(entry.id ?? entry.name);
    this.id = entry.id;
    this.name = entry.name;
    this.meta = entry.meta;
    this.entityType = entry.type;
    this.picture = picture;
    this.title = (
      <>
        {picture} {entry.name}
        {entry.meta ? (
          <span className="mention-meta">{entry.meta}</span>
        ) : null}
      </>
    );
  }
}

export default function NewMentionsPlugin(): JSX.Element | null {
  const provider = useMentionLookupProvider();

  // null = standalone mount without a host lookup: the feature is inert.
  // undefined = no provider in the tree (playground dev app): dummy fallback.
  if (provider === null) {
    return null;
  }

  return <MentionsPluginImpl provider={provider} />;
}

function MentionsPluginImpl({
  provider,
}: {
  provider: MentionLookupValue | undefined;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  const [queryString, setQueryString] = useState<string | null>(null);

  const results = useMentionLookupService(queryString, provider);

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const onMentionClick = provider?.onClick;
  useEffect(() => {
    if (!onMentionClick) {
      return;
    }
    return editor.registerCommand<MouseEvent>(
      CLICK_COMMAND,
      (event) => {
        const target = event.target;
        if (!(target instanceof Node)) {
          return false;
        }
        const node = $getNearestNodeFromDOMNode(target);
        if ($isMentionNode(node)) {
          onMentionClick({
            id: node.getMentionId(),
            name: node.getMentionName(),
            type: node.getMentionEntityType(),
          });
        }
        // Never claim the event — caret placement etc. proceeds as usual.
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onMentionClick]);

  const options = useMemo(() => {
    // Icon resolution per entry: candidate icon → feature-level icon →
    // stock user avatar. All host icons are plain text symbols (strings
    // cross the UMD boundary; JSX cannot).
    const fallbackIcon = provider?.icon;
    const iconFor = (entry: MentionEntry) => {
      const symbol = entry.icon ?? fallbackIcon;
      return symbol ? (
        <span className="icon mention-icon">{symbol}</span>
      ) : (
        <i className="icon user" />
      );
    };
    return results
      .map((result) => new MentionTypeaheadOption(result, iconFor(result)))
      .slice(0, SUGGESTION_LIST_LENGTH_LIMIT);
  }, [results, provider?.icon]);

  const onSelectOption = useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        // mentionName keeps the bare name (source of truth); the visible text
        // carries the '@' prefix so editor, markdown and HTML read the same.
        const mentionNode = $createMentionNode(
          selectedOption.name,
          '@' + selectedOption.name,
          selectedOption.id,
          selectedOption.entityType,
        );
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        mentionNode.select();
        closeMenu();
      });
    },
    [editor],
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const slashMatch = checkForSlashTriggerMatch(text, editor);
      if (slashMatch !== null) {
        return null;
      }
      return getPossibleQueryMatch(text);
    },
    [checkForSlashTriggerMatch, editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
    />
  );
}
