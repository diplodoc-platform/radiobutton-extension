import MarkdownIt from 'markdown-it';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import Token from 'markdown-it/lib/token';

import {addHiddenProperty, generateID} from './utils';
import {copyRuntimeFiles} from './copyRuntimeFiles';
import {getName, getRadioButtonId, getRadioButtonKey} from './getRadioButtonId';
import {
  ACTIVE_CLASSNAME,
  DEFAULT_RADIO_BUTTONS_GROUP_PREFIX,
  GROUP_DATA_KEY,
  RADIO_BUTTONS_LIST_CLASSNAME,
  RADIO_BUTTON_ACTIVE_KEY,
  RADIO_BUTTON_CLASSNAME,
  RADIO_BUTTON_DATA_ID,
  RADIO_BUTTON_DATA_KEY,
  RADIO_BUTTON_PANEL_CLASSNAME,
} from '../common';

export type PluginOptions = {
  runtimeJsPath: string;
  runtimeCssPath: string;
  containerClasses: string;
  bundle: boolean;
};

const RADIO_BUTTON_RE = /`?{% list radio( group=([^ ]*))? %}`?/;

let runsCounter = 0;

export type RadioButton = {
  name: string;
  tokens: Token[];
  listItem: Token;
};

type TransformOptions = {
  output?: string;
};

function findRadioButtons(tokens: Token[], idx: number) {
  const radioButtons = [];
  let i = idx,
    nestedLevel = -1,
    pending: RadioButton = {name: '', tokens: [], listItem: new Token('list_item_open', '', 0)};

  while (i < tokens.length) {
    const token = tokens[i];

    switch (token.type) {
      case 'ordered_list_open':
      case 'bullet_list_open':
        if (nestedLevel > -1) {
          pending.tokens.push(token);
        }
        nestedLevel++;
        break;
      case 'list_item_open':
        if (nestedLevel) {
          pending.tokens.push(token);
        } else {
          pending = {name: '', tokens: [], listItem: token};
        }
        break;
      case 'list_item_close':
        if (nestedLevel) {
          pending.tokens.push(token);
        } else {
          radioButtons.push(pending);
        }
        break;
      case 'ordered_list_close':
      case 'bullet_list_close':
        if (!nestedLevel) {
          return {
            radioButtons,
            index: i,
          };
        }

        nestedLevel--;

        pending.tokens.push(token);

        break;
      case 'paragraph_open':
        if (!pending && tokens[i + 1].content && tokens[i + 1].content.trim() === '{% endlist %}') {
          return {
            radioButtons,
            index: i + 2,
          };
        }

        if (!pending.name && tokens[i + 1].type === 'inline') {
          pending.name = tokens[i + 1].content;
          i += 2;
        } else {
          pending.tokens.push(token);
        }
        break;
      default:
        pending.tokens.push(token);
    }

    i++;
  }

  return {
    radioButtons,
    index: i,
  };
}

function insertRadioButtons(
  radioButtons: RadioButton[],
  state: StateCore,
  {start, end}: {start: number; end: number},
  {
    containerClasses,
    radioButtonsGroup,
    runId,
  }: {containerClasses: string; radioButtonsGroup: string; runId: string},
) {
  const radioButtonsTokens = [];
  const radioButtonListTokens = [];
  const radioButtonPanelsTokens = [];
  const radioButtonsOpen = new state.Token('radio_buttons_open', 'div', 1);
  const radioButtonsClose = new state.Token('radio_buttons_close', 'div', -1);
  const radioButtonListOpen = new state.Token('radio_buttons-list_open', 'div', 1);
  const radioButtonListClose = new state.Token('radio_buttons-list_close', 'div', -1);

  if (radioButtons.length) {
    const [start] = radioButtons[0].listItem.map ?? [null];
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (start == null) {
      throw new Error('failed to parse line mapping');
    }

    const [_, end] = radioButtons[radioButtons.length - 1].listItem.map ?? [null, null];
    // eslint-disable-next-line no-eq-null, eqeqeq
    if (end == null) {
      throw new Error('failed to parse line mapping');
    }

    radioButtonListOpen.map = [start, end];
  }

  radioButtonsOpen.block = true;
  radioButtonsClose.block = true;
  radioButtonListOpen.block = true;
  radioButtonListClose.block = true;

  radioButtonsOpen.attrSet(
    'class',
    [RADIO_BUTTON_CLASSNAME, containerClasses].filter(Boolean).join(' '),
  );
  radioButtonsOpen.attrSet(GROUP_DATA_KEY, radioButtonsGroup);
  radioButtonListOpen.attrSet('class', RADIO_BUTTONS_LIST_CLASSNAME);
  radioButtonListOpen.attrSet('role', 'radioButtonlist');

  for (let i = 0; i < radioButtons.length; i++) {
    const radioButtonOpen = new state.Token('radioButton_open', 'div', 1);
    const radioButtonInline = new state.Token('inline', '', 0);
    const radioButtonText = new state.Token('text', '', 0);
    const radioButtonClose = new state.Token('radioButton_close', 'div', -1);
    const radioButtonPanelOpen = new state.Token('radioButton-panel_open', 'div', 1);
    const radioButtonPanelClose = new state.Token('radioButton-panel_close', 'div', -1);

    const radioButton = radioButtons[i];
    const radioButtonId = getRadioButtonId(radioButton, {runId});
    const radioButtonKey = getRadioButtonKey(radioButton);
    radioButton.name = getName(radioButton);

    const radioButtonPanelId = generateID();

    radioButtonOpen.map = radioButtons[i].listItem.map;
    radioButtonOpen.markup = radioButtons[i].listItem.markup;
    radioButtonText.content = radioButtons[i].name;
    radioButtonInline.children = [radioButtonText];
    radioButtonOpen.block = true;
    radioButtonClose.block = true;
    radioButtonPanelOpen.block = true;
    radioButtonPanelClose.block = true;
    radioButtonOpen.attrSet(RADIO_BUTTON_DATA_ID, radioButtonId);
    radioButtonOpen.attrSet(RADIO_BUTTON_DATA_KEY, radioButtonKey);
    radioButtonOpen.attrSet(RADIO_BUTTON_ACTIVE_KEY, i === 0 ? 'true' : 'false');
    radioButtonOpen.attrSet('class', RADIO_BUTTON_CLASSNAME);
    radioButtonOpen.attrSet('role', 'radioButton');
    radioButtonOpen.attrSet('aria-controls', radioButtonPanelId);
    radioButtonOpen.attrSet('aria-selected', 'false');
    radioButtonOpen.attrSet('radioButtonindex', i === 0 ? '0' : '-1');
    radioButtonPanelOpen.attrSet('id', radioButtonPanelId);
    radioButtonPanelOpen.attrSet('class', RADIO_BUTTON_PANEL_CLASSNAME);
    radioButtonPanelOpen.attrSet('role', 'radioButtonpanel');
    radioButtonPanelOpen.attrSet('aria-labelledby', radioButtonId);
    radioButtonPanelOpen.attrSet('data-title', radioButton.name);

    if (i === 0) {
      radioButtonOpen.attrJoin('class', ACTIVE_CLASSNAME);
      radioButtonOpen.attrSet('aria-selected', 'true');
      radioButtonPanelOpen.attrJoin('class', ACTIVE_CLASSNAME);
    }

    radioButtonListTokens.push(radioButtonOpen, radioButtonInline, radioButtonClose);
    radioButtonPanelsTokens.push(
      radioButtonPanelOpen,
      ...radioButtons[i].tokens,
      radioButtonPanelClose,
    );
  }

  radioButtonsTokens.push(radioButtonsOpen);
  radioButtonsTokens.push(radioButtonListOpen);
  radioButtonsTokens.push(...radioButtonListTokens);
  radioButtonsTokens.push(radioButtonListClose);
  radioButtonsTokens.push(...radioButtonPanelsTokens);
  radioButtonsTokens.push(radioButtonsClose);

  state.tokens.splice(start, end - start + 1, ...radioButtonsTokens);

  return radioButtonsTokens.length;
}

