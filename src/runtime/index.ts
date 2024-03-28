import {GLOBAL_SYMBOL} from '../common';
import {RadioController} from './controller';
import './scss/tabs.scss';

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !window[GLOBAL_SYMBOL]) {
  window[GLOBAL_SYMBOL] = new RadioController(document);
}
