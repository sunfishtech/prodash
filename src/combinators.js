import { prop, compose, merge, identity, whereEq, pick } from 'ramda';
import { Observable } from 'rx';
import { arrayOf } from './util';
import dl from 'datalib';

export default Observable;

Observable.prototype.toMap = function (keyField, keyTransform = identity) {
  const key = compose(keyTransform, prop(keyField));
  const reducer = (map, rec) => {
    map[key(rec)] = rec;
    return map;
  };

  return this.reduce(reducer, {});
};

Observable.prototype.aggregate = function (aggSpec) {
  const fieldSpec = (agg) => (name) => { return {name: name, ops: [agg], as: [name]}; };
  const groupBy = arrayOf(aggSpec.groupBy);
  const spec = aggSpec.sum.map(fieldSpec('sum'));
  const group = dl.groupby(...groupBy).stream(true).summarize(spec);
  const reducer = (g, rec) => {
    g.insert([rec]);
    return g;
  };

  return this.reduce(reducer, group).map((g) => g.result()).tap(console.log.bind(console));
};

Observable.prototype.whereEq = function (pattern) {
  return this.where(whereEq(pattern));
};

Observable.prototype.leftJoin = function (targetTable, spec) {
  const select = spec.select ? pick(arrayOf(spec.select)) : identity;
  const fkey = prop(spec.foreignKey);
  const match = (rec) => targetTable[fkey(rec).toString()] || {};
  const join = compose(select, match);

  return this.map((rec) => merge(rec, join(rec)));
};
