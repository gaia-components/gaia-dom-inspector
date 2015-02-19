;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var GaiaTextarea = require('gaia-text-input-multiline');
var component = require('gaia-component');
var format = require('./lib/format');
var GaiaPage = require('gaia-pages');

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};

var allAttributes = (
  'accept accept-charset accesskey action alt async autocomplete autofocus autoplay challenge ' +
  'charset checked class colspan content contenteditable contextmenu controls coords crossorigin ' +
  'defer dir disabled download draggable dropzone enctype form formaction formenctype formmethod ' +
  'formnovalidate formtarget headers height hidden href hreflang http-equiv id ismap keytype label ' +
  'lang list loop manifest max maxlength media method min multiple muted name novalidate onabort ' +
  'onafterprint onbeforeprint onbeforeunload onblur oncanplay oncanplaythrough onchange onclick ' +
  'oncontextmenu oncopy oncuechange oncut ondblclick ondrag ondragend ondragenter ondragleave ' +
  'ondragover ondragstart ondrop ondurationchange onemptied onended onerror onfocus onhashchange ' +
  'oninput oninvalid onkeydown onkeypress onkeyup onload onloadeddata onloadedmetadata onloadstart ' +
  'onmessage onmousedown onmousemove onmouseout onmouseover onmouseup onoffline ononline onpagehide ' +
  'onpageshow onpaste onpause onplay onplaying onpopstate onprogress onratechange onreset onresize ' +
  'onscroll onsearch onseeked onseeking onselect onshow onstalled onstorage onsubmit onsuspend ' +
  'ontimeupdate ontoggle ontouchcancel ontouchend ontouchmove ontouchstart onunload onvolumechange ' +
  'onwaiting onwheel open pattern placeholder poster preload readonly rel required rev rowspan ' +
  'sandbox scoped seamless selected shape size sizes sortable spellcheck src srcdoc step style ' +
  'tabindex target title translate type usemap value width xmlns'
).split(' ');

/**
 * Register the element.
 *
 * @return {Element} constructor
 */
module.exports = component.register('gaia-property-inspector', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    debug('created');
    this.setupShadowRoot();

    this.els = {
      inner: this.shadowRoot.querySelector('.inner'),
      props: this.shadowRoot.querySelector('.props'),
      router: this.shadowRoot.querySelector('gaia-pages'),
      pages: this.shadowRoot.querySelectorAll('[data-route]'),
      header: this.shadowRoot.querySelector('gaia-header'),
      saveButton: this.shadowRoot.querySelector('.save'),
      search: this.shadowRoot.querySelector('input[type="search"]')
    };

    this.els.title = this.els.header.querySelector('h1');

    this.router = this.els.router;
    this.shadowRoot.addEventListener('click', e => this.onClick(e));
    this.router.addEventListener('changed', e => this.onPageChange(e));
    this.els.header.addEventListener('action', () => this.router.back({ dir: 'back' }));
    this.els.search.addEventListener('keyup', e => this.onKeyUp(e));

    this.rootProperty = this.getAttribute('root-property');
  },

  attached: function() {

    // HACK: This isn't being called natively :(
    this.els.header.attachedCallback();
  },

  attrs: {
    rootProperty: {
      get: function() { return this._rootProperty || ''; },
      set: function(value) {
        value = value || '';
        if (value === this._rootProperty) { return; }
        this.setAttr('root-property', value);
        this._rootProperty = value;

        if (this.node) {
          this.router.reset();
          this.router.navigate('/' + value);
        }
      }
    }
  },

  set: function(node) {
    debug('set node', node);
    this.node = node;
    this.router.reset();
    this.router.navigate('/' + this.rootProperty);
  },

  onClick: function(e) {
    debug('click', e);
    var a = e.target.closest('a');
    if (!a) { return; }
    e.preventDefault();
    var href = a.getAttribute('href');
    if (href === 'back') { this.router.back({ dir: 'back' }); }
    else { this.router.navigate(href, { dir: 'forward' }); }
  },

  onPageChange: function() {
    debug('on page change');
    var page = this.router.current;
    var path = this.router.path;
    var data = dataFromPath(path, this.node);
    var formatted = format(data.value);
    var displayType = formatted.displayType;
    var el = render[displayType](formatted.formatted);

    this.setTitle(formatted.title || data.key);
    this.toggleSaveButton(displayType === 'value');
    this.toggleBackButton(path !== '/' + this.rootProperty);
    this.els.search.value = '';
    
    page.innerHTML = '';
    page.appendChild(el);
  },

  onKeyUp: function(e) {
    debug('on key up');

    clearTimeout(this._searchTimeout);
    this._searchTimeout = setTimeout(() => {
      var value = (this.els.search.value || '').toLowerCase();
      var items = [].slice.apply(this.shadowRoot.querySelectorAll('.items > a'));
      items.forEach((item) => {
        item.hidden = value && item.dataset.searchText.indexOf(value) === -1;
      });
    }, 500);
  },

  setTitle: function(text) {
    this.els.title.textContent = text;
  },

  toggleSaveButton: function(value) {
    this.els.saveButton.hidden = !value;
  },

  toggleBackButton: function(value) {
    this.els.header.action = value ? 'back' : '';
  },

  template: `
    <div class="inner">
      <gaia-header action="back" not-flush>
        <h1>Header</h1>
        <button class="save">Save</button>
      </gaia-header>
      <input type="search" placeholder="Search...">
      <gaia-pages manual class="no-animations">
        <section data-route="."></section>
        <section data-route="."></section>
      </gaia-pages>
    </div>

    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        list-style-type: none;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      :host {
        display: block;
      }

      .inner {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;

        display: flex;
        flex-direction: column;

        font-size: 0.9em;
        color: var(--text-color);
        background: var(--background);
        -moz-user-select: none;
        cursor: default;
      }

      gaia-pages {
        flex: 1;
      }

      .value-page {
        display: flex;
        height: 100%;
      }

      .value-page .textarea {
        width: 100%;
      }

      .props {
        width: 100%;
        margin: 0;
        padding: 0;
      }

      .item {
        display: block;
        padding: 0.5em 0.5em;
        border-bottom: solid 1px var(--border-color);
        opacity: 0.6;
      }

      .item.clickable {
        opacity: 1;
      }

      .item[hidden] {
        display: none;
      }

      .item:nth-child(odd) {
      }

      .item .name {
        font: inherit;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item .value {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .item > .value {
        color: var(--highlight-color);
      }

      input[type="search"],
      textarea {
        background:
          var(--text-input-background,
          var(--input-background,
          var(--background-minus,
          #fff)));
        border: 1px solid var(--input-border-color, var(--border-color, var(--background-plus, #E7E7E7)));
        color: var(--text-color, #000);
        font: inherit;
        display: block;
        margin: 0;
        width: 100%;
        resize: none;
      }

      input[type="search"] {
        border-radius: 30px;
        padding: 0 16px;
        height: 40px;
      }

      textarea {
        padding: 10px 16px;
        height: 100%;
      }
    </style>`
});

