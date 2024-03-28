import type {RadioController} from './runtime/controller';

export const RADIO_BUTTONS_CLASSNAME = 'yfm-radio';
export const RADIO_BUTTONS_LIST_CLASSNAME = 'yfm-radio-buttons';
export const RADIO_BUTTON_CLASSNAME = 'yfm-radion-button';
export const RADIO_BUTTON_PANEL_CLASSNAME = 'yfm-radio-buttons-panel';
export const ACTIVE_CLASSNAME = 'active';

export const GROUP_DATA_KEY = 'data-diplodoc-group';
export const RADIO_BUTTON_DATA_KEY = 'data-diplodoc-key';
export const RADIO_BUTTON_DATA_ID = 'data-diplodoc-id';
export const RADIO_BUTTON_ACTIVE_KEY = 'data-diplodoc-is-active';

export const DEFAULT_RADIO_BUTTONS_GROUP_PREFIX = 'defaultRadioButtonGroup-';

export interface RadioButton {
  group?: string;
  key: string;
}

export interface SelectedRadioButtonEvent {
  radioButton: RadioButton;
  currentRadioButtonId?: string;
}

export const GLOBAL_SYMBOL: unique symbol = Symbol.for('diplodocRadioButtons');

declare global {
  interface Window {
    [GLOBAL_SYMBOL]: RadioController;
  }
}
