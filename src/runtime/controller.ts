import {
  ACTIVE_CLASSNAME,
  DEFAULT_RADIO_BUTTONS_GROUP_PREFIX,
  GROUP_DATA_KEY,
  RADIO_BUTTONS_CLASSNAME,
  RADIO_BUTTONS_LIST_CLASSNAME,
  RADIO_BUTTON_CLASSNAME,
  RADIO_BUTTON_DATA_ID,
  RADIO_BUTTON_DATA_KEY,
  RADIO_BUTTON_PANEL_CLASSNAME,
  RadioButton,
  SelectedRadioButtonEvent,
} from '../common';
import {
  ElementOffset,
  getClosestScrollableParent,
  getEventTarget,
  getOffsetByScrollableParent,
  isCustom,
} from './utils';

const Selector = {
  RADIO_BUTTONS: `.${RADIO_BUTTONS_CLASSNAME}`,
  RADIO_BUTTON_LIST: `.${RADIO_BUTTONS_LIST_CLASSNAME}`,
  RADIO_BUTTON: `.${RADIO_BUTTON_CLASSNAME}`,
  RADIO_BUTTON_PANEL: `.${RADIO_BUTTON_PANEL_CLASSNAME}`,
};

export interface ISelectRadioButtonByIdOptions {
  scrollToElement: boolean;
}

type Handler = (payload: SelectedRadioButtonEvent) => void;

type RadioButtonSwitchDirection = 'left' | 'right';

export class RadioController {
  private _document: Document;

  private _onSelectRadioButtonHandlers: Set<Handler> = new Set();

  constructor(document: Document) {
    this._document = document;
    this._document.addEventListener('click', (event) => {
      const target = getEventTarget(event) as HTMLElement;

      if (isCustom(event) || !this.isValidRadioButtonElement(target)) {
        return;
      }

      const radioButton = this.getRadioButtonDataFromHTMLElement(target);
      if (radioButton) {
        this._selectRadioButton(radioButton, target);
      }
    });
    this._document.addEventListener('keydown', (event) => {
      let direction: RadioButtonSwitchDirection | null = null;
      switch (event.key) {
        case 'ArrowLeft': {
          direction = 'left';
          break;
        }
        case 'ArrowRight': {
          direction = 'right';
          break;
        }
      }
      if (!direction) {
        return;
      }

      const target = getEventTarget(event) as HTMLElement;

      if (isCustom(event) || !this.isValidRadioButtonElement(target)) {
        return;
      }

      const {radioButtons, nodes} = this.getRadioButtons(target);
      const currentRadioButton = this.getRadioButtonDataFromHTMLElement(target);
      const currentRadioButtonIndex = radioButtons.findIndex(
        ({key}) => currentRadioButton?.key && key === currentRadioButton.key,
      );
      if (!currentRadioButton || radioButtons.length <= 1 || currentRadioButtonIndex === -1) {
        return;
      }

      const newIndex =
        (currentRadioButtonIndex + (direction === 'left' ? -1 : 1) + radioButtons.length) %
        radioButtons.length;

      this.selectRadioButton(radioButtons[newIndex]);
      nodes[newIndex].focus();
    });
  }

  onSelectRadioButton(handler: Handler) {
    this._onSelectRadioButtonHandlers.add(handler);

    return () => {
      this._onSelectRadioButtonHandlers.delete(handler);
    };
  }

  selectRadioButtonById(id: string, options?: ISelectRadioButtonByIdOptions) {
    const target = this._document.querySelector(
      `${Selector.RADIO_BUTTON}[${RADIO_BUTTON_DATA_ID}="${id}"]`,
    ) as HTMLElement;

    if (!target || !this.isValidRadioButtonElement(target)) {
      return;
    }

    const radioButton = this.getRadioButtonDataFromHTMLElement(target);
    if (radioButton) {
      this._selectRadioButton(radioButton, target);
    }

    if (options?.scrollToElement) {
      target.scrollIntoView();
    }
  }

  selectRadioButton(radioButton: RadioButton) {
    this._selectRadioButton(radioButton);
  }

  private _selectRadioButton(radioButton: RadioButton, targetRadioButton?: HTMLElement) {
    const {group, key} = radioButton;

    if (!group) {
      return;
    }

    const scrollableParent = targetRadioButton && getClosestScrollableParent(targetRadioButton);
    const previousTargetOffset =
      scrollableParent && getOffsetByScrollableParent(targetRadioButton, scrollableParent);

    const updatedRadioButtons = this.updateHTML({group, key});

    if (updatedRadioButtons > 0) {
      this.fireSelectRadioButtonEvent({group, key}, targetRadioButton?.dataset.diplodocId);

      if (previousTargetOffset) {
        this.resetScroll(targetRadioButton, scrollableParent, previousTargetOffset);
      }
    }
  }

