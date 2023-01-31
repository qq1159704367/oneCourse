/*! Sifrr.Storage v0.0.9 - sifrr project | MIT licensed | https://github.com/sifrr/sifrr */
var toS = Object.prototype.toString;
var uId = '~SS%l3g5k3~';

function decodeBlob(str, type) {
  return new Blob([new Uint8Array(str.split(',')).buffer], {
    type
  });
}

function encodeBlob(blob) {
  var uri = URL.createObjectURL(blob),
      xhr = new XMLHttpRequest();
  xhr.open('GET', uri, false);
  xhr.send();
  URL.revokeObjectURL(uri);
  var ui8 = new Uint8Array(xhr.response.length);

  for (var i = 0; i < xhr.response.length; ++i) {
    ui8[i] = xhr.response.charCodeAt(i);
  }

  return ui8.toString();
}

function parse(data) {
  var ans = data;

  if (typeof data === 'string') {
    try {
      ans = data = JSON.parse(data);
    } catch (e) {// do nothing
    }
  }

  if (typeof data === 'string' && data.indexOf(uId) > 0) {
    var [type, av, av2] = data.split(uId);
    if (type === 'ArrayBuffer') ans = new Uint8Array(av.split(',').map(i => parseInt(i))).buffer;else if (type === 'Blob') ans = decodeBlob(av2, av);else ans = new window[type](av.split(','));
  } else if (Array.isArray(data)) {
    ans = [];
    data.forEach((v, i) => {
      ans[i] = parse(v);
    });
  } else if (typeof data === 'object') {
    if (data === null) return null;
    ans = {};

    for (var k in data) {
      ans[k] = parse(data[k]);
    }
  }

  return ans;
}
function stringify(data) {
  if (typeof data !== 'object') return JSON.stringify(data);
  if (data === null) return 'null';
  if (Array.isArray(data)) return JSON.stringify(data.map(d => stringify(d)));
  var type = toS.call(data).slice(8, -1);

  if (type === 'Object') {
    var ans = {};

    for (var k in data) {
      ans[k] = stringify(data[k]);
    }

    return JSON.stringify(ans);
  } else if (type === 'ArrayBuffer') {
    data = new Uint8Array(data);
  } else if (type === 'Blob') {
    data = data.type + uId + encodeBlob(data);
  }

  return type + uId + data.toString();
}

// always bind to storage
var parseGetData = (original, onExpire) => {
  var now = Date.now();
  Object.keys(original).forEach(k => {
    if (typeof original[k] === 'undefined') return;
    var {
      createdAt,
      ttl
    } = original[k];
    original[k] = original[k] && original[k].value;
    if (ttl === 0) return;

    if (now - createdAt > ttl) {
      delete original[k];
      onExpire && onExpire(k);
    }
  });
  return original;
};
var parseSetValue = (value, defaultTtl) => {
  if (value && value.value) {
    value.ttl = value.ttl || defaultTtl;
    value.createdAt = Date.now();
    return value;
  } else {
    return {
      value,
      ttl: defaultTtl,
      createdAt: Date.now()
    };
  }
};
var parseSetData = (key, value, defaultTtl) => {
  if (typeof key === 'string') {
    return {
      [key]: parseSetValue(value, defaultTtl)
    };
  } else {
    var data = {};
    Object.keys(key).forEach(k => data[k] = parseSetValue(key[k], defaultTtl));
    return data;
  }
};
var parseKey = key => {
  if (Array.isArray(key)) {
    return key;
  } else {
    return [key];
  }
};

var defaultOptions = {
  name: 'SifrrStorage',
  version: 1,
  description: 'Sifrr Storage',
  size: 5 * 1024 * 1024,
  ttl: 0
};

class Storage {
  constructor(options = defaultOptions) {
    this.type = this.constructor.type;
    this.table = {};
    Object.assign(this, defaultOptions, options);
    this.tableName = this.name + this.version;
  } // overwrited methods


  select(keys) {
    var table = this.getStore();
    var ans = {};
    keys.forEach(key => ans[key] = table[key]);
    return ans;
  }

  upsert(data) {
    var table = this.getStore();

    for (var key in data) {
      table[key] = data[key];
    }

    this.setStore(table);
    return true;
  }

  delete(keys) {
    var table = this.getStore();
    keys.forEach(key => delete table[key]);
    this.setStore(table);
    return true;
  }

  deleteAll() {
    this.setStore({});
    return true;
  }

  getStore() {
    return this.table;
  }

  setStore(v) {
    this.table = v;
  }

  keys() {
    return Promise.resolve(this.getStore()).then(d => Object.keys(d));
  }

  all() {
    return Promise.resolve(this.getStore()).then(d => parseGetData(d, this.del.bind(this)));
  }

  get(key) {
    return Promise.resolve(this.select(parseKey(key))).then(d => parseGetData(d, this.del.bind(this)));
  }

