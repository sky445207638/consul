import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { computed, action } from '@ember/object';
import { alias } from '@ember/object/computed';
import { tracked } from '@glimmer/tracking';
import { sort } from '@ember/object/computed';
import { defineProperty } from '@ember/object';

export default class DataCollectionComponent extends Component {
  @service('filter') filter;
  @service('sort') sort;
  @service('search') searchService;

  @tracked term = '';

  @alias('searchService.searchables') searchableMap;

  get type() {
    return this.args.type;
  }

  get searchMethod() {
    return this.args.searchable || 'exact';
  }

  get searchProperties() {
    return this.args.filters.searchproperties;
  }

  @computed('term', 'args.search')
  get searchTerm() {
    return this.term || this.args.search || '';
  }

  @computed('type', 'searchMethod', 'filtered', 'searchProperties')
  get searchable() {
    const Searchable =
      typeof this.searchMethod === 'string'
        ? this.searchableMap[this.searchMethod]
        : this.args.searchable;
    return new Searchable(this.filtered, {
      finders: Object.fromEntries(
        Object.entries(this.searchService.predicate(this.type)).filter(([key, value]) => {
          return typeof this.searchProperties === 'undefined'
            ? true
            : this.searchProperties.includes(key);
        })
      ),
    });
  }

  @computed('type', 'args.sort')
  get comparator() {
    if (typeof this.args.sort === 'undefined') {
      return [];
    }
    return this.sort.comparator(this.type)(this.args.sort);
  }

  @computed('comparator', 'searched')
  get items() {
    // the ember sort computed accepts either:
    // 1. The name of a property (as a string) returning an array properties to sort by
    // 2. A function to use for sorting
    let comparator = 'comparator';
    if (typeof this.comparator === 'function') {
      comparator = this.comparator;
    }
    defineProperty(this, 'sorted', sort('searched', comparator));
    return this.sorted;
  }

  @computed('searchTerm', 'searchable', 'filtered')
  get searched() {
    if (this.searchTerm === '') {
      return this.filtered;
    }
    return this.searchable.search(this.searchTerm);
  }

  @computed('type', 'content', 'args.filters')
  get filtered() {
    // if we don't filter, return a copy of the content so we end up with what
    // filter will return when filtering ED recordsets
    if (typeof this.args.filters === 'undefined') {
      return this.content.slice();
    }
    const predicate = this.filter.predicate(this.type);
    if (typeof predicate === 'undefined') {
      return this.content.slice();
    }
    return this.content.filter(predicate(this.args.filters));
  }

  @computed('args.{items.[],items.content.[]}')
  get content() {
    // TODO: Temporary little hack to ensure we detect DataSource proxy
    // objects but not any other special Ember Proxy object like ember-data
    // things. Remove this once we no longer need the Proxies
    if (this.args.items.dispatchEvent === 'function') {
      return this.args.items.content;
    }
    return this.args.items;
  }

  @action
  search(term) {
    this.term = term;
    return this.items;
  }
}