function dataFromPath(path, object) {
  debug('object from path', path, object);
  var key;

  var value = path.split('/').reduce((object, part) => {
    key = part;
    return part ? object[part] : object;
  }, object);

  if (key !== 'attributes') {
    return {
      key: key,
      value: value
    };
  }

  var attributesMap = new Map();

  allAttributes.forEach((name) => {
    attributesMap.set(name, undefined);
  });

  [].forEach.call(value, (attr) => {
    attributesMap.set(attr.name, attr.value);
  });

  return {
    key: key,
    value: attributesMap
  };
}

var render = {
  object: function(props) {
    debug('render props', props);
    var list = document.createElement('div');
    list.className = 'items';

    var items = [];
    props.forEach(prop => {
      var item = document.createElement('a');
      var key = document.createElement('h3');
      var value = document.createElement('div');
      var isObject = typeof prop.value === 'object';

      key.className = 'name';
      value.className = 'value';

      key.textContent = prop.key;
      value.textContent = prop.displayValue;

      item.appendChild(key);
      item.appendChild(value);
      item.className = 'item';
      item.dataset.searchText = ((prop.key || '') + '').toLowerCase();

      if (isObject || prop.writable) {
        item.classList.add('clickable');
        item.href = prop.key;
      }

      list.appendChild(item);
      items.push(item);
    });

    return list;
  },

  value: function(item) {
    debug('render value', item);
    // XXX: gaia-text-input is broken on B2G. Use a standard <textarea> for now.
    //var textarea = document.createElement('gaia-text-input-multiline');
    var textarea = document.createElement('textarea');
    var el = document.createElement('div');
    el.className = 'value-page';
    //textarea.value = item.value;
    textarea.innerHTML = item.value;
    textarea.className = 'textarea';
    el.appendChild((textarea));
    return el;
  }
};

function getDisplayValue(value) {
  if (typeof value === 'string') { return '\'' + value + '\''; }
  else if (value instanceof HTMLElement) return toString.element(value);
  else if (value instanceof Text) return toString.textNode(value);
  else return value;
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-property-inspector',this));
