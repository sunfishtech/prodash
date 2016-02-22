import { prop, compose } from 'ramda';
import { titleize, money, percent, arrayOf, execOrReturn, round } from './util';
import { h } from 'virtual-dom';

const netChange = (metric) => (data) =>
  prop(`ending_${metric}`, data) - prop(`starting_${metric}`, data);

const ratio = (num, denom) => (data) => {
  const numerator = prop(num, data);
  const denominator = prop(denom, data);

  return denominator > 0 ? numerator / denominator : 0;
};

const td = (selector = '', styler = {}) => data => {
  const children = arrayOf(execOrReturn(selector, data));
  const attrs = execOrReturn(styler);

  return h('td', attrs, children);
};

const th = (selector = '', styler = {}) => {
  const children = arrayOf(execOrReturn(selector));
  const attrs = execOrReturn(styler);

  return h('th', attrs, children);
};

const tr = (row) => {
  const cells = [
    td(compose(titleize, prop('billing_state_name')), {className: 'state-name'}),
    td(prop('starting_accounts')),
    td(prop('added_accounts')),
    td(prop('completed_accounts')),
    td(prop('ending_accounts')),
    td(netChange('accounts')),
    td(prop('starting_backlog')),
    td(prop('added_to_backlog')),
    td(prop('removed_from_backlog')),
    td(prop('ending_backlog')),
    td(netChange('backlog')),
    td(compose(percent, ratio('ending_backlog', 'ending_accounts'))),
    td(compose(round, prop('avg_days_in_backlog'))),
    td(compose(round, prop('max_days_in_backlog'))),
    td(compose(money, prop('balance')), {className: 'balance'})
  ];

  return h('tr', {}, cells.map(cell => cell(row)));
};

export default (rows) => {
  return h('table', {className: 'overview'}, [
    h('thead', {}, [
      th('Status', {style: 'text-align:left'}),
      th('Starting Balance'),
      th('Added'),
      th('Completed'),
      th('Ending Balance'),
      th('Net Change'),
      th('Starting Backlog'),
      th('Added'),
      th('Completed'),
      th('Ending Backlog'),
      th('Net Change'),
      th('Backlog Pct'),
      th('Avg Days in Backlog'),
      th('Max Days in Backlog'),
      th('Current Balance', {style: 'text-align:right'})
    ]),
    h('tbody', {}, rows.map(tr))
  ]);
};