function findCloseTokenIdx(tokens: Token[], idx: number) {
  let level = 0;
  let i = idx;
  while (i < tokens.length) {
    if (matchOpenToken(tokens, i)) {
      level++;
    } else if (matchCloseToken(tokens, i)) {
      if (level === 0) {
        return i;
      }
      level--;
    }

    i++;
  }

  return null;
}

function matchCloseToken(tokens: Token[], i: number) {
  return (
    tokens[i].type === 'paragraph_open' &&
    tokens[i + 1].type === 'inline' &&
    tokens[i + 1].content.trim() === '{% endlist %}'
  );
}

function matchOpenToken(tokens: Token[], i: number) {
  return (
    tokens[i].type === 'paragraph_open' &&
    tokens[i + 1].type === 'inline' &&
    tokens[i + 1].content.match(RADIO_BUTTON_RE)
  );
}

export function transform({
  runtimeJsPath = '_assets/radioButtons-extension.js',
  runtimeCssPath = '_assets/radioButtons-extension.css',
  containerClasses = '',
  bundle = true,
}: Partial<PluginOptions> = {}) {
  return function radioButtons(md: MarkdownIt, options?: TransformOptions) {
    const {output = '.'} = options || {};
    const plugin = (state: StateCore) => {
      const {env, tokens} = state;
      const runId = String(++runsCounter);

      addHiddenProperty(env, 'bundled', new Set<string>());

      let i = 0;
      let radioButtonsAreInserted = false;

      while (i < tokens.length) {
        const match = matchOpenToken(tokens, i);
        const openTag = match && match[0];
        const isNotEscaped = openTag && !(openTag.startsWith('`') && openTag.endsWith('`'));

        if (!match || !isNotEscaped) {
          i++;
          continue;
        }

        const closeTokenIdx = findCloseTokenIdx(tokens, i + 3);

        if (!closeTokenIdx) {
          tokens[i].attrSet('YFM005', 'true');
          i += 3;
          continue;
        }

        const radioButtonsGroup =
          match[2] || `${DEFAULT_RADIO_BUTTONS_GROUP_PREFIX}${generateID()}`;

        const {radioButtons, index} = findRadioButtons(state.tokens, i + 3);

        if (radioButtons.length > 0) {
          insertRadioButtons(
            radioButtons,
            state,
            {start: i, end: index + 3},
            {
              containerClasses,
              radioButtonsGroup,
              runId,
            },
          );
          i++;
          radioButtonsAreInserted = true;
        } else {
          state.tokens.splice(i, index - i);
        }
      }

      if (radioButtonsAreInserted) {
        env.meta = env.meta || {};
        env.meta.script = env.meta.script || [];
        env.meta.style = env.meta.style || [];
        env.meta.script.push(runtimeJsPath);
        env.meta.style.push(runtimeCssPath);

        if (bundle) {
          copyRuntimeFiles({runtimeJsPath, runtimeCssPath, output}, env.bundled);
        }
      }
    };

    try {
      md.core.ruler.before('curly_attributes', 'radioButtons', plugin);
    } catch (e) {
      md.core.ruler.push('radioButtons', plugin);
    }
  };
}
