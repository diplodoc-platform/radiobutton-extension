import {useCallback, useEffect} from 'react';
import {GLOBAL_SYMBOL, RadioButton, SelectedRadioButtonEvent} from '../common';
import {ISelectRadioButtonByIdOptions} from '../runtime/controller';

export type {RadioButton};

export type UseDiplodocRadioButtonsCallback = (
  radioButton: RadioButton,
  currentRadioButtonId?: string,
) => void;

export function useDiplodocRadioButtons(callback: UseDiplodocRadioButtonsCallback) {
  const selectRadioButtonHandle = useCallback(
    ({radioButton, currentRadioButtonId}: SelectedRadioButtonEvent) => {
      callback(radioButton, currentRadioButtonId);
    },
    [callback],
  );

  useEffect(
    () => window[GLOBAL_SYMBOL].onSelectRadioButton(selectRadioButtonHandle),
    [selectRadioButtonHandle],
  );

  return {
    selectTabById: useCallback(
      (radioButtonId: string, options?: ISelectRadioButtonByIdOptions) =>
        window[GLOBAL_SYMBOL].selectRadioButtonById(radioButtonId, options),
      [],
    ),
    selectTab: useCallback(
      (radioButton: RadioButton) => window[GLOBAL_SYMBOL].selectRadioButton(radioButton),
      [],
    ),
  };
}
