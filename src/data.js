import Observable from './combinators';
import dl from 'datalib';
import { identity, sortBy, compose, prop } from 'ramda';

const records = (context) => context.RECORDS ? context.RECORDS : context;
const csv = (file) => Observable.fromNodeCallback(dl.csv)(file).flatMap(records);
const json = (file) => Observable.fromNodeCallback(dl.json)(file).flatMap(records);

const aggSpec = {
  sum: [
    'starting_accounts',
    'added_accounts',
    'completed_accounts',
    'ending_accounts',
    'starting_backlog',
    'added_to_backlog',
    'removed_from_backlog',
    'ending_backlog',
    'balance'
  ],
  max: ['max_days_in_backlog'],
  average: ['avg_days_in_backlog'],

  groupBy: ['billing_state_key']
};

const billingStates = json('/data/dim_billing_state.json').toMap('billing_state_key');
const dailySnaps = csv('/data/openwork.csv');
// const trends = csv('queryresult.csv');

const dailySnapshot = (snapshotDate) => (env) => {
  const select = ['position', 'billing_state_name', 'billing_state_pipeline', 'billing_state_owner'];

  return dailySnaps
    .whereEq({'snapshot_date_key': snapshotDate})
    .aggregate(aggSpec)
    .flatMap(identity)
    .leftJoin(env.billingStates, {foreignKey: 'billing_state_key', select: select})
    .toArray()
    .map(sortBy(compose(Number, prop('position'))));
};

export default {
  dailySnapshot: (dateKey) => billingStates
    .map(states => { return {billingStates: states};})
    .flatMap(dailySnapshot(dateKey))
};