  set(key, value) {
    return Promise.resolve(this.upsert(parseSetData(key, value, this.ttl)));
  }

  del(key) {
    return Promise.resolve(this.delete(parseKey(key)));
  }

  clear() {
    return Promise.resolve(this.deleteAll());
  }

  memoize(func, keyFunc = (...arg) => typeof arg[0] === 'string' ? arg[0] : stringify(arg[0])) {
    return (...args) => {
      var key = keyFunc(...args);
      return this.get(key).then(data => {
        if (data[key] === undefined || data[key] === null) {
          var resultPromise = func(...args);
          if (!(resultPromise instanceof Promise)) throw Error('Only promise returning functions can be memoized');
          return resultPromise.then(v => {
            return this.set(key, v).then(() => v);
          });
        } else {
          return data[key];
        }
      });
    };
  }

  isSupported(force = true) {
    if (force && (typeof window === 'undefined' || typeof document === 'undefined')) {
      return true;
    } else if (window && this.hasStore()) {
      return true;
    } else {
      return false;
    }
  }

  hasStore() {
    return true;
  }

  isEqual(other) {
    if (this.tableName == other.tableName && this.type == other.type) {
      return true;
    } else {
      return false;
    }
  } // aliases


  static stringify(data) {
    return stringify(data);
  }

  static parse(data) {
    return parse(data);
  }

  static _add(instance) {
    this._all = this._all || [];

    this._all.push(instance);
  }

  static _matchingInstance(otherInstance) {
    var all = this._all || [],
        length = all.length;

    for (var i = 0; i < length; i++) {
      if (all[i].isEqual(otherInstance)) return all[i];
    }

    this._add(otherInstance);

    return otherInstance;
  }

}

class IndexedDB extends Storage {
  constructor(options) {
    super(options);
    return this.constructor._matchingInstance(this);
  }

  select(keys) {
    var ans = {};
    var promises = [];
    keys.forEach(key => promises.push(this._tx('readonly', 'get', key, undefined).then(r => ans[key] = r)));
    return Promise.all(promises).then(() => ans);
  }

  upsert(data) {
    var promises = [];

    for (var key in data) {
      promises.push(this._tx('readwrite', 'put', data[key], key));
    }

    return Promise.all(promises).then(() => true);
  }

  delete(keys) {
    var promises = [];
    keys.forEach(key => promises.push(this._tx('readwrite', 'delete', key, undefined)));
    return Promise.all(promises).then(() => true);
  }

  deleteAll() {
    return this._tx('readwrite', 'clear', undefined, undefined);
  }

  _tx(scope, fn, param1, param2) {
    var me = this;
    this.store = this.store || this.createStore(me.tableName);
    return this.store.then(db => {
      return new Promise((resolve, reject) => {
        var tx = db.transaction(me.tableName, scope).objectStore(me.tableName);
        var request = tx[fn].call(tx, param1, param2);

        request.onsuccess = event => resolve(event.target.result);

        request.onerror = event => reject(event.error);
      });
    });
  }

  getStore() {
    return this._tx('readonly', 'getAllKeys', undefined, undefined).then(this.select.bind(this));
  }

  createStore(table) {
    return new Promise((resolve, reject) => {
      var request = window.indexedDB.open(table, 1);

      request.onupgradeneeded = () => {
        request.result.createObjectStore(table);
      };

      request.onsuccess = () => resolve(request.result);

      request.onerror = () => reject(request.error);
    });
  }

  hasStore() {
    return !!window.indexedDB;
  }

  static get type() {
    return 'indexeddb';
  }

}

class WebSQL extends Storage {
  constructor(options) {
    super(options);
    return this.constructor._matchingInstance(this);
  }

  parsedData() {}

  select(keys) {
    var q = keys.map(() => '?').join(', '); // Need to give array for ? values in executeSql's 2nd argument

    return this.execSql("SELECT key, value FROM ".concat(this.tableName, " WHERE key in (").concat(q, ")"), keys);
  }

  upsert(data) {
    this.getWebsql().transaction(tx => {
      for (var key in data) {
        tx.executeSql("INSERT OR REPLACE INTO ".concat(this.tableName, "(key, value) VALUES (?, ?)"), [key, this.constructor.stringify(data[key])]);
      }
    });
    return true;
  }

  delete(keys) {
    var q = keys.map(() => '?').join(', ');
    this.execSql("DELETE FROM ".concat(this.tableName, " WHERE key in (").concat(q, ")"), keys);
    return true;
  }

  deleteAll() {
    this.execSql("DELETE FROM ".concat(this.tableName));
    return true;
  }

  getStore() {
    return this.execSql("SELECT key, value FROM ".concat(this.tableName));
  }

  hasStore() {
    return !!window.openDatabase;
  }

