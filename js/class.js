// Simple JavaScript Inheritance (John Resig, MIT) — ESM export.
// Inspired by base2 and Prototype. The `.extend`/`_super` semantics are
// preserved exactly; only the module surface changed (was an IIFE that set
// `this.Class` in the global scope, which is undefined inside an ES module).
export const Class = (function () {
  var initializing = false,
    fnTest = /xyz/.test(function () { "xyz"; }) ? /\b_super\b/ : /.*/;
  var Class = function () {};
  Class.extend = function extend(prop) {
    var _super = this.prototype;
    initializing = true;
    var prototype = new this();
    initializing = false;
    for (var name in prop) {
      prototype[name] =
        typeof prop[name] == "function" && typeof _super[name] == "function" && fnTest.test(prop[name])
          ? (function (name, fn) {
              return function () {
                var tmp = this._super;
                this._super = _super[name];
                var ret = fn.apply(this, arguments);
                this._super = tmp;
                return ret;
              };
            })(name, prop[name])
          : prop[name];
    }
    function Class() {
      if (!initializing && this.init) this.init.apply(this, arguments);
    }
    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.extend = extend;
    return Class;
  };
  return Class;
})();
