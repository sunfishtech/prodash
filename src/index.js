import { h, create, diff, patch } from 'virtual-dom';

import data from './data';
import StatTable from './StatTable';
import './style.scss';

document.addEventListener('DOMContentLoaded', function (event) {
  var tree = h('div', {className: 'loading-indicator'}, ['Loading...']);
  var root = create(tree);
  const container = document.querySelector('#daily-snapshot');

  container.appendChild(root);

  data.dailySnapshot(20160215)
    .map(StatTable)
    .do((newTree) => {
      const patches = diff(tree, newTree);

      root = patch(root, patches);
      tree = newTree;
    })
    .subscribeOnError((err) => console.log(err.stack));
});