  getWebsql() {
    if (this._store) return this._store;
    this._store = window.openDatabase('ss', 1, this.description, this.size);
    this.execSql("CREATE TABLE IF NOT EXISTS ".concat(this.tableName, " (key unique, value)"));
    return this._store;
  }

  execSql(query, args = []) {
    var me = this;
    return new Promise(resolve => {
      me.getWebsql().transaction(function (tx) {
        tx.executeSql(query, args, (tx, results) => {
          resolve(me.parseResults(results));
        });
      });
    });
  }

  parseResults(results) {
    var ans = {};
    var len = results.rows.length;

    for (var i = 0; i < len; i++) {
      ans[results.rows.item(i).key] = this.constructor.parse(results.rows.item(i).value);
    }

    return ans;
  }

  static get type() {
    return 'websql';
  }

}

class LocalStorage extends Storage {
  constructor(options) {
    super(options);
    return this.constructor._matchingInstance(this);
  }

  select(keys) {
    var table = {};
    keys.forEach(k => {
      var v = this.constructor.parse(this.getLocalStorage().getItem(this.tableName + '/' + k));
      if (v !== null) table[k] = v;
    });
    return table;
  }

  upsert(data) {
    for (var key in data) {
      this.getLocalStorage().setItem(this.tableName + '/' + key, this.constructor.stringify(data[key]));
    }

    return true;
  }

  delete(keys) {
    keys.map(k => this.getLocalStorage().removeItem(this.tableName + '/' + k));
    return true;
  }

  deleteAll() {
    Object.keys(this.getLocalStorage()).forEach(k => {
      if (k.indexOf(this.tableName) === 0) this.getLocalStorage().removeItem(k);
    });
    return true;
  }

  getStore() {
    return this.select(Object.keys(this.getLocalStorage()).map(k => {
      if (k.indexOf(this.tableName) === 0) return k.slice(this.tableName.length + 1);
    }).filter(k => typeof k !== 'undefined'));
  }

  getLocalStorage() {
    return window.localStorage;
  }

  hasStore() {
    return !!window.localStorage;
  }

  static get type() {
    return 'localstorage';
  }

}

var date = new Date(0).toUTCString();
var equal = '%3D',
    equalRegex = new RegExp(equal, 'g');

class Cookies extends Storage {
  constructor(options) {
    super(options);
    return this.constructor._matchingInstance(this);
  }

  upsert(data) {
    for (var key in data) {
      this.setStore("".concat(this.tableName, "/").concat(key, "=").concat(this.constructor.stringify(data[key]).replace(/=/g, equal), "; path=/"));
    }

    return true;
  }

  delete(keys) {
    keys.forEach(k => this.setStore("".concat(this.tableName, "/").concat(k, "=; expires=").concat(date, "; path=/")));
    return true;
  }

  deleteAll() {
    return this.keys().then(this.delete.bind(this));
  }

  getStore() {
    var result = document.cookie,
        ans = {};
    result.split('; ').forEach(value => {
      var [k, v] = value.split('=');
      if (k.indexOf(this.tableName) === 0) ans[k.slice(this.tableName.length + 1)] = this.constructor.parse(v.replace(equalRegex, '='));
    });
    return ans;
  }

  setStore(v) {
    document.cookie = v;
  }

  hasStore() {
    return typeof document.cookie !== 'undefined';
  }

  static get type() {
    return 'cookies';
  }

}

class JsonStorage extends Storage {
  constructor(options) {
    super(options);
    return this.constructor._matchingInstance(this);
  }

  hasStore() {
    return true;
  }

  static get type() {
    return 'jsonstorage';
  }

}

var storages = {
  [IndexedDB.type]: IndexedDB,
  [WebSQL.type]: WebSQL,
  [LocalStorage.type]: LocalStorage,
  [Cookies.type]: Cookies,
  [JsonStorage.type]: JsonStorage
};

function getSupportedStoreFromPriority(priority = [], options = {}) {
  priority = priority.concat([IndexedDB.type, WebSQL.type, LocalStorage.type, Cookies.type, JsonStorage.type]);

  for (var i = 0; i < priority.length; i++) {
    var store = storages[priority[i]];

    if (store) {
      var storage = new store(options);
      if (storage.isSupported()) return storage;
    }
  }

  throw Error('No compatible storage found. Available types: ' + Object.keys(storages).join(', ') + '.');
}

function getStorage(options) {
  var priority = typeof options === 'string' ? [options] : (options || {}).priority;
  var stOptions = typeof options === 'string' ? {} : options;
  return getSupportedStoreFromPriority(priority, stOptions);
}

export { Cookies, IndexedDB, JsonStorage, LocalStorage, WebSQL, storages as availableStores, getStorage };
/*! (c) @aadityataparia */
//# sourceMappingURL=sifrr.storage.module.js.map
