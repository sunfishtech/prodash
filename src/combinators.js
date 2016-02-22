import { prop, compose, merge, identity, whereEq, pick, toPairs, append, values } from 'ramda';
import { Observable } from 'rx';
import { arrayOf } from './util';
import dl from 'datalib';
import aggTypes from './datalib-aggregations';

export default Observable;

Observable.prototype.toMap = function (keyField, keyTransform = identity) {
  const key = compose(keyTransform, prop(keyField));
  const reducer = (map, rec) => {
    map[key(rec)] = rec;
    return map;
  };

  return this.reduce(reducer, {});
};

const extractAggs = compose(toPairs, pick(aggTypes));

const mergeFieldSpec = (field, agg, prevSpec) =>
  prevSpec ? {
    name: prevSpec.name,
    ops: append(agg, prevSpec.ops),
    as: append(`${field}_${agg}`, prevSpec.as)
  } : { name: field, ops: [agg], as: [field] };

const aggSpecToFieldSpecs = (aggSpec) => {
  const aggs = extractAggs(aggSpec);
  const reducer = (specs, aggAndFields) => {
    const [agg, fields] = aggAndFields;

    fields.forEach(f => {
      specs[f] = mergeFieldSpec(f, agg, specs[f]);
    });
    return specs;
  };

  return values(aggs.reduce(reducer, {}));
};

Observable.prototype.aggregate = function (aggSpec) {
  const groupBy = arrayOf(aggSpec.groupBy);
  const spec = aggSpecToFieldSpecs(aggSpec);
  const group = dl.groupby(...groupBy).stream(true).summarize(spec);
  const reducer = (g, rec) => {
    g.insert([rec]);
    return g;
  };

  return this.reduce(reducer, group).map((g) => g.result());
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
