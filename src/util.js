import { titleize as _titleize, humanize, numberFormat } from 'underscore.string.fp';
import { compose, flatten, is } from 'ramda';

export const titleize = compose(_titleize, humanize);
export const money = (val) => `$${numberFormat(val)}`;
export const percent = (val) => `${numberFormat(val*100)}%`;
export const arrayOf = (val) => flatten([val]);
export const execOrReturn = (valOrFunc, ...args) => is(Function, valOrFunc) ? valOrFunc(...args) : valOrFunc;
