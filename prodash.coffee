# Place all the behaviors and hooks related to the matching controller here.
# All this logic will automatically be available in application.js.
# You can use CoffeeScript in this file: http://coffeescript.org/
$ =>
  h = require('virtual-dom/h')
  create = require('virtual-dom/create-element')
  diff = require('virtual-dom/diff')
  patch = require('virtual-dom/patch')
  R = require('ramda')
  S = require('underscore.string.fp')
  Rx = require('rx')
  Observable = Rx.Observable
  dl = require('datalib')
  prop = R.prop
  add = R.add
  divide = R.divide
  compose = R.compose
  merge = R.merge
  flatten = R.flatten
  titleize = compose(S.titleize, S.humanize)
  money = (val) => "$#{S.numberFormat(val)}"
  arrayOf = (val) => flatten([val])
  execOrReturn = (valOrFunc, args...) => if R.is(Function, valOrFunc) then valOrFunc(args...) else valOrFunc

  records = (context) => if context.RECORDS then context.RECORDS else context
  csv = (file) => Observable.fromNodeCallback(dl.csv)(file).flatMap(records)
  json = (file) => Observable.fromNodeCallback(dl.json)(file).flatMap(records)

  Observable.prototype.toMap = (keyField, keyTransform = R.identity) ->
    key = R.compose(keyTransform, R.prop(keyField))
    reducer = (map, rec) =>
      map[key(rec)] = rec
      map
    @.reduce reducer, {}

  Observable.prototype.aggregate = (aggSpec) ->
    fieldSpec = (agg) => (name) => {name:name, ops:[agg], as:[name]}
    groupBy = R.flatten([aggSpec.groupBy])
    spec = aggSpec.sum.map(fieldSpec('sum'))
    group = dl.groupby(groupBy...).stream(true)
      .summarize(spec)

    reducer = (g, rec) =>
      g.insert([rec])
      g

    @reduce(reducer, group).map((g) => g.result())

  Observable.prototype.whereEq = (pattern) ->
    @where(R.whereEq(pattern))

  Observable.prototype.leftJoin = (targetTable, spec) ->
    select = if spec.select? then R.pick(R.flatten([spec.select])) else R.identity
    fkey = R.prop(spec.foreignKey)
    match = (rec) => targetTable[fkey(rec).toString()] || {}
    join = R.compose(select, match)
    @map (rec) =>
      R.merge(rec, join(rec))

  dataSources =
    billingStates: json("dim_billing_state.json").toMap('billing_state_key')
    dailySnaps: csv("openwork.csv")
    trends: csv("queryresult.csv")

  report = (val) => console.log(val)

  aggSpec = 
    sum: ['starting_accounts', 'added_accounts', 'completed_accounts', 'ending_accounts', 'starting_backlog', 'added_to_backlog', 'removed_from_backlog', 'ending_backlog', 'balance']
    groupBy: ['billing_state_key']

  dailySnapshot = (snapshotDate) => (env) =>
    dataSources.dailySnaps
      .whereEq({snapshot_date_key:snapshotDate})
      .aggregate(aggSpec)
      .flatMap(R.identity)
      .leftJoin(env.billingStates, {foreignKey:'billing_state_key', select:['position', 'billing_state_name', 'billing_state_pipeline', 'billing_state_owner']})
      .toArray().map(R.sortBy(R.compose(Number,R.prop('position'))))

  netChange = (metric) => (data) =>
    prop("ending_#{metric}", data) -
    prop("starting_#{metric}", data)

  ratio = (num, denom) => (data) =>
    numerator = prop(num, data)
    denominator = prop(denom, data)
    if denominator > 0 then numerator / denominator else 0

  td = (selector = '', styler = {}) => (data) =>
    children = arrayOf(execOrReturn(selector, data))
    attrs = execOrReturn(styler)
    h('td', attrs, children)

  th = (selector = '', styler = {}) =>
    children = arrayOf(execOrReturn(selector))
    attrs = execOrReturn(styler)
    h('th', attrs, children)

  tr = (row) =>
    cells = [
      td(compose(titleize, prop('billing_state_name')), {className:'state-name'}),
      td(prop('starting_accounts')),
      td(prop('added_accounts')),
      td(prop('completed_accounts')),
      td(prop('ending_accounts')),
      td(netChange("accounts")),
      td(prop('starting_backlog')),
      td(prop('added_to_backlog')),
      td(prop('removed_from_backlog')),
      td(prop('ending_backlog')),
      td(netChange('backlog')),
      td(ratio("ending_backlog","ending_accounts")),
      td(),
      td(),
      td(compose(money, prop('balance')), {className:'balance'})
    ]
    h('tr', {}, cells.map((cell) => cell(row)))

  render = (rows) => h('table', {className:'overview'}, [
    h('thead', {}, [
      th('Status', {style:'text-align:left'}),
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
      th('Backlog %'),
      th('Avg Days in Backlog'),
      th('Max Days in Backlog'),
      th('Current Balance', {style:'text-align:right'})
    ]),
    h('tbody', {}, rows.map(tr))
  ])
  

  tree = h('div',{},['loading'])
  root = create(tree)
  container = document.querySelector("#daily-snapshot")
  container.appendChild(root)
  
  env = dataSources.billingStates
    .map((states) => {billingStates:states})
    .flatMap(dailySnapshot(20160215))
    .map(render)
    .do((newTree) =>
      patches = diff(tree, newTree)
      root = patch(root, patches)
      tree = newTree
    )
    .subscribeOnError((err) => console.log(err.stack))
 