  private updateHTML(radioButton: Required<RadioButton>) {
    const {group, key} = radioButton;

    const radioButtons = this._document.querySelectorAll(
      `${Selector.RADIO_BUTTONS}[${GROUP_DATA_KEY}="${group}"] ${Selector.RADIO_BUTTON}[${RADIO_BUTTON_DATA_KEY}="${key}"]`,
    );

    let updated = 0;

    radioButtons.forEach((element) => {
      const htmlElem = element as HTMLElement;
      if (
        !this.isValidRadioButtonElement(htmlElem) ||
        htmlElem.dataset.diplodocIsActive === 'true'
      ) {
        return;
      }

      updated++;

      const radioButton = element;
      const radioButtonList = radioButton.parentNode;
      const radioButtonsContainer = radioButtonList?.parentNode;
      const allRadioButtons = Array.from(
        radioButtonList?.querySelectorAll(Selector.RADIO_BUTTON) || [],
      );
      const allPanels = Array.from(radioButtonsContainer?.children || []).filter((node) =>
        node.classList.contains(RADIO_BUTTON_PANEL_CLASSNAME),
      );
      const targetIndex = allRadioButtons.indexOf(radioButton);

      allRadioButtons.forEach((radioButton, i) => {
        const panel = allPanels[i];
        const isTargetRadioButton = i === targetIndex;
        const htmlElem = radioButton as HTMLElement;

        htmlElem.dataset.diplodocIsActive = isTargetRadioButton ? 'true' : 'false';

        radioButton.classList.toggle(ACTIVE_CLASSNAME, isTargetRadioButton);
        radioButton.setAttribute('aria-selected', isTargetRadioButton.toString());
        radioButton.setAttribute('radioButtonindex', isTargetRadioButton ? '0' : '-1');
        panel.classList.toggle(ACTIVE_CLASSNAME, isTargetRadioButton);
      });
    });

    return updated;
  }

  private resetScroll(
    target: HTMLElement,
    scrollableParent: HTMLElement,
    previousTargetOffset: ElementOffset,
  ) {
    const targetOffset = getOffsetByScrollableParent(target, scrollableParent);
    const topDelta = targetOffset.top - previousTargetOffset.top;
    const leftDelta = targetOffset.left - previousTargetOffset.left;
    const scrollTopDelta = targetOffset.scrollTop - previousTargetOffset.scrollTop;
    const scrollLeftDelta = targetOffset.scrollLeft - previousTargetOffset.scrollLeft;
    scrollableParent.scrollTo(
      scrollableParent.scrollLeft + leftDelta - scrollLeftDelta,
      scrollableParent.scrollTop + topDelta - scrollTopDelta,
    );
  }

  private fireSelectRadioButtonEvent(radioButton: Required<RadioButton>, diplodocId?: string) {
    const {group, key} = radioButton;

    const eventRadioButton: RadioButton = group.startsWith(DEFAULT_RADIO_BUTTONS_GROUP_PREFIX)
      ? {key}
      : radioButton;

    this._onSelectRadioButtonHandlers.forEach((handler) => {
      handler({radioButton: eventRadioButton, currentRadioButtonId: diplodocId});
    });
  }

  private isValidRadioButtonElement(element: HTMLElement) {
    const radioButtonList =
      element.matches(Selector.RADIO_BUTTON) && element.dataset.diplodocId
        ? element.closest(Selector.RADIO_BUTTON_LIST)
        : null;
    return radioButtonList?.closest(Selector.RADIO_BUTTONS);
  }

  private getRadioButtonDataFromHTMLElement(target: HTMLElement): RadioButton | null {
    const key = target.dataset.diplodocKey;
    const group = (target.closest(Selector.RADIO_BUTTONS) as HTMLElement)?.dataset.diplodocGroup;
    return key && group ? {group, key} : null;
  }

  private getRadioButtons(target: HTMLElement): {
    radioButtons: RadioButton[];
    nodes: NodeListOf<HTMLElement>;
  } {
    const group = (target.closest(Selector.RADIO_BUTTONS) as HTMLElement)?.dataset.diplodocGroup;
    const nodes = (
      target.closest(Selector.RADIO_BUTTON_LIST) as HTMLElement
    )?.querySelectorAll<HTMLElement>(Selector.RADIO_BUTTON);

    const radioButtons: RadioButton[] = [];
    nodes.forEach((radioButtonEl) => {
      const key = radioButtonEl?.dataset.diplodocKey;
      if (!key) {
        return;
      }

      radioButtons.push({
        group,
        key,
      });
    });

    return {radioButtons, nodes};
  }
}
