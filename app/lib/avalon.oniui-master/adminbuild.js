/*==================================================
 Copyright (c) 2013-2015 司徒正美 and other contributors
 http://www.cnblogs.com/rubylouvre/
 https://github.com/RubyLouvre
 http://weibo.com/jslouvre/
 
 Released under the MIT license
 avalon.shim.js(无加载器版本) 1.45 built in 2015.7.13
 support IE6+ and other browsers
 ==================================================*/
(function(global, factory) {

    if (typeof module === "object" && typeof module.exports === "object") {
        // For CommonJS and CommonJS-like environments where a proper `window`
        // is present, execute the factory and get avalon.
        // For environments that do not have a `window` with a `document`
        // (such as Node.js), expose a factory as module.exports.
        // This accentuates the need for the creation of a real `window`.
        // e.g. var avalon = require("avalon")(window);
        module.exports = global.document ? factory(global, true) : function(w) {
            if (!w.document) {
                throw new Error("Avalon requires a window with a document")
            }
            return factory(w)
        }
    } else {
        factory(global)
    }

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function(window, noGlobal){

/*********************************************************************
 *                    全局变量及方法                                  *
 **********************************************************************/
var expose = new Date() - 0
//http://stackoverflow.com/questions/7290086/javascript-use-strict-and-nicks-find-global-function
var DOC = window.document
var head = DOC.getElementsByTagName("head")[0] //HEAD元素
var ifGroup = head.insertBefore(document.createElement("avalon"), head.firstChild) //避免IE6 base标签BUG
ifGroup.innerHTML = "X<style id='avalonStyle'>.avalonHide{ display: none!important }</style>"
ifGroup.setAttribute("ms-skip", "1")
ifGroup.className = "avalonHide"
var rnative = /\[native code\]/ //判定是否原生函数
function log() {
    if (window.console && avalon.config.debug) {
        // http://stackoverflow.com/questions/8785624/how-to-safely-wrap-console-log
        Function.apply.call(console.log, console, arguments)
    }
}


var subscribers = "$" + expose
var otherRequire = window.require
var otherDefine = window.define
var innerRequire
var stopRepeatAssign = false
var rword = /[^, ]+/g //切割字符串为一个个小块，以空格或豆号分开它们，结合replace实现字符串的forEach
var rcomplexType = /^(?:object|array)$/
var rsvg = /^\[object SVG\w*Element\]$/
var rwindow = /^\[object (?:Window|DOMWindow|global)\]$/
var oproto = Object.prototype
var ohasOwn = oproto.hasOwnProperty
var serialize = oproto.toString
var ap = Array.prototype
var aslice = ap.slice
var Registry = {} //将函数曝光到此对象上，方便访问器收集依赖
var W3C = window.dispatchEvent
var root = DOC.documentElement
var avalonFragment = DOC.createDocumentFragment()
var cinerator = DOC.createElement("div")
var class2type = {}
"Boolean Number String Function Array Date RegExp Object Error".replace(rword, function (name) {
    class2type["[object " + name + "]"] = name.toLowerCase()
})


function noop() {
}


function oneObject(array, val) {
    if (typeof array === "string") {
        array = array.match(rword) || []
    }
    var result = {},
            value = val !== void 0 ? val : 1
    for (var i = 0, n = array.length; i < n; i++) {
        result[array[i]] = value
    }
    return result
}

//生成UUID http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
var generateID = function (prefix) {
    prefix = prefix || "avalon"
    return String(Math.random() + Math.random()).replace(/\d\.\d{4}/, prefix)
}
function IE() {
    if (window.VBArray) {
        var mode = document.documentMode
        return mode ? mode : window.XMLHttpRequest ? 7 : 6
    } else {
        return NaN
    }
}
var IEVersion = IE()

avalon = function (el) { //创建jQuery式的无new 实例化结构
    return new avalon.init(el)
}

avalon.profile = function () {
    if (window.console && avalon.config.profile) {
        Function.apply.call(console.log, console, arguments)
    }
}

/*视浏览器情况采用最快的异步回调*/
avalon.nextTick = new function () {// jshint ignore:line
    var tickImmediate = window.setImmediate
    var tickObserver = window.MutationObserver
    var tickPost = W3C && window.postMessage
    if (tickImmediate) {
        return tickImmediate.bind(window)
    }

    var queue = []
    function callback() {
        var n = queue.length
        for (var i = 0; i < n; i++) {
            queue[i]()
        }
        queue = queue.slice(n)
    }

    if (tickObserver) {
        var node = document.createTextNode("avalon")
        new tickObserver(callback).observe(node, {characterData: true})// jshint ignore:line
        return function (fn) {
            queue.push(fn)
            node.data = Math.random()
        }
    }

    if (tickPost) {
        window.addEventListener("message", function (e) {
            var source = e.source
            if ((source === window || source === null) && e.data === "process-tick") {
                e.stopPropagation()
                callback()
            }
        })

        return function (fn) {
            queue.push(fn)
            window.postMessage('process-tick', '*')
        }
    }

    return function (fn) {
        setTimeout(fn, 0)
    }
}// jshint ignore:line
/*********************************************************************
 *                 avalon的静态方法定义区                              *
 **********************************************************************/
avalon.init = function (el) {
    this[0] = this.element = el
}
avalon.fn = avalon.prototype = avalon.init.prototype

avalon.type = function (obj) { //取得目标的类型
    if (obj == null) {
        return String(obj)
    }
    // 早期的webkit内核浏览器实现了已废弃的ecma262v4标准，可以将正则字面量当作函数使用，因此typeof在判定正则时会返回function
    return typeof obj === "object" || typeof obj === "function" ?
            class2type[serialize.call(obj)] || "object" :
            typeof obj
}

var isFunction = typeof alert === "object" ? function (fn) {
    try {
        return /^\s*\bfunction\b/.test(fn + "")
    } catch (e) {
        return false
    }
} : function (fn) {
    return serialize.call(fn) === "[object Function]"
}
avalon.isFunction = isFunction

avalon.isWindow = function (obj) {
    if (!obj)
        return false
    // 利用IE678 window == document为true,document == window竟然为false的神奇特性
    // 标准浏览器及IE9，IE10等使用 正则检测
    return obj == obj.document && obj.document != obj //jshint ignore:line
}

function isWindow(obj) {
    return rwindow.test(serialize.call(obj))
}
if (isWindow(window)) {
    avalon.isWindow = isWindow
}
var enu
for (enu in avalon({})) {
    break
}
var enumerateBUG = enu !== "0" //IE6下为true, 其他为false
/*判定是否是一个朴素的javascript对象（Object），不是DOM对象，不是BOM对象，不是自定义类的实例*/
avalon.isPlainObject = function (obj, key) {
    if (!obj || avalon.type(obj) !== "object" || obj.nodeType || avalon.isWindow(obj)) {
        return false;
    }
    try { //IE内置对象没有constructor
        if (obj.constructor && !ohasOwn.call(obj, "constructor") && !ohasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
            return false;
        }
    } catch (e) { //IE8 9会在这里抛错
        return false;
    }
    if (enumerateBUG) {
        for (key in obj) {
            return ohasOwn.call(obj, key)
        }
    }
    for (key in obj) {
    }
    return key === void 0 || ohasOwn.call(obj, key)
}
if (rnative.test(Object.getPrototypeOf)) {
    avalon.isPlainObject = function (obj) {
        // 简单的 typeof obj === "object"检测，会致使用isPlainObject(window)在opera下通不过
        return serialize.call(obj) === "[object Object]" && Object.getPrototypeOf(obj) === oproto
    }
}
//与jQuery.extend方法，可用于浅拷贝，深拷贝
avalon.mix = avalon.fn.mix = function () {
    var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            i = 1,
            length = arguments.length,
            deep = false

    // 如果第一个参数为布尔,判定是否深拷贝
    if (typeof target === "boolean") {
        deep = target
        target = arguments[1] || {}
        i++
    }

    //确保接受方为一个复杂的数据类型
    if (typeof target !== "object" && !isFunction(target)) {
        target = {}
    }

    //如果只有一个参数，那么新成员添加于mix所在的对象上
    if (i === length) {
        target = this
        i--
    }

    for (; i < length; i++) {
        //只处理非空参数
        if ((options = arguments[i]) != null) {
            for (name in options) {
                src = target[name]
                try {
                    copy = options[name] //当options为VBS对象时报错
                } catch (e) {
                    continue
                }

                // 防止环引用
                if (target === copy) {
                    continue
                }
                if (deep && copy && (avalon.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {

                    if (copyIsArray) {
                        copyIsArray = false
                        clone = src && Array.isArray(src) ? src : []

                    } else {
                        clone = src && avalon.isPlainObject(src) ? src : {}
                    }

                    target[name] = avalon.mix(deep, clone, copy)
                } else if (copy !== void 0) {
                    target[name] = copy
                }
            }
        }
    }
    return target
}

function _number(a, len) { //用于模拟slice, splice的效果
    a = Math.floor(a) || 0
    return a < 0 ? Math.max(len + a, 0) : Math.min(a, len);
}
avalon.mix({
    rword: rword,
    subscribers: subscribers,
    version: 1.45,
    ui: {},
    log: log,
    slice: W3C ? function (nodes, start, end) {
        return aslice.call(nodes, start, end)
    } : function (nodes, start, end) {
        var ret = []
        var len = nodes.length
        if (end === void 0)
            end = len
        if (typeof end === "number" && isFinite(end)) {
            start = _number(start, len)
            end = _number(end, len)
            for (var i = start; i < end; ++i) {
                ret[i - start] = nodes[i]
            }
        }
        return ret
    },
    noop: noop,
    /*如果不用Error对象封装一下，str在控制台下可能会乱码*/
    error: function (str, e) {
        throw  (e || Error)(str)
    },
    /*将一个以空格或逗号隔开的字符串或数组,转换成一个键值都为1的对象*/
    oneObject: oneObject,
    /* avalon.range(10)
     => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     avalon.range(1, 11)
     => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
     avalon.range(0, 30, 5)
     => [0, 5, 10, 15, 20, 25]
     avalon.range(0, -10, -1)
     => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
     avalon.range(0)
     => []*/
    range: function (start, end, step) { // 用于生成整数数组
        step || (step = 1)
        if (end == null) {
            end = start || 0
            start = 0
        }
        var index = -1,
                length = Math.max(0, Math.ceil((end - start) / step)),
                result = new Array(length)
        while (++index < length) {
            result[index] = start
            start += step
        }
        return result
    },
    eventHooks: [],
    /*绑定事件*/
    bind: function(el, type, fn, phase) {
        var hooks = avalon.eventHooks
        var hook = hooks[type]
        if (typeof hook === "object") {
            type = hook.type
            if (hook.deel) {
                 fn = hook.deel(el, type, fn, phase)
            }
        }
        var callback = W3C ? fn : function(e) {
            fn.call(el, fixEvent(e));
        }
        if (W3C) {
            el.addEventListener(type, callback, !!phase)
        } else {
            el.attachEvent("on" + type, callback)
        }
        return callback
    },
    /*卸载事件*/
    unbind: function(el, type, fn, phase) {
        var hooks = avalon.eventHooks
        var hook = hooks[type]
        var callback = fn || noop
        if (typeof hook === "object") {
            type = hook.type
            if (hook.deel) {
                fn = hook.deel(el, type, fn, false)
            }
        }
        if (W3C) {
            el.removeEventListener(type, callback, !!phase)
        } else {
            el.detachEvent("on" + type, callback)
        }
    },
    /*读写删除元素节点的样式*/
    css: function (node, name, value) {
        if (node instanceof avalon) {
            node = node[0]
        }
        var prop = /[_-]/.test(name) ? camelize(name) : name, fn
        name = avalon.cssName(prop) || prop
        if (value === void 0 || typeof value === "boolean") { //获取样式
            fn = cssHooks[prop + ":get"] || cssHooks["@:get"]
            if (name === "background") {
                name = "backgroundColor"
            }
            var val = fn(node, name)
            return value === true ? parseFloat(val) || 0 : val
        } else if (value === "") { //请除样式
            node.style[name] = ""
        } else { //设置样式
            if (value == null || value !== value) {
                return
            }
            if (isFinite(value) && !avalon.cssNumber[prop]) {
                value += "px"
            }
            fn = cssHooks[prop + ":set"] || cssHooks["@:set"]
            fn(node, name, value)
        }
    },
    /*遍历数组与对象,回调的第一个参数为索引或键名,第二个或元素或键值*/
    each: function (obj, fn) {
        if (obj) { //排除null, undefined
            var i = 0
            if (isArrayLike(obj)) {
                for (var n = obj.length; i < n; i++) {
                    if (fn(i, obj[i]) === false)
                        break
                }
            } else {
                for (i in obj) {
                    if (obj.hasOwnProperty(i) && fn(i, obj[i]) === false) {
                        break
                    }
                }
            }
        }
    },
    //收集元素的data-{{prefix}}-*属性，并转换为对象
    getWidgetData: function (elem, prefix) {
        var raw = avalon(elem).data()
        var result = {}
        for (var i in raw) {
            if (i.indexOf(prefix) === 0) {
                result[i.replace(prefix, "").replace(/\w/, function (a) {
                    return a.toLowerCase()
                })] = raw[i]
            }
        }
        return result
    },
    Array: {
        /*只有当前数组不存在此元素时只添加它*/
        ensure: function (target, item) {
            if (target.indexOf(item) === -1) {
                return target.push(item)
            }
        },
        /*移除数组中指定位置的元素，返回布尔表示成功与否*/
        removeAt: function (target, index) {
            return !!target.splice(index, 1).length
        },
        /*移除数组中第一个匹配传参的那个元素，返回布尔表示成功与否*/
        remove: function (target, item) {
            var index = target.indexOf(item)
            if (~index)
                return avalon.Array.removeAt(target, index)
            return false
        }
    }
})

var bindingHandlers = avalon.bindingHandlers = {}
var bindingExecutors = avalon.bindingExecutors = {}

/*判定是否类数组，如节点集合，纯数组，arguments与拥有非负整数的length属性的纯JS对象*/
function isArrayLike(obj) {
    if (!obj)
        return false
    var n = obj.length
    if (n === (n >>> 0)) { //检测length属性是否为非负整数
        var type = serialize.call(obj).slice(8, -1)
        if (/(?:regexp|string|function|window|global)$/i.test(type))
            return false
        if (type === "Array")
            return true
        try {
            if ({}.propertyIsEnumerable.call(obj, "length") === false) { //如果是原生对象
                return  /^\s?function/.test(obj.item || obj.callee)
            }
            return true
        } catch (e) { //IE的NodeList直接抛错
            return !obj.window //IE6-8 window
        }
    }
    return false
}


// https://github.com/rsms/js-lru
var Cache = new function() {// jshint ignore:line
    function LRU(maxLength) {
        this.size = 0
        this.limit = maxLength
        this.head = this.tail = void 0
        this._keymap = {}
    }

    var p = LRU.prototype

    p.put = function(key, value) {
        var entry = {
            key: key,
            value: value
        }
        this._keymap[key] = entry
        if (this.tail) {
            this.tail.newer = entry
            entry.older = this.tail
        } else {
            this.head = entry
        }
        this.tail = entry
        if (this.size === this.limit) {
            this.shift()
        } else {
            this.size++
        }
        return value
    }

    p.shift = function() {
        var entry = this.head
        if (entry) {
            this.head = this.head.newer
            this.head.older =
                    entry.newer =
                    entry.older =
                    this._keymap[entry.key] = void 0
        }
    }
    p.get = function(key) {
        var entry = this._keymap[key]
        if (entry === void 0)
            return
        if (entry === this.tail) {
            return  entry.value
        }
        // HEAD--------------TAIL
        //   <.older   .newer>
        //  <--- add direction --
        //   A  B  C  <D>  E
        if (entry.newer) {
            if (entry === this.head) {
                this.head = entry.newer
            }
            entry.newer.older = entry.older // C <-- E.
        }
        if (entry.older) {
            entry.older.newer = entry.newer // C. --> E
        }
        entry.newer = void 0 // D --x
        entry.older = this.tail // D. --> E
        if (this.tail) {
            this.tail.newer = entry // E. <-- D
        }
        this.tail = entry
        return entry.value
    }
    return LRU
}// jshint ignore:line

/*********************************************************************
 *                         javascript 底层补丁                       *
 **********************************************************************/
if (!"司徒正美".trim) {
    var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g
    String.prototype.trim = function () {
        return this.replace(rtrim, "")
    }
}
var hasDontEnumBug = !({
    'toString': null
}).propertyIsEnumerable('toString'),
        hasProtoEnumBug = (function () {
        }).propertyIsEnumerable('prototype'),
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;
if (!Object.keys) {
    Object.keys = function (object) { //ecma262v5 15.2.3.14
        var theKeys = []
        var skipProto = hasProtoEnumBug && typeof object === "function"
        if (typeof object === "string" || (object && object.callee)) {
            for (var i = 0; i < object.length; ++i) {
                theKeys.push(String(i))
            }
        } else {
            for (var name in object) {
                if (!(skipProto && name === "prototype") && ohasOwn.call(object, name)) {
                    theKeys.push(String(name))
                }
            }
        }

        if (hasDontEnumBug) {
            var ctor = object.constructor,
                    skipConstructor = ctor && ctor.prototype === object
            for (var j = 0; j < dontEnumsLength; j++) {
                var dontEnum = dontEnums[j]
                if (!(skipConstructor && dontEnum === "constructor") && ohasOwn.call(object, dontEnum)) {
                    theKeys.push(dontEnum)
                }
            }
        }
        return theKeys
    }
}
if (!Array.isArray) {
    Array.isArray = function (a) {
        return serialize.call(a) === "[object Array]"
    }
}

if (!noop.bind) {
    Function.prototype.bind = function (scope) {
        if (arguments.length < 2 && scope === void 0)
            return this
        var fn = this,
                argv = arguments
        return function () {
            var args = [],
                    i
            for (i = 1; i < argv.length; i++)
                args.push(argv[i])
            for (i = 0; i < arguments.length; i++)
                args.push(arguments[i])
            return fn.apply(scope, args)
        }
    }
}

function iterator(vars, body, ret) {
    var fun = 'for(var ' + vars + 'i=0,n = this.length; i < n; i++){' + body.replace('_', '((i in this) && fn.call(scope,this[i],i,this))') + '}' + ret
    /* jshint ignore:start */
    return Function("fn,scope", fun)
    /* jshint ignore:end */
}
if (!rnative.test([].map)) {
    avalon.mix(ap, {
        //定位操作，返回数组中第一个等于给定参数的元素的索引值。
        indexOf: function (item, index) {
            var n = this.length,
                    i = ~~index
            if (i < 0)
                i += n
            for (; i < n; i++)
                if (this[i] === item)
                    return i
            return -1
        },
        //定位操作，同上，不过是从后遍历。
        lastIndexOf: function (item, index) {
            var n = this.length,
                    i = index == null ? n - 1 : index
            if (i < 0)
                i = Math.max(0, n + i)
            for (; i >= 0; i--)
                if (this[i] === item)
                    return i
            return -1
        },
        //迭代操作，将数组的元素挨个儿传入一个函数中执行。Prototype.js的对应名字为each。
        forEach: iterator("", '_', ""),
        //迭代类 在数组中的每个项上运行一个函数，如果此函数的值为真，则此元素作为新数组的元素收集起来，并返回新数组
        filter: iterator('r=[],j=0,', 'if(_)r[j++]=this[i]', 'return r'),
        //收集操作，将数组的元素挨个儿传入一个函数中执行，然后把它们的返回值组成一个新数组返回。Prototype.js的对应名字为collect。
        map: iterator('r=[],', 'r[i]=_', 'return r'),
        //只要数组中有一个元素满足条件（放进给定函数返回true），那么它就返回true。Prototype.js的对应名字为any。
        some: iterator("", 'if(_)return true', 'return false'),
        //只有数组中的元素都满足条件（放进给定函数返回true），它才返回true。Prototype.js的对应名字为all。
        every: iterator("", 'if(!_)return false', 'return true')
    })
}
/*********************************************************************
 *                           DOM 底层补丁                             *
 **********************************************************************/

function fixContains(root, el) {
    try { //IE6-8,游离于DOM树外的文本节点，访问parentNode有时会抛错
        while ((el = el.parentNode))
            if (el === root)
                return true
        return false
    } catch (e) {
        return false
    }
}
avalon.contains = fixContains
//IE6-11的文档对象没有contains
if (!DOC.contains) {
    DOC.contains = function (b) {
        return fixContains(DOC, b)
    }
}

function outerHTML() {
    return new XMLSerializer().serializeToString(this)
}

if (window.SVGElement) {
    //safari5+是把contains方法放在Element.prototype上而不是Node.prototype
    if (!DOC.createTextNode("x").contains) {
        Node.prototype.contains = function (arg) {//IE6-8没有Node对象
            return !!(this.compareDocumentPosition(arg) & 16)
        }
    }
    var svgns = "http://www.w3.org/2000/svg"
    var svg = DOC.createElementNS(svgns, "svg")
    svg.innerHTML = '<circle cx="50" cy="50" r="40" fill="red" />'
    if (!rsvg.test(svg.firstChild)) { // #409
        function enumerateNode(node, targetNode) {// jshint ignore:line
            if (node && node.childNodes) {
                var nodes = node.childNodes
                for (var i = 0, el; el = nodes[i++]; ) {
                    if (el.tagName) {
                        var svg = DOC.createElementNS(svgns,
                                el.tagName.toLowerCase())
                        ap.forEach.call(el.attributes, function (attr) {
                            svg.setAttribute(attr.name, attr.value) //复制属性
                        })// jshint ignore:line
                        // 递归处理子节点
                        enumerateNode(el, svg)
                        targetNode.appendChild(svg)
                    }
                }
            }
        }
        Object.defineProperties(SVGElement.prototype, {
            "outerHTML": {//IE9-11,firefox不支持SVG元素的innerHTML,outerHTML属性
                enumerable: true,
                configurable: true,
                get: outerHTML,
                set: function (html) {
                    var tagName = this.tagName.toLowerCase(),
                            par = this.parentNode,
                            frag = avalon.parseHTML(html)
                    // 操作的svg，直接插入
                    if (tagName === "svg") {
                        par.insertBefore(frag, this)
                        // svg节点的子节点类似
                    } else {
                        var newFrag = DOC.createDocumentFragment()
                        enumerateNode(frag, newFrag)
                        par.insertBefore(newFrag, this)
                    }
                    par.removeChild(this)
                }
            },
            "innerHTML": {
                enumerable: true,
                configurable: true,
                get: function () {
                    var s = this.outerHTML
                    var ropen = new RegExp("<" + this.nodeName + '\\b(?:(["\'])[^"]*?(\\1)|[^>])*>', "i")
                    var rclose = new RegExp("<\/" + this.nodeName + ">$", "i")
                    return s.replace(ropen, "").replace(rclose, "")
                },
                set: function (html) {
                    if (avalon.clearHTML) {
                        avalon.clearHTML(this)
                        var frag = avalon.parseHTML(html)
                        enumerateNode(frag, this)
                    }
                }
            }
        })
    }
}
if (!root.outerHTML && window.HTMLElement) { //firefox 到11时才有outerHTML
    HTMLElement.prototype.__defineGetter__("outerHTML", outerHTML);
}


//============================= event binding =======================
var rmouseEvent = /^(?:mouse|contextmenu|drag)|click/
function fixEvent(event) {
    var ret = {}
    for (var i in event) {
        ret[i] = event[i]
    }
    var target = ret.target = event.srcElement
    if (event.type.indexOf("key") === 0) {
        ret.which = event.charCode != null ? event.charCode : event.keyCode
    } else if (rmouseEvent.test(event.type)) {
        var doc = target.ownerDocument || DOC
        var box = doc.compatMode === "BackCompat" ? doc.body : doc.documentElement
        ret.pageX = event.clientX + (box.scrollLeft >> 0) - (box.clientLeft >> 0)
        ret.pageY = event.clientY + (box.scrollTop >> 0) - (box.clientTop >> 0)
        ret.wheelDeltaY = ret.wheelDelta
        ret.wheelDeltaX = 0
    }
    ret.timeStamp = new Date() - 0
    ret.originalEvent = event
    ret.preventDefault = function () { //阻止默认行为
        event.returnValue = false
    }
    ret.stopPropagation = function () { //阻止事件在DOM树中的传播
        event.cancelBubble = true
    }
    return ret
}

var eventHooks = avalon.eventHooks
//针对firefox, chrome修正mouseenter, mouseleave
if (!("onmouseenter" in root)) {
    avalon.each({
        mouseenter: "mouseover",
        mouseleave: "mouseout"
    }, function (origType, fixType) {
        eventHooks[origType] = {
            type: fixType,
            deel: function (elem, _, fn) {
                return function (e) {
                    var t = e.relatedTarget
                    if (!t || (t !== elem && !(elem.compareDocumentPosition(t) & 16))) {
                        delete e.type
                        e.type = origType
                        return fn.call(elem, e)
                    }
                }
            }
        }
    })
}
//针对IE9+, w3c修正animationend
avalon.each({
    AnimationEvent: "animationend",
    WebKitAnimationEvent: "webkitAnimationEnd"
}, function (construct, fixType) {
    if (window[construct] && !eventHooks.animationend) {
        eventHooks.animationend = {
            type: fixType
        }
    }
})
//针对IE6-8修正input
if (!("oninput" in DOC.createElement("input"))) {
    eventHooks.input = {
        type: "propertychange",
        deel: function (elem, _, fn) {
            return function (e) {
                if (e.propertyName === "value") {
                    e.type = "input"
                    return fn.call(elem, e)
                }
            }
        }
    }
}
if (DOC.onmousewheel === void 0) {
    /* IE6-11 chrome mousewheel wheelDetla 下 -120 上 120
     firefox DOMMouseScroll detail 下3 上-3
     firefox wheel detlaY 下3 上-3
     IE9-11 wheel deltaY 下40 上-40
     chrome wheel deltaY 下100 上-100 */
    var fixWheelType = DOC.onwheel !== void 0 ? "wheel" : "DOMMouseScroll"
    var fixWheelDelta = fixWheelType === "wheel" ? "deltaY" : "detail"
    eventHooks.mousewheel = {
        type: fixWheelType,
        deel: function (elem, _, fn) {
            return function (e) {
                e.wheelDeltaY = e.wheelDelta = e[fixWheelDelta] > 0 ? -120 : 120
                e.wheelDeltaX = 0
                if (Object.defineProperty) {
                    Object.defineProperty(e, "type", {
                        value: "mousewheel"
                    })
                }
                fn.call(elem, e)
            }
        }
    }
}



/*********************************************************************
 *                           配置系统                                 *
 **********************************************************************/

function kernel(settings) {
    for (var p in settings) {
        if (!ohasOwn.call(settings, p))
            continue
        var val = settings[p]
        if (typeof kernel.plugins[p] === "function") {
            kernel.plugins[p](val)
        } else if (typeof kernel[p] === "object") {
            avalon.mix(kernel[p], val)
        } else {
            kernel[p] = val
        }
    }
    return this
}
var openTag, closeTag, rexpr, rexprg, rbind, rregexp = /[-.*+?^${}()|[\]\/\\]/g

function escapeRegExp(target) {
    //http://stevenlevithan.com/regex/xregexp/
    //将字符串安全格式化为正则表达式的源码
    return (target + "").replace(rregexp, "\\$&")
}

var plugins = {
    loader: function (builtin) {
        var flag = innerRequire && builtin
        window.require = flag ? innerRequire : otherRequire
        window.define = flag ? innerRequire.define : otherDefine
    },
    interpolate: function (array) {
        openTag = array[0]
        closeTag = array[1]
        if (openTag === closeTag) {
            throw new SyntaxError("openTag!==closeTag")
            var test = openTag + "test" + closeTag
            cinerator.innerHTML = test
            if (cinerator.innerHTML !== test && cinerator.innerHTML.indexOf("&lt;") > -1) {
                throw new SyntaxError("此定界符不合法")
            }
            cinerator.innerHTML = ""
        }
        var o = escapeRegExp(openTag),
                c = escapeRegExp(closeTag)
        rexpr = new RegExp(o + "(.*?)" + c)
        rexprg = new RegExp(o + "(.*?)" + c, "g")
        rbind = new RegExp(o + ".*?" + c + "|\\sms-")
    }
}

kernel.debug = true
kernel.plugins = plugins
kernel.plugins['interpolate'](["{{", "}}"])
kernel.paths = {}
kernel.shim = {}
kernel.maxRepeatSize = 100
avalon.config = kernel
var ravalon = /(\w+)\[(avalonctrl)="(\S+)"\]/
var findNodes = DOC.querySelectorAll ? function(str) {
    return DOC.querySelectorAll(str)
} : function(str) {
    var match = str.match(ravalon)
    var all = DOC.getElementsByTagName(match[1])
    var nodes = []
    for (var i = 0, el; el = all[i++]; ) {
        if (el.getAttribute(match[2]) === match[3]) {
            nodes.push(el)
        }
    }
    return nodes
}
/*********************************************************************
 *                            事件总线                               *
 **********************************************************************/
var EventBus = {
    $watch: function (type, callback) {
        if (typeof callback === "function") {
            var callbacks = this.$events[type]
            if (callbacks) {
                callbacks.push(callback)
            } else {
                this.$events[type] = [callback]
            }
        } else { //重新开始监听此VM的第一重简单属性的变动
            this.$events = this.$watch.backup
        }
        return this
    },
    $unwatch: function (type, callback) {
        var n = arguments.length
        if (n === 0) { //让此VM的所有$watch回调无效化
            this.$watch.backup = this.$events
            this.$events = {}
        } else if (n === 1) {
            this.$events[type] = []
        } else {
            var callbacks = this.$events[type] || []
            var i = callbacks.length
            while (~--i < 0) {
                if (callbacks[i] === callback) {
                    return callbacks.splice(i, 1)
                }
            }
        }
        return this
    },
    $fire: function (type) {
        var special, i, v, callback
        if (/^(\w+)!(\S+)$/.test(type)) {
            special = RegExp.$1
            type = RegExp.$2
        }
        var events = this.$events
        if (!events)
            return
        var args = aslice.call(arguments, 1)
        var detail = [type].concat(args)
        if (special === "all") {
            for (i in avalon.vmodels) {
                v = avalon.vmodels[i]
                if (v !== this) {
                    v.$fire.apply(v, detail)
                }
            }
        } else if (special === "up" || special === "down") {
            var elements = events.expr ? findNodes(events.expr) : []
            if (elements.length === 0)
                return
            for (i in avalon.vmodels) {
                v = avalon.vmodels[i]
                if (v !== this) {
                    if (v.$events.expr) {
                        var eventNodes = findNodes(v.$events.expr)
                        if (eventNodes.length === 0) {
                            continue
                        }
                        //循环两个vmodel中的节点，查找匹配（向上匹配或者向下匹配）的节点并设置标识
                        /* jshint ignore:start */
                        ap.forEach.call(eventNodes, function (node) {
                            ap.forEach.call(elements, function (element) {
                                var ok = special === "down" ? element.contains(node) : //向下捕获
                                        node.contains(element) //向上冒泡
                                if (ok) {
                                    node._avalon = v //符合条件的加一个标识
                                }
                            });
                        })
                        /* jshint ignore:end */
                    }
                }
            }
            var nodes = DOC.getElementsByTagName("*") //实现节点排序
            var alls = []
            ap.forEach.call(nodes, function (el) {
                if (el._avalon) {
                    alls.push(el._avalon)
                    el._avalon = ""
                    el.removeAttribute("_avalon")
                }
            })
            if (special === "up") {
                alls.reverse()
            }
            for (i = 0; callback = alls[i++]; ) {
                if (callback.$fire.apply(callback, detail) === false) {
                    break
                }
            }
        } else {
            var callbacks = events[type] || []
            var all = events.$all || []
            for (i = 0; callback = callbacks[i++]; ) {
                if (isFunction(callback))
                    callback.apply(this, args)
            }
            for (i = 0; callback = all[i++]; ) {
                if (isFunction(callback))
                    callback.apply(this, arguments)
            }
        }
    }
}

/*********************************************************************
 *                           modelFactory                             *
 **********************************************************************/
//avalon最核心的方法的两个方法之一（另一个是avalon.scan），返回一个ViewModel(VM)
var VMODELS = avalon.vmodels = {} //所有vmodel都储存在这里
avalon.define = function (id, factory) {
    var $id = id.$id || id
    if (!$id) {
        log("warning: vm必须指定$id")
    }
    if (VMODELS[$id]) {
        log("warning: " + $id + " 已经存在于avalon.vmodels中")
    }
    if (typeof id === "object") {
        var model = modelFactory(id)
    } else {
        var scope = {
            $watch: noop
        }
        factory(scope) //得到所有定义

        model = modelFactory(scope) //偷天换日，将scope换为model
        stopRepeatAssign = true
        factory(model)
        stopRepeatAssign = false
    }
    model.$id = $id
    return VMODELS[$id] = model
}

//一些不需要被监听的属性
var $$skipArray = String("$id,$watch,$unwatch,$fire,$events,$model,$skipArray,$proxy,$reinitialize,$propertyNames").match(rword)
var defineProperty = Object.defineProperty
var canHideOwn = true
//如果浏览器不支持ecma262v5的Object.defineProperties或者存在BUG，比如IE8
//标准浏览器使用__defineGetter__, __defineSetter__实现
try {
    defineProperty({}, "_", {
        value: "x"
    })
    var defineProperties = Object.defineProperties
} catch (e) {
    canHideOwn = false
}

function modelFactory(source, $special, $model) {
    if (Array.isArray(source)) {
        var arr = source.concat()
        source.length = 0
        var collection = arrayFactory(source)
        collection.pushArray(arr)
        return collection
    }
    //0 null undefined || Node || VModel(fix IE6-8 createWithProxy $val: val引发的BUG)
    if (!source || source.nodeType > 0 || (source.$id && source.$events)) {
        return source
    }
    var $skipArray = Array.isArray(source.$skipArray) ? source.$skipArray : []
    $skipArray.$special = $special || {} //强制要监听的属性
    var $vmodel = {} //要返回的对象, 它在IE6-8下可能被偷龙转凤
    $model = $model || {} //vmodels.$model属性
    var $events = {} //vmodel.$events属性
    var accessors = {} //监控属性
    var computed = []
    $$skipArray.forEach(function (name) {
        delete source[name]
    })
    var names = Object.keys(source)
    /* jshint ignore:start */
    names.forEach(function (name, accessor) {
        var val = source[name]
        $model[name] = val
        if (isObservable(name, val, $skipArray)) {
            //总共产生三种accessor
            $events[name] = []
            var valueType = avalon.type(val)
            //总共产生三种accessor
            if (valueType === "object" && isFunction(val.get) && Object.keys(val).length <= 2) {
                accessor = makeComputedAccessor(name, val)
                computed.push(accessor)
            } else if (rcomplexType.test(valueType)) {
                accessor = makeComplexAccessor(name, val, valueType, $events[name])
            } else {
                accessor = makeSimpleAccessor(name, val)
            }
            accessors[name] = accessor
        }
    })
    /* jshint ignore:end */

    $vmodel = defineProperties($vmodel, descriptorFactory(accessors), source) //生成一个空的ViewModel
    for (var i = 0; i < names.length; i++) {
        var name = names[i]
        if (!accessors[name]) {
            $vmodel[name] = source[name]
        }
    }
    //添加$id, $model, $events, $watch, $unwatch, $fire
    $vmodel.$propertyNames = names.sort().join("&shy;")
    $vmodel.$id = generateID()
    $vmodel.$model = $model
    $vmodel.$events = $events
    for (i in EventBus) {
        var fn = EventBus[i]
        if (!W3C) { //在IE6-8下，VB对象的方法里的this并不指向自身，需要用bind处理一下
            fn = fn.bind($vmodel)
        }
        $vmodel[i] = fn
    }
    if (canHideOwn) {
        Object.defineProperty($vmodel, "hasOwnProperty", hasOwnDescriptor)
    } else {
        /* jshint ignore:start */
        $vmodel.hasOwnProperty = function (name) {
            return name in $vmodel.$model
        }
        /* jshint ignore:end */
    }

    $vmodel.$reinitialize = function () {
        computed.forEach(function (accessor) {
            delete accessor._value
            delete accessor.oldArgs
            accessor.digest = function () {
                accessor.call($vmodel)
            }
            dependencyDetection.begin({
                callback: function (vm, dependency) {//dependency为一个accessor
                    var name = dependency._name
                    if (dependency !== accessor) {
                        var list = vm.$events[name]
                        injectDependency(list, accessor.digest)
                    }
                }
            })
            try {
                accessor.get.call($vmodel)
            } finally {
                dependencyDetection.end()
            }
        })
    }
    $vmodel.$reinitialize()
    return $vmodel
}

var hasOwnDescriptor = {
    value: function (name) {
        return name in this.$model
    },
    writable: false,
    enumerable: false,
    configurable: true
}
//创建一个简单访问器
function makeSimpleAccessor(name, value) {
    function accessor(value) {
        var oldValue = accessor._value
        if (arguments.length > 0) {
            if (!stopRepeatAssign && !isEqual(value, oldValue)) {
                accessor.updateValue(this, value)
                accessor.notify(this, value, oldValue)
            }
            return this
        } else {
            dependencyDetection.collectDependency(this, accessor)
            return oldValue
        }
    }
    accessorFactory(accessor, name)
    accessor._value = value
    return accessor;
}

//创建一个计算访问器
function makeComputedAccessor(name, options) {
    function accessor(value) {//计算属性
        var oldValue = accessor._value
        var init = ("_value" in accessor)
        if (arguments.length > 0) {
            if (stopRepeatAssign) {
                return this
            }
            if (typeof accessor.set === "function") {
                if (accessor.oldArgs !== value) {
                    accessor.oldArgs = value
                    var $events = this.$events
                    var lock = $events[name]
                    $events[name] = [] //清空回调，防止内部冒泡而触发多次$fire
                    accessor.set.call(this, value)
                    $events[name] = lock
                    value = accessor.get.call(this)
                    if (value !== oldValue) {
                        accessor.updateValue(this, value)
                        accessor.notify(this, value, oldValue) //触发$watch回调
                    }
                }
            }
            return this
        } else {
            //将依赖于自己的高层访问器或视图刷新函数（以绑定对象形式）放到自己的订阅数组中
            //将自己注入到低层访问器的订阅数组中
            value = accessor.get.call(this)
            accessor.updateValue(this, value)
            if (init && oldValue !== value) {
                accessor.notify(this, value, oldValue) //触发$watch回调
            }
            return value
        }
    }
    accessor.set = options.set
    accessor.get = options.get
    accessorFactory(accessor, name)
    return accessor
}

//创建一个复杂访问器
function makeComplexAccessor(name, initValue, valueType, list) {
    function accessor(value) {
        var oldValue = accessor._value

        var son = accessor._vmodel
        if (arguments.length > 0) {
            if (stopRepeatAssign) {
                return this
            }
            if (valueType === "array") {
                var a = son, b = value,
                        an = a.length,
                        bn = b.length
                a.$lock = true
                if (an > bn) {
                    a.splice(bn, an - bn)
                } else if (bn > an) {
                    a.push.apply(a, b.slice(an))
                }
                var n = Math.min(an, bn)
                for (var i = 0; i < n; i++) {
                    a.set(i, b[i])
                }
                delete a.$lock
                a._fire("set")
            } else if (valueType === "object") {
                var newPropertyNames = Object.keys(value).sort().join("&shy;")
                if (son.$propertyNames === newPropertyNames) {
                    for (i in value) {
                        son[i] = value[i]
                    }
                } else if(W3C){
                      var a  = accessor._vmodel = modelFactory(value)
                      a.$events = son.$events
                } else{
                    var $proxy = son.$proxy
                    son = accessor._vmodel = modelFactory(value)
                    var observes = son.$events[subscribers] = this.$events[name] || []
                    var iterators = observes.concat()
                    observes.length = 0
                    son.$proxy = $proxy
                    while (a = iterators.shift()) {
                        var fn = bindingHandlers[a.type]
                        if (fn) { //#753
                            a.rollback && a.rollback() //还原 ms-with ms-on
                            fn(a, a.vmodels)
                        }
                    }
                }
            }
            accessor.updateValue(this, son.$model)
            accessor.notify(this, this._value, oldValue)
            return this
        } else {
            dependencyDetection.collectDependency(this, accessor)
            return son
        }
    }
    accessorFactory(accessor, name)
    var son = accessor._vmodel = modelFactory(initValue)
    son.$events[subscribers] = list
    return accessor
}

function globalUpdateValue(vmodel, value) {
    vmodel.$model[this._name] = this._value = value
}

function globalNotify(vmodel, value, oldValue) {
    var name = this._name
    var array = vmodel.$events[name] //刷新值
    if (array) {
        fireDependencies(array) //同步视图
        EventBus.$fire.call(vmodel, name, value, oldValue) //触发$watch回调
    }
}

function accessorFactory(accessor, name) {
    accessor._name = name
    //同时更新_value与model
    accessor.updateValue = globalUpdateValue
    accessor.notify = globalNotify
}

//比较两个值是否相等
var isEqual = Object.is || function (v1, v2) {
    if (v1 === 0 && v2 === 0) {
        return 1 / v1 === 1 / v2
    } else if (v1 !== v1) {
        return v2 !== v2
    } else {
        return v1 === v2
    }
}

function isObservable(name, value, $skipArray) {
    if (isFunction(value) || value && value.nodeType) {
        return false
    }
    if ($skipArray.indexOf(name) !== -1) {
        return false
    }
    var $special = $skipArray.$special
    if (name && name.charAt(0) === "$" && !$special[name]) {
        return false
    }
    return true
}

var descriptorFactory = W3C ? function (obj) {
    var descriptors = {}
    for (var i in obj) {
        descriptors[i] = {
            get: obj[i],
            set: obj[i],
            enumerable: true,
            configurable: true
        }
    }
    return descriptors
} : function (a) {
    return a
}

//    function diff(newObject, oldObject) {
//        var added = []
//        for (var i in newObject) {
//            if (newObject.hasOwnProperty(i)) {
//                if (!oldObject.hasOwnerProperty(i)) {
//                    added.push({
//                        name: i,
//                        value: newObject[i]
//                    })
//                }
//            }
//        }
//        var deleted = []
//        for (var i in newObject) {
//            if (oldObject.hasOwnProperty(i)) {
//                if (!newObject.hasOwnerProperty(i)) {
//                    deleted.push( Object.getOwnPropertyDescriptor(oldObject, i).get)
//                }
//            }
//        }
//        for(var i = 0; i < added.length; i++){
//            var a = added[i]
//            var fn = deleted.shift()
//            fn._name = a.name
//            fn._value = a.value
//        }
//    }
//===================修复浏览器对Object.defineProperties的支持=================
if (!canHideOwn) {
    if ("__defineGetter__" in avalon) {
        defineProperty = function (obj, prop, desc) {
            if ('value' in desc) {
                obj[prop] = desc.value
            }
            if ("get" in desc) {
                obj.__defineGetter__(prop, desc.get)
            }
            if ('set' in desc) {
                obj.__defineSetter__(prop, desc.set)
            }
            return obj
        }
        defineProperties = function (obj, descs) {
            for (var prop in descs) {
                if (descs.hasOwnProperty(prop)) {
                    defineProperty(obj, prop, descs[prop])
                }
            }
            return obj
        }
    }
    if (IEVersion) {
        var VBClassPool = {}
        window.execScript([// jshint ignore:line
            "Function parseVB(code)",
            "\tExecuteGlobal(code)",
            "End Function" //转换一段文本为VB代码
        ].join("\n"), "VBScript")
        function VBMediator(instance, accessors, name, value) {// jshint ignore:line
            var accessor = accessors[name]
            if (arguments.length === 4) {
                accessor.call(instance, value)
            } else {
                return accessor.call(instance)
            }
        }
        defineProperties = function (name, accessors, properties) {
            // jshint ignore:line
            var buffer = []
            buffer.push(
                    "\r\n\tPrivate [__data__], [__proxy__]",
                    "\tPublic Default Function [__const__](d, p)",
                    "\t\tSet [__data__] = d: set [__proxy__] = p",
                    "\t\tSet [__const__] = Me", //链式调用
                    "\tEnd Function")
            //添加普通属性,因为VBScript对象不能像JS那样随意增删属性，必须在这里预先定义好
            for (name in properties) {
                if (!accessors.hasOwnProperty(name)) {
                    buffer.push("\tPublic [" + name + "]")
                }
            }
            $$skipArray.forEach(function (name) {
                if (!accessors.hasOwnProperty(name)) {
                    buffer.push("\tPublic [" + name + "]")
                }
            })
            buffer.push("\tPublic [" + 'hasOwnProperty' + "]")
            //添加访问器属性 
            for (name in accessors) {
                buffer.push(
                        //由于不知对方会传入什么,因此set, let都用上
                        "\tPublic Property Let [" + name + "](val" + expose + ")", //setter
                        "\t\tCall [__proxy__](Me,[__data__], \"" + name + "\", val" + expose + ")",
                        "\tEnd Property",
                        "\tPublic Property Set [" + name + "](val" + expose + ")", //setter
                        "\t\tCall [__proxy__](Me,[__data__], \"" + name + "\", val" + expose + ")",
                        "\tEnd Property",
                        "\tPublic Property Get [" + name + "]", //getter
                        "\tOn Error Resume Next", //必须优先使用set语句,否则它会误将数组当字符串返回
                        "\t\tSet[" + name + "] = [__proxy__](Me,[__data__],\"" + name + "\")",
                        "\tIf Err.Number <> 0 Then",
                        "\t\t[" + name + "] = [__proxy__](Me,[__data__],\"" + name + "\")",
                        "\tEnd If",
                        "\tOn Error Goto 0",
                        "\tEnd Property")

            }

            buffer.push("End Class")
            var body = buffer.join("\r\n")
            var className =VBClassPool[body]   
            if (!className) {
                className = generateID("VBClass")
                window.parseVB("Class " + className + body)
                window.parseVB([
                    "Function " + className + "Factory(a, b)", //创建实例并传入两个关键的参数
                    "\tDim o",
                    "\tSet o = (New " + className + ")(a, b)",
                    "\tSet " + className + "Factory = o",
                    "End Function"
                ].join("\r\n"))
                VBClassPool[body] = className
            }
            var ret = window[className + "Factory"](accessors, VBMediator) //得到其产品
            return ret //得到其产品
        }
    }
}

/*********************************************************************
 *          监控数组（与ms-each, ms-repeat配合使用）                     *
 **********************************************************************/

function arrayFactory(model) {
    var array = []
    array.$id = generateID()
    array.$model = model //数据模型
    array.$events = {}
    array.$events[subscribers] = []
    array._ = modelFactory({
        length: model.length
    })
    array._.$watch("length", function (a, b) {
        array.$fire("length", a, b)
    })
    for (var i in EventBus) {
        array[i] = EventBus[i]
    }
    avalon.mix(array, arrayPrototype)
    return array
}

function mutateArray(method, pos, n, index, method2, pos2, n2) {
    var oldLen = this.length, loop = 2
    while (--loop) {
        switch (method) {
      case "add":
                /* jshint ignore:start */
                var array = this.$model.slice(pos, pos + n).map(function (el) {
                    if (rcomplexType.test(avalon.type(el))) {
                        return el.$id ? el : modelFactory(el, 0, el)
                    } else {
                        return el
                    }
                })
                /* jshint ignore:end */
                _splice.apply(this, [pos, 0].concat(array))
                this._fire("add", pos, n)
                break
            case "del":
                var ret = this._splice(pos, n)
                this._fire("del", pos, n)
                break
        }
        if (method2) {
            method = method2
            pos = pos2
            n = n2
            loop = 2
            method2 = 0
        }
    }
    this._fire("index", index)
    if (this.length !== oldLen) {
        this._.length = this.length
    }
    return ret
}

var _splice = ap.splice
var arrayPrototype = {
    _splice: _splice,
    _fire: function (method, a, b) {
        fireDependencies(this.$events[subscribers], method, a, b)
    },
    size: function () { //取得数组长度，这个函数可以同步视图，length不能
        return this._.length
    },
    pushArray: function (array) {
        var m = array.length, n = this.length
        if (m) {
            ap.push.apply(this.$model, array)
            mutateArray.call(this, "add", n, m, Math.max(0, n - 1))
        }
        return  m + n
    },
    push: function () {
        //http://jsperf.com/closure-with-arguments
        var array = []
        var i, n = arguments.length
        for (i = 0; i < n; i++) {
            array[i] = arguments[i]
        }
        return this.pushArray(array)
    },
    unshift: function () {
        var m = arguments.length, n = this.length
        if (m) {
            ap.unshift.apply(this.$model, arguments)
            mutateArray.call(this, "add", 0, m, 0)
        }
        return  m + n //IE67的unshift不会返回长度
    },
    shift: function () {
        if (this.length) {
            var el = this.$model.shift()
            mutateArray.call(this, "del", 0, 1, 0)
            return el //返回被移除的元素
        }
    },
    pop: function () {
        var n = this.length
        if (n) {
            var el = this.$model.pop()
            mutateArray.call(this, "del", n - 1, 1, Math.max(0, n - 2))
            return el //返回被移除的元素
        }
    },
    splice: function (start) {
        var m = arguments.length, args = [], change
        var removed = _splice.apply(this.$model, arguments)
        if (removed.length) { //如果用户删掉了元素
            args.push("del", start, removed.length, 0)
            change = true
        }
        if (m > 2) {  //如果用户添加了元素
            if (change) {
                args.splice(3, 1, 0, "add", start, m - 2)
            } else {
                args.push("add", start, m - 2, 0)
            }
            change = true
        }
        if (change) { //返回被移除的元素
            return mutateArray.apply(this, args)
        } else {
            return []
        }
    },
    contains: function (el) { //判定是否包含
        return this.indexOf(el) !== -1
    },
    remove: function (el) { //移除第一个等于给定值的元素
        return this.removeAt(this.indexOf(el))
    },
    removeAt: function (index) { //移除指定索引上的元素
        if (index >= 0) {
            this.$model.splice(index, 1)
            return mutateArray.call(this, "del", index, 1, 0)
        }
        return  []
    },
    clear: function () {
        this.$model.length = this.length = this._.length = 0 //清空数组
        this._fire("clear", 0)
        return this
    },
    removeAll: function (all) { //移除N个元素
        if (Array.isArray(all)) {
            for (var i = this.length - 1; i >= 0; i--) {
                if (all.indexOf(this[i]) !== -1) {
                    this.removeAt(i)
                }
            }
        } else if (typeof all === "function") {
            for ( i = this.length - 1; i >= 0; i--) {
                var el = this[i]
                if (all(el, i)) {
                    this.removeAt(i)
                }
            }
        } else {
            this.clear()
        }
    },
    ensure: function (el) {
        if (!this.contains(el)) { //只有不存在才push
            this.push(el)
        }
        return this
    },
    set: function (index, val) {
        if (index >= 0) {
            var valueType = avalon.type(val)
            if (val && val.$model) {
                val = val.$model
            }
            var target = this[index]
            if (valueType === "object") {
                for (var i in val) {
                    if (target.hasOwnProperty(i)) {
                        target[i] = val[i]
                    }
                }
            } else if (valueType === "array") {
                target.clear().push.apply(target, val)
            } else if (target !== val) {
                this[index] = val
                this.$model[index] = val
                this._fire("set", index, val)
            }
        }
        return this
    }
}
//相当于原来bindingExecutors.repeat 的index分支
function resetIndex(array, pos) {
    var last = array.length - 1
    for (var el; el = array[pos]; pos++) {
        el.$index = pos
        el.$first = pos === 0
        el.$last = pos === last
    }
}

function sortByIndex(array, indexes) {
    var map = {};
    for (var i = 0, n = indexes.length; i < n; i++) {
        map[i] = array[i] // preserve
        var j = indexes[i]
        if (j in map) {
            array[i] = map[j]
            delete map[j]
        } else {
            array[i] = array[j]
        }
    }
}

"sort,reverse".replace(rword, function (method) {
    arrayPrototype[method] = function () {
        var newArray = this.$model//这是要排序的新数组
        var oldArray = newArray.concat() //保持原来状态的旧数组
        var mask = Math.random()
        var indexes = []
        var hasSort
        ap[method].apply(newArray, arguments) //排序
        for (var i = 0, n = oldArray.length; i < n; i++) {
            var neo = newArray[i]
            var old = oldArray[i]
            if (isEqual(neo, old)) {
                indexes.push(i)
            } else {
                var index = oldArray.indexOf(neo)
                indexes.push(index)//得到新数组的每个元素在旧数组对应的位置
                oldArray[index] = mask    //屏蔽已经找过的元素
                hasSort = true
            }
        }
        if (hasSort) {
            sortByIndex(this, indexes)
            // sortByIndex(this.$proxy, indexes)
            this._fire("move", indexes)
              this._fire("index", 0)
        }
        return this
    }
})


/*********************************************************************
 *                           依赖调度系统                             *
 **********************************************************************/
//检测两个对象间的依赖关系
var dependencyDetection = (function () {
    var outerFrames = []
    var currentFrame
    return {
        begin: function (accessorObject) {
            //accessorObject为一个拥有callback的对象
            outerFrames.push(currentFrame)
            currentFrame = accessorObject
        },
        end: function () {
            currentFrame = outerFrames.pop()
        },
        collectDependency: function (vmodel, accessor) {
            if (currentFrame) {
                //被dependencyDetection.begin调用
                currentFrame.callback(vmodel, accessor);
            }
        }
    };
})()
//将绑定对象注入到其依赖项的订阅数组中
var ronduplex = /^(duplex|on)$/
avalon.injectBinding = function (data) {
    var fn = data.evaluator
    if (fn) { //如果是求值函数
        dependencyDetection.begin({
            callback: function (vmodel, dependency) {
                injectDependency(vmodel.$events[dependency._name], data)
            }
        })
        try {
            var c = ronduplex.test(data.type) ? data : fn.apply(0, data.args)
            data.handler(c, data.element, data)
        } catch (e) {
            //log("warning:exception throwed in [avalon.injectBinding] " + e)
            delete data.evaluator
            var node = data.element
            if (node.nodeType === 3) {
                var parent = node.parentNode
                if (kernel.commentInterpolate) {
                    parent.replaceChild(DOC.createComment(data.value), node)
                } else {
                    node.data = openTag + (data.oneTime ? "::" : "") + data.value + closeTag
                }
            }
        } finally {
            dependencyDetection.end()
        }
    }
}

//将依赖项(比它高层的访问器或构建视图刷新函数的绑定对象)注入到订阅者数组 
function injectDependency(list, data) {
    if (data.oneTime)
        return
    if (list && avalon.Array.ensure(list, data) && data.element) {
        injectDisposeQueue(data, list)
    }
}

//通知依赖于这个访问器的订阅者更新自身
function fireDependencies(list) {
    if (list && list.length) {
        if (new Date() - beginTime > 444 && typeof list[0] === "object") {
            rejectDisposeQueue()
        }
        var args = aslice.call(arguments, 1)
        for (var i = list.length, fn; fn = list[--i]; ) {
            var el = fn.element
            if (el && el.parentNode) {
                try {
                    if (fn.$repeat) {
                        fn.handler.apply(fn, args) //处理监控数组的方法
                    } else if (fn.type !== "on") { //事件绑定只能由用户触发,不能由程序触发
                        var fun = fn.evaluator || noop
                        fn.handler(fun.apply(0, fn.args || []), el, fn)

                    }
                } catch (e) {
                }
            }
        }
    }
}
/*********************************************************************
 *                          定时GC回收机制                             *
 **********************************************************************/
var disposeCount = 0
var disposeQueue = avalon.$$subscribers = []
var beginTime = new Date()
var oldInfo = {}
var uuid2Node = {}
function getUid(obj, makeID) { //IE9+,标准浏览器
    if (!obj.uuid && !makeID) {
        obj.uuid = ++disposeCount
        uuid2Node[obj.uuid] = obj
    }
    return obj.uuid
}
function getNode(uuid) {
    return uuid2Node[uuid]
}
//添加到回收列队中
function injectDisposeQueue(data, list) {
    var elem = data.element
    if (!data.uuid) {
        if (elem.nodeType !== 1) {
            data.uuid = data.type + (data.pos || 0) + "-" + getUid(elem.parentNode)
        } else {
            data.uuid = data.name + "-" + getUid(elem)
        }
    }
    var lists = data.lists || (data.lists = [])
    avalon.Array.ensure(lists, list)
    list.$uuid = list.$uuid || generateID()
    if (!disposeQueue[data.uuid]) {
        disposeQueue[data.uuid] = 1
        disposeQueue.push(data)
    }
}

function rejectDisposeQueue(data) {
    if (avalon.optimize)
        return
    var i = disposeQueue.length
    var n = i
    var allTypes = []
    var iffishTypes = {}
    var newInfo = {}
    //对页面上所有绑定对象进行分门别类, 只检测个数发生变化的类型
    while (data = disposeQueue[--i]) {
        var type = data.type
        if (newInfo[type]) {
            newInfo[type]++
        } else {
            newInfo[type] = 1
            allTypes.push(type)
        }
    }
    var diff = false
    allTypes.forEach(function (type) {
        if (oldInfo[type] !== newInfo[type]) {
            iffishTypes[type] = 1
            diff = true
        }
    })
    i = n
    if (diff) {
        while (data = disposeQueue[--i]) {
            if (!data.element)
                continue
            if (iffishTypes[data.type] && shouldDispose(data.element)) { //如果它没有在DOM树
                disposeQueue.splice(i, 1)
                delete disposeQueue[data.uuid]
                delete uuid2Node[data.element.uuid]
                var lists = data.lists
                for (var k = 0, list; list = lists[k++]; ) {
                    avalon.Array.remove(lists, list)
                    avalon.Array.remove(list, data)
                }
                disposeData(data)
            }
        }
    }
    oldInfo = newInfo
    beginTime = new Date()
}

function disposeData(data) {
    data.element = null
    data.rollback && data.rollback()
    for (var key in data) {
        data[key] = null
    }
}

function shouldDispose(el) {
    try {//IE下，如果文本节点脱离DOM树，访问parentNode会报错
        if (!el.parentNode) {
            return true
        }
    } catch (e) {
        return true
    }

    return el.msRetain ? 0 : (el.nodeType === 1 ? !root.contains(el) : !avalon.contains(root, el))
}

/************************************************************************
 *            HTML处理(parseHTML, innerHTML, clearHTML)                  *
 ************************************************************************/
// We have to close these tags to support XHTML 
var tagHooks = {
    area: [1, "<map>", "</map>"],
    param: [1, "<object>", "</object>"],
    col: [2, "<table><colgroup>", "</colgroup></table>"],
    legend: [1, "<fieldset>", "</fieldset>"],
    option: [1, "<select multiple='multiple'>", "</select>"],
    thead: [1, "<table>", "</table>"],
    tr: [2, "<table>", "</table>"],
    td: [3, "<table><tr>", "</tr></table>"],
    g: [1, '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1">', '</svg>'],
    //IE6-8在用innerHTML生成节点时，不能直接创建no-scope元素与HTML5的新标签
    _default: W3C ? [0, "", ""] : [1, "X<div>", "</div>"] //div可以不用闭合
}
tagHooks.th = tagHooks.td
tagHooks.optgroup = tagHooks.option
tagHooks.tbody = tagHooks.tfoot = tagHooks.colgroup = tagHooks.caption = tagHooks.thead
String("circle,defs,ellipse,image,line,path,polygon,polyline,rect,symbol,text,use").replace(rword, function (tag) {
    tagHooks[tag] = tagHooks.g //处理SVG
})
var rtagName = /<([\w:]+)/  //取得其tagName
var rxhtml = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig
var rcreate = W3C ? /[^\d\D]/ : /(<(?:script|link|style|meta|noscript))/ig
var scriptTypes = oneObject(["", "text/javascript", "text/ecmascript", "application/ecmascript", "application/javascript"])
var rnest = /<(?:tb|td|tf|th|tr|col|opt|leg|cap|area)/ //需要处理套嵌关系的标签
var script = DOC.createElement("script")
var rhtml = /<|&#?\w+;/
avalon.parseHTML = function (html) {
    var fragment = avalonFragment.cloneNode(false)
    if (typeof html !== "string") {
        return fragment
    }
    if (!rhtml.test(html)) {
        fragment.appendChild(DOC.createTextNode(html))
        return fragment
    }
    html = html.replace(rxhtml, "<$1></$2>").trim()
    var tag = (rtagName.exec(html) || ["", ""])[1].toLowerCase(),
            //取得其标签名
            wrap = tagHooks[tag] || tagHooks._default,
            wrapper = cinerator,
            firstChild, neo
    if (!W3C) { //fix IE
        html = html.replace(rcreate, "<br class=msNoScope>$1") //在link style script等标签之前添加一个补丁
    }
    wrapper.innerHTML = wrap[1] + html + wrap[2]
    var els = wrapper.getElementsByTagName("script")
    if (els.length) { //使用innerHTML生成的script节点不会发出请求与执行text属性
        for (var i = 0, el; el = els[i++]; ) {
            if (scriptTypes[el.type]) {
                //以偷龙转凤方式恢复执行脚本功能
                neo = script.cloneNode(false) //FF不能省略参数
                ap.forEach.call(el.attributes, function (attr) {
                    if (attr && attr.specified) {
                        neo[attr.name] = attr.value //复制其属性
                        neo.setAttribute(attr.name, attr.value)
                    }
                })  // jshint ignore:line
                neo.text = el.text
                el.parentNode.replaceChild(neo, el) //替换节点
            }
        }
    }
    if (!W3C) { //fix IE
        var target = wrap[1] === "X<div>" ? wrapper.lastChild.firstChild : wrapper.lastChild
        if (target && target.tagName === "TABLE" && tag !== "tbody") {
            //IE6-7处理 <thead> --> <thead>,<tbody>
            //<tfoot> --> <tfoot>,<tbody>
            //<table> --> <table><tbody></table>
            for (els = target.childNodes, i = 0; el = els[i++]; ) {
                if (el.tagName === "TBODY" && !el.innerHTML) {
                    target.removeChild(el)
                    break
                }
            }
        }
        els = wrapper.getElementsByTagName("br")
        var n = els.length
        while (el = els[--n]) {
            if (el.className === "msNoScope") {
                el.parentNode.removeChild(el)
            }
        }
        for (els = wrapper.all, i = 0; el = els[i++]; ) { //fix VML
            if (isVML(el)) {
                fixVML(el)
            }
        }
    }
    //移除我们为了符合套嵌关系而添加的标签
    for (i = wrap[0]; i--; wrapper = wrapper.lastChild) {
    }
    while (firstChild = wrapper.firstChild) { // 将wrapper上的节点转移到文档碎片上！
        fragment.appendChild(firstChild)
    }
    return fragment
}

function isVML(src) {
    var nodeName = src.nodeName
    return nodeName.toLowerCase() === nodeName && src.scopeName && src.outerText === ""
}

function fixVML(node) {
    if (node.currentStyle.behavior !== "url(#default#VML)") {
        node.style.behavior = "url(#default#VML)"
        node.style.display = "inline-block"
        node.style.zoom = 1 //hasLayout
    }
}
avalon.innerHTML = function (node, html) {
    if (!W3C && (!rcreate.test(html) && !rnest.test(html))) {
        try {
            node.innerHTML = html
            return
        } catch (e) {
        }
    }
    var a = this.parseHTML(html)
    this.clearHTML(node).appendChild(a)
}
avalon.clearHTML = function (node) {
    node.textContent = ""
    while (node.firstChild) {
        node.removeChild(node.firstChild)
    }
    return node
}

/*********************************************************************
 *                  avalon的原型方法定义区                            *
 **********************************************************************/

function hyphen(target) {
    //转换为连字符线风格
    return target.replace(/([a-z\d])([A-Z]+)/g, "$1-$2").toLowerCase()
}

function camelize(target) {
    //提前判断，提高getStyle等的效率
    if (!target || target.indexOf("-") < 0 && target.indexOf("_") < 0) {
        return target
    }
    //转换为驼峰风格
    return target.replace(/[-_][^-_]/g, function(match) {
        return match.charAt(1).toUpperCase()
    })
}

var fakeClassListMethods = {
    _toString: function() {
        var node = this.node
        var cls = node.className
        var str = typeof cls === "string" ? cls : cls.baseVal
        return str.split(/\s+/).join(" ")
    },
    _contains: function(cls) {
        return (" " + this + " ").indexOf(" " + cls + " ") > -1
    },
    _add: function(cls) {
        if (!this.contains(cls)) {
            this._set(this + " " + cls)
        }
    },
    _remove: function(cls) {
        this._set((" " + this + " ").replace(" " + cls + " ", " "))
    },
    __set: function(cls) {
        cls = cls.trim()
        var node = this.node
        if (rsvg.test(node)) {
            //SVG元素的className是一个对象 SVGAnimatedString { baseVal="", animVal=""}，只能通过set/getAttribute操作
            node.setAttribute("class", cls)
        } else {
            node.className = cls
        }
    } //toggle存在版本差异，因此不使用它
}

    function fakeClassList(node) {
        if (!("classList" in node)) {
            node.classList = {
                node: node
            }
            for (var k in fakeClassListMethods) {
                node.classList[k.slice(1)] = fakeClassListMethods[k]
            }
        }
        return node.classList
    }


    "add,remove".replace(rword, function(method) {
        avalon.fn[method + "Class"] = function(cls) {
            var el = this[0]
            //https://developer.mozilla.org/zh-CN/docs/Mozilla/Firefox/Releases/26
            if (cls && typeof cls === "string" && el && el.nodeType === 1) {
                cls.replace(/\S+/g, function(c) {
                    fakeClassList(el)[method](c)
                })
            }
            return this
        }
    })
    avalon.fn.mix({
        hasClass: function(cls) {
            var el = this[0] || {}
            return el.nodeType === 1 && fakeClassList(el).contains(cls)
        },
        toggleClass: function(value, stateVal) {
            var className, i = 0
            var classNames = String(value).split(/\s+/)
            var isBool = typeof stateVal === "boolean"
            while ((className = classNames[i++])) {
                var state = isBool ? stateVal : !this.hasClass(className)
                this[state ? "addClass" : "removeClass"](className)
            }
            return this
        },
        attr: function(name, value) {
            if (arguments.length === 2) {
                this[0].setAttribute(name, value)
                return this
            } else {
                return this[0].getAttribute(name)
            }
        },
        data: function(name, value) {
            name = "data-" + hyphen(name || "")
            switch (arguments.length) {
                case 2:
                    this.attr(name, value)
                    return this
                case 1:
                    var val = this.attr(name)
                    return parseData(val)
                case 0:
                    var ret = {}
                    ap.forEach.call(this[0].attributes, function(attr) {
                        if (attr) {
                            name = attr.name
                            if (!name.indexOf("data-")) {
                                name = camelize(name.slice(5))
                                ret[name] = parseData(attr.value)
                            }
                        }
                    })
                    return ret
            }
        },
        removeData: function(name) {
            name = "data-" + hyphen(name)
            this[0].removeAttribute(name)
            return this
        },
        css: function(name, value) {
            if (avalon.isPlainObject(name)) {
                for (var i in name) {
                    avalon.css(this, i, name[i])
                }
            } else {
                var ret = avalon.css(this, name, value)
            }
            return ret !== void 0 ? ret : this
        },
        position: function() {
            var offsetParent, offset,
                elem = this[0],
                parentOffset = {
                    top: 0,
                    left: 0
                }
            if (!elem) {
                return
            }
            if (this.css("position") === "fixed") {
                offset = elem.getBoundingClientRect()
            } else {
                offsetParent = this.offsetParent() //得到真正的offsetParent
                offset = this.offset() // 得到正确的offsetParent
                if (offsetParent[0].tagName !== "HTML") {
                    parentOffset = offsetParent.offset()
                }
                parentOffset.top += avalon.css(offsetParent[0], "borderTopWidth", true)
                parentOffset.left += avalon.css(offsetParent[0], "borderLeftWidth", true)

                // Subtract offsetParent scroll positions
                parentOffset.top -= offsetParent.scrollTop()
                parentOffset.left -= offsetParent.scrollLeft()
            }
            return {
                top: offset.top - parentOffset.top - avalon.css(elem, "marginTop", true),
                left: offset.left - parentOffset.left - avalon.css(elem, "marginLeft", true)
            }
        },
        offsetParent: function() {
            var offsetParent = this[0].offsetParent
            while (offsetParent && avalon.css(offsetParent, "position") === "static") {
                offsetParent = offsetParent.offsetParent;
            }
            return avalon(offsetParent || root)
        },
        bind: function(type, fn, phase) {
            if (this[0]) { //此方法不会链
                return avalon.bind(this[0], type, fn, phase)
            }
        },
        unbind: function(type, fn, phase) {
            if (this[0]) {
                avalon.unbind(this[0], type, fn, phase)
            }
            return this
        },
        val: function(value) {
            var node = this[0]
            if (node && node.nodeType === 1) {
                var get = arguments.length === 0
                var access = get ? ":get" : ":set"
                var fn = valHooks[getValType(node) + access]
                if (fn) {
                    var val = fn(node, value)
                } else if (get) {
                    return (node.value || "").replace(/\r/g, "")
                } else {
                    node.value = value
                }
            }
            return get ? val : this
        }
    })

    function parseData(data) {
        try {
            if (typeof data === "object")
                return data
            data = data === "true" ? true :
                data === "false" ? false :
                data === "null" ? null : +data + "" === data ? +data : rbrace.test(data) ? avalon.parseJSON(data) : data
        } catch (e) {}
        return data
    }
var rbrace = /(?:\{[\s\S]*\}|\[[\s\S]*\])$/,
    rvalidchars = /^[\],:{}\s]*$/,
    rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
    rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
    rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g
avalon.parseJSON = window.JSON ? JSON.parse : function(data) {
    if (typeof data === "string") {
        data = data.trim();
        if (data) {
            if (rvalidchars.test(data.replace(rvalidescape, "@")
                .replace(rvalidtokens, "]")
                .replace(rvalidbraces, ""))) {
                return (new Function("return " + data))() // jshint ignore:line
            }
        }
        avalon.error("Invalid JSON: " + data)
    }
    return data
}

//生成avalon.fn.scrollLeft, avalon.fn.scrollTop方法
avalon.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
}, function(method, prop) {
    avalon.fn[method] = function(val) {
        var node = this[0] || {}, win = getWindow(node),
            top = method === "scrollTop"
        if (!arguments.length) {
            return win ? (prop in win) ? win[prop] : root[method] : node[method]
        } else {
            if (win) {
                win.scrollTo(!top ? val : avalon(win).scrollLeft(), top ? val : avalon(win).scrollTop())
            } else {
                node[method] = val
            }
        }
    }
})

function getWindow(node) {
    return node.window && node.document ? node : node.nodeType === 9 ? node.defaultView || node.parentWindow : false;
}
//=============================css相关=======================
var cssHooks = avalon.cssHooks = {}
var prefixes = ["", "-webkit-", "-o-", "-moz-", "-ms-"]
var cssMap = {
    "float": W3C ? "cssFloat" : "styleFloat"
}
avalon.cssNumber = oneObject("columnCount,order,fillOpacity,fontWeight,lineHeight,opacity,orphans,widows,zIndex,zoom")

avalon.cssName = function(name, host, camelCase) {
    if (cssMap[name]) {
        return cssMap[name]
    }
    host = host || root.style
    for (var i = 0, n = prefixes.length; i < n; i++) {
        camelCase = camelize(prefixes[i] + name)
        if (camelCase in host) {
            return (cssMap[name] = camelCase)
        }
    }
    return null
}
cssHooks["@:set"] = function(node, name, value) {
    try { //node.style.width = NaN;node.style.width = "xxxxxxx";node.style.width = undefine 在旧式IE下会抛异常
        node.style[name] = value
    } catch (e) {}
}
if (window.getComputedStyle) {
    cssHooks["@:get"] = function(node, name) {
        if (!node || !node.style) {
            throw new Error("getComputedStyle要求传入一个节点 " + node)
        }
        var ret, styles = getComputedStyle(node, null)
            if (styles) {
                ret = name === "filter" ? styles.getPropertyValue(name) : styles[name]
                if (ret === "") {
                    ret = node.style[name] //其他浏览器需要我们手动取内联样式
                }
            }
        return ret
    }
    cssHooks["opacity:get"] = function(node) {
        var ret = cssHooks["@:get"](node, "opacity")
        return ret === "" ? "1" : ret
    }
} else {
    var rnumnonpx = /^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i
    var rposition = /^(top|right|bottom|left)$/
    var ralpha = /alpha\([^)]*\)/i
    var ie8 = !! window.XDomainRequest
    var salpha = "DXImageTransform.Microsoft.Alpha"
    var border = {
        thin: ie8 ? '1px' : '2px',
        medium: ie8 ? '3px' : '4px',
        thick: ie8 ? '5px' : '6px'
    }
    cssHooks["@:get"] = function(node, name) {
        //取得精确值，不过它有可能是带em,pc,mm,pt,%等单位
        var currentStyle = node.currentStyle
        var ret = currentStyle[name]
        if ((rnumnonpx.test(ret) && !rposition.test(ret))) {
            //①，保存原有的style.left, runtimeStyle.left,
            var style = node.style,
                left = style.left,
                rsLeft = node.runtimeStyle.left
                //②由于③处的style.left = xxx会影响到currentStyle.left，
                //因此把它currentStyle.left放到runtimeStyle.left，
                //runtimeStyle.left拥有最高优先级，不会style.left影响
                node.runtimeStyle.left = currentStyle.left
                //③将精确值赋给到style.left，然后通过IE的另一个私有属性 style.pixelLeft
                //得到单位为px的结果；fontSize的分支见http://bugs.jquery.com/ticket/760
                style.left = name === 'fontSize' ? '1em' : (ret || 0)
                ret = style.pixelLeft + "px"
                //④还原 style.left，runtimeStyle.left
            style.left = left
            node.runtimeStyle.left = rsLeft
        }
        if (ret === "medium") {
            name = name.replace("Width", "Style")
            //border width 默认值为medium，即使其为0"
            if (currentStyle[name] === "none") {
                ret = "0px"
            }
        }
        return ret === "" ? "auto" : border[ret] || ret
    }
    cssHooks["opacity:set"] = function(node, name, value) {
        var style = node.style
        var opacity = isFinite(value) && value <= 1 ? "alpha(opacity=" + value * 100 + ")" : ""
        var filter = style.filter || "";
        style.zoom = 1
        //不能使用以下方式设置透明度
        //node.filters.alpha.opacity = value * 100
        style.filter = (ralpha.test(filter) ?
            filter.replace(ralpha, opacity) :
            filter + " " + opacity).trim()
        if (!style.filter) {
            style.removeAttribute("filter")
        }
    }
    cssHooks["opacity:get"] = function(node) {
        //这是最快的获取IE透明值的方式，不需要动用正则了！
        var alpha = node.filters.alpha || node.filters[salpha],
            op = alpha && alpha.enabled ? alpha.opacity : 100
        return (op / 100) + "" //确保返回的是字符串
    }
}

"top,left".replace(rword, function(name) {
    cssHooks[name + ":get"] = function(node) {
        var computed = cssHooks["@:get"](node, name)
        return /px$/.test(computed) ? computed :
            avalon(node).position()[name] + "px"
    }
})

var cssShow = {
    position: "absolute",
    visibility: "hidden",
    display: "block"
}

var rdisplayswap = /^(none|table(?!-c[ea]).+)/

    function showHidden(node, array) {
        //http://www.cnblogs.com/rubylouvre/archive/2012/10/27/2742529.html
        if (node.offsetWidth <= 0) { //opera.offsetWidth可能小于0
            if (rdisplayswap.test(cssHooks["@:get"](node, "display"))) {
                var obj = {
                    node: node
                }
                for (var name in cssShow) {
                    obj[name] = node.style[name]
                    node.style[name] = cssShow[name]
                }
                array.push(obj)
            }
            var parent = node.parentNode
            if (parent && parent.nodeType === 1) {
                showHidden(parent, array)
            }
        }
    }
    "Width,Height".replace(rword, function(name) { //fix 481
        var method = name.toLowerCase(),
            clientProp = "client" + name,
            scrollProp = "scroll" + name,
            offsetProp = "offset" + name
            cssHooks[method + ":get"] = function(node, which, override) {
                var boxSizing = -4
                if (typeof override === "number") {
                    boxSizing = override
                }
                which = name === "Width" ? ["Left", "Right"] : ["Top", "Bottom"]
                var ret = node[offsetProp] // border-box 0
                if (boxSizing === 2) { // margin-box 2
                    return ret + avalon.css(node, "margin" + which[0], true) + avalon.css(node, "margin" + which[1], true)
                }
                if (boxSizing < 0) { // padding-box  -2
                    ret = ret - avalon.css(node, "border" + which[0] + "Width", true) - avalon.css(node, "border" + which[1] + "Width", true)
                }
                if (boxSizing === -4) { // content-box -4
                    ret = ret - avalon.css(node, "padding" + which[0], true) - avalon.css(node, "padding" + which[1], true)
                }
                return ret
            }
        cssHooks[method + "&get"] = function(node) {
            var hidden = [];
            showHidden(node, hidden);
            var val = cssHooks[method + ":get"](node)
            for (var i = 0, obj; obj = hidden[i++];) {
                node = obj.node
                for (var n in obj) {
                    if (typeof obj[n] === "string") {
                        node.style[n] = obj[n]
                    }
                }
            }
            return val;
        }
        avalon.fn[method] = function(value) { //会忽视其display
            var node = this[0]
            if (arguments.length === 0) {
                if (node.setTimeout) { //取得窗口尺寸,IE9后可以用node.innerWidth /innerHeight代替
                    return node["inner" + name] || node.document.documentElement[clientProp]
                }
                if (node.nodeType === 9) { //取得页面尺寸
                    var doc = node.documentElement
                    //FF chrome    html.scrollHeight< body.scrollHeight
                    //IE 标准模式 : html.scrollHeight> body.scrollHeight
                    //IE 怪异模式 : html.scrollHeight 最大等于可视窗口多一点？
                    return Math.max(node.body[scrollProp], doc[scrollProp], node.body[offsetProp], doc[offsetProp], doc[clientProp])
                }
                return cssHooks[method + "&get"](node)
            } else {
                return this.css(method, value)
            }
        }
        avalon.fn["inner" + name] = function() {
            return cssHooks[method + ":get"](this[0], void 0, -2)
        }
        avalon.fn["outer" + name] = function(includeMargin) {
            return cssHooks[method + ":get"](this[0], void 0, includeMargin === true ? 2 : 0)
        }
    })
    avalon.fn.offset = function() { //取得距离页面左右角的坐标
        var node = this[0],
            box = {
                left: 0,
                top: 0
            }
        if (!node || !node.tagName || !node.ownerDocument) {
            return box
        }
        var doc = node.ownerDocument,
            body = doc.body,
            root = doc.documentElement,
            win = doc.defaultView || doc.parentWindow
        if (!avalon.contains(root, node)) {
            return box
        }
        //http://hkom.blog1.fc2.com/?mode=m&no=750 body的偏移量是不包含margin的
        //我们可以通过getBoundingClientRect来获得元素相对于client的rect.
        //http://msdn.microsoft.com/en-us/library/ms536433.aspx
        if (node.getBoundingClientRect) {
            box = node.getBoundingClientRect() // BlackBerry 5, iOS 3 (original iPhone)
        }
        //chrome/IE6: body.scrollTop, firefox/other: root.scrollTop
        var clientTop = root.clientTop || body.clientTop,
            clientLeft = root.clientLeft || body.clientLeft,
            scrollTop = Math.max(win.pageYOffset || 0, root.scrollTop, body.scrollTop),
            scrollLeft = Math.max(win.pageXOffset || 0, root.scrollLeft, body.scrollLeft)
            // 把滚动距离加到left,top中去。
            // IE一些版本中会自动为HTML元素加上2px的border，我们需要去掉它
            // http://msdn.microsoft.com/en-us/library/ms533564(VS.85).aspx
            return {
                top: box.top + scrollTop - clientTop,
                left: box.left + scrollLeft - clientLeft
            }
    }

    //==================================val相关============================

    function getValType(elem) {
        var ret = elem.tagName.toLowerCase()
        return ret === "input" && /checkbox|radio/.test(elem.type) ? "checked" : ret
    }
var roption = /^<option(?:\s+\w+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*\s+value[\s=]/i
var valHooks = {
    "option:get": IEVersion ? function(node) {
        //在IE11及W3C，如果没有指定value，那么node.value默认为node.text（存在trim作），但IE9-10则是取innerHTML(没trim操作)
        //specified并不可靠，因此通过分析outerHTML判定用户有没有显示定义value
        return roption.test(node.outerHTML) ? node.value : node.text.trim()
    } : function(node) {
        return node.value
    },
    "select:get": function(node, value) {
        var option, options = node.options,
            index = node.selectedIndex,
            getter = valHooks["option:get"],
            one = node.type === "select-one" || index < 0,
            values = one ? null : [],
            max = one ? index + 1 : options.length,
            i = index < 0 ? max : one ? index : 0
        for (; i < max; i++) {
            option = options[i]
            //旧式IE在reset后不会改变selected，需要改用i === index判定
            //我们过滤所有disabled的option元素，但在safari5下，如果设置select为disable，那么其所有孩子都disable
            //因此当一个元素为disable，需要检测其是否显式设置了disable及其父节点的disable情况
            if ((option.selected || i === index) && !option.disabled) {
                value = getter(option)
                if (one) {
                    return value
                }
                //收集所有selected值组成数组返回
                values.push(value)
            }
        }
        return values
    },
    "select:set": function(node, values, optionSet) {
        values = [].concat(values) //强制转换为数组
        var getter = valHooks["option:get"]
        for (var i = 0, el; el = node.options[i++];) {
            if ((el.selected = values.indexOf(getter(el)) > -1)) {
                optionSet = true
            }
        }
        if (!optionSet) {
            node.selectedIndex = -1
        }
    }
}

/*********************************************************************
 *                          编译系统                                  *
 **********************************************************************/
var meta = {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '"': '\\"',
    '\\': '\\\\'
}
var quote = window.JSON && JSON.stringify || function(str) {
    return '"' + str.replace(/[\\\"\x00-\x1f]/g, function(a) {
        var c = meta[a];
        return typeof c === 'string' ? c :
                '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
    }) + '"'
}

var keywords = [
    "break,case,catch,continue,debugger,default,delete,do,else,false",
    "finally,for,function,if,in,instanceof,new,null,return,switch,this",
    "throw,true,try,typeof,var,void,while,with", /* 关键字*/
    "abstract,boolean,byte,char,class,const,double,enum,export,extends",
    "final,float,goto,implements,import,int,interface,long,native",
    "package,private,protected,public,short,static,super,synchronized",
    "throws,transient,volatile", /*保留字*/
    "arguments,let,yield,undefined" /* ECMA 5 - use strict*/].join(",")
var rrexpstr = /\/\*[\w\W]*?\*\/|\/\/[^\n]*\n|\/\/[^\n]*$|"(?:[^"\\]|\\[\w\W])*"|'(?:[^'\\]|\\[\w\W])*'|[\s\t\n]*\.[\s\t\n]*[$\w\.]+/g
var rsplit = /[^\w$]+/g
var rkeywords = new RegExp(["\\b" + keywords.replace(/,/g, '\\b|\\b') + "\\b"].join('|'), 'g')
var rnumber = /\b\d[^,]*/g
var rcomma = /^,+|,+$/g
var variablePool = new Cache(512)
var getVariables = function (code) {
    var key = "," + code.trim()
    var ret = variablePool.get(key)
    if (ret) {
        return ret
    }
    var match = code
            .replace(rrexpstr, "")
            .replace(rsplit, ",")
            .replace(rkeywords, "")
            .replace(rnumber, "")
            .replace(rcomma, "")
            .split(/^$|,+/)
    return variablePool.put(key, uniqSet(match))
}
/*添加赋值语句*/

function addAssign(vars, scope, name, data) {
    var ret = [],
            prefix = " = " + name + "."
    for (var i = vars.length, prop; prop = vars[--i]; ) {
        if (scope.hasOwnProperty(prop)) {
            ret.push(prop + prefix + prop)
            data.vars.push(prop)
            if (data.type === "duplex") {
                vars.get = name + "." + prop
            }
            vars.splice(i, 1)
        }
    }
    return ret
}

function uniqSet(array) {
    var ret = [],
            unique = {}
    for (var i = 0; i < array.length; i++) {
        var el = array[i]
        var id = el && typeof el.$id === "string" ? el.$id : el
        if (!unique[id]) {
            unique[id] = ret.push(el)
        }
    }
    return ret
}
//缓存求值函数，以便多次利用
var evaluatorPool = new Cache(128)
//取得求值函数及其传参
var rduplex = /\w\[.*\]|\w\.\w/
var rproxy = /(\$proxy\$[a-z]+)\d+$/
var rthimRightParentheses = /\)\s*$/
var rthimOtherParentheses = /\)\s*\|/g
var rquoteFilterName = /\|\s*([$\w]+)/g
var rpatchBracket = /"\s*\["/g
var rthimLeftParentheses = /"\s*\(/g
function parseFilter(val, filters) {
    filters = filters
            .replace(rthimRightParentheses, "")//处理最后的小括号
            .replace(rthimOtherParentheses, function () {//处理其他小括号
                return "],|"
            })
            .replace(rquoteFilterName, function (a, b) { //处理|及它后面的过滤器的名字
                return "[" + quote(b)
            })
            .replace(rpatchBracket, function () {
                return '"],["'
            })
            .replace(rthimLeftParentheses, function () {
                return '",'
            }) + "]"
    return  "return avalon.filters.$filter(" + val + ", " + filters + ")"
}

function parseExpr(code, scopes, data) {
    var dataType = data.type
    var filters = data.filters || ""
    var exprId = scopes.map(function (el) {
        return String(el.$id).replace(rproxy, "$1")
    }) + code + dataType + filters
    var vars = getVariables(code).concat(),
            assigns = [],
            names = [],
            args = [],
            prefix = ""
    //args 是一个对象数组， names 是将要生成的求值函数的参数
    scopes = uniqSet(scopes)
    data.vars = []
    for (var i = 0, sn = scopes.length; i < sn; i++) {
        if (vars.length) {
            var name = "vm" + expose + "_" + i
            names.push(name)
            args.push(scopes[i])
            assigns.push.apply(assigns, addAssign(vars, scopes[i], name, data))
        }
    }
    if (!assigns.length && dataType === "duplex") {
        return
    }
    if (dataType !== "duplex" && (code.indexOf("||") > -1 || code.indexOf("&&") > -1)) {
        //https://github.com/RubyLouvre/avalon/issues/583
        data.vars.forEach(function (v) {
            var reg = new RegExp("\\b" + v + "(?:\\.\\w+|\\[\\w+\\])+", "ig")
            code = code.replace(reg, function (_) {
                var c = _.charAt(v.length)
                var r = IEVersion ? code.slice(arguments[1] + _.length) : RegExp.rightContext
                var method = /^\s*\(/.test(r)
                if (c === "." || c === "[" || method) {//比如v为aa,我们只匹配aa.bb,aa[cc],不匹配aaa.xxx
                    var name = "var" + String(Math.random()).replace(/^0\./, "")
                    if (method) {//array.size()
                        var array = _.split(".")
                        if (array.length > 2) {
                            var last = array.pop()
                            assigns.push(name + " = " + array.join("."))
                            return name + "." + last
                        } else {
                            return _
                        }
                    }
                    assigns.push(name + " = " + _)
                    return name
                } else {
                    return _
                }
            })
        })
    }
    //---------------args----------------
    data.args = args
    //---------------cache----------------
    delete data.vars
    var fn = evaluatorPool.get(exprId) //直接从缓存，免得重复生成
    if (fn) {
        data.evaluator = fn
        return
    }
    prefix = assigns.join(", ")
    if (prefix) {
        prefix = "var " + prefix
    }
    if (/\S/.test(filters)) { //文本绑定，双工绑定才有过滤器
        if (!/text|html/.test(data.type)) {
            throw Error("ms-" + data.type + "不支持过滤器")
        }
        code = "\nvar ret" + expose + " = " + code + ";\r\n"
        code += parseFilter("ret" + expose, filters)
    } else if (dataType === "duplex") { //双工绑定
        var _body = "\nreturn function(vvv){\n\t" +
                prefix +
                ";\n\tif(!arguments.length){\n\t\treturn " +
                code +
                "\n\t}\n\t" + (!rduplex.test(code) ? vars.get : code) +
                "= vvv;\n} "
        try {
            fn = Function.apply(noop, names.concat(_body))
            data.evaluator = evaluatorPool.put(exprId, fn)
        } catch (e) {
            log("debug: parse error," + e.message)
        }
        return
    } else if (dataType === "on") { //事件绑定
        if (code.indexOf("(") === -1) {
            code += ".call(this, $event)"
        } else {
            code = code.replace("(", ".call(this,")
        }
        names.push("$event")
        code = "\nreturn " + code + ";" //IE全家 Function("return ")出错，需要Function("return ;")
        var lastIndex = code.lastIndexOf("\nreturn")
        var header = code.slice(0, lastIndex)
        var footer = code.slice(lastIndex)
        code = header + "\n" + footer
    } else { //其他绑定
        code = "\nreturn " + code + ";" //IE全家 Function("return ")出错，需要Function("return ;")
    }
    try {
        fn = Function.apply(noop, names.concat("\n" + prefix + code))
        data.evaluator = evaluatorPool.put(exprId, fn)
    } catch (e) {
        log("debug: parse error," + e.message)
    } finally {
        vars = assigns = names = null //释放内存
    }
}


//parseExpr的智能引用代理

function parseExprProxy(code, scopes, data, tokens, noRegister) {
    if (Array.isArray(tokens)) {
        code = tokens.map(function (el) {
            return el.expr ? "(" + el.value + ")" : quote(el.value)
        }).join(" + ")
    }
    parseExpr(code, scopes, data)
    if (data.evaluator && !noRegister) {
        data.handler = bindingExecutors[data.handlerName || data.type]
        //方便调试
        //这里非常重要,我们通过判定视图刷新函数的element是否在DOM树决定
        //将它移出订阅者列表
        avalon.injectBinding(data)
    }
}
avalon.parseExprProxy = parseExprProxy
/*********************************************************************
 *                           扫描系统                                 *
 **********************************************************************/

avalon.scan = function(elem, vmodel) {
    elem = elem || root
    var vmodels = vmodel ? [].concat(vmodel) : []
    scanTag(elem, vmodels)
}

//http://www.w3.org/TR/html5/syntax.html#void-elements
var stopScan = oneObject("area,base,basefont,br,col,command,embed,hr,img,input,link,meta,param,source,track,wbr,noscript,script,style,textarea".toUpperCase())

function checkScan(elem, callback, innerHTML) {
    var id = setTimeout(function() {
        var currHTML = elem.innerHTML
        clearTimeout(id)
        if (currHTML === innerHTML) {
            callback()
        } else {
            checkScan(elem, callback, currHTML)
        }
    })
}


function createSignalTower(elem, vmodel) {
    var id = elem.getAttribute("avalonctrl") || vmodel.$id
    elem.setAttribute("avalonctrl", id)
    vmodel.$events.expr = elem.tagName + '[avalonctrl="' + id + '"]'
}

var getBindingCallback = function(elem, name, vmodels) {
    var callback = elem.getAttribute(name)
    if (callback) {
        for (var i = 0, vm; vm = vmodels[i++]; ) {
            if (vm.hasOwnProperty(callback) && typeof vm[callback] === "function") {
                return vm[callback]
            }
        }
    }
}

function executeBindings(bindings, vmodels) {
    for (var i = 0, data; data = bindings[i++]; ) {
        data.vmodels = vmodels
        bindingHandlers[data.type](data, vmodels)
        if (data.evaluator && data.element && data.element.nodeType === 1) { //移除数据绑定，防止被二次解析
            //chrome使用removeAttributeNode移除不存在的特性节点时会报错 https://github.com/RubyLouvre/avalon/issues/99
            data.element.removeAttribute(data.name)
        }
    }
    bindings.length = 0
}

//https://github.com/RubyLouvre/avalon/issues/636
var mergeTextNodes = IEVersion && window.MutationObserver ? function (elem) {
    var node = elem.firstChild, text
    while (node) {
        var aaa = node.nextSibling
        if (node.nodeType === 3) {
            if (text) {
                text.nodeValue += node.nodeValue
                elem.removeChild(node)
            } else {
                text = node
            }
        } else {
            text = null
        }
        node = aaa
    }
} : 0
var roneTime = /^\s*::/
var rmsAttr = /ms-(\w+)-?(.*)/
var priorityMap = {
    "if": 10,
    "repeat": 90,
    "data": 100,
    "widget": 110,
    "each": 1400,
    "with": 1500,
    "duplex": 2000,
    "on": 3000
}

var events = oneObject("animationend,blur,change,input,click,dblclick,focus,keydown,keypress,keyup,mousedown,mouseenter,mouseleave,mousemove,mouseout,mouseover,mouseup,scan,scroll,submit")
var obsoleteAttrs = oneObject("value,title,alt,checked,selected,disabled,readonly,enabled")
function bindingSorter(a, b) {
    return a.priority - b.priority
}

function scanAttr(elem, vmodels, match) {
    var scanNode = true
    if (vmodels.length) {
        var attributes = getAttributes ? getAttributes(elem) : elem.attributes
        var bindings = []
        var fixAttrs = []
        var msData = {}
        for (var i = 0, attr; attr = attributes[i++]; ) {
            if (attr.specified) {
                if (match = attr.name.match(rmsAttr)) {
                    //如果是以指定前缀命名的
                    var type = match[1]
                    var param = match[2] || ""
                    var value = attr.value
                    var name = attr.name
                    if (events[type]) {
                        param = type
                        type = "on"
                    } else if (obsoleteAttrs[type]) {
                        if (type === "enabled") {//吃掉ms-enabled绑定,用ms-disabled代替
                            log("warning!ms-enabled或ms-attr-enabled已经被废弃")
                            type = "disabled"
                            value = "!(" + value + ")"
                        }
                        param = type
                        type = "attr"
                        name = "ms-" + type + "-"+ param
                        fixAttrs.push([attr.name, name, value])
                    }
                    msData[name] = value
                    if (typeof bindingHandlers[type] === "function") {
                        var newValue = value.replace(roneTime, "")
                        var oneTime = value !== newValue
                        var binding = {
                            type: type,
                            param: param,
                            element: elem,
                            name: name,
                            value: newValue,
                            oneTime: oneTime,
                            uuid: name+"-"+getUid(elem),
                             //chrome与firefox下Number(param)得到的值不一样 #855
                            priority:  (priorityMap[type] || type.charCodeAt(0) * 10 )+ (Number(param.replace(/\D/g, "")) || 0)
                        }
                        if (type === "html" || type === "text") {
                            var token = getToken(value)
                            avalon.mix(binding, token)
                            binding.filters = binding.filters.replace(rhasHtml, function () {
                                binding.type = "html"
                                binding.group = 1
                                return ""
                            })// jshint ignore:line
                        } else if (type === "duplex") {
                            var hasDuplex = name
                        } else if (name === "ms-if-loop") {
                            binding.priority += 100
                        }
                        bindings.push(binding)
                        if (type === "widget") {
                            elem.msData = elem.msData || msData
                        }
                    }
                }
            }
        }
        if (bindings.length) {
            bindings.sort(bindingSorter)
            fixAttrs.forEach(function (arr) {
                log("warning!请改用" + arr[1] + "代替" + arr[0] + "!")
                elem.removeAttribute(arr[0])
                elem.setAttribute(arr[1], arr[2])
            })
            //http://bugs.jquery.com/ticket/7071
            //在IE下对VML读取type属性,会让此元素所有属性都变成<Failed>
            if (hasDuplex) {
                if (msData["ms-attr-checked"]) {
                    log("warning!一个控件不能同时定义ms-attr-checked与" + hasDuplex)
                }
                if (msData["ms-attr-value"]) {
                    log("warning!一个控件不能同时定义ms-attr-value与" + hasDuplex)
                }
            }
            for (i = 0; binding = bindings[i]; i++) {
                type = binding.type
                if (rnoscanAttrBinding.test(type)) {
                    return executeBindings(bindings.slice(0, i + 1), vmodels)
                } else if (scanNode) {
                    scanNode = !rnoscanNodeBinding.test(type)
                }
            }
            executeBindings(bindings, vmodels)
        }
    }
    if (scanNode && !stopScan[elem.tagName] && rbind.test(elem.innerHTML.replace(rlt, "<").replace(rgt, ">"))) {
        mergeTextNodes && mergeTextNodes(elem)
        scanNodeList(elem, vmodels) //扫描子孙元素
    }
}
var rnoscanAttrBinding = /^if|widget|repeat$/
var rnoscanNodeBinding = /^each|with|html|include$/
//IE67下，在循环绑定中，一个节点如果是通过cloneNode得到，自定义属性的specified为false，无法进入里面的分支，
//但如果我们去掉scanAttr中的attr.specified检测，一个元素会有80+个特性节点（因为它不区分固有属性与自定义属性），很容易卡死页面
if (!"1" [0]) {
    var attrPool = new Cache(512)
    var rattrs = /\s+(ms-[^=\s]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g,
            rquote = /^['"]/,
            rtag = /<\w+\b(?:(["'])[^"]*?(\1)|[^>])*>/i,
            ramp = /&amp;/g
    //IE6-8解析HTML5新标签，会将它分解两个元素节点与一个文本节点
    //<body><section>ddd</section></body>
    //        window.onload = function() {
    //            var body = document.body
    //            for (var i = 0, el; el = body.children[i++]; ) {
    //                avalon.log(el.outerHTML)
    //            }
    //        }
    //依次输出<SECTION>, </SECTION>
    var getAttributes = function (elem) {
        var html = elem.outerHTML
        //处理IE6-8解析HTML5新标签的情况，及<br>等半闭合标签outerHTML为空的情况
        if (html.slice(0, 2) === "</" || !html.trim()) {
            return []
        }
        var str = html.match(rtag)[0]
        var attributes = [],
                match,
                k, v
        var ret = attrPool.get(str)
        if (ret) {
            return ret
        }
        while (k = rattrs.exec(str)) {
            v = k[2]
            if (v) {
                v = (rquote.test(v) ? v.slice(1, -1) : v).replace(ramp, "&")
            }
            var name = k[1].toLowerCase()
            match = name.match(rmsAttr)
            var binding = {
                name: name,
                specified: true,
                value: v || ""
            }
            attributes.push(binding)
        }
        return attrPool.put(str, attributes)
    }
}

function scanNodeList(parent, vmodels) {
    var nodes = avalon.slice(parent.childNodes)
    scanNodeArray(nodes, vmodels)
}

function scanNodeArray(nodes, vmodels) {
    for (var i = 0, node; node = nodes[i++];) {
        switch (node.nodeType) {
            case 1:
                scanTag(node, vmodels) //扫描元素节点
                if (node.msCallback) {
                    node.msCallback()
                    node.msCallback = void 0
                }
                break
            case 3:
               if(rexpr.test(node.nodeValue)){
                    scanText(node, vmodels, i) //扫描文本节点
               }
               break
        }
    }
}


function scanTag(elem, vmodels, node) {
    //扫描顺序  ms-skip(0) --> ms-important(1) --> ms-controller(2) --> ms-if(10) --> ms-repeat(100) 
    //--> ms-if-loop(110) --> ms-attr(970) ...--> ms-each(1400)-->ms-with(1500)--〉ms-duplex(2000)垫后
    var a = elem.getAttribute("ms-skip")
    //#360 在旧式IE中 Object标签在引入Flash等资源时,可能出现没有getAttributeNode,innerHTML的情形
    if (!elem.getAttributeNode) {
        return log("warning " + elem.tagName + " no getAttributeNode method")
    }
    var b = elem.getAttributeNode("ms-important")
    var c = elem.getAttributeNode("ms-controller")
    if (typeof a === "string") {
        return
    } else if (node = b || c) {
        var newVmodel = avalon.vmodels[node.value]
        if (!newVmodel) {
            return
        }
        //ms-important不包含父VM，ms-controller相反
        vmodels = node === b ? [newVmodel] : [newVmodel].concat(vmodels)
        var name = node.name
        elem.removeAttribute(name) //removeAttributeNode不会刷新[ms-controller]样式规则
        avalon(elem).removeClass(name)
        createSignalTower(elem, newVmodel)
    }
    scanAttr(elem, vmodels) //扫描特性节点
}
var rhasHtml = /\|\s*html\s*/,
        r11a = /\|\|/g,
        rlt = /&lt;/g,
        rgt = /&gt;/g,
        rstringLiteral = /(['"])(\\\1|.)+?\1/g
function getToken(value) {
    if (value.indexOf("|") > 0) {
        var scapegoat = value.replace(rstringLiteral, function (_) {
            return Array(_.length + 1).join("1")// jshint ignore:line
        })
        var index = scapegoat.replace(r11a, "\u1122\u3344").indexOf("|") //干掉所有短路或
        if (index > -1) {
            return {
                filters: value.slice(index),
                value: value.slice(0, index),
                expr: true
            }
        }
    }
    return {
        value: value,
        filters: "",
        expr: true
    }
}

function scanExpr(str) {
    var tokens = [],
            value, start = 0,
            stop
    do {
        stop = str.indexOf(openTag, start)
        if (stop === -1) {
            break
        }
        value = str.slice(start, stop)
        if (value) { // {{ 左边的文本
            tokens.push({
                value: value,
                filters: "",
                expr: false
            })
        }
        start = stop + openTag.length
        stop = str.indexOf(closeTag, start)
        if (stop === -1) {
            break
        }
        value = str.slice(start, stop)
        if (value) { //处理{{ }}插值表达式
            tokens.push(getToken(value, start))
        }
        start = stop + closeTag.length
    } while (1)
    value = str.slice(start)
    if (value) { //}} 右边的文本
        tokens.push({
            value: value,
            expr: false,
            filters: ""
        })
    }
    return tokens
}

function scanText(textNode, vmodels, index) {
    var bindings = []
    tokens = scanExpr(textNode.data)
    if (tokens.length) {
        for (var i = 0; token = tokens[i++]; ) {
            var node = DOC.createTextNode(token.value) //将文本转换为文本节点，并替换原来的文本节点
            if (token.expr) {
                token.value = token.value.replace(roneTime, function () {
                    token.oneTime = true
                    return ""
                })
                token.type = "text"
                token.element = node
                token.filters = token.filters.replace(rhasHtml, function () {
                    token.type = "html"
                    return ""
                })// jshint ignore:line
                token.pos = index * 1000 + i
                bindings.push(token) //收集带有插值表达式的文本
            }
            avalonFragment.appendChild(node)
        }
        textNode.parentNode.replaceChild(avalonFragment, textNode)
        if (bindings.length)
            executeBindings(bindings, vmodels)
    }
}

var bools = ["autofocus,autoplay,async,allowTransparency,checked,controls",
    "declare,disabled,defer,defaultChecked,defaultSelected",
    "contentEditable,isMap,loop,multiple,noHref,noResize,noShade",
    "open,readOnly,selected"
].join(",")
var boolMap = {}
bools.replace(rword, function(name) {
    boolMap[name.toLowerCase()] = name
})

var propMap = { //属性名映射
    "accept-charset": "acceptCharset",
    "char": "ch",
    "charoff": "chOff",
    "class": "className",
    "for": "htmlFor",
    "http-equiv": "httpEquiv"
}

var anomaly = ["accessKey,bgColor,cellPadding,cellSpacing,codeBase,codeType,colSpan",
    "dateTime,defaultValue,frameBorder,longDesc,maxLength,marginWidth,marginHeight",
    "rowSpan,tabIndex,useMap,vSpace,valueType,vAlign"
].join(",")
anomaly.replace(rword, function(name) {
    propMap[name.toLowerCase()] = name
})

var rnoscripts = /<noscript.*?>(?:[\s\S]+?)<\/noscript>/img
var rnoscriptText = /<noscript.*?>([\s\S]+?)<\/noscript>/im

var getXHR = function() {
    return new(window.XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP") // jshint ignore:line
}

var templatePool = avalon.templateCache = {}

bindingHandlers.attr = function(data, vmodels) {
    var text = data.value.trim(),
        simple = true
    if (text.indexOf(openTag) > -1 && text.indexOf(closeTag) > 2) {
        simple = false
        if (rexpr.test(text) && RegExp.rightContext === "" && RegExp.leftContext === "") {
            simple = true
            text = RegExp.$1
        }
    }
    if (data.type === "include") {
        var elem = data.element
        data.includeRendered = getBindingCallback(elem, "data-include-rendered", vmodels)
        data.includeLoaded = getBindingCallback(elem, "data-include-loaded", vmodels)
        var outer = data.includeReplace = !! avalon(elem).data("includeReplace")
        if (avalon(elem).data("includeCache")) {
            data.templateCache = {}
        }
        data.startInclude = DOC.createComment("ms-include")
        data.endInclude = DOC.createComment("ms-include-end")
        if (outer) {
            data.element = data.startInclude
            elem.parentNode.insertBefore(data.startInclude, elem)
            elem.parentNode.insertBefore(data.endInclude, elem.nextSibling)
        } else {
            elem.insertBefore(data.startInclude, elem.firstChild)
            elem.appendChild(data.endInclude)
        }
    }
    data.handlerName = "attr" //handleName用于处理多种绑定共用同一种bindingExecutor的情况
    parseExprProxy(text, vmodels, data, (simple ? 0 : scanExpr(data.value)))
}

bindingExecutors.attr = function(val, elem, data) {
    var method = data.type,
        attrName = data.param
    if (method === "css") {
        avalon(elem).css(attrName, val)
    } else if (method === "attr") {
       
        // ms-attr-class="xxx" vm.xxx="aaa bbb ccc"将元素的className设置为aaa bbb ccc
        // ms-attr-class="xxx" vm.xxx=false  清空元素的所有类名
        // ms-attr-name="yyy"  vm.yyy="ooo" 为元素设置name属性
        var toRemove = (val === false) || (val === null) || (val === void 0)

        if (!W3C && propMap[attrName]) { //旧式IE下需要进行名字映射
            attrName = propMap[attrName]
        }
        var bool = boolMap[attrName]
        if (typeof elem[bool] === "boolean") {
            elem[bool] = !! val //布尔属性必须使用el.xxx = true|false方式设值
            if (!val) { //如果为false, IE全系列下相当于setAttribute(xxx,''),会影响到样式,需要进一步处理
                toRemove = true
            }
        }
        if (toRemove) {
            return elem.removeAttribute(attrName)
        }
        //SVG只能使用setAttribute(xxx, yyy), VML只能使用elem.xxx = yyy ,HTML的固有属性必须elem.xxx = yyy
        var isInnate = rsvg.test(elem) ? false : (DOC.namespaces && isVML(elem)) ? true : attrName in elem.cloneNode(false)
        if (isInnate) {
            elem[attrName] = val+""
        } else {
            elem.setAttribute(attrName, val)
        }
    } else if (method === "include" && val) {
        var vmodels = data.vmodels
        var rendered = data.includeRendered
        var loaded = data.includeLoaded
        var replace = data.includeReplace
        var target = replace ? elem.parentNode : elem
        var scanTemplate = function(text) {
            if (loaded) {
                var newText = loaded.apply(target, [text].concat(vmodels))
                if (typeof newText === "string")
                    text = newText
            }
            if (rendered) {
                checkScan(target, function() {
                    rendered.call(target)
                }, NaN)
            }
            var lastID = data.includeLastID
            if (data.templateCache && lastID && lastID !== val) {
                var lastTemplate = data.templateCache[lastID]
                if (!lastTemplate) {
                    lastTemplate = data.templateCache[lastID] = DOC.createElement("div")
                    ifGroup.appendChild(lastTemplate)
                }
            }
            data.includeLastID = val
            while (true) {
                var node = data.startInclude.nextSibling
                if (node && node !== data.endInclude) {
                    target.removeChild(node)
                    if (lastTemplate)
                        lastTemplate.appendChild(node)
                } else {
                    break
                }
            }
            var dom = getTemplateNodes(data, val, text)
            var nodes = avalon.slice(dom.childNodes)
            target.insertBefore(dom, data.endInclude)
            scanNodeArray(nodes, vmodels)
        }

        if (data.param === "src") {
            if (typeof templatePool[val] === "string") {
                avalon.nextTick(function() {
                    scanTemplate(templatePool[val])
                })
            } else if (Array.isArray(templatePool[val])) { //#805 防止在循环绑定中发出许多相同的请求
                templatePool[val].push(scanTemplate)
            } else {
                var xhr = getXHR()
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        var s = xhr.status
                        if (s >= 200 && s < 300 || s === 304 || s === 1223) {
                            var text = xhr.responseText
                            for (var f = 0, fn; fn = templatePool[val][f++];) {
                                fn(text)
                            }
                            templatePool[val] = text
                        }
                    }
                }
                templatePool[val] = [scanTemplate]
                xhr.open("GET", val, true)
                if ("withCredentials" in xhr) {
                    xhr.withCredentials = true
                }
                xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
                xhr.send(null)
            }
        } else {
            //IE系列与够新的标准浏览器支持通过ID取得元素（firefox14+）
            //http://tjvantoll.com/2012/07/19/dom-element-references-as-global-variables/
            var el = val && val.nodeType === 1 ? val : DOC.getElementById(val)
            if (el) {
                if (el.tagName === "NOSCRIPT" && !(el.innerHTML || el.fixIE78)) { //IE7-8 innerText,innerHTML都无法取得其内容，IE6能取得其innerHTML
                    xhr = getXHR() //IE9-11与chrome的innerHTML会得到转义的内容，它们的innerText可以
                    xhr.open("GET", location, false) //谢谢Nodejs 乱炖群 深圳-纯属虚构
                    xhr.send(null)
                    //http://bbs.csdn.net/topics/390349046?page=1#post-393492653
                    var noscripts = DOC.getElementsByTagName("noscript")
                    var array = (xhr.responseText || "").match(rnoscripts) || []
                    var n = array.length
                    for (var i = 0; i < n; i++) {
                        var tag = noscripts[i]
                        if (tag) { //IE6-8中noscript标签的innerHTML,innerText是只读的
                            tag.style.display = "none" //http://haslayout.net/css/noscript-Ghost-Bug
                            tag.fixIE78 = (array[i].match(rnoscriptText) || ["", "&nbsp;"])[1]
                        }
                    }
                }
                avalon.nextTick(function() {
                    scanTemplate(el.fixIE78 || el.value || el.innerText || el.innerHTML)
                })
            }
        }
    } else {
        if (!root.hasAttribute && typeof val === "string" && (method === "src" || method === "href")) {
            val = val.replace(/&amp;/g, "&") //处理IE67自动转义的问题
        }
        elem[method] = val
        if (window.chrome && elem.tagName === "EMBED") {
            var parent = elem.parentNode //#525  chrome1-37下embed标签动态设置src不能发生请求
            var comment = document.createComment("ms-src")
            parent.replaceChild(comment, elem)
            parent.replaceChild(elem, comment)
        }
    }
}

function getTemplateNodes(data, id, text) {
    var div = data.templateCache && data.templateCache[id]
    if (div) {
        var dom = DOC.createDocumentFragment(),
            firstChild
        while (firstChild = div.firstChild) {
            dom.appendChild(firstChild)
        }
        return dom
    }
    return avalon.parseHTML(text)
}

//这几个指令都可以使用插值表达式，如ms-src="aaa/{{b}}/{{c}}.html"
"title,alt,src,value,css,include,href".replace(rword, function(name) {
    bindingHandlers[name] = bindingHandlers.attr
})
//根据VM的属性值或表达式的值切换类名，ms-class="xxx yyy zzz:flag" 
//http://www.cnblogs.com/rubylouvre/archive/2012/12/17/2818540.html
bindingHandlers["class"] = function(data, vmodels) {
    var oldStyle = data.param,
        text = data.value,
        rightExpr
        data.handlerName = "class"
    if (!oldStyle || isFinite(oldStyle)) {
        data.param = "" //去掉数字
        var noExpr = text.replace(rexprg, function(a) {
            return a.replace(/./g, "0")
            //return Math.pow(10, a.length - 1) //将插值表达式插入10的N-1次方来占位
        })
        var colonIndex = noExpr.indexOf(":") //取得第一个冒号的位置
        if (colonIndex === -1) { // 比如 ms-class="aaa bbb ccc" 的情况
            var className = text
        } else { // 比如 ms-class-1="ui-state-active:checked" 的情况 
            className = text.slice(0, colonIndex)
            rightExpr = text.slice(colonIndex + 1)
            parseExpr(rightExpr, vmodels, data) //决定是添加还是删除
            if (!data.evaluator) {
                log("debug: ms-class '" + (rightExpr || "").trim() + "' 不存在于VM中")
                return false
            } else {
                data._evaluator = data.evaluator
                data._args = data.args
            }
        }
        var hasExpr = rexpr.test(className) //比如ms-class="width{{w}}"的情况
        if (!hasExpr) {
            data.immobileClass = className
        }
        parseExprProxy("", vmodels, data, (hasExpr ? scanExpr(className) : 0))
    } else {
        data.immobileClass = data.oldStyle = data.param
        parseExprProxy(text, vmodels, data)
    }
}

bindingExecutors["class"] = function(val, elem, data) {
    var $elem = avalon(elem),
        method = data.type
    if (method === "class" && data.oldStyle) { //如果是旧风格
        $elem.toggleClass(data.oldStyle, !! val)
    } else {
        //如果存在冒号就有求值函数
        data.toggleClass = data._evaluator ? !! data._evaluator.apply(elem, data._args) : true
        data.newClass = data.immobileClass || val
        if (data.oldClass && data.newClass !== data.oldClass) {
            $elem.removeClass(data.oldClass)
        }
        data.oldClass = data.newClass
        switch (method) {
            case "class":
                $elem.toggleClass(data.newClass, data.toggleClass)
                break
            case "hover":
            case "active":
                if (!data.hasBindEvent) { //确保只绑定一次
                    var activate = "mouseenter" //在移出移入时切换类名
                    var abandon = "mouseleave"
                    if (method === "active") { //在聚焦失焦中切换类名
                        elem.tabIndex = elem.tabIndex || -1
                        activate = "mousedown"
                        abandon = "mouseup"
                        var fn0 = $elem.bind("mouseleave", function() {
                            data.toggleClass && $elem.removeClass(data.newClass)
                        })
                    }
                    var fn1 = $elem.bind(activate, function() {
                        data.toggleClass && $elem.addClass(data.newClass)
                    })
                    var fn2 = $elem.bind(abandon, function() {
                        data.toggleClass && $elem.removeClass(data.newClass)
                    })
                    data.rollback = function() {
                        $elem.unbind("mouseleave", fn0)
                        $elem.unbind(activate, fn1)
                        $elem.unbind(abandon, fn2)
                    }
                    data.hasBindEvent = true
                }
                break;
        }
    }
}

"hover,active".replace(rword, function(method) {
    bindingHandlers[method] = bindingHandlers["class"]
})
//ms-controller绑定已经在scanTag 方法中实现
//ms-css绑定已由ms-attr绑定实现


// bindingHandlers.data 定义在if.js
bindingExecutors.data = function(val, elem, data) {
	var key = "data-" + data.param
	if (val && typeof val === "object") {
		elem[key] = val
	} else {
		elem.setAttribute(key, String(val))
	}
}
//双工绑定
var duplexBinding = bindingHandlers.duplex = function(data, vmodels) {
    var elem = data.element,
        hasCast
        parseExprProxy(data.value, vmodels, data, 0, 1)

        data.changed = getBindingCallback(elem, "data-duplex-changed", vmodels) || noop
    if (data.evaluator && data.args) {
        var params = []
        var casting = oneObject("string,number,boolean,checked")
        if (elem.type === "radio" && data.param === "") {
            data.param = "checked"
        }
        if (elem.msData) {
            elem.msData["ms-duplex"] = data.value
        }
        data.param.replace(/\w+/g, function(name) {
            if (/^(checkbox|radio)$/.test(elem.type) && /^(radio|checked)$/.test(name)) {
                if (name === "radio")
                    log("ms-duplex-radio已经更名为ms-duplex-checked")
                name = "checked"
                data.isChecked = true
            }
            if (name === "bool") {
                name = "boolean"
                log("ms-duplex-bool已经更名为ms-duplex-boolean")
            } else if (name === "text") {
                name = "string"
                log("ms-duplex-text已经更名为ms-duplex-string")
            }
            if (casting[name]) {
                hasCast = true
            }
            avalon.Array.ensure(params, name)
        })
        if (!hasCast) {
            params.push("string")
        }
        data.param = params.join("-")
        data.bound = function(type, callback) {
            if (elem.addEventListener) {
                elem.addEventListener(type, callback, false)
            } else {
                elem.attachEvent("on" + type, callback)
            }
            var old = data.rollback
            data.rollback = function() {
                elem.avalonSetter = null
                avalon.unbind(elem, type, callback)
                old && old()
            }
        }
        for (var i in avalon.vmodels) {
            var v = avalon.vmodels[i]
            v.$fire("avalon-ms-duplex-init", data)
        }
        var cpipe = data.pipe || (data.pipe = pipe)
        cpipe(null, data, "init")
        var tagName = elem.tagName
        duplexBinding[tagName] && duplexBinding[tagName](elem, data.evaluator.apply(null, data.args), data)
    }
}
//不存在 bindingExecutors.duplex

    function fixNull(val) {
        return val == null ? "" : val
    }
avalon.duplexHooks = {
    checked: {
        get: function(val, data) {
            return !data.element.oldValue
        }
    },
    string: {
        get: function(val) { //同步到VM
            return val
        },
        set: fixNull
    },
    "boolean": {
        get: function(val) {
            return val === "true"
        },
        set: fixNull
    },
    number: {
        get: function(val, data) {
            var number = parseFloat(val)
            if (-val === -number) {
                return number
            }
            var arr = /strong|medium|weak/.exec(data.element.getAttribute("data-duplex-number")) || ["medium"]
            switch (arr[0]) {
                case "strong":
                    return 0
                case "medium":
                    return val === "" ? "" : 0
                case "weak":
                    return val
            }
        },
        set: fixNull
    }
}

function pipe(val, data, action, e) {
    data.param.replace(/\w+/g, function(name) {
        var hook = avalon.duplexHooks[name]
        if (hook && typeof hook[action] === "function") {
            val = hook[action](val, data)
        }
    })
    return val
}

var TimerID, ribbon = []

    avalon.tick = function(fn) {
        if (ribbon.push(fn) === 1) {
            TimerID = setInterval(ticker, 60)
        }
    }

    function ticker() {
        for (var n = ribbon.length - 1; n >= 0; n--) {
            var el = ribbon[n]
            if (el() === false) {
                ribbon.splice(n, 1)
            }
        }
        if (!ribbon.length) {
            clearInterval(TimerID)
        }
    }

var watchValueInTimer = noop
var rmsinput = /text|password|hidden/
new function() { // jshint ignore:line
    try { //#272 IE9-IE11, firefox
        var setters = {}
        var aproto = HTMLInputElement.prototype
        var bproto = HTMLTextAreaElement.prototype
        function newSetter(value) { // jshint ignore:line
                setters[this.tagName].call(this, value)
                if (rmsinput.test(this.type) && !this.msFocus && this.avalonSetter) {
                    this.avalonSetter()
                }
        }
        var inputProto = HTMLInputElement.prototype
        Object.getOwnPropertyNames(inputProto) //故意引发IE6-8等浏览器报错
        setters["INPUT"] = Object.getOwnPropertyDescriptor(aproto, "value").set
    
        Object.defineProperty(aproto, "value", {
            set: newSetter
        })
        setters["TEXTAREA"] = Object.getOwnPropertyDescriptor(bproto, "value").set
        Object.defineProperty(bproto, "value", {
            set: newSetter
        })
    } catch (e) {
        //在chrome 43中 ms-duplex终于不需要使用定时器实现双向绑定了
        // http://updates.html5rocks.com/2015/04/DOM-attributes-now-on-the-prototype
        // https://docs.google.com/document/d/1jwA8mtClwxI-QJuHT7872Z0pxpZz8PBkf2bGAbsUtqs/edit?pli=1
        watchValueInTimer = avalon.tick
    }
} // jshint ignore:line
if (IEVersion) {
    avalon.bind(DOC, "selectionchange", function(e) {
        var el = DOC.activeElement
        if (el && typeof el.avalonSetter === "function") {
            el.avalonSetter()
        }
    })
}

//处理radio, checkbox, text, textarea, password
duplexBinding.INPUT = function(element, evaluator, data) {
    var $type = element.type,
        bound = data.bound,
        $elem = avalon(element),
        composing = false

        function callback(value) {
            data.changed.call(this, value, data)
        }

        function compositionStart() {
            composing = true
        }

        function compositionEnd() {
            composing = false
        }
        //当value变化时改变model的值
    var updateVModel = function() {
        if (composing) //处理中文输入法在minlengh下引发的BUG
            return
        var val = element.oldValue = element.value //防止递归调用形成死循环
        var lastValue = data.pipe(val, data, "get")
        if ($elem.data("duplexObserve") !== false) {
            evaluator(lastValue)
            callback.call(element, lastValue)
            if ($elem.data("duplex-focus")) {
                avalon.nextTick(function() {
                    element.focus()
                })
            }
        }
    }
    //当model变化时,它就会改变value的值
    data.handler = function() {
        var val = data.pipe(evaluator(), data, "set") + "" //fix #673
        if (val !== element.oldValue) {
            element.value = val
        }
    }
    if (data.isChecked || $type === "radio") {
        var IE6 = IEVersion === 6
        updateVModel = function() {
            if ($elem.data("duplexObserve") !== false) {
                var lastValue = data.pipe(element.value, data, "get")
                evaluator(lastValue)
                callback.call(element, lastValue)
            }
        }
        data.handler = function() {
            var val = evaluator()
            var checked = data.isChecked ? !! val : val + "" === element.value
            element.oldValue = checked
            if (IE6) {
                setTimeout(function() {
                    //IE8 checkbox, radio是使用defaultChecked控制选中状态，
                    //并且要先设置defaultChecked后设置checked
                    //并且必须设置延迟
                    element.defaultChecked = checked
                    element.checked = checked
                }, 31)
            } else {
                element.checked = checked
            }
        }
        bound("click", updateVModel)
    } else if ($type === "checkbox") {
        updateVModel = function() {
            if ($elem.data("duplexObserve") !== false) {
                var method = element.checked ? "ensure" : "remove"
                var array = evaluator()
                if (!Array.isArray(array)) {
                    log("ms-duplex应用于checkbox上要对应一个数组")
                    array = [array]
                }
                var val = data.pipe(element.value, data, "get")
                avalon.Array[method](array, val)
                callback.call(element, array)
            }
        }

        data.handler = function() {
            var array = [].concat(evaluator()) //强制转换为数组
            var val = data.pipe(element.value, data, "get")
            element.checked = array.indexOf(val) > -1
        }
        bound(W3C ? "change" : "click", updateVModel)
    } else {
        var events = element.getAttribute("data-duplex-event") || "input"
        if (element.attributes["data-event"]) {
            log("data-event指令已经废弃，请改用data-duplex-event")
        }

        function delay(e) { // jshint ignore:line
            setTimeout(function() {
                updateVModel(e)
            })
        }
        events.replace(rword, function(name) {
            switch (name) {
                case "input":
                    if (!IEVersion) { // W3C
                        bound("input", updateVModel)
                        //非IE浏览器才用这个
                        bound("compositionstart", compositionStart)
                        bound("compositionend", compositionEnd)
                        bound("DOMAutoComplete", updateVModel)
                    } else { //onpropertychange事件无法区分是程序触发还是用户触发
                        // IE下通过selectionchange事件监听IE9+点击input右边的X的清空行为，及粘贴，剪切，删除行为
                        if (IEVersion > 8) {
                            bound("input", updateVModel) //IE9使用propertychange无法监听中文输入改动
                        } else {
                            bound("propertychange", function(e) { //IE6-8下第一次修改时不会触发,需要使用keydown或selectionchange修正
                                if (e.propertyName === "value") {
                                    updateVModel()
                                }
                            })
                        }
                        bound("dragend", delay)
                        //http://www.cnblogs.com/rubylouvre/archive/2013/02/17/2914604.html
                        //http://www.matts411.com/post/internet-explorer-9-oninput/
                    }
                    break
                default:
                    bound(name, updateVModel)
                    break
            }
        })
        bound("focus", function() {
            element.msFocus = true
        })
        bound("blur", function() {
            element.msFocus = false
        })

        if (rmsinput.test($type)) {
            watchValueInTimer(function() {
                if (root.contains(element)) {
                    if (!element.msFocus && element.oldValue !== element.value) {
                        updateVModel()
                    }
                } else if (!element.msRetain) {
                    return false
                }
            })
        }

        element.avalonSetter = updateVModel //#765
    }

    element.oldValue = element.value
    avalon.injectBinding(data)
    callback.call(element, element.value)
}
duplexBinding.TEXTAREA = duplexBinding.INPUT
duplexBinding.SELECT = function(element, evaluator, data) {
    var $elem = avalon(element)

        function updateVModel() {
            if ($elem.data("duplexObserve") !== false) {
                var val = $elem.val() //字符串或字符串数组
                if (Array.isArray(val)) {
                    val = val.map(function(v) {
                        return data.pipe(v, data, "get")
                    })
                } else {
                    val = data.pipe(val, data, "get")
                }
                if (val + "" !== element.oldValue) {
                    evaluator(val)
                }
                data.changed.call(element, val, data)
            }
        }
    data.handler = function() {
        var val = evaluator()
        val = val && val.$model || val
        if (Array.isArray(val)) {
            if (!element.multiple) {
                log("ms-duplex在<select multiple=true>上要求对应一个数组")
            }
        } else {
            if (element.multiple) {
                log("ms-duplex在<select multiple=false>不能对应一个数组")
            }
        }
        //必须变成字符串后才能比较
        val = Array.isArray(val) ? val.map(String) : val + ""
        if (val + "" !== element.oldValue) {
            $elem.val(val)
            element.oldValue = val + ""
        }
    }
    data.bound("change", updateVModel)
    element.msCallback = function() {
        avalon.injectBinding(data)
        data.changed.call(element, evaluator(), data)
    }
}
// bindingHandlers.html 定义在if.js
bindingExecutors.html = function (val, elem, data) {
    var isHtmlFilter = elem.nodeType !== 1
    var parent = isHtmlFilter ? elem.parentNode : elem
    if (!parent)
        return
    val = val == null ? "" : val
    if (data.oldText !== val) {
        data.oldText = val
    } else {
        return
    }
    if (elem.nodeType === 3) {
        var signature = generateID("html")
        parent.insertBefore(DOC.createComment(signature), elem)
        data.element = DOC.createComment(signature + ":end")
        parent.replaceChild(data.element, elem)
        elem = data.element
    }
    if (typeof val !== "object") {//string, number, boolean
        var fragment = avalon.parseHTML(String(val))
    } else if (val.nodeType === 11) { //将val转换为文档碎片
        fragment = val
    } else if (val.nodeType === 1 || val.item) {
        var nodes = val.nodeType === 1 ? val.childNodes : val.item
        fragment = avalonFragment.cloneNode(true)
        while (nodes[0]) {
            fragment.appendChild(nodes[0])
        }
    }

    nodes = avalon.slice(fragment.childNodes)
    //插入占位符, 如果是过滤器,需要有节制地移除指定的数量,如果是html指令,直接清空
    if (isHtmlFilter) {
        var endValue = elem.nodeValue.slice(0, -4)
        while (true) {
            var node = elem.previousSibling
            if (!node || node.nodeType === 8 && node.nodeValue === endValue) {
                break
            } else {
                parent.removeChild(node)
            }
        }
        parent.insertBefore(fragment, elem)
    } else {
        avalon.clearHTML(elem).appendChild(fragment)
    }
    scanNodeArray(nodes, data.vmodels)
}
bindingHandlers["if"] =
    bindingHandlers.data =
    bindingHandlers.text =
    bindingHandlers.html =
    function(data, vmodels) {
        parseExprProxy(data.value, vmodels, data)
}

bindingExecutors["if"] = function(val, elem, data) {
     try {
         if(!elem.parentNode) return
     } catch(e) {return}
    if (val) { //插回DOM树
        if (elem.nodeType === 8) {
            elem.parentNode.replaceChild(data.template, elem)
         //   animate.enter(data.template, elem.parentNode)
            elem = data.element = data.template //这时可能为null
        }
        if (elem.getAttribute(data.name)) {
            elem.removeAttribute(data.name)
            scanAttr(elem, data.vmodels)
        }
        data.rollback = null
    } else { //移出DOM树，并用注释节点占据原位置
        if (elem.nodeType === 1) {
            var node = data.element = DOC.createComment("ms-if")
            elem.parentNode.replaceChild(node, elem)
       //     animate.leave(elem, node.parentNode, node)
            data.template = elem //元素节点
            ifGroup.appendChild(elem)
            data.rollback = function() {
                if (elem.parentNode === ifGroup) {
                    ifGroup.removeChild(elem)
                }
            }
        }
    }
}
//ms-important绑定已经在scanTag 方法中实现
//ms-include绑定已由ms-attr绑定实现

var rdash = /\(([^)]*)\)/
bindingHandlers.on = function(data, vmodels) {
    var value = data.value
    data.type = "on"
    var eventType = data.param.replace(/-\d+$/, "") // ms-on-mousemove-10
    if (typeof bindingHandlers.on[eventType + "Hook"] === "function") {
        bindingHandlers.on[eventType + "Hook"](data)
    }
    if (value.indexOf("(") > 0 && value.indexOf(")") > -1) {
        var matched = (value.match(rdash) || ["", ""])[1].trim()
        if (matched === "" || matched === "$event") { // aaa() aaa($event)当成aaa处理
            value = value.replace(rdash, "")
        }
    }
    parseExprProxy(value, vmodels, data)
}

bindingExecutors.on = function(callback, elem, data) {
    callback = function(e) {
        var fn = data.evaluator || noop
        return fn.apply(this, data.args.concat(e))
    }
    var eventType = data.param.replace(/-\d+$/, "") // ms-on-mousemove-10
    if (eventType === "scan") {
        callback.call(elem, {
            type: eventType
        })
    } else if (typeof data.specialBind === "function") {
        data.specialBind(elem, callback)
    } else {
        var removeFn = avalon.bind(elem, eventType, callback)
    }
    data.rollback = function() {
        if (typeof data.specialUnbind === "function") {
            data.specialUnbind()
        } else {
            avalon.unbind(elem, eventType, removeFn)
        }
    }
}
bindingHandlers.repeat = function (data, vmodels) {
    var type = data.type
    parseExprProxy(data.value, vmodels, data, 0, 1)
    data.proxies = []
    var freturn = false
    try {
        var $repeat = data.$repeat = data.evaluator.apply(0, data.args || [])
        var xtype = avalon.type($repeat)
        if (xtype !== "object" && xtype !== "array") {
            freturn = true
            avalon.log("warning:" + data.value + "只能是对象或数组")
        }
    } catch (e) {
        freturn = true
    }
    var arr = data.value.split(".") || []
    if (arr.length > 1) {
        arr.pop()
        var n = arr[0]
        for (var i = 0, v; v = vmodels[i++]; ) {
            if (v && v.hasOwnProperty(n)) {
                var events = v[n].$events || {}
                events[subscribers] = events[subscribers] || []
                events[subscribers].push(data)
                break
            }
        }
    }

    var elem = data.element
    if (elem.nodeType === 1) {
        elem.removeAttribute(data.name)
        data.sortedCallback = getBindingCallback(elem, "data-with-sorted", vmodels)
        data.renderedCallback = getBindingCallback(elem, "data-" + type + "-rendered", vmodels)
        var signature = generateID(type)
        var start = DOC.createComment(signature)
        var end = DOC.createComment(signature + ":end")
        data.signature = signature
        data.template = avalonFragment.cloneNode(false)
        if (type === "repeat") {
            var parent = elem.parentNode
            parent.replaceChild(end, elem)
            parent.insertBefore(start, end)
            data.template.appendChild(elem)
        } else {
            while (elem.firstChild) {
                data.template.appendChild(elem.firstChild)
            }
            elem.appendChild(start)
            elem.appendChild(end)
        }
        data.element = end
        data.handler = bindingExecutors.repeat
        data.rollback = function () {
            var elem = data.element
            if (!elem)
                return
            data.handler("clear")
        }
    }

    if (freturn) {
        return
    }

    data.$outer = {}
    var check0 = "$key"
    var check1 = "$val"
    if (Array.isArray($repeat)) {
        check0 = "$first"
        check1 = "$last"
    }
   
    for (i = 0; v = vmodels[i++]; ) {
        if (v.hasOwnProperty(check0) && v.hasOwnProperty(check1)) {
            data.$outer = v
            break
        }
    }
    var $events = $repeat.$events
    var $list = ($events || {})[subscribers]
    injectDependency($list, data)
    if (xtype === "object") {
        data.$with = true
        $repeat.$proxy || ($repeat.$proxy = {})
        data.handler("append", $repeat)
    } else if ($repeat.length) {
        data.handler("add", 0, $repeat.length)
    }
}

bindingExecutors.repeat = function (method, pos, el) {
    if (method) {
        var data = this, start, fragment
        var end = data.element
        var comments = getComments(data)
        var parent = end.parentNode
        var proxies = data.proxies
        var transation = avalonFragment.cloneNode(false)
        switch (method) {
            case "add": //在pos位置后添加el数组（pos为插入位置,el为要插入的个数）
                var n = pos + el
                var fragments = []
                for (var i = pos; i < n; i++) {
                    var proxy = eachProxyAgent(i, data)
                    proxies.splice(i, 0, proxy)
                    shimController(data, transation, proxy, fragments)
                }
                var now = new Date() - 0
                avalon.optimize = avalon.optimize || now
                for (i = 0; fragment = fragments[i++]; ) {
                    scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                }
                if (avalon.optimize === now) {
                    delete avalon.optimize
                }
                parent.insertBefore(transation, comments[pos] || end)
                avalon.profile("插入操作花费了 " + (new Date - now))
                break
            case "del": //将pos后的el个元素删掉(pos, el都是数字)
                sweepNodes(comments[pos], comments[pos + el] || end)
                var removed = proxies.splice(pos, el)
                recycleProxies(removed, "each")
                break
            case "clear":
                start = comments[0]
                if (start) {
                    sweepNodes(start, end)
                    if (data.$with) {
                        parent.insertBefore(start, end)
                    }
                }
                recycleProxies(proxies, "each")
                break
            case "move":
                start = comments[0]
                if (start) {
                    var signature = start.nodeValue
                    var rooms = []
                    var room = [],
                            node
                    sweepNodes(start, end, function () {
                        room.unshift(this)
                        if (this.nodeValue === signature) {
                            rooms.unshift(room)
                            room = []
                        }
                    })
                    sortByIndex(rooms, pos)
                    sortByIndex(proxies, pos)
                    while (room = rooms.shift()) {
                        while (node = room.shift()) {
                            transation.appendChild(node)
                        }
                    }
                    parent.insertBefore(transation, end)
                }
                break
        case "index": //将proxies中的第pos个起的所有元素重新索引
                var last = proxies.length - 1
                for (; el = proxies[pos]; pos++) {
                    el.$index = pos
                    el.$first = pos === 0
                    el.$last = pos === last
                }
                return
            case "set": //将proxies中的第pos个元素的VM设置为el（pos为数字，el任意）
                proxy = proxies[pos]
                if (proxy) {
                    fireDependencies(proxy.$events[data.param || "el"])
                }
                break
            case "append":
                var object = pos //原来第2参数， 被循环对象
                var pool = object.$proxy   //代理对象组成的hash
                var keys = []
                fragments = []
                for (var key in pool) {
                    if (!object.hasOwnProperty(key)) {
                        proxyRecycler(pool[key], withProxyPool) //去掉之前的代理VM
                        delete(pool[key])
                    }
                }
                for (key in object) { //得到所有键名
                    if (object.hasOwnProperty(key) && key !== "hasOwnProperty" && key !== "$proxy") {
                        keys.push(key)
                    }
                }
                if (data.sortedCallback) { //如果有回调，则让它们排序
                    var keys2 = data.sortedCallback.call(parent, keys)
                    if (keys2 && Array.isArray(keys2) && keys2.length) {
                        keys = keys2
                    }
                }

                for (i = 0; key = keys[i++]; ) {
                    if (key !== "hasOwnProperty") {
                        pool[key] = withProxyAgent(pool[key], key, data)
                        shimController(data, transation, pool[key], fragments)
                    }
                }

                parent.insertBefore(transation, end)
                for (i = 0; fragment = fragments[i++]; ) {
                    scanNodeArray(fragment.nodes, fragment.vmodels)
                    fragment.nodes = fragment.vmodels = null
                }
                break
        }
        if (!data.$repeat || data.$repeat.hasOwnProperty("$lock")) //IE6-8 VBScript对象会报错, 有时候data.$repeat不存在
            return
        if (method === "clear")
            method = "del"
        var callback = data.renderedCallback || noop,
                args = arguments
        if (parent.oldValue && parent.tagName === "SELECT") { //fix #503
            avalon(parent).val(parent.oldValue.split(","))
        }
        callback.apply(parent, args)
    }
}

"with,each".replace(rword, function (name) {
    bindingHandlers[name] = bindingHandlers.repeat
})

function shimController(data, transation, proxy, fragments) {
    var content = data.template.cloneNode(true)
    var nodes = avalon.slice(content.childNodes)
    if (!data.$with) {
        content.insertBefore(DOC.createComment(data.signature), content.firstChild)
    }
    transation.appendChild(content)
    var nv = [proxy].concat(data.vmodels)
    var fragment = {
        nodes: nodes,
        vmodels: nv
    }
    fragments.push(fragment)
}

function getComments(data) {
    var end = data.element
    var signature = end.nodeValue.replace(":end", "")
    var node = end.previousSibling
    var array = []
    while (node) {
        if (node.nodeValue === signature) {
            array.unshift(node)
        }
        node = node.previousSibling
    }
    return array
}


//移除掉start与end之间的节点(保留end)
function sweepNodes(start, end, callback) {
    while (true) {
        var node = end.previousSibling
        if (!node)
            break
        node.parentNode.removeChild(node)
        callback && callback.call(node)
        if (node === start) {
            break
        }
    }
}

// 为ms-each,ms-with, ms-repeat会创建一个代理VM，
// 通过它们保持一个下上文，让用户能调用$index,$first,$last,$remove,$key,$val,$outer等属性与方法
// 所有代理VM的产生,消费,收集,存放通过xxxProxyFactory,xxxProxyAgent, recycleProxies,xxxProxyPool实现
var withProxyPool = []
function withProxyFactory() {
    var proxy = modelFactory({
        $key: "",
        $outer: {},
        $host: {},
        $val: {
            get: function () {
                return this.$host[this.$key]
            },
            set: function (val) {
                this.$host[this.$key] = val
            }
        }
    }, {
        $val: 1
    })
    proxy.$id = generateID("$proxy$with")
    return proxy
}

function withProxyAgent(proxy, key, data) {
    proxy = proxy || withProxyPool.pop()
    if (!proxy) {
        proxy = withProxyFactory()
    } else {
        proxy.$reinitialize()
    }
    var host = data.$repeat
    proxy.$key = key
    proxy.$host = host
    proxy.$outer = data.$outer
    if (host.$events) {
        proxy.$events.$val = host.$events[key]
    } else {
        proxy.$events = {}
    }
    return proxy
}


function  recycleProxies(proxies) {
    eachProxyRecycler(proxies)
}
function eachProxyRecycler(proxies) {
    proxies.forEach(function (proxy) {
        proxyRecycler(proxy, eachProxyPool)
    })
    proxies.length = 0
}


var eachProxyPool = []
function eachProxyFactory(name) {
    var source = {
        $host: [],
        $outer: {},
        $index: 0,
        $first: false,
        $last: false,
        $remove: avalon.noop
    }
    source[name] = {
        get: function () {
            var e = this.$events
            var array = e.$index
            e.$index = e[name] //#817 通过$index为el收集依赖
            try {
                return this.$host[this.$index]
            } finally {
                e.$index = array
            }
        },
        set: function (val) {
            try {
                var e = this.$events
                var array = e.$index
                e.$index = []
                this.$host.set(this.$index, val)
            } finally {
                e.$index = array
            }
        }
    }
    var second = {
        $last: 1,
        $first: 1,
        $index: 1
    }
    var proxy = modelFactory(source, second)
    proxy.$id = generateID("$proxy$each")
    return proxy
}

function eachProxyAgent(index, data) {
    var param = data.param || "el",
            proxy
    for (var i = 0, n = eachProxyPool.length; i < n; i++) {
        var candidate = eachProxyPool[i]
        if (candidate && candidate.hasOwnProperty(param)) {
            proxy = candidate
            eachProxyPool.splice(i, 1)
        }
    }
    if (!proxy) {
        proxy = eachProxyFactory(param)
    }
    var host = data.$repeat
    var last = host.length - 1
    proxy.$index = index
    proxy.$first = index === 0
    proxy.$last = index === last
    proxy.$host = host
    proxy.$outer = data.$outer
    proxy.$remove = function () {
        return host.removeAt(proxy.$index)
    }
    return proxy
}


function proxyRecycler(proxy, proxyPool) {
    for (var i in proxy.$events) {
        if (Array.isArray(proxy.$events[i])) {
            proxy.$events[i].forEach(function (data) {
                if (typeof data === "object")
                    disposeData(data)
            })// jshint ignore:line
            proxy.$events[i].length = 0
        }
    }
    proxy.$host = proxy.$outer = {}
    if (proxyPool.unshift(proxy) > kernel.maxRepeatSize) {
        proxyPool.pop()
    }
}
/*********************************************************************
 *                         各种指令                                  *
 **********************************************************************/
//ms-skip绑定已经在scanTag 方法中实现
// bindingHandlers.text 定义在if.js
bindingExecutors.text = function(val, elem) {
    val = val == null ? "" : val //不在页面上显示undefined null
    if (elem.nodeType === 3) { //绑定在文本节点上
        try { //IE对游离于DOM树外的节点赋值会报错
            elem.data = val
        } catch (e) {}
    } else { //绑定在特性节点上
        if ("textContent" in elem) {
            elem.textContent = val
        } else {
            elem.innerText = val
        }
    }
}
function parseDisplay(nodeName, val) {
    //用于取得此类标签的默认display值
    var key = "_" + nodeName
    if (!parseDisplay[key]) {
        var node = DOC.createElement(nodeName)
        root.appendChild(node)
        if (W3C) {
            val = getComputedStyle(node, null).display
        } else {
            val = node.currentStyle.display
        }
        root.removeChild(node)
        parseDisplay[key] = val
    }
    return parseDisplay[key]
}

avalon.parseDisplay = parseDisplay

bindingHandlers.visible = function(data, vmodels) {
    var elem = avalon(data.element)
    var display = elem.css("display")
    if (display === "none") {
        var style = elem[0].style
        var has = /visibility/i.test(style.cssText)
        var visible = elem.css("visibility")
        style.display = ""
        style.visibility = "hidden"
        display = elem.css("display")
        if (display === "none") {
            display = parseDisplay(elem[0].nodeName)
        }
        style.visibility = has ? visible : ""
    }
    data.display = display
    parseExprProxy(data.value, vmodels, data)
}

bindingExecutors.visible = function(val, elem, data) {
    elem.style.display = val ? data.display : "none"
}
bindingHandlers.widget = function(data, vmodels) {
    var args = data.value.match(rword)
    var elem = data.element
    var widget = args[0]
    var id = args[1]
    if (!id || id === "$") { //没有定义或为$时，取组件名+随机数
        id = generateID(widget)
    }
    var optName = args[2] || widget //没有定义，取组件名
    var constructor = avalon.ui[widget]
    if (typeof constructor === "function") { //ms-widget="tabs,tabsAAA,optname"
        vmodels = elem.vmodels || vmodels
        for (var i = 0, v; v = vmodels[i++];) {
            if (v.hasOwnProperty(optName) && typeof v[optName] === "object") {
                var vmOptions = v[optName]
                vmOptions = vmOptions.$model || vmOptions
                break
            }
        }
        if (vmOptions) {
            var wid = vmOptions[widget + "Id"]
            if (typeof wid === "string") {
                log("warning!不再支持" + widget + "Id")
                id = wid
            }
        }
        //抽取data-tooltip-text、data-tooltip-attr属性，组成一个配置对象
        var widgetData = avalon.getWidgetData(elem, widget)
        data.value = [widget, id, optName].join(",")
        data[widget + "Id"] = id
        data.evaluator = noop
        elem.msData["ms-widget-id"] = id
        var options = data[widget + "Options"] = avalon.mix({}, constructor.defaults, vmOptions || {}, widgetData)
        elem.removeAttribute("ms-widget")
        var vmodel = constructor(elem, data, vmodels) || {} //防止组件不返回VM
        if (vmodel.$id) {
            avalon.vmodels[id] = vmodel
            createSignalTower(elem, vmodel)
            try {
                vmodel.$init(function() {
                    avalon.scan(elem, [vmodel].concat(vmodels))
                    if (typeof options.onInit === "function") {
                        options.onInit.call(elem, vmodel, options, vmodels)
                    }
                })
            } catch (e) {}
            data.rollback = function() {
                try {
                    vmodel.widgetElement = null
                    vmodel.$remove()
                } catch (e) {}
                elem.msData = {}
                delete avalon.vmodels[vmodel.$id]
            }
            injectDisposeQueue(data, widgetList)
            if (window.chrome) {
                elem.addEventListener("DOMNodeRemovedFromDocument", function() {
                    setTimeout(rejectDisposeQueue)
                })
            }
        } else {
            avalon.scan(elem, vmodels)
        }
    } else if (vmodels.length) { //如果该组件还没有加载，那么保存当前的vmodels
        elem.vmodels = vmodels
    }
}
var widgetList = []
//不存在 bindingExecutors.widget
/*********************************************************************
 *                             自带过滤器                            *
 **********************************************************************/
var rscripts = /<script[^>]*>([\S\s]*?)<\/script\s*>/gim
var ron = /\s+(on[^=\s]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g
var ropen = /<\w+\b(?:(["'])[^"]*?(\1)|[^>])*>/ig
var rsanitize = {
    a: /\b(href)\=("javascript[^"]*"|'javascript[^']*')/ig,
    img: /\b(src)\=("javascript[^"]*"|'javascript[^']*')/ig,
    form: /\b(action)\=("javascript[^"]*"|'javascript[^']*')/ig
}
var rsurrogate = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g
var rnoalphanumeric = /([^\#-~| |!])/g;

function numberFormat(number, decimals, point, thousands) {
    //form http://phpjs.org/functions/number_format/
    //number	必需，要格式化的数字
    //decimals	可选，规定多少个小数位。
    //point	可选，规定用作小数点的字符串（默认为 . ）。
    //thousands	可选，规定用作千位分隔符的字符串（默认为 , ），如果设置了该参数，那么所有其他参数都是必需的。
    number = (number + '')
            .replace(/[^0-9+\-Ee.]/g, '')
    var n = !isFinite(+number) ? 0 : +number,
            prec = !isFinite(+decimals) ? 3 : Math.abs(decimals),
            sep = thousands || ",",
            dec = point || ".",
            s = '',
            toFixedFix = function(n, prec) {
                var k = Math.pow(10, prec)
                return '' + (Math.round(n * k) / k)
                        .toFixed(prec)
            }
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n))
            .split('.')
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep)
    }
    if ((s[1] || '')
            .length < prec) {
        s[1] = s[1] || ''
        s[1] += new Array(prec - s[1].length + 1)
                .join('0')
    }
    return s.join(dec)
}


var filters = avalon.filters = {
    uppercase: function(str) {
        return str.toUpperCase()
    },
    lowercase: function(str) {
        return str.toLowerCase()
    },
    truncate: function(str, length, truncation) {
        //length，新字符串长度，truncation，新字符串的结尾的字段,返回新字符串
        length = length || 30
        truncation = typeof truncation === "string" ?  truncation : "..." 
        return str.length > length ? str.slice(0, length - truncation.length) + truncation : String(str)
    },
    $filter: function(val) {
        for (var i = 1, n = arguments.length; i < n; i++) {
            var array = arguments[i]
            var fn = avalon.filters[array.shift()]
            if (typeof fn === "function") {
                var arr = [val].concat(array)
                val = fn.apply(null, arr)
            }
        }
        return val
    },
    camelize: camelize,
    //https://www.owasp.org/index.php/XSS_Filter_Evasion_Cheat_Sheet
    //    <a href="javasc&NewLine;ript&colon;alert('XSS')">chrome</a> 
    //    <a href="data:text/html;base64, PGltZyBzcmM9eCBvbmVycm9yPWFsZXJ0KDEpPg==">chrome</a>
    //    <a href="jav	ascript:alert('XSS');">IE67chrome</a>
    //    <a href="jav&#x09;ascript:alert('XSS');">IE67chrome</a>
    //    <a href="jav&#x0A;ascript:alert('XSS');">IE67chrome</a>
    sanitize: function(str) {
        return str.replace(rscripts, "").replace(ropen, function(a, b) {
            var match = a.toLowerCase().match(/<(\w+)\s/)
            if (match) { //处理a标签的href属性，img标签的src属性，form标签的action属性
                var reg = rsanitize[match[1]]
                if (reg) {
                    a = a.replace(reg, function(s, name, value) {
                        var quote = value.charAt(0)
                        return name + "=" + quote + "javascript:void(0)" + quote// jshint ignore:line
                    })
                }
            }
            return a.replace(ron, " ").replace(/\s+/g, " ") //移除onXXX事件
        })
    },
    escape: function(str) {
        //将字符串经过 str 转义得到适合在页面中显示的内容, 例如替换 < 为 &lt 
        return String(str).
                replace(/&/g, '&amp;').
                replace(rsurrogate, function(value) {
                    var hi = value.charCodeAt(0)
                    var low = value.charCodeAt(1)
                    return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';'
                }).
                replace(rnoalphanumeric, function(value) {
                    return '&#' + value.charCodeAt(0) + ';'
                }).
                replace(/</g, '&lt;').
                replace(/>/g, '&gt;')
    },
    currency: function(amount, symbol, fractionSize) {
        return (symbol || "\uFFE5") + numberFormat(amount, isFinite(fractionSize) ? fractionSize : 2)
    },
    number: numberFormat
}
/*
 'yyyy': 4 digit representation of year (e.g. AD 1 => 0001, AD 2010 => 2010)
 'yy': 2 digit representation of year, padded (00-99). (e.g. AD 2001 => 01, AD 2010 => 10)
 'y': 1 digit representation of year, e.g. (AD 1 => 1, AD 199 => 199)
 'MMMM': Month in year (January-December)
 'MMM': Month in year (Jan-Dec)
 'MM': Month in year, padded (01-12)
 'M': Month in year (1-12)
 'dd': Day in month, padded (01-31)
 'd': Day in month (1-31)
 'EEEE': Day in Week,(Sunday-Saturday)
 'EEE': Day in Week, (Sun-Sat)
 'HH': Hour in day, padded (00-23)
 'H': Hour in day (0-23)
 'hh': Hour in am/pm, padded (01-12)
 'h': Hour in am/pm, (1-12)
 'mm': Minute in hour, padded (00-59)
 'm': Minute in hour (0-59)
 'ss': Second in minute, padded (00-59)
 's': Second in minute (0-59)
 'a': am/pm marker
 'Z': 4 digit (+sign) representation of the timezone offset (-1200-+1200)
 format string can also be one of the following predefined localizable formats:
 
 'medium': equivalent to 'MMM d, y h:mm:ss a' for en_US locale (e.g. Sep 3, 2010 12:05:08 pm)
 'short': equivalent to 'M/d/yy h:mm a' for en_US locale (e.g. 9/3/10 12:05 pm)
 'fullDate': equivalent to 'EEEE, MMMM d,y' for en_US locale (e.g. Friday, September 3, 2010)
 'longDate': equivalent to 'MMMM d, y' for en_US locale (e.g. September 3, 2010
 'mediumDate': equivalent to 'MMM d, y' for en_US locale (e.g. Sep 3, 2010)
 'shortDate': equivalent to 'M/d/yy' for en_US locale (e.g. 9/3/10)
 'mediumTime': equivalent to 'h:mm:ss a' for en_US locale (e.g. 12:05:08 pm)
 'shortTime': equivalent to 'h:mm a' for en_US locale (e.g. 12:05 pm)
 */
new function() {// jshint ignore:line
    function toInt(str) {
        return parseInt(str, 10) || 0
    }

    function padNumber(num, digits, trim) {
        var neg = ""
        if (num < 0) {
            neg = '-'
            num = -num
        }
        num = "" + num
        while (num.length < digits)
            num = "0" + num
        if (trim)
            num = num.substr(num.length - digits)
        return neg + num
    }

    function dateGetter(name, size, offset, trim) {
        return function(date) {
            var value = date["get" + name]()
            if (offset > 0 || value > -offset)
                value += offset
            if (value === 0 && offset === -12) {
                value = 12
            }
            return padNumber(value, size, trim)
        }
    }

    function dateStrGetter(name, shortForm) {
        return function(date, formats) {
            var value = date["get" + name]()
            var get = (shortForm ? ("SHORT" + name) : name).toUpperCase()
            return formats[get][value]
        }
    }

    function timeZoneGetter(date) {
        var zone = -1 * date.getTimezoneOffset()
        var paddedZone = (zone >= 0) ? "+" : ""
        paddedZone += padNumber(Math[zone > 0 ? "floor" : "ceil"](zone / 60), 2) + padNumber(Math.abs(zone % 60), 2)
        return paddedZone
    }
    //取得上午下午

    function ampmGetter(date, formats) {
        return date.getHours() < 12 ? formats.AMPMS[0] : formats.AMPMS[1]
    }
    var DATE_FORMATS = {
        yyyy: dateGetter("FullYear", 4),
        yy: dateGetter("FullYear", 2, 0, true),
        y: dateGetter("FullYear", 1),
        MMMM: dateStrGetter("Month"),
        MMM: dateStrGetter("Month", true),
        MM: dateGetter("Month", 2, 1),
        M: dateGetter("Month", 1, 1),
        dd: dateGetter("Date", 2),
        d: dateGetter("Date", 1),
        HH: dateGetter("Hours", 2),
        H: dateGetter("Hours", 1),
        hh: dateGetter("Hours", 2, -12),
        h: dateGetter("Hours", 1, -12),
        mm: dateGetter("Minutes", 2),
        m: dateGetter("Minutes", 1),
        ss: dateGetter("Seconds", 2),
        s: dateGetter("Seconds", 1),
        sss: dateGetter("Milliseconds", 3),
        EEEE: dateStrGetter("Day"),
        EEE: dateStrGetter("Day", true),
        a: ampmGetter,
        Z: timeZoneGetter
    }
    var rdateFormat = /((?:[^yMdHhmsaZE']+)|(?:'(?:[^']|'')*')|(?:E+|y+|M+|d+|H+|h+|m+|s+|a|Z))(.*)/
    var raspnetjson = /^\/Date\((\d+)\)\/$/
    filters.date = function(date, format) {
        var locate = filters.date.locate,
                text = "",
                parts = [],
                fn, match
        format = format || "mediumDate"
        format = locate[format] || format
        if (typeof date === "string") {
            if (/^\d+$/.test(date)) {
                date = toInt(date)
            } else if (raspnetjson.test(date)) {
                date = +RegExp.$1
            } else {
                var trimDate = date.trim()
                var dateArray = [0, 0, 0, 0, 0, 0, 0]
                var oDate = new Date(0)
                //取得年月日
                trimDate = trimDate.replace(/^(\d+)\D(\d+)\D(\d+)/, function(_, a, b, c) {
                    var array = c.length === 4 ? [c, a, b] : [a, b, c]
                    dateArray[0] = toInt(array[0])     //年
                    dateArray[1] = toInt(array[1]) - 1 //月
                    dateArray[2] = toInt(array[2])     //日
                    return ""
                })
                var dateSetter = oDate.setFullYear
                var timeSetter = oDate.setHours
                trimDate = trimDate.replace(/[T\s](\d+):(\d+):?(\d+)?\.?(\d)?/, function(_, a, b, c, d) {
                    dateArray[3] = toInt(a) //小时
                    dateArray[4] = toInt(b) //分钟
                    dateArray[5] = toInt(c) //秒
                    if (d) {                //毫秒
                        dateArray[6] = Math.round(parseFloat("0." + d) * 1000)
                    }
                    return ""
                })
                var tzHour = 0
                var tzMin = 0
                trimDate = trimDate.replace(/Z|([+-])(\d\d):?(\d\d)/, function(z, symbol, c, d) {
                    dateSetter = oDate.setUTCFullYear
                    timeSetter = oDate.setUTCHours
                    if (symbol) {
                        tzHour = toInt(symbol + c)
                        tzMin = toInt(symbol + d)
                    }
                    return ""
                })

                dateArray[3] -= tzHour
                dateArray[4] -= tzMin
                dateSetter.apply(oDate, dateArray.slice(0, 3))
                timeSetter.apply(oDate, dateArray.slice(3))
                date = oDate
            }
        }
        if (typeof date === "number") {
            date = new Date(date)
        }
        if (avalon.type(date) !== "date") {
            return
        }
        while (format) {
            match = rdateFormat.exec(format)
            if (match) {
                parts = parts.concat(match.slice(1))
                format = parts.pop()
            } else {
                parts.push(format)
                format = null
            }
        }
        parts.forEach(function(value) {
            fn = DATE_FORMATS[value]
            text += fn ? fn(date, locate) : value.replace(/(^'|'$)/g, "").replace(/''/g, "'")
        })
        return text
    }
    var locate = {
        AMPMS: {
            0: "上午",
            1: "下午"
        },
        DAY: {
            0: "星期日",
            1: "星期一",
            2: "星期二",
            3: "星期三",
            4: "星期四",
            5: "星期五",
            6: "星期六"
        },
        MONTH: {
            0: "1月",
            1: "2月",
            2: "3月",
            3: "4月",
            4: "5月",
            5: "6月",
            6: "7月",
            7: "8月",
            8: "9月",
            9: "10月",
            10: "11月",
            11: "12月"
        },
        SHORTDAY: {
            "0": "周日",
            "1": "周一",
            "2": "周二",
            "3": "周三",
            "4": "周四",
            "5": "周五",
            "6": "周六"
        },
        fullDate: "y年M月d日EEEE",
        longDate: "y年M月d日",
        medium: "yyyy-M-d H:mm:ss",
        mediumDate: "yyyy-M-d",
        mediumTime: "H:mm:ss",
        "short": "yy-M-d ah:mm",
        shortDate: "yy-M-d",
        shortTime: "ah:mm"
    }
    locate.SHORTMONTH = locate.MONTH
    filters.date.locate = locate
}// jshint ignore:line
/*********************************************************************
 *                     END                                  *
 **********************************************************************/
new function () {
    avalon.config({
        loader: false
    })
    var fns = [], loaded = DOC.readyState === "complete", fn
    function flush(f) {
        loaded = 1
        while (f = fns.shift())
            f()
    }

    avalon.bind(DOC, "DOMContentLoaded", fn = function () {
        avalon.unbind(DOC, "DOMContentLoaded", fn)
        flush()
    })

    var id = setInterval(function () {
        if (document.readyState === "complete" && document.body) {
            clearInterval(id)
            flush()
        }
    }, 50)

    avalon.ready = function (fn) {
        loaded ? fn(avalon) : fns.push(fn)
    }
    avalon.ready(function () {
        avalon.scan(DOC.body)
    })
}


// Register as a named AMD module, since avalon can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase avalon is used because AMD module names are
// derived from file names, and Avalon is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of avalon, it will work.

// Note that for maximum portability, libraries that are not avalon should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. avalon is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon
    if (typeof define === "function" && define.amd) {
        define("avalon", [], function() {
            return avalon
        })
    }
// Map over avalon in case of overwrite
    var _avalon = window.avalon
    avalon.noConflict = function(deep) {
        if (deep && window.avalon === avalon) {
            window.avalon = _avalon
        }
        return avalon
    }
// Expose avalon identifiers, even in AMD
// and CommonJS for browser emulators
    if (noGlobal === void 0) {
        window.avalon = avalon
    }
    return avalon

}));
define('mmRouter/mmPromise',["avalon"], function (avalon) {
//chrome36的原生Promise还多了一个defer()静态方法，允许不通过传参就能生成Promise实例，
//另还多了一个chain(onSuccess, onFail)原型方法，意义不明
//目前，firefox24, opera19也支持原生Promise(chrome32就支持了，但需要打开开关，自36起直接可用)
//本模块提供的Promise完整实现ECMA262v6 的Promise规范
//2015.3.12 支持async属性
    function ok(val) {
        return val
    }
    function ng(e) {
        throw e
    }

    function done(onSuccess) {//添加成功回调
        return this.then(onSuccess, ng)
    }
    function fail(onFail) {//添加出错回调
        return this.then(ok, onFail)
    }
    function defer() {
        var ret = {};
        ret.promise = new this(function (resolve, reject) {
            ret.resolve = resolve
            ret.reject = reject
        });
        return ret
    }
    var msPromise = function (executor) {
        this._callbacks = []
        var me = this
        if (typeof this !== "object")
            throw new TypeError("Promises must be constructed via new")
        if (typeof executor !== "function")
            throw new TypeError("not a function")

        executor(function (value) {
            _resolve(me, value)
        }, function (reason) {
            _reject(me, reason)
        })
    }
    function fireCallbacks(promise, fn) {
        if (typeof promise.async === "boolean") {
            var isAsync = promise.async
        } else {
            isAsync = promise.async = true
        }
        if (isAsync) {
            window.setTimeout(fn, 0)
        } else {
            fn()
        }
    }
//返回一个已经处于`resolved`状态的Promise对象
    msPromise.resolve = function (value) {
        return new msPromise(function (resolve) {
            resolve(value)
        })
    }
//返回一个已经处于`rejected`状态的Promise对象
    msPromise.reject = function (reason) {
        return new msPromise(function (resolve, reject) {
            reject(reason)
        })
    }

    msPromise.prototype = {
//一个Promise对象一共有3个状态：
//- `pending`：还处在等待状态，并没有明确最终结果
//- `resolved`：任务已经完成，处在成功状态
//- `rejected`：任务已经完成，处在失败状态
        constructor: msPromise,
        _state: "pending",
        _fired: false, //判定是否已经被触发
        _fire: function (onSuccess, onFail) {
            if (this._state === "rejected") {
                if (typeof onFail === "function") {
                    onFail(this._value)
                } else {
                    throw this._value
                }
            } else {
                if (typeof onSuccess === "function") {
                    onSuccess(this._value)
                }
            }
        },
        _then: function (onSuccess, onFail) {
            if (this._fired) {//在已有Promise上添加回调
                var me = this
                fireCallbacks(me, function () {
                    me._fire(onSuccess, onFail)
                });
            } else {
                this._callbacks.push({onSuccess: onSuccess, onFail: onFail})
            }
        },
        then: function (onSuccess, onFail) {
            onSuccess = typeof onSuccess === "function" ? onSuccess : ok
            onFail = typeof onFail === "function" ? onFail : ng
            var me = this//在新的Promise上添加回调
            var nextPromise = new msPromise(function (resolve, reject) {
                me._then(function (value) {
                    try {
                        value = onSuccess(value)
                    } catch (e) {
                        // https://promisesaplus.com/#point-55
                        reject(e)
                        return
                    }
                    resolve(value)
                }, function (value) {
                    try {
                        value = onFail(value)
                    } catch (e) {
                        reject(e)
                        return
                    }
                    resolve(value)
                })
            })
            for (var i in me) {
                if (!personal[i]) {
                    nextPromise[i] = me[i]
                }
            }
            return nextPromise
        },
        "done": done,
        "catch": fail,
        "fail": fail
    }
    var personal = {
        _state: 1,
        _fired: 1,
        _value: 1,
        _callbacks: 1
    }
    function _resolve(promise, value) {//触发成功回调
        if (promise._state !== "pending")
            return;
        if (value && typeof value.then === "function") {
//thenable对象使用then，Promise实例使用_then
            var method = value instanceof msPromise ? "_then" : "then"
            value[method](function (val) {
                _transmit(promise, val, true)
            }, function (reason) {
                _transmit(promise, reason, false)
            });
        } else {
            _transmit(promise, value, true);
        }
    }
    function _reject(promise, value) {//触发失败回调
        if (promise._state !== "pending")
            return
        _transmit(promise, value, false)
    }
//改变Promise的_fired值，并保持用户传参，触发所有回调
    function _transmit(promise, value, isResolved) {
        promise._fired = true;
        promise._value = value;
        promise._state = isResolved ? "fulfilled" : "rejected"
        fireCallbacks(promise, function () {
            promise._callbacks.forEach(function (data) {
                promise._fire(data.onSuccess, data.onFail);
            })
        })
    }
    function _some(any, iterable) {
        iterable = Array.isArray(iterable) ? iterable : []
        var n = 0, result = [], end
        return new msPromise(function (resolve, reject) {
            // 空数组直接resolve
            if (!iterable.length)
                resolve(result)
            function loop(a, index) {
                a.then(function (ret) {
                    if (!end) {
                        result[index] = ret//保证回调的顺序
                        n++
                        if (any || n >= iterable.length) {
                            resolve(any ? ret : result)
                            end = true
                        }
                    }
                }, function (e) {
                    end = true
                    reject(e)
                })
            }
            for (var i = 0, l = iterable.length; i < l; i++) {
                loop(iterable[i], i)
            }
        })
    }

    msPromise.all = function (iterable) {
        return _some(false, iterable)
    }
    msPromise.race = function (iterable) {
        return _some(true, iterable)
    }
    msPromise.defer = defer



    avalon.Promise = msPromise
    var nativePromise = window.Promise
    if (/native code/.test(nativePromise)) {
        nativePromise.prototype.done = done
        nativePromise.prototype.fail = fail
        if (!nativePromise.defer) { //chrome实现的私有方法
            nativePromise.defer = defer
        }
    }
    return window.Promise = nativePromise || msPromise

})
//https://github.com/ecomfe/er/blob/master/src/Deferred.js
//http://jser.info/post/77696682011/es6-promises
;
define('mmRouter/mmHistory',["avalon"], function(avalon) {
    var anchorElement = document.createElement('a')

    var History = avalon.History = function() {
        this.location = location
    }

    History.started = false
    //取得当前IE的真实运行环境
    History.IEVersion = (function() {
        var mode = document.documentMode
        return mode ? mode : window.XMLHttpRequest ? 7 : 6
    })()

    History.defaults = {
        basepath: "/",
        html5Mode: false,
        hashPrefix: "!",
        iframeID: null, //IE6-7，如果有在页面写死了一个iframe，这样似乎刷新的时候不会丢掉之前的历史
        interval: 50, //IE6-7,使用轮询，这是其时间时隔
        fireAnchor: true,//决定是否将滚动条定位于与hash同ID的元素上
        routeElementJudger: avalon.noop // 判断a元素是否是触发router切换的链接
    }

    var oldIE = window.VBArray && History.IEVersion <= 7
    var supportPushState = !!(window.history.pushState)
    var supportHashChange = !!("onhashchange" in window && (!window.VBArray || !oldIE))
    History.prototype = {
        constructor: History,
        getFragment: function(fragment) {
            if (fragment == null) {
                if (this.monitorMode === "popstate") {
                    fragment = this.getPath()
                } else {
                    fragment = this.getHash()
                }
            }
            return fragment.replace(/^[#\/]|\s+$/g, "")
        },
        getHash: function(window) {
            // IE6直接用location.hash取hash，可能会取少一部分内容
            // 比如 http://www.cnblogs.com/rubylouvre#stream/xxxxx?lang=zh_c
            // ie6 => location.hash = #stream/xxxxx
            // 其他浏览器 => location.hash = #stream/xxxxx?lang=zh_c
            // firefox 会自作多情对hash进行decodeURIComponent
            // 又比如 http://www.cnblogs.com/rubylouvre/#!/home/q={%22thedate%22:%2220121010~20121010%22}
            // firefox 15 => #!/home/q={"thedate":"20121010~20121010"}
            // 其他浏览器 => #!/home/q={%22thedate%22:%2220121010~20121010%22}
            var path = (window || this).location.href
            return this._getHash(path.slice(path.indexOf("#")))
        },
        _getHash: function(path) {
            if (path.indexOf("#/") === 0) {
                return decodeURIComponent(path.slice(2))
            }
            if (path.indexOf("#!/") === 0) {
                return decodeURIComponent(path.slice(3))
            }
            return ""
        },
        getPath: function() {
            var path = decodeURIComponent(this.location.pathname + this.location.search)
            var root = this.basepath.slice(0, -1)
            if (!path.indexOf(root))
                path = path.slice(root.length)
            return path.slice(1)
        },
        _getAbsolutePath: function(a) {
            return !a.hasAttribute ? a.getAttribute("href", 4) : a.href
        },
        /*
         * @interface avalon.history.start 开始监听历史变化
         * @param options 配置参数
         * @param options.hashPrefix hash以什么字符串开头，默认是 "!"，对应实际效果就是"#!"
         * @param options.routeElementJudger 判断a元素是否是触发router切换的链接的函数，return true则触发切换，默认为avalon.noop，history内部有一个判定逻辑，是先判定a元素的href属性是否以hashPrefix开头，如果是则当做router切换元素，因此综合判定规则是 href.indexOf(hashPrefix) == 0 || routeElementJudger(ele, ele.href)，如果routeElementJudger返回true则跳转至href，如果返回的是字符串，则跳转至返回的字符串，如果返回false则返回浏览器默认行为
         * @param options.html5Mode 是否采用html5模式，即不使用hash来记录历史，默认false
         * @param options.fireAnchor 决定是否将滚动条定位于与hash同ID的元素上，默认为true
         * @param options.basepath 根目录，默认为"/"
         */
        start: function(options) {
            if (History.started)
                throw new Error("avalon.history has already been started")
            History.started = true
            this.options = avalon.mix({}, History.defaults, options)
            //IE6不支持maxHeight, IE7支持XMLHttpRequest, IE8支持window.Element，querySelector, 
            //IE9支持window.Node, window.HTMLElement, IE10不支持条件注释
            //确保html5Mode属性存在,并且是一个布尔
            this.html5Mode = !!this.options.html5Mode
            //监听模式
            this.monitorMode = this.html5Mode ? "popstate" : "hashchange"
            if (!supportPushState) {
                if (this.html5Mode) {
                    avalon.log("如果浏览器不支持HTML5 pushState，强制使用hash hack!")
                    this.html5Mode = false
                }
                this.monitorMode = "hashchange"
            }
            if (!supportHashChange) {
                this.monitorMode = "iframepoll"
            }
            this.prefix = "#" + this.options.hashPrefix + "/"
            //确认前后都存在斜线， 如"aaa/ --> /aaa/" , "/aaa --> /aaa/", "aaa --> /aaa/", "/ --> /"
            this.basepath = ("/" + this.options.basepath + "/").replace(/^\/+|\/+$/g, "/")  // 去最左右两边的斜线

            this.fragment = this.getFragment()

            anchorElement.href = this.basepath
            this.rootpath = this._getAbsolutePath(anchorElement)
            var that = this

            var html = '<!doctype html><html><body>@</body></html>'
            if (this.options.domain) {
                html = html.replace("<body>", "<script>document.domain =" + this.options.domain + "</script><body>")
            }
            this.iframeHTML = html
            if (this.monitorMode === "iframepoll") {
                //IE6,7在hash改变时不会产生历史，需要用一个iframe来共享历史
                avalon.ready(function() {
                    if(that.iframe) return
                    var iframe = that.iframe || document.getElementById(that.iframeID) || document.createElement('iframe')
                    iframe.src = 'javascript:0'
                    iframe.style.display = 'none'
                    iframe.tabIndex = -1
                    document.body.appendChild(iframe)
                    that.iframe = iframe.contentWindow
                    that._setIframeHistory(that.prefix + that.fragment)
                })

            }

            // 支持popstate 就监听popstate
            // 支持hashchange 就监听hashchange
            // 否则的话只能每隔一段时间进行检测了
            function checkUrl(e) {
                var iframe = that.iframe
                if (that.monitorMode === "iframepoll" && !iframe) {
                    return false
                }
                var pageHash = that.getFragment(), hash
                if (iframe) {//IE67
                    var iframeHash = that.getHash(iframe)
                    //与当前页面hash不等于之前的页面hash，这主要是用户通过点击链接引发的
                    if (pageHash !== that.fragment) {
                        that._setIframeHistory(that.prefix + pageHash)
                        hash = pageHash
                        //如果是后退按钮触发hash不一致
                    } else if (iframeHash !== that.fragment) {
                        that.location.hash = that.prefix + iframeHash
                        hash = iframeHash
                    }

                } else if (pageHash !== that.fragment) {
                    hash = pageHash
                }
                if (hash !== void 0) {
                    that.fragment = hash
                    that.fireRouteChange(hash, {fromHistory: true})
                }
            }

            //thanks https://github.com/browserstate/history.js/blob/master/scripts/uncompressed/history.html4.js#L272

            // 支持popstate 就监听popstate
            // 支持hashchange 就监听hashchange(IE8,IE9,FF3)
            // 否则的话只能每隔一段时间进行检测了(IE6, IE7)
            switch (this.monitorMode) {
                case "popstate":
                    this.checkUrl = avalon.bind(window, "popstate", checkUrl)
                    this._fireLocationChange = checkUrl
                    break
                case  "hashchange":
                    this.checkUrl = avalon.bind(window, "hashchange", checkUrl)
                    break;
                case  "iframepoll":
                    this.checkUrl = setInterval(checkUrl, this.options.interval)
                    break;
            }
            //根据当前的location立即进入不同的路由回调
            avalon.ready(function() {
                that.fireRouteChange(that.fragment || "/", {replace: true})
            })
        },
        fireRouteChange: function(hash, options) {
            var router = avalon.router
            if (router && router.navigate) {
                router.setLastPath(hash)
                router.navigate(hash === "/" ? hash : "/" + hash, options)
            }
            if (this.options.fireAnchor) {
                scrollToAnchorId(hash.replace(/\?.*/g,""))
            }
        },
        // 中断URL的监听
        stop: function() {
            avalon.unbind(window, "popstate", this.checkUrl)
            avalon.unbind(window, "hashchange", this.checkUrl)
            clearInterval(this.checkUrl)
            History.started = false
        },
        updateLocation: function(hash, options, urlHash) {
            var options = options || {},
                rp = options.replace,
                st =    options.silent
            if (this.monitorMode === "popstate") {
                // html5 mode 第一次加载的时候保留之前的hash
                var path = this.rootpath + hash + (urlHash || "")
                // html5 model包含query
                if(path != this.location.href.split("#")[0]) history[rp ? "replaceState" : "pushState"]({path: path}, document.title, path)
                if(!st) this._fireLocationChange()
            } else {
                var newHash = this.prefix + hash
                if(st && hash != this.getHash()) {
                    this._setIframeHistory(newHash, rp)
                    if(this.fragment) avalon.router.setLastPath(this.fragment)
                    this.fragment = this._getHash(newHash)
                }
                this._setHash(this.location, newHash, rp)
            }
        },
        _setHash: function(location, hash, replace){
            var href = location.href.replace(/(javascript:|#).*$/, '')
            if (replace){
                location.replace(href + hash)
            }
            else location.hash = hash
        },
        _setIframeHistory: function(hash, replace) {
            if(!this.iframe) return
            var idoc = this.iframe.document
                idoc.open()
                idoc.write(this.iframeHTML)
                idoc.close()
            this._setHash(idoc.location, hash, replace)
        }
    }

    avalon.history = new History

    //https://github.com/asual/jquery-address/blob/master/src/jquery.address.js

    //劫持页面上所有点击事件，如果事件源来自链接或其内部，
    //并且它不会跳出本页，并且以"#/"或"#!/"开头，那么触发updateLocation方法
    avalon.bind(document, "click", function(event) {
        var defaultPrevented = "defaultPrevented" in event ? event['defaultPrevented'] : event.returnValue === false,
            routeElementJudger = avalon.history.options.routeElementJudger
        if (defaultPrevented || event.ctrlKey || event.metaKey || event.which === 2)
            return
        var target = event.target
        while (target.nodeName !== "A") {
            target = target.parentNode
            if (!target || target.tagName === "BODY") {
                return
            }
        }

        if (targetIsThisWindow(target.target)) {
            var href = oldIE ? target.getAttribute("href", 2) : target.getAttribute("href") || target.getAttribute("xlink:href")
            var prefix = avalon.history.prefix
            if (href === null) { // href is null if the attribute is not present
                return
            }
            var hash = href.replace(prefix, "").trim()
            if(!(href.indexOf(prefix) === 0 && hash !== "")) {
                hash = routeElementJudger(target, href)
                if(hash === true) hash = href
            }
            if (hash) {
                event.preventDefault()
                avalon.router && avalon.router.navigate(hash)
            }
        }
    })

    //判定A标签的target属性是否指向自身
    //thanks https://github.com/quirkey/sammy/blob/master/lib/sammy.js#L219
    function targetIsThisWindow(targetWindow) {
        if (!targetWindow || targetWindow === window.name || targetWindow === '_self' || (targetWindow === 'top' && window == window.top)) {
            return true
        }
        return false
    }
    //得到页面第一个符合条件的A标签
    function getFirstAnchor(list) {
        for (var i = 0, el; el = list[i++]; ) {
            if (el.nodeName === "A") {
                return el
            }
        }
    }

    function scrollToAnchorId(hash, el) {
        if ((el = document.getElementById(hash))) {
            el.scrollIntoView()
        } else if ((el = getFirstAnchor(document.getElementsByName(hash)))) {
            el.scrollIntoView()
        } else {
            window.scrollTo(0, 0)
        }
    }
    return avalon
})

// 主要参数有 basepath  html5Mode  hashPrefix  interval domain fireAnchor;
define('mmRouter/mmRouter',["./mmHistory"], function() {

    function Router() {
        var table = {}
        "get,post,delete,put".replace(avalon.rword, function(name) {
            table[name] = []
        })
        this.routingTable = table
    }

    function parseQuery(url) {
        var array = url.split("?"), query = {}, path = array[0], querystring = array[1]
        if (querystring) {
            var seg = querystring.split("&"),
                    len = seg.length, i = 0, s;
            for (; i < len; i++) {
                if (!seg[i]) {
                    continue
                }
                s = seg[i].split("=")
                query[decodeURIComponent(s[0])] = decodeURIComponent(s[1])
            }
        }
        return {
            path: path,
            query: query
        }
    }


    function queryToString(obj) {
        if(typeof obj == 'string') return obj
        var str = []
        for(var i in obj) {
            if(i == "query") continue
            str.push(i + '=' + encodeURIComponent(obj[i]))
        }
        return str.length ? '?' + str.join("&") : ''
    }

    var placeholder = /([:*])(\w+)|\{(\w+)(?:\:((?:[^{}\\]+|\\.|\{(?:[^{}\\]+|\\.)*\})+))?\}/g
    Router.prototype = {
        error: function(callback) {
            this.errorback = callback
        },
        _pathToRegExp: function(pattern, opts) {
            var keys = opts.keys = [],
                    //      segments = opts.segments = [],
                    compiled = '^', last = 0, m, name, regexp, segment;

            while ((m = placeholder.exec(pattern))) {
                name = m[2] || m[3]; // IE[78] returns '' for unmatched groups instead of null
                regexp = m[4] || (m[1] == '*' ? '.*' : 'string')
                segment = pattern.substring(last, m.index);
                var type = this.$types[regexp]
                var key = {
                    name: name
                }
                if (type) {
                    regexp = type.pattern
                    key.decode = type.decode
                }
                keys.push(key)
                compiled += quoteRegExp(segment, regexp, false)
                //  segments.push(segment)
                last = placeholder.lastIndex
            }
            segment = pattern.substring(last);
            compiled += quoteRegExp(segment) + (opts.strict ? opts.last : "\/?") + '$';
            var sensitive = typeof opts.caseInsensitive === "boolean" ? opts.caseInsensitive : true
            //  segments.push(segment);
            opts.regexp = new RegExp(compiled, sensitive ? 'i' : undefined);
            return opts

        },
        //添加一个路由规则
        add: function(method, path, callback, opts) {
            var array = this.routingTable[method.toLowerCase()]
            if (path.charAt(0) !== "/") {
                throw "path必须以/开头"
            }
            opts = opts || {}
            opts.callback = callback
            if (path.length > 2 && path.charAt(path.length - 1) === "/") {
                path = path.slice(0, -1)
                opts.last = "/"
            }
            avalon.Array.ensure(array, this._pathToRegExp(path, opts))
        },
        //判定当前URL与已有状态对象的路由规则是否符合
        route: function(method, path, query) {
            path = path.trim()
            var states = this.routingTable[method]
            for (var i = 0, el; el = states[i++]; ) {
                var args = path.match(el.regexp)
                if (args) {
                    el.query = query || {}
                    el.path = path
                    el.params = {}
                    var keys = el.keys
                    args.shift()
                    if (keys.length) {
                        this._parseArgs(args, el)
                    }
                    return  el.callback.apply(el, args)
                }
            }
            if (this.errorback) {
                this.errorback()
            }
        },
        _parseArgs: function(match, stateObj) {
            var keys = stateObj.keys
            for (var j = 0, jn = keys.length; j < jn; j++) {
                var key = keys[j]
                var value = match[j] || ""
                if (typeof key.decode === "function") {//在这里尝试转换参数的类型
                    var val = key.decode(value)
                } else {
                    try {
                        // 大数限制
                        // 是不是应该还限制小数啊
                        if(!(value.match(/^[0-9]{17,}$/g) || value > "9007199254740992")) val = JSON.parse(value)
                    } catch (e) {
                        val = value
                    }
                }
                match[j] = stateObj.params[key.name] = val
            }
        },
        getLastPath: function() {
            return getCookie("msLastPath")
        },
        setLastPath: function(path) {
            setCookie("msLastPath", path)
        },
        /*
         *  @interface avalon.router.redirect
         *  @param hash 访问的url hash
         */
        redirect: function(hash) {
            this.navigate(hash, {replace: true})
        },
        /*
         *  @interface avalon.router.navigate
         *  @param hash 访问的url hash
         *  @param options 扩展配置
         *  @param options.replace true替换history，否则生成一条新的历史记录
         *  @param options.silent true表示只同步url，不触发url变化监听绑定
        */
        navigate: function(hash, options) {
            var parsed = parseQuery((hash.charAt(0) !== "/" ? "/" : "") + hash),
                options = options || {}
            if(hash.charAt(0) === "/")
                hash = hash.slice(1)// 修正出现多扛的情况 fix http://localhost:8383/mmRouter/index.html#!//
            // 在state之内有写history的逻辑
            if(!avalon.state || options.silent) avalon.history && avalon.history.updateLocation(hash, avalon.mix({}, options, {silent: true}))
            // 只是写历史而已
            if(!options.silent) {
                this.route("get", parsed.path, parsed.query, options)
            }
        },
        /*
         *  @interface avalon.router.when 配置重定向规则
         *  @param path 被重定向的表达式，可以是字符串或者数组
         *  @param redirect 重定向的表示式或者url
        */
        when: function(path, redirect) {
            var me = this,
                path = path instanceof Array ? path : [path]
            avalon.each(path, function(index, p) {
                me.add("get", p, function() {
                    var info = me.urlFormate(redirect, this.params, this.query)
                    me.navigate(info.path + info.query, {replace: true})
                })
            })
            return this
        },
        /*
         *  @interface avalon.router.get 添加一个router规则
         *  @param path url表达式
         *  @param callback 对应这个url的回调
        */
        get: function(path, callback) {},
        urlFormate: function(url, params, query) {
            var query = query ? queryToString(query) : "",
                hash = url.replace(placeholder, function(mat) {
                    var key = mat.replace(/[\{\}]/g, '').split(":")
                    key = key[0] ? key[0] : key[1]
                    return key in params ? params[key] : ''
                }).replace(/^\//g, '')
            return {
                path: hash,
                query: query
            }
        },
        /* *
         `'/hello/'` - 匹配'/hello/'或'/hello'
         `'/user/:id'` - 匹配 '/user/bob' 或 '/user/1234!!!' 或 '/user/' 但不匹配 '/user' 与 '/user/bob/details'
         `'/user/{id}'` - 同上
         `'/user/{id:[^/]*}'` - 同上
         `'/user/{id:[0-9a-fA-F]{1,8}}'` - 要求ID匹配/[0-9a-fA-F]{1,8}/这个子正则
         `'/files/{path:.*}'` - Matches any URL starting with '/files/' and captures the rest of the
         path into the parameter 'path'.
         `'/files/*path'` - ditto.
         */
        // avalon.router.get("/ddd/:dddID/",callback)
        // avalon.router.get("/ddd/{dddID}/",callback)
        // avalon.router.get("/ddd/{dddID:[0-9]{4}}/",callback)
        // avalon.router.get("/ddd/{dddID:int}/",callback)
        // 我们甚至可以在这里添加新的类型，avalon.router.$type.d4 = { pattern: '[0-9]{4}', decode: Number}
        // avalon.router.get("/ddd/{dddID:d4}/",callback)
        $types: {
            date: {
                pattern: "[0-9]{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2][0-9]|3[0-1])",
                decode: function(val) {
                    return new Date(val.replace(/\-/g, "/"))
                }
            },
            string: {
                pattern: "[^\\/]*"
            },
            bool: {
                decode: function(val) {
                    return parseInt(val, 10) === 0 ? false : true;
                },
                pattern: "0|1"
            },
            int: {
                decode: function(val) {
                    return parseInt(val, 10);
                },
                pattern: "\\d+"
            }
        }
    }

    "get,put,delete,post".replace(avalon.rword, function(method) {
        return  Router.prototype[method] = function(a, b, c) {
            this.add(method, a, b, c)
        }
    })
    function quoteRegExp(string, pattern, isOptional) {
        var result = string.replace(/[\\\[\]\^$*+?.()|{}]/g, "\\$&");
        if (!pattern)
            return result;
        var flag = isOptional ? '?' : '';
        return result + flag + '(' + pattern + ')' + flag;
    }
    function supportLocalStorage() {
        try {
            localStorage.setItem("avalon", 1)
            localStorage.removeItem("avalon")
            return true
        } catch (e) {
            return false
        }
    }

    if (supportLocalStorage()) {
        Router.prototype.getLastPath = function() {
            return localStorage.getItem("msLastPath")
        }
        var cookieID
        Router.prototype.setLastPath = function (path) {
            if (cookieID) {
                clearTimeout(cookieID)
                cookieID = null
            }
            localStorage.setItem("msLastPath", path)
            cookieID = setTimeout(function () {
                localStorage.removItem("msLastPath")
            }, 1000 * 60 * 60 * 24)
        }
    }

       

    function escapeCookie(value) {
        return String(value).replace(/[,;"\\=\s%]/g, function(character) {
            return encodeURIComponent(character)
        });
    }
    function setCookie(key, value) {
        var date = new Date()//将date设置为1天以后的时间 
        date.setTime(date.getTime() + 1000 * 60 * 60 * 24)
        document.cookie = escapeCookie(key) + '=' + escapeCookie(value) + ";expires=" + date.toGMTString()
    }
    function getCookie(name) {
        var m = String(document.cookie).match(new RegExp('(?:^| )' + name + '(?:(?:=([^;]*))|;|$)')) || ["", ""]
        return decodeURIComponent(m[1])
    }

    avalon.router = new Router

    return avalon
})
/*
 <!DOCTYPE html>
 <html>
 <head>
 <meta charset="utf-8">
 <title>路由系统</title>
 <script src="avalon.js"></script>
 <script>
 require(["mmRouter"], function() {
 var model = avalon.define('xxx', function(vm) {
 vm.currPath = ""
 })
 avalon.router.get("/aaa", function(a) {
 model.currPath = this.path
 })
 avalon.router.get("/bbb", function(a) {
 model.currPath = this.path
 })
 avalon.router.get("/ccc", function(a) {
 model.currPath = this.path
 })
 avalon.router.get("/ddd/:ddd", function(a) {//:ddd为参数
 avalon.log(a)
 model.currPath = this.path
 })
 avalon.router.get("/eee", function(a) {
 model.currPath = this.path
 })
 avalon.history.start({
 html5Mode: true,
 basepath: "/avalon"
 })
 avalon.scan()
 })
 </script>
 </head>
 <body >
 <div ms-controller="xxx">
 <ul>
 <li><a href="#!/aaa">aaa</a></li>
 <li><a href="#!/bbb">bbb</a></li>
 <li><a href="#!/ccc">ccc</a></li>
 <li><a href="#!/ddd/222">ddd</a></li>
 <li><a href="#!/eee">eee</a></li>
 </ul>
 <div style="color:red">{{currPath}}</div>
 <div style="height: 600px;width:1px;">
 
 </div>
 <p id="eee">会定位到这里</p>
 </div>
 
 </body>
 </html>
 
 */;
/**
 * verson 0.9
 */
define('mmRouter/mmState',["./mmPromise", "./mmRouter"], function () {
//重写mmRouter中的route方法     
    avalon.router.route = function (method, path, query, options) {
        path = path.trim()
        var states = this.routingTable[method]
        for (var i = 0, el; el = states[i++]; ) {//el为一个个状态对象，状态对象的callback总是返回一个Promise
            var args = path.match(el.regexp)
            if (args && el.abstract !== true) {//不能是抽象状态
                var newParams = {params: {}}
                avalon.mix(newParams.params, el.params)
                newParams.keys = el.keys
                newParams.params.query = query || {}
                args.shift()
                if (el.keys.length) {
                    this._parseArgs(args, newParams)
                }
                if (el.stateName) {
                    mmState.transitionTo(mmState.currentState, el, newParams.params, options)
                } else {
                    el.callback.apply(el, args)
                }
                return
            }
        }
        if (this.errorback) {
            this.errorback()
        }
    }
    var _root, undefine, _controllers = {}, _states = {}
    /*
     *  @interface avalon.router.go 跳转到一个已定义状态上，params对参数对象
     *  @param toName 状态name
     *  @param params 附加参数
     *  @param params.query 在hash后面附加的类似search的参数对
     *  @param options 扩展配置
     *  @param options.reload true强制reload，即便url、参数并未发生变化
     *  @param options.replace true替换history，否则生成一条新的历史记录
     *  @param options.confirmed true不触发onBeforeUnload,$onBeforeUnload,onBeforeExit
     */
    avalon.router.go = function (toName, params, options) {
        var from = mmState.currentState,
                to = StateModel.is(toName) ? toName : getStateByName(toName),
                params = params || {}
        var params = avalon.mix(true, {}, to.params, params)
        if (to) {
            mmState.transitionTo(from, to, params, options)
        }
    }
    // 事件管理器
    var Event = window.$eventManager = avalon.define({
        $id: "$eventManager",
        $flag: 0,
        uiqKey: function () {
            Event.$flag++
            return "flag" + Event.$flag++
        }
    })
    function removeOld() {
        var nodes = mmState.oldNodes
        while (nodes.length) {
            var i = nodes.length - 1,
                    node = nodes[i]
            node.parentNode && node.parentNode.removeChild(node)
            nodes.splice(i, 1)
            node = null
        }
    }
    Event.$watch("onAbort", removeOld)
    var mmState = window.mmState = {
        prevState: NaN,
        currentState: NaN, // 当前状态，可能还未切换到该状态
        activeState: NaN, // 当前实际处于的状态
        oldNodes: [],
        query: {}, // 从属于currentState
        popOne: function (chain, params, callback, notConfirmed) {
            if (mmState._toParams !== params)
                return callback(false, {type: "abort"})
            var cur = chain.pop(), me = this
            if (!cur)
                return callback()
            // 阻止退出
            if (notConfirmed && cur.onBeforeExit() === false)
                return callback(false)
            me.activeState = cur.parentState || _root
            cur.done = function (success) {
                cur._pending = false
                cur.done = null
                cur._local = null
                if (success !== false) {
                    if (me.activeState)
                        return me.popOne(chain, params, callback, notConfirmed)
                }
                return callback(success)
            }
            var success = cur.onExit()
            if (!cur._pending && cur.done)
                cur.done(success)
        },
        pushOne: function (chain, params, callback, _local, toLocals) {
            if (mmState._toParams !== params)
                return callback(false, {type: "abort"})
            var cur = chain.shift(), me = this
            // 退出
            if (!cur) {
                chain = null
                return callback()
            }
            cur.syncParams(params)
            // 阻止进入该状态
            if (cur.onBeforeEnter() === false) {
                // 恢复params
                cur.syncParams(cur.oldParams)
                return callback(false)
            }
            var _local = inherit(_local)
            me.activeState = cur // 更新当前实际处于的状态
            cur.done = function (success) {
                // 防止async处触发已经销毁的done
                if (!cur.done)
                    return
                cur._pending = false
                cur.done = null
                cur.visited = true
                // 退出
                if (success === false) {
                    // 这里斟酌一下 - 去掉
                    // cur.callback.apply(cur, [params, _local])
                    return callback(success)
                }
                var resolved = cur.callback.apply(cur, [params, _local])
                resolved.$then(function (res) {
                    // sync params to oldParams
                    avalon.mix(true, cur.oldParams, cur.params)
                    // 继续状态链
                    me.pushOne(chain, params, callback, _local)
                })
            }
            // 一般在这个回调里准备数据
            var args = []
            avalon.each(cur.keys, function (index, item) {
                var key = item.name
                args.push(cur.params[key])
            })
            cur._onEnter.apply(cur, args)
            if (!cur._pending && cur.done)
                cur.done()
        },
        transitionTo: function (fromState, toState, toParams, options) {
            var toParams = toParams || toState.params, fromAbort
            // state machine on transition
            if (this.activeState && (this.activeState != this.currentState)) {
                avalon.log("navigating to [" +
                        this.currentState.stateName +
                        "] will be stopped, redirect to [" +
                        toState.stateName + "] now")
                this.activeState.done && this.activeState.done(!"stopped")
                fromState = this.activeState // 更新实际的fromState
                fromAbort = true
            }
            mmState.oldNodes = []
            var info = avalon.router.urlFormate(toState.url, toParams, toParams.query),
                    me = this,
                    options = options || {},
                    // 是否强制reload，参照angular，这个时候会触发整个页面重刷
                    reload = options.reload,
                    over,
                    fromChain = fromState && fromState.chain || [],
                    toChain = toState.chain,
                    i = 0,
                    changeType, // 是params变化？query变化？这个东西可以用来配置是否屏蔽视图刷新逻辑
                    state = toChain[i],
                    _local = _root.sourceLocal,
                    toLocals = []
            // 初始化可能存在的异步state
            var modulesToLoad = [],
                modulesToLoadObj = {},
                chains = [].concat(fromChain).concat(toChain)
            avalon.each(chains, function(i, state) {
                var stateUrl = state.stateUrl
                if (stateUrl) {
                    state._stateUrl = stateUrl
                    delete state.stateUrl
                    if (!(stateUrl in modulesToLoadObj)) {
                        modulesToLoadObj[stateUrl] = ''
                        modulesToLoad.push(getPromise(function (rs, rj) {
                            avalon.controller.loader(stateUrl, function(stateConfig) {
                                avalon.mix(state, stateConfig)
                                state.initViewsConfig()
                                rs()
                            })
                        }))
                    }
                }
            })
            chains = modulesToLoadObj = null

            getPromise(modulesToLoad).then(function() {
                if (!reload) {
                    // 找到共有父状态chain，params未变化
                    while (state && state === fromChain[i] && !state.paramsChanged(toParams)) {
                        _local = toLocals[i] = state._local
                        i++
                        state = toChain[i]
                    }
                }
                var exitChain = fromChain.slice(i), // 需要退出的chain
                        enterChain = toChain.slice(i), // 需要进入的chain
                        commonLocal = _local
                // 建立toLocals，用来计算哪些view会被替换
                while (state = toChain[i]) {
                    _local = toLocals[i] = inherit(_local, state.sourceLocal)
                    i++
                }
                mmState._local = _local
                done = function (success, e) {
                    if (over)
                        return
                    over = true
                    me.currentState = me.activeState
                    enterChain = exitChain = commonLocal = _local = toParams = null
                    mmState.oldNodes = []
                    if (success !== false) {
                        mmState.lastLocal = mmState.currentState._local
                        _root.fire("updateview", me.currentState, changeType)
                        avalon.log("transitionTo " + toState.stateName + " success")
                        callStateFunc("onLoad", me, fromState, toState)
                    } else {
                        return callStateFunc("onError", me, {
                            type: "transition",
                            message: "transitionTo " + toState.stateName + " faild",
                            error: e,
                            fromState: fromState,
                            toState: toState,
                            params: toParams
                        }, me.currentState)
                    }
                }
                toState.path = ("/" + info.path).replace(/^[\/]{2,}/g, "/")
                if (!reload && fromState === toState) {
                    changeType = toState.paramsChanged(toParams)
                    if (!changeType) {
                        // redirect的目的状态 == me.activeState && abort
                        if (toState == me.activeState && fromAbort)
                            return done()
                        // 重复点击直接return
                        return
                    }
                }

                mmState.query = avalon.mix({}, toParams.query)

                // onBeforeUnload check
                if (options && !options.confirmed && (callStateFunc("onBeforeUnload", me, fromState, toState) === false || broadCastBeforeUnload(exitChain, enterChain, fromState, toState) === false)) {
                    return callStateFunc("onAbort", me, fromState, toState)
                }
                if (over === true) {
                    return
                }
                avalon.log("begin transitionTo " + toState.stateName + " from " + (fromState && fromState.stateName || "unknown"))
                callStateFunc("onUnload", me, fromState, toState)
                me.currentState = toState
                me.prevState = fromState
                mmState._toParams = toParams
                if (info && avalon.history) {
                    if (avalon.history.updateLocation) {
                        avalon.history.updateLocation(info.path + info.query,
                                avalon.mix({silent: true}, options), !fromState && location.hash)
                    } else {
                        avalon.history.navigate(info.path + info.query,
                                avalon.mix({silent: true}, options))
                    }
                }
                callStateFunc("onBegin", me, fromState, toState)
                me.popOne(exitChain, toParams, function (success) {
                    // 中断
                    if (success === false)
                        return done(success)
                    me.pushOne(enterChain, toParams, done, commonLocal, toLocals)
                }, !(options && options.confirmed))
            }, function() {
                throw new Error('加载stateUrl资源失败')
            })
        }
    }
    //将template,templateUrl,templateProvider等属性从opts对象拷贝到新生成的view对象上的
    function copyTemplateProperty(newObj, oldObj, name) {
        if (name in oldObj) {
            newObj[name] = oldObj[name]
            delete  oldObj[name]
        }
    }
    function getCacheContainer() {
        return document.getElementsByTagName("avalon")[0]
    }
    var templateCache = {},
            cacheContainer = getCacheContainer()
    function loadCache(name) {
        var fragment = document.createDocumentFragment(),
                divPlaceHolder = document.getElementById(name),
                f,
                eles = divPlaceHolder.eles,
                i = 0
        if (divPlaceHolder) {
            while (f = eles[i]) {
                fragment.appendChild(f)
                i++
            }
        }
        return fragment
    }
    function setCache(name, element) {
        var fragment = document.createDocumentFragment(),
                divPlaceHolder = document.getElementById(name),
                f
        if (!divPlaceHolder) {
            divPlaceHolder = document.createElement("div")
            divPlaceHolder.id = name
            cacheContainer.appendChild(divPlaceHolder)
        }
        // 引用
        if (divPlaceHolder.eles) {
            avalon.each(divPlaceHolder.eles, function (index, ele) {
                fragment.appendChild(ele)
            })
        } else {
            divPlaceHolder.eles = []
            while (f = element.firstChild) {
                fragment.appendChild(f)
                divPlaceHolder.eles.push(f)
            }
            templateCache[name] = true
        }
        divPlaceHolder.appendChild(fragment)
    }
    function broadCastBeforeUnload(exitChain, enterChain, fromState, toState) {
        var lastLocal = mmState.lastLocal
        if (!lastLocal || !enterChain[0] && !exitChain[0])
            return
        var newLocal = mmState._local,
                cacheQueue = []
        for (var i in lastLocal) {
            var local = lastLocal[i]
            // 所有被更新的view
            if (!(i in newLocal) || newLocal[i] != local) {
                if (local.$ctrl && ("$onBeforeUnload" in local.$ctrl)) {
                    if (local.$ctrl.$onBeforeUnload(fromState, toState) === false)
                        return false
                }
                if (local.element && (exitChain[0] != enterChain[0]))
                    cacheQueue.push(local)
            }
        }
        avalon.each(cacheQueue, function (index, local) {
            var ele = local.element,
                    name = avalon(ele).data("currentCache")
            if (name) {
                setCache(name, ele)
            }
        })
        cacheQueue = null
    }
    // 靠谱的解决方法
    avalon.bindingHandlers.view = function (data) {
        data.expr = "'" + (data.expr || "") + "'"
        var vmodels = data.vmodels || arguments[1]
        var currentState = mmState.currentState,
                element = data.element,
                $element = avalon(element),
                viewname = (data.value || data.expr || "").replace(/['"]+/g, ""),
                comment = document.createComment("ms-view:" + viewname),
                par = element.parentNode,
                defaultHTML = element.innerHTML,
                statename = $element.data("statename") || "",
                parentState = getStateByName(statename) || _root,
                currentLocal = {},
                oldElement = element,
                tpl = element.outerHTML
        element.removeAttribute("ms-view") // remove right now
        par.insertBefore(comment, element)
        function update(firsttime, currentState, changeType) {
            // node removed, remove callback
            if (!document.contains(comment)) {
                data = vmodels = element = par = comment = $element = oldElement = update = null
                return !"delete from watch"
            }
            var definedParentStateName = $element.data("statename") || "",
                    parentState = getStateByName(definedParentStateName) || _root,
                    _local
            if (viewname.indexOf("@") < 0)
                viewname += "@" + parentState.stateName
            _local = mmState.currentState._local && mmState.currentState._local[viewname]
            if (firsttime && !_local || currentLocal === _local)
                return
            currentLocal = _local
            var _currentState = _local && _local.state
            // 缓存，如果加载dom上，则是全局配置，针对template还可以开一个单独配置
            var cacheTpl = $element.data("viewCache"),
                    lastCache = $element.data("currentCache")
            if (_local) {
                cacheTpl = (_local.viewCache === false ? false : _local.viewCache || cacheTpl) && (viewname + "@" + (_currentState && _currentState.stateName || ""))
            } else if (cacheTpl) {
                cacheTpl = viewname + "@__default__"
            }
            // stateB->stateB，配置了参数变化不更新dom
            if (_local && _currentState === currentState && _local.ignoreChange && _local.ignoreChange(changeType, viewname))
                return
            // 需要load和使用的cache是一份
            if (cacheTpl && cacheTpl === lastCache)
                return
            compileNode(tpl, element, $element, _currentState)
            var html = _local ? _local.template : defaultHTML,
                    fragment
            if (cacheTpl) {
                if (_local) {
                    _local.element = element
                } else {
                    mmState.currentState._local[viewname] = {
                        state: mmState.currentState,
                        template: defaultHTML,
                        element: element
                    }
                }
            }
            avalon.clearHTML(element)
            // oldElement = element
            element.removeAttribute("ms-view")
            element.setAttribute("ui-view", data.value || data.expr || "")
            // 本次更新的dom需要用缓存
            if (cacheTpl) {
                // 已缓存
                if (templateCache[cacheTpl]) {
                    fragment = loadCache(cacheTpl)
                    // 未缓存
                } else {
                    fragment = avalon.parseHTML(html)
                }
                element.appendChild(fragment)
                // 更新现在使用的cache名字
                $element.data("currentCache", cacheTpl)
                if (templateCache[cacheTpl])
                    return
            } else {
                element.innerHTML = html
                $element.data("currentCache", false)
            }
            // default
            if (!_local && cacheTpl)
                $element.data("currentCache", cacheTpl)
            avalon.each(getViewNodes(element), function (i, node) {
                avalon(node).data("statename", _currentState && _currentState.stateName || "")
            })
            // merge上下文vmodels + controller指定的vmodels
            avalon.scan(element, (_local && _local.vmodels || []).concat(vmodels || []))
            // 触发视图绑定的controller的事件
            if (_local && _local.$ctrl) {
                _local.$ctrl.$onRendered && _local.$ctrl.$onRendered.apply(element, [_local])
            }
        }
        update("firsttime")
        _root.watch("updateview", function (state, changeType) {
            return update.call(this, undefine, state, changeType)
        })
    }
    if (avalon.directives) {
        avalon.directive("view", {
            init: avalon.bindingHandlers.view
        })
    }
    function compileNode(tpl, element, $element, _currentState) {
        if ($element.hasClass("oni-mmRouter-slide")) {
            // 拷贝一个镜像
            var copy = element.cloneNode(true)
            copy.setAttribute("ms-skip", "true")
            avalon(copy).removeClass("oni-mmRouter-enter").addClass("oni-mmRouter-leave")
            avalon(element).addClass("oni-mmRouter-enter")
            element.parentNode.insertBefore(copy, element)
            mmState.oldNodes.push(copy)
            callStateFunc("onViewEnter", _currentState, element, copy)
        }
        return element
    }

    function inherit(parent, extra) {
        return avalon.mix(new (avalon.mix(function () {
        }, {prototype: parent}))(), extra);
    }

    /*
     * @interface avalon.state 对avalon.router.get 进行重新封装，生成一个状态对象
     * @param stateName 指定当前状态名
     * @param opts 配置
     * @param opts.url  当前状态对应的路径规则，与祖先状态们组成一个完整的匹配规则
     * @param {Function} opts.ignoreChange 当mmState.currentState == this时，更新视图的时候调用该函数，return true mmRouter则不会去重写视图和scan，请确保该视图内用到的数据没有放到avalon vmodel $skipArray内
     * @param opts.controller 如果不写views属性,则默认view为""，为默认的view指定一个控制器，该配置会直接作为avalon.controller的参数生成一个$ctrl对象
     * @param opts.controllerUrl 指定默认view控制器的路径，适用于模块化开发，该情形下默认通过avalon.controller.loader去加载一个符合amd规范，并返回一个avalon.controller定义的对象，传入opts.params作参数
     * @param opts.controllerProvider 指定默认view控制器的提供者，它可以是一个Promise，也可以为一个函数，传入opts.params作参数
     @param opts.viewCache 是否缓存这个模板生成的dom，设置会覆盖dom元素上的data-view-cache，也可以分别配置到views上每个单独的view上
     * @param opts.views: 如果不写views属性,则默认view【ms-view=""】为""，也可以通过指定一个viewname属性来配置【ms-view="viewname"】，对多个[ms-view]容器进行处理,每个对象应拥有template, templateUrl, templateProvider，可以给每个对象搭配一个controller||controllerUrl||controllerProvider属性
     *     views的结构为
     *<pre>
     *     {
     *        "": {template: "xxx"}
     *        "aaa": {template: "xxx"}
     *        "bbb@": {template: "xxx"}
     *     }
     *</pre>
     *     views的每个键名(keyname)的结构为viewname@statename，
     *         如果名字不存在@，则viewname直接为keyname，statename为opts.stateName
     *         如果名字存在@, viewname为match[0], statename为match[1]
     * @param opts.views.{viewname}.template 指定当前模板，也可以为一个函数，传入opts.params作参数，* @param opts.views.viewname.cacheController 是否缓存view的控制器，默认true
     * @param opts.views.{viewname}.templateUrl 指定当前模板的路径，也可以为一个函数，传入opts.params作参数
     * @param opts.views.{viewname}.templateProvider 指定当前模板的提供者，它可以是一个Promise，也可以为一个函数，传入opts.params作参数
     * @param opts.views.{viewname}.ignoreChange 用法同state.ignoreChange，只是针对的粒度更细一些，针对到具体的view
     * @param {Function} opts.onBeforeEnter 切入某个state之前触发，this指向对应的state，如果return false则会中断并退出整个状态机
     * @param {Function} opts.onEnter 进入状态触发，可以返回false，或任意不为true的错误信息或一个promise对象，用法跟视图的$onEnter一致
     * @param {Function} onEnter.params 视图所属的state的参数
     * @param {Function} onEnter.resolve $onEnter return false的时候，进入同步等待，直到手动调用resolve
     * @param {Function} onEnter.reject 数据加载失败，调用
     * @param {Function} opts.onBeforeExit state退出前触发，this指向对应的state，如果return false则会中断并退出整个状态机
     * @param {Function} opts.onExit 退出后触发，this指向对应的state
     * @param opts.ignoreChange.changeType 值为"param"，表示params变化，值为"query"，表示query变化
     * @param opts.ignoreChange.viewname 关联的ms-view name
     * @param opts.abstract  表示它不参与匹配，this指向对应的state
     * @param {private} opts.parentState 父状态对象（框架内部生成）
     */
    avalon.state = function (stateName, opts) {
        var state = StateModel(stateName, opts)
        avalon.router.get(state.url, function (params, _local) {
            var me = this, promises = [], _resovle, _reject, _data = [], _callbacks = []
            state.resolved = getPromise(function (rs, rj) {
                _resovle = rs
                _reject = rj
            })
            avalon.each(state.views, function (name, view) {
                var params = me.params,
                        reason = {
                            type: "view",
                            name: name,
                            params: params,
                            state: state,
                            view: view
                        },
                viewLocal = _local[name] = {
                    name: name,
                    state: state,
                    params: state.filterParams(params),
                    ignoreChange: "ignoreChange" in view ? view.ignoreChange : me.ignoreChange,
                    viewCache: "viewCache" in view ? view.viewCache : me.viewCache
                },
                promise = fromPromise(view, params, reason)
                promises.push(promise)
                // template不能cache
                promise.then(function (s) {
                    viewLocal.template = s
                }, avalon.noop) // 捕获模板报错
                var prom,
                        callback = function ($ctrl) {
                            viewLocal.vmodels = $ctrl.$vmodels
                            view.$controller = viewLocal.$ctrl = $ctrl
                            resolveData()
                        },
                        resolveData = function () {
                            var $onEnter = view.$controller && view.$controller.$onEnter
                            if ($onEnter) {
                                var innerProm = getPromise(function (rs, rj) {
                                    var reason = {
                                        type: "data",
                                        state: state,
                                        params: params
                                    },
                                    res = $onEnter(params, rs, function (message) {
                                        reason.message = message
                                        rj(reason)
                                    })
                                    // if promise
                                    if (res && res.then) {
                                        _data.push(res)
                                        res.then(function () {
                                            rs(res)
                                        })
                                        // error msg
                                    } else if (res && res !== true) {
                                        reason.message = res
                                        rj(reason)
                                    } else if (res === undefine) {
                                        rs()
                                    }
                                    // res === false will pause here
                                })
                                innerProm = innerProm.then(function (cb) {
                                    avalon.isFunction(cb) && _callbacks.push(cb)
                                })
                                _data.push(innerProm)
                            }
                        }
                // controller似乎可以缓存着
                if (view.$controller && view.cacheController !== false) {
                    return callback(view.$controller)
                }
                // 加载controller模块
                if (view.controller) {
                    prom = promise.then(function () {
                        callback(avalon.controller(view.controller))
                    })
                } else if (view.controllerUrl) {
                    prom = getPromise(function (rs, rj) {
                        var url = avalon.isFunction(view.controllerUrl) ? view.controllerUrl(params) : view.controllerUrl
                        url = url instanceof Array ? url : [url]
                        avalon.controller.loader(url, function ($ctrl) {
                            promise.then(function () {
                                callback($ctrl)
                                rs()
                            })
                        })
                    })
                } else if (view.controllerProvider) {
                    var res = avalon.isFunction(view.controllerProvider) ? view.controllerProvider(params) : view.controllerProvider
                    prom = getPromise(function (rs, rj) {
                        // if promise
                        if (res && res.then) {
                            _data.push(res)
                            res.then(function (r) {
                                promise.then(function () {
                                    callback(r)
                                    rs()
                                })
                            }, function (e) {
                                reason.message = e
                                rj(reason)
                            })
                            // error msg
                        } else {
                            promise.then(function () {
                                callback(res)
                                rs()
                            })
                        }
                    })
                }
                // is promise
                if (prom && prom.then) {
                    promises.push(prom)
                }
            })
            // 模板和controller就绪
            getPromise(promises).$then(function (values) {
                state._local = _local
                // 数据就绪
                getPromise(_data).$then(function () {
                    avalon.each(_callbacks, function (i, func) {
                        func()
                    })
                    promises = _data = _callbacks = null
                    _resovle()
                })
            })
            return state.resolved

        }, state)

        return this
    }

    function isError(e) {
        return e instanceof Error
    }

    // 将所有的promise error适配到这里来
    function promiseError(e) {
        if (isError(e)) {
            throw e
        } else {
            callStateFunc("onError", mmState, e, e && e.state)
        }
    }

    function getPromise(excutor) {
        var prom = avalon.isFunction(excutor) ? new Promise(excutor) : Promise.all(excutor)
        return prom
    }
    Promise.prototype.$then = function (onFulfilled, onRejected) {
        var prom = this.then(onFulfilled, onRejected)
        prom["catch"](promiseError)
        return prom
    }
    avalon.state.onViewEntered = function (newNode, oldNode) {
        if (newNode != oldNode)
            oldNode.parentNode.removeChild(oldNode)
    }
    /*
     *  @interface avalon.state.config 全局配置
     *  @param {Object} config 配置对象
     *  @param {Function} config.onBeforeUnload 开始切前的回调，this指向router对象，第一个参数是fromState，第二个参数是toState，return false可以用来阻止切换进行
     *  @param {Function} config.onAbort onBeforeUnload return false之后，触发的回调，this指向mmState对象，参数同onBeforeUnload
     *  @param {Function} config.onUnload url切换时候触发，this指向mmState对象，参数同onBeforeUnload
     *  @param {Function} config.onBegin  开始切换的回调，this指向mmState对象，参数同onBeforeUnload，如果配置了onBegin，则忽略begin
     *  @param {Function} config.onLoad 切换完成并成功，this指向mmState对象，参数同onBeforeUnload
     *  @param {Function} config.onViewEnter 视图插入动画函数，有一个默认效果
     *  @param {Node} config.onViewEnter.arguments[0] 新视图节点
     *  @param {Node} config.onViewEnter.arguments[1] 旧的节点
     *  @param {Function} config.onError 出错的回调，this指向对应的state，第一个参数是一个object，object.type表示出错的类型，比如view表示加载出错，object.name则对应出错的view name，object.xhr则是当使用默认模板加载器的时候的httpRequest对象，第二个参数是对应的state
     */
    avalon.state.config = function (config) {
        avalon.mix(avalon.state, config || {})
        return avalon
    }
    function callStateFunc(name, state) {
        Event.$fire.apply(Event, arguments)
        return avalon.state[name] ? avalon.state[name].apply(state || mmState.currentState, [].slice.call(arguments, 2)) : 0
    }
    // 状态原型，所有的状态都要继承这个原型
    function StateModel(stateName, options) {
        if (this instanceof StateModel) {
            this.stateName = stateName
            this.formate(options)
        } else {
            var state = _states[stateName] = new StateModel(stateName, options || {})
            return state
        }
    }
    StateModel.is = function (state) {
        return state instanceof StateModel
    }
    StateModel.prototype = {
        formate: function (options) {
            avalon.mix(true, this, options)
            var stateName = this.stateName,
                me = this,
                chain = stateName.split("."),
                len = chain.length - 1/*,
                sourceLocal = me.sourceLocal = {}*/
            this.chain = []
            avalon.each(chain, function (key, name) {
                if (key == len) {
                    me.chain.push(me)
                } else {
                    var n = chain.slice(0, key + 1).join("."),
                            state = getStateByName(n)
                    if (!state)
                        throw new Error("必须先定义" + n)
                    me.chain.push(state)
                }
            })
            if (this.url === void 0) {
                this.abstract = true
            }
            var _parent = this.chain[len - 1] || _root
            if (_parent) {
                this.url = _parent.url + (this.url || "")
                this.parentState = _parent
            }
            // state的views等属性需要异步按需加载
            if (!this.stateUrl) this.initViewsConfig()
            this._self = options
            this._pending = false
            this.visited = false
            this.params = inherit(_parent && _parent.params || {})
            this.oldParams = {}
            this.keys = []

            this.events = {}
        },
        initViewsConfig: function () {
            var me = this,
                sourceLocal = this.sourceLocal = {},
                stateName = this.statename,
                _parent = this.parentState
            if (!this.views && stateName != "") {
                var view = {}
                "template,templateUrl,templateProvider,controller,controllerUrl,controllerProvider,viewCache".replace(/\w+/g, function (prop) {
                    copyTemplateProperty(view, me, prop)
                })
                var viewname = "viewname" in this ? this.viewname : ""
                this.views = {}
                this.views[viewname] = view
            }
            var views = {},
                viewsIsArray = this.views instanceof Array // 如果是一个数组

            avalon.each(this.views, function (maybeName, view) {
                var name = viewsIsArray ? view.name || "" : maybeName // 默认缺省
                if (name.indexOf("@") < 0) {
                    name += "@" + (_parent ? _parent.stateName || "" : "")
                }
                views[name] = view
                sourceLocal[name] = {}
            })
            this.views = views
        },
        watch: function (eventName, func) {
            var events = this.events[eventName] || []
            this.events[eventName] = events
            events.push(func)
            return func
        },
        fire: function (eventName, state) {
            var events = this.events[eventName] || [], i = 0
            while (events[i]) {
                var res = events[i].apply(this, [].slice.call(arguments, 1))
                if (res === false) {
                    events.splice(i, 1)
                } else {
                    i++
                }
            }
        },
        unwatch: function (eventName, func) {
            var events = this.events[eventName]
            if (!events)
                return
            var i = 0
            while (events[i]) {
                if (events[i] == func)
                    return events.splice(i, 1)
                i++
            }
        },
        paramsChanged: function (toParams) {
            var changed = false, keys = this.keys, me = this, params = this.params
            avalon.each(keys, function (index, item) {
                var key = item.name
                if (params[key] != toParams[key])
                    changed = "param"
            })
            // query
            if (!changed && mmState.currentState === this) {
                changed = !objectCompare(toParams.query, mmState.query) && "query"
            }
            return changed
        },
        filterParams: function (toParams) {
            var params = avalon.mix(true, {}, this.params), keys = this.keys
            avalon.each(keys, function (index, item) {
                params[item.name] = toParams[item.name]
            })
            return params
        },
        syncParams: function (toParams) {
            var me = this
            avalon.each(this.keys, function (index, item) {
                var key = item.name
                if (key in toParams)
                    me.params[key] = toParams[key]
            })
        },
        _onEnter: function () {
            this.query = this.getQuery()
            var me = this,
                    arg = Array.prototype.slice.call(arguments),
                    done = me._async(),
                    prom = getPromise(function (rs, rj) {
                        var reason = {
                            type: "data",
                            state: me,
                            params: me.params
                        },
                        _reject = function (message) {
                            reason.message = message
                            done.apply(me, [false])
                            rj(reason)
                        },
                                _resovle = function () {
                                    done.apply(me)
                                    rs()
                                },
                                res = me.onEnter.apply(me, arg.concat([_resovle, _reject]))
                        // if promise
                        if (res && res.then) {
                            res.then(_resovle)["catch"](promiseError)
                            // error msg
                        } else if (res && res !== true) {
                            _reject(res)
                        } else if (res === undefine) {
                            _resovle()
                        }
                        // res === false will pause here
                    })
        },
        /*
         * @interface state.getQuery 获取state的query，等价于state.query
         *<pre>
         *  onEnter: function() {
         *      var query = this.getQuery()
         *      or
         *      this.query
         *  }
         *</pre> 
         */
        getQuery: function () {
            return mmState.query
        },
        /*
         * @interface state.getParams 获取state的params，等价于state.params
         *<pre>
         *  onEnter: function() {
         *      var params = this.getParams()
         *      or
         *      this.params
         *  }
         *</pre> 
         */
        getParams: function () {
            return this.params
        },
        _async: function () {
            // 没有done回调的时候，防止死球
            if (this.done)
                this._pending = true
            return this.done || avalon.noop
        },
        onBeforeEnter: avalon.noop, // 切入某个state之前触发
        onEnter: avalon.noop, // 切入触发
        onBeforeExit: avalon.noop, // state退出前触发
        onExit: avalon.noop // 退出后触发
    }

    _root = StateModel("", {
        url: "",
        views: null,
        "abstract": true
    })

    /*
     * @interface avalon.controller 给avalon.state视图对象配置控制器
     * @param name 控制器名字
     * @param {Function} factory 控制器函数，传递一个内部生成的控制器对象作为参数
     * @param {Object} factory.arguments[0] $ctrl 控制器的第一个参数：实际生成的控制器对象
     * @param {Object} $ctrl.$vmodels 给视图指定一个scan的vmodels数组，实际scan的时候$vmodels.concat(dom树上下文继承的vmodels)
     * @param {Function} $ctrl.$onBeforeUnload 该视图被卸载前触发，return false可以阻止视图卸载，并阻止跳转
     * @param {Function} $ctrl.$onEnter 给该视图加载数据，可以返回false，或任意不为true的错误信息或一个promise对象，传递3个参数
     * @param {Object} $ctrl.$onEnter.arguments[0] params第一个参数：视图所属的state的参数
     * @param {Function} $ctrl.$onEnter.arguments[1] resolve $onEnter 第二个参数：return false的时候，进入同步等待，直到手动调用resolve
     * @param {Function} $ctrl.$onEnter.arguments[2] reject 第三个参数：数据加载失败，调用
     * @param {Function} $ctrl.$onRendered 视图元素scan完成之后，调用
     */
    avalon.controller = function () {
        var first = arguments[0],
                second = arguments[1]
        if (first && (first instanceof _controller))
            return first
        var $ctrl = _controller()
        if (avalon.isFunction(first)) {
            first($ctrl)
        } else if (avalon.isFunction(second)) {
            $ctrl.name = first
            second($ctrl)
        } else if (typeof first == "string" || typeof first == "object") {
            first = first instanceof Array ? first : Array.prototype.slice.call(arguments)
            avalon.each(first, function (index, item) {
                if (typeof item == "string") {
                    first[index] = avalon.vmodels[item]
                }
                item = first[index]
                if ("$onRendered" in item)
                    $ctrl.$onRendered = item["$onRendered"]
                if ("$onEnter" in  item)
                    $ctrl.$onEnter = item["$onEnter"]
            })
            $ctrl.$vmodels = first
        } else {
            throw new Error("参数错误" + arguments)
        }
        return $ctrl
    }
    /*
     *  @interface avalon.controller.loader avalon.controller异步引入模块的加载器，默认是通过avalon.require加载
     */
    avalon.controller.loader = function (url, callback) {
        // 没有错误回调...
        function wrapper($ctrl) {
            callback && callback($ctrl)
        }
        url = url instanceof Array ? url : [url]
        if (window.requirejs) {
            requirejs(url, wrapper)
        } else if (typeof require === "function" && require.ensure) {
            require.ensure(url, wrapper)
        } else if (avalon.require) {
            avalon.require(url, wrapper)
        } else { // 抛个错误，方便调试
            throw Error('未能找有效的模块加载器异步加载"' + url + '"，请参照mmState.js的avalon.controller.loader源码进行修改')
        }
    }

    function _controller() {
        if (!(this instanceof _controller))
            return new _controller
        this.$vmodels = []
    }
    _controller.prototype = {
    }

    function objectCompare(objA, objB) {
        if (!objA || !objB) return false
        for (var i in objA) {
            if (!(i in objB) || objA[i] !== objB[i])
                return false
        }
        for (var i in objB) {
            if (!(i in objA) || objA[i] !== objB[i])
                return false
        }
        return true
    }

    //【avalon.state】的辅助函数，确保返回的是函数
    function getFn(object, name) {
        return typeof object[name] === "function" ? object[name] : avalon.noop
    }

    function getStateByName(stateName) {
        return _states[stateName]
    }
    function getViewNodes(node, query) {
        var nodes, query = query || "ms-view"
        if (node.querySelectorAll) {
            nodes = node.querySelectorAll("[" + query + "]")
        } else {
            nodes = Array.prototype.filter.call(node.getElementsByTagName("*"), function (node) {
                return typeof node.getAttribute(query) === "string"
            })
        }
        return nodes
    }

    // 【avalon.state】的辅助函数，opts.template的处理函数
    function fromString(template, params, reason) {
        var promise = getPromise(function (resolve, reject) {
            var str = typeof template === "function" ? template(params) : template
            if (typeof str == "string") {
                resolve(str)
            } else {
                reason.message = "template必须对应一个字符串或一个返回字符串的函数"
                reject(reason)
            }
        })
        return promise
    }
    // 【fromUrl】的辅助函数，得到一个XMLHttpRequest对象
    var getXHR = function () {
        return new (window.XMLHttpRequest || ActiveXObject)("Microsoft.XMLHTTP")
    }/*
     *  @interface avalon.state.templateLoader 通过url异步加载模板的函数，默认是通过内置的httpRequest去加载，但是在node-webkit环境是不work的，因此开放了这个配置，用以自定义url模板加载器，会在一个promise实例里调用这个方法去加载模板
     *  @param url 模板地址
     *  @param resolve 加载成功，如果需要缓存模板，请调用<br>
     resolve(avalon.templateCache[url] = templateString)<br>
     否则，请调用<br>
     resolve(templateString)<br>
     *  @param reject 加载失败，请调用reject(reason)
     *  @param reason 挂在失败原因的对象
     */
    avalon.state.templateLoader = function (url, resolve, reject, reason) {
        var xhr = getXHR()
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var status = xhr.status;
                if (status > 399 && status < 600) {
                    reason.message = "templateUrl对应资源不存在或没有开启 CORS"
                    reason.status = status
                    reason.xhr = xhr
                    reject(reason)
                } else {
                    resolve(avalon.templateCache[url] = xhr.responseText)
                }
            }
        }
        xhr.open("GET", url, true)
        if ("withCredentials" in xhr) {
            xhr.withCredentials = true
        }
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
        xhr.send()
    }
    // 【avalon.state】的辅助函数，opts.templateUrl的处理函数
    function fromUrl(url, params, reason) {
        var promise = getPromise(function (resolve, reject) {
            if (typeof url === "function") {
                url = url(params)
            }
            if (typeof url !== "string") {
                reason.message = "templateUrl必须对应一个URL"
                return reject(reason)
            }
            if (avalon.templateCache[url]) {
                return  resolve(avalon.templateCache[url])
            }
            avalon.state.templateLoader(url, resolve, reject, reason)
        })
        return promise
    }
    // 【avalon.state】的辅助函数，opts.templateProvider的处理函数
    function fromProvider(fn, params, reason) {
        var promise = getPromise(function (resolve, reject) {
            if (typeof fn === "function") {
                var ret = fn(params)
                if (ret && ret.then || typeof ret == "string") {
                    resolve(ret)
                } else {
                    reason.message = "templateProvider为函数时应该返回一个Promise或thenable对象或字符串"
                    reject(reason)
                }
            } else if (fn && fn.then) {
                resolve(fn)
            } else {
                reason.message = "templateProvider不为函数时应该对应一个Promise或thenable对象"
                reject(reason)
            }
        })
        return promise
    }
    // 【avalon.state】的辅助函数，将template或templateUrl或templateProvider转换为可用的Promise对象
    function fromPromise(config, params, reason) {
        return config.template ? fromString(config.template, params, reason) :
                config.templateUrl ? fromUrl(config.templateUrl, params, reason) :
                config.templateProvider ? fromProvider(config.templateProvider, params, reason) :
                getPromise(function (resolve, reject) {
                    reason.message = "必须存在template, templateUrl, templateProvider中的一个"
                    reject(reason)
                })
    }
})
;
/**
 * @license RequireJS text 2.0.13+ Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.13+',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.lastIndexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'] &&
            !process.versions['atom-shell'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file[0] === '\uFEFF') {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});

define('text!smartgrid/avalon.smartgrid.html',[],function () { return '<div class="oni-smartgrid" id="oni-smartgrid">\n    <div class="oni-smartgrid-main-wrapper">\n        <div class="oni-smartgrid-main" id="oni-smartgrid-main">\n            <div class="oni-smartgrid-header" ms-if="!noHeader">\n                <div class="oni-smartgrid-header-fixed"\n                    ms-if="isAffix"\n                    ms-css-top="_headerTop"\n                    ms-visible="_fixHeaderToggle"\n                    ms-css-position="_position"\n                    ms-css-width="_gridWidth">\n                    <div ms-repeat-column="columns"\n                        class="oni-smartgrid-column"\n                        ms-visible="column.toggle"\n                        ms-css-width="column.width"\n                        ms-css-text-align="column.align"\n                        ms-class="{{column.customClass}}"\n                        ms-class-1="oni-smartgrid-hidden: _hiddenAffixHeader(column, allChecked)">\n                        <div class="oni-smartgrid-column-cell">\n                            {{column.name|sanitize|html}}\n                            <span  ms-click="sortColumn(column, $index, $event)"\n                                   ms-if="column.sortable"\n                                   ms-class="oni-helper-{{column.sortTrend}}">\n                                <span class="oni-helper-sort-top"></span>\n                                <span class="oni-helper-sort-bottom"></span>\n                            </span>\n                        </div>\n                    </div>\n                </div>\n                <div id="oni-smartgrid-header">\n                    <div ms-repeat-column="columns"\n                        class="oni-smartgrid-column"\n                        ms-visible="column.toggle"\n                        ms-css-width="column.width"\n                        ms-css-text-align="column.align"\n                        ms-class="{{column.customClass}}"\n                        ms-class-1="oni-smartgrid-hidden: _hiddenAffixHeader(column, allChecked)">\n                        <div class="oni-smartgrid-column-cell">\n                            {{column.name|sanitize|html}}\n                            <span  ms-click="sortColumn(column, $index, $event)"\n                                   ms-if="column.sortable"\n                                   ms-class="oni-helper-{{column.sortTrend}}">\n                                <span class="oni-helper-sort-top"></span>\n                                <span class="oni-helper-sort-bottom"></span>\n                            </span>\n                        </div>\n                    </div>\n                </div>\n            </div>\n            <div class="oni-smartgrid-body-wrapper">\n                  <div class="oni-smartgrid-body-modal" ms-if="loadingToggle"></div>\n                  <div id="oni-smartgrid-loading-text" class="oni-smartgrid-body-loading" ms-if="loadingToggle">{{loadingText}}</div>\n                <div class="oni-smartgrid-body" id="oni-smartgrid-body" ms-css-min-height="bodyMinHeight">\n                </div>\n            </div>\n        </div>\n    </div>\n    <div class="oni-smartgrid-footer" ms-if="!noFooter">\n        <div class="oni-smartgrid-pager-wrapper" ms-visible="pageable && _pagerShow">\n            <div ms-if="pageable" ms-widget="pager, $, $pagerConfig"></div>\n        </div>\n    </div>\n</div>\nMS_OPTION_EJS\n<&- var trl = @data.length &>\n<&- if(!trl) { &>\n    <div class="oni-smartgrid-nodata"><&=@noResult&></div>\n<&- } else { &>\n    <&- for(var i=0, tr; i<trl; i++) { &>\n        <&- tr = @data[i];\n            var selectedClass = "";\n            if (i%2==0) {\n                selectedClass = "oni-smartgrid-odd";\n            } else {\n                selectedClass = "oni-smartgrid-even"\n            }\n            if (tr.selected && @checkRow) {\n                selectedClass += " oni-smartgrid-selected"\n            }\n            if (tr.disable) {\n                selectedClass += " oni-smartgrid-disabled"\n            }&>\n        <div id="<&=tr.$id&>" class="<&=selectedClass&> oni-smartgrid-row" ms-hover="oni-smartgrid-hover">\n            <&- for(var j=0, tdl=@columns.length, td; j<tdl; j++) { &>\n                <&- td=@columns[j].$model;\n                    var textAlign="text-align:"+td.align,\n                        customClass = td.customClass || "",\n                        format = td.format;&>\n                <div class="oni-smartgrid-column" ms-visible="columns[<&= j &>][\'toggle\']" ms-css-width="columns[<&= j &>][\'width\']">\n                    <div style="<&= textAlign &>" class="<&= customClass &> oni-smartgrid-column-cell">\n                        <&= format(@vmId, td.key , i, tr[td.key], tr, tr.disable) &>\n                    </div>\n                </div>\n            <& } &>\n        </div>\n    <& } &>\n<& } &>\n';});


define('text!loading/avalon.loading.html',[],function () { return '<div class="oni-helper-reset oni-helper-clearfix oni-widget">\n     <div class="oni-helper-reset oni-helper-clearfix oni-widget oni-loading-modal" \n          ms-class-100="oni-helper-max-index:toggle" \n          ms-if="modal" \n          ms-attr-id="\'modal\'+$loadingID" \n          style="z-index:999;" \n          ms-css-opacity="modalOpacity" \n          ms-css-background-color="modalBackground" \n          ms-visible="toggle">\n          <iframe allowTransparency="true" frameborder="none" src="javascript:\'\'"></iframe>\n          </div>\n     <div class="oni-helper-reset oni-helper-clearfix oni-widget oni-widget-content oni-loading" \n          ms-class-100="oni-helper-max-index:toggle" \n          ms-visible="toggle" \n          ms-css-width="width" \n          ms-css-height="height" \n          ms-css-margin-left="-width/2+\'px\'" \n          ms-css-margin-top="-height/2+\'px\'" \n          ms-attr-id="\'oni-loading-\'+$loadingID"><div \n          ms-css-width="width" \n          ms-css-height="height">{{MS_WIDGET_HTML}}</div></div>\n</div>';});


define('text!loading/avalon.loading.bar.html',[],function () { return '{{MS_WIDGET_BALL}}\n<v:oval ms-repeat-item="data" style="position:absolute;" \n  ms-attr-strokecolor="color" \n  ms-attr-fillcolor="color" \n  ms-css-left="item.x + \'px\'" \n  ms-css-top="item.y + \'px\'" \n  ms-css-width="item.r * 2 + \'px\'" \n  ms-css-height="item.r * 2 + \'px\'">\n</v:oval>\n{{MS_WIDGET_DIVIDER}}\n<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">\n  <circle  \n          ms-attr-r="data[$index].r" \n          ms-attr-cx="data[$index].x+data[$index].r" \n          ms-attr-cy="data[$index].y+data[$index].r" \n          ms-repeat="data" \n          ms-attr-fill="color">\n      <animate attributeName="opacity" from="1" to=".1" repeatCount="indefinite" \n               ms-if="type==\'ball\'" \n               ms-attr-dur="svgDur" \n               ms-attr-begin="data[$index].begin"/>\n      <animate attributeName="r" repeatCount="indefinite" keySplines="0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8;0.2 0.2 0.4 0.8" calcMode="spline" \n               ms-attr-values="\'0;\'+data[$index].r+\';0;0\'"\n               ms-attr-dur="svgDur" \n               ms-if="type==\'spinning-bubbles\'" \n               ms-attr-begin="data[$index].begin"/>\n      <animate attributeName="r" repeatCount="indefinite" keytimes="0;0.2;0.7;1" keySplines="0.2 0.2 0.4 0.8;0.2 0.6 0.4 0.8;0.2 0.6 0.4 0.8" calcMode="spline" \n        ms-if="type==\'bubbles\'"\n        ms-attr-begin="data[$index].begin"  \n        ms-attr-dur="svgDur" \n        ms-attr-values="\'0;\'+data[$index].r+\';0;0\'" />\n  </circle>\n</svg>\n{{MS_WIDGET_TYPE}}\n{{MS_WIDGET_SPIN}}\n<v:oval stroked="true" filled="F" \n        ms-attr-strokecolor="color" \n        ms-css-height="width+\'px\'" \n        ms-css-width="width+\'px\'" \n        ms-css-opacity="opacity" \n        ms-attr-strokeweight="width / 2 - widthInner / 2+\'px\'" \n        ms-repeat="data" \n  style="position:absolute;z-index:2;left:0;top:0;"></v:oval>\n<v:arc stroked="true" filled="F" \n    ms-attr-strokecolor="color" \n    ms-attr-strokeweight="width / 2 - widthInner / 2+\'px\'" \n    style="position:absolute;z-index:3;text-indent:-1000px;overflow:hidden;left:0;top:0;" \n    ms-attr-startangle="startangle" \n    ms-attr-endangle="endangle" \n    ms-css-height="width+\'px\'" \n    ms-css-width="width+\'px\'" \n    ms-repeat="data">\n  </v:arc>\n{{MS_WIDGET_DIVIDER}}\n<svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">\n  <path \n    ms-attr-d="arc" \n    ms-attr-stroke="color" \n    ms-attr-stroke-width="radius" \n    ms-attr-transform="\'rotate(0 \' + spinPoint +\')\'"\n    stroke-linejoin="round" fill="none">\n      <animateTransform attributeName="transform" repeatCount="indefinite" attributeType="XML" type="rotate" begin="0s" \n        ms-attr-from="0 + \' \' + spinPoint" \n        ms-attr-to="360 + \' \' + spinPoint" \n        ms-attr-dur="svgDur" />\n    </path>\n  <path stroke-linejoin="round" \n    ms-attr-d="circle" \n    ms-attr-stroke-width="radius" \n    ms-attr-stroke="color" \n    ms-css-opacity="opacity" \n    fill="none"></path>\n  </svg>\n{{MS_WIDGET_TYPE}}\n{{MS_WIDGET_SPINNING_SPIN}}\n<v:arc stroked="true" filled="F" \n    ms-attr-strokecolor="color" \n    ms-attr-strokeweight="radius+\'px\'" \n    style="position:absolute;z-index:3;text-indent:-1000px;overflow:hidden;left:0;top:0;" \n    ms-attr-startangle="item.startangle" \n    ms-attr-endangle="item.endangle" \n    ms-css-opacity="opacities[$index]" \n    ms-css-height="width+\'px\'" \n    ms-css-width="width+\'px\'" \n    ms-repeat-item="data">\n  </v:arc>\n{{MS_WIDGET_DIVIDER}}\n<svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">\n  <path \n    ms-attr-d="arc" \n    ms-attr-stroke="color" \n    ms-attr-stroke-width="radius" \n    ms-attr-transform="item.rotate" \n    ms-repeat-item="data" \n    ms-css-opacity="opacities[$index]" \n    stroke-linejoin="round" fill="none">\n      <animate ms-if="0" attributeName="opacity" from="1" to=".2" repeatCount="indefinite" \n               ms-attr-dur="svgDur" \n               ms-attr-begin="item.begin"/>\n    </path>\n  </svg>\n{{MS_WIDGET_TYPE}}\n{{MS_WIDGET_SPOKES}}\n<v:rect style="position:absolute;"  \n        ms-attr-fillcolor="color" \n        ms-attr-strokecolor="color"  \n        ms-css-left="item.spokesLeft+\'px\'" \n        ms-css-top="item.spokesTop+\'px\'"\n        ms-css-width="spokesWidth+\'px\'" \n        ms-css-height="spokesHeight+\'px\'" \n        ms-css-rotation="item.spokesRotation" \n        ms-repeat-item="data">\n        <v:fill \n                ms-attr-color="color"></v:fill>\n  </v:rect>\n{{MS_WIDGET_DIVIDER}}\n<svg width="100%" height="100%" version="1.1" xmlns="http://www.w3.org/2000/svg">\n  <path opacity=".1" ms-attr-d="svgPath" \n      ms-attr-transform="data[$index].rotate" \n        ms-repeat="data" \n    ms-attr-fill="color">\n    <animate attributeName="opacity" from="1" to=".1" repeatCount="indefinite" \n             ms-attr-dur="svgDur" \n             ms-attr-begin="data[$index].begin"/></path>\n  </svg>\n{{MS_WIDGET_TYPE}}\n{{MS_WIDGET_IMG}}\n<img width="100%" height="100%" ms-attr-src="src">';});

define('normalize',[],function() {
  
  // regular expression for removing double slashes
  // eg http://www.example.com//my///url/here -> http://www.example.com/my/url/here
  var slashes = /([^:])\/+/g
  var removeDoubleSlashes = function(uri) {
    return uri.replace(slashes, '$1/');
  }

  // given a relative URI, and two absolute base URIs, convert it from one base to another
  var protocolRegEx = /[^\:\/]*:\/\/([^\/])*/;
  var absUrlRegEx = /^(\/|data:)/;
  function convertURIBase(uri, fromBase, toBase) {
    if (uri.match(absUrlRegEx) || uri.match(protocolRegEx))
      return uri;
    uri = removeDoubleSlashes(uri);
    // if toBase specifies a protocol path, ensure this is the same protocol as fromBase, if not
    // use absolute path at fromBase
    var toBaseProtocol = toBase.match(protocolRegEx);
    var fromBaseProtocol = fromBase.match(protocolRegEx);
    if (fromBaseProtocol && (!toBaseProtocol || toBaseProtocol[1] != fromBaseProtocol[1] || toBaseProtocol[2] != fromBaseProtocol[2]))
      return absoluteURI(uri, fromBase);
    
    else {
      return relativeURI(absoluteURI(uri, fromBase), toBase);
    }
  };
  
  // given a relative URI, calculate the absolute URI
  function absoluteURI(uri, base) {
    if (uri.substr(0, 2) == './')
      uri = uri.substr(2);

    // absolute urls are left in tact
    if (uri.match(absUrlRegEx) || uri.match(protocolRegEx))
      return uri;
    
    var baseParts = base.split('/');
    var uriParts = uri.split('/');
    
    baseParts.pop();
    
    while (curPart = uriParts.shift())
      if (curPart == '..')
        baseParts.pop();
      else
        baseParts.push(curPart);
    
    return baseParts.join('/');
  };


  // given an absolute URI, calculate the relative URI
  function relativeURI(uri, base) {
    
    // reduce base and uri strings to just their difference string
    var baseParts = base.split('/');
    baseParts.pop();
    base = baseParts.join('/') + '/';
    i = 0;
    while (base.substr(i, 1) == uri.substr(i, 1))
      i++;
    while (base.substr(i, 1) != '/')
      i--;
    base = base.substr(i + 1);
    uri = uri.substr(i + 1);

    // each base folder difference is thus a backtrack
    baseParts = base.split('/');
    var uriParts = uri.split('/');
    out = '';
    while (baseParts.shift())
      out += '../';
    
    // finally add uri parts
    while (curPart = uriParts.shift())
      out += curPart + '/';
    
    return out.substr(0, out.length - 1);
  };
  
  var normalizeCSS = function(source, fromBase, toBase) {

    fromBase = removeDoubleSlashes(fromBase);
    toBase = removeDoubleSlashes(toBase);

    var urlRegEx = /@import\s*("([^"]*)"|'([^']*)')|url\s*\((?!#)\s*(\s*"([^"]*)"|'([^']*)'|[^\)]*\s*)\s*\)/ig;
    var result, url, source;

    while (result = urlRegEx.exec(source)) {
      url = result[3] || result[2] || result[5] || result[6] || result[4];
      var newUrl;
      newUrl = convertURIBase(url, fromBase, toBase);
      var quoteLen = result[5] || result[6] ? 1 : 0;
      source = source.substr(0, urlRegEx.lastIndex - url.length - quoteLen - 1) + newUrl + source.substr(urlRegEx.lastIndex - quoteLen - 1);
      urlRegEx.lastIndex = urlRegEx.lastIndex + (newUrl.length - url.length);
    }
    
    return source;
  };
  
  normalizeCSS.convertURIBase = convertURIBase;
  normalizeCSS.absoluteURI = absoluteURI;
  normalizeCSS.relativeURI = relativeURI;
  
  return normalizeCSS;
});
//>>excludeEnd('excludeRequireCss');
/*
 * Require-CSS RequireJS css! loader plugin
 * 0.1.8
 * Guy Bedford 2014
 * MIT
 */

/*
 *
 * Usage:
 *  require(['css!./mycssFile']);
 *
 * Tested and working in (up to latest versions as of March 2013):
 * Android
 * iOS 6
 * IE 6 - 10
 * Chome 3 - 26
 * Firefox 3.5 - 19
 * Opera 10 - 12
 * 
 * browserling.com used for virtual testing environment
 *
 * Credit to B Cavalier & J Hann for the IE 6 - 9 method,
 * refined with help from Martin Cermak
 * 
 * Sources that helped along the way:
 * - https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent
 * - http://www.phpied.com/when-is-a-stylesheet-really-loaded/
 * - https://github.com/cujojs/curl/blob/master/src/curl/plugin/css.js
 *
 */

define('css',[],function() {
  if (typeof window == 'undefined')
    return { load: function(n, r, load){ load() } };

  var head = document.getElementsByTagName('head')[0];

  var engine = window.navigator.userAgent.match(/Trident\/([^ ;]*)|AppleWebKit\/([^ ;]*)|Opera\/([^ ;]*)|rv\:([^ ;]*)(.*?)Gecko\/([^ ;]*)|MSIE\s([^ ;]*)|AndroidWebKit\/([^ ;]*)/) || 0;

  // use <style> @import load method (IE < 9, Firefox < 18)
  var useImportLoad = false;
  
  // set to false for explicit <link> load checking when onload doesn't work perfectly (webkit)
  var useOnload = true;

  // trident / msie
  if (engine[1] || engine[7])
    useImportLoad = parseInt(engine[1]) < 6 || parseInt(engine[7]) <= 9;
  // webkit
  else if (engine[2] || engine[8])
    useOnload = false;
  // gecko
  else if (engine[4])
    useImportLoad = parseInt(engine[4]) < 18;

  //main api object
  var cssAPI = {};

  cssAPI.pluginBuilder = './css-builder';

  // <style> @import load method
  var curStyle, curSheet;
  var createStyle = function () {
    curStyle = document.createElement('style');
    head.appendChild(curStyle);
    curSheet = curStyle.styleSheet || curStyle.sheet;
  }
  var ieCnt = 0;
  var ieLoads = [];
  var ieCurCallback;
  
  var createIeLoad = function(url) {
    ieCnt++;
    if (ieCnt == 32) {
      createStyle();
      ieCnt = 0;
    }
    curSheet.addImport(url);
    curStyle.onload = function(){ processIeLoad() };
  }
  var processIeLoad = function() {
    ieCurCallback();
 
    var nextLoad = ieLoads.shift();
 
    if (!nextLoad) {
      ieCurCallback = null;
      return;
    }
 
    ieCurCallback = nextLoad[1];
    createIeLoad(nextLoad[0]);
  }
  var importLoad = function(url, callback) {
    if (!curSheet || !curSheet.addImport)
      createStyle();

    if (curSheet && curSheet.addImport) {
      // old IE
      if (ieCurCallback) {
        ieLoads.push([url, callback]);
      }
      else {
        createIeLoad(url);
        ieCurCallback = callback;
      }
    }
    else {
      // old Firefox
      curStyle.textContent = '@import "' + url + '";';

      var loadInterval = setInterval(function() {
        try {
          curStyle.sheet.cssRules;
          clearInterval(loadInterval);
          callback();
        } catch(e) {}
      }, 10);
    }
  }

  // <link> load method
  var linkLoad = function(url, callback) {
    var link = document.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    if (useOnload)
      link.onload = function() {
        link.onload = function() {};
        // for style dimensions queries, a short delay can still be necessary
        setTimeout(callback, 7);
      }
    else
      var loadInterval = setInterval(function() {
        for (var i = 0; i < document.styleSheets.length; i++) {
          var sheet = document.styleSheets[i];
          if (sheet.href == link.href) {
            clearInterval(loadInterval);
            return callback();
          }
        }
      }, 10);
    link.href = url;
    head.appendChild(link);
  }

  cssAPI.normalize = function(name, normalize) {
    if (name.substr(name.length - 4, 4) == '.css')
      name = name.substr(0, name.length - 4);

    return normalize(name);
  }

  cssAPI.load = function(cssId, req, load, config) {

    (useImportLoad ? importLoad : linkLoad)(req.toUrl(cssId + '.css'), load);

  }

  return cssAPI;
});

define('css!loading/avalon.loading',[],function(){});

define('css!chameleon/oniui-common',[],function(){});
/**
 * @cnName 加载效果组件
 * @enName loading
 * @introduce
 *  <p> 实现各种加载动画效果
</p>
 */
define('loading/avalon.loading',["avalon", "text!./avalon.loading.html", "text!./avalon.loading.bar.html", "css!./avalon.loading.css", "css!../chameleon/oniui-common.css"], function(avalon, template, ballTemplate) {
    var widgetCount = 0, 
        isIE = navigator.userAgent.match(/msie/ig) || ("ActiveXObject" in window),
        _key = (99999 - Math.random() * 10000) >> 0,
        templateCache = {},
        parts = ballTemplate.split("{{MS_WIDGET_TYPE}}"),
        _config = {}
    // 通过addtype注册新的效果
    // config里面是每个type特有的配置或者方法，mix到vm里
    // drawser方法在注入html之前执行，主要用于生成绘图需要的数据
    // effect方法用于setinterval动画效果
    function addType(type, config, drawer, effect) {
        config["drawer"] = drawer
        config["effect"] = effect
        _config[type] = config
    }
    function g(id) {
        return document.getElementById(id)
    }
    avalon.each(parts, function(i, item) {
        var type,
                item = item.trim().replace(/^\{\{MS_WIDGET_[^\}]+\}\}/g, function(mat) {
            type = mat.replace(/\{\{MS_WIDGET_|\}\}/g, "").replace(/_/g, "-").toLowerCase()
            return ""
        })
        if (type) {
            type = type
            item = item.split("{{MS_WIDGET_DIVIDER}}")
            templateCache[type] = {
                "svg": item[1] || item[0],
                "vml": item[0]
            }
        }
    })
    // svg绘制圆弧
    function circleValueList(r, bw, ct) {
        var arr = [],
                count = ct || 36,
                r = r - bw,
                arc,
                x,
                y,
                res
        for (var i = 0; i <= count; i++) {
            arc = Math.PI / 2 - Math.PI * 2 / count * i
            x = Math.cos(arc) * r + r * 1 + bw * 1
            y = (1 - Math.sin(arc).toFixed(4)) * r + bw * 1
            res = (i ? " L" : "M") + x + " " + y + (i == 100 ? "Z" : "")
            arr.push(res)
        }
        return arr
    }
    // 注册ball，小球排列成一个圆
    addType("ball", {
        "width": 32,
        "widthInner": 28,
        count: 10, //@config type=ball，loading效果组成的小图形个数
        interval: 120,//@config type=ball，毫秒数，动画效果帧间隔
        circleMargin: 1,//@config type=ticks，小球之间的间距，单位是一倍小球半径
        "svgDur": "1s"
    }, function(vmodel) {
        var type = vmodel.type,
            count = vmodel.count,
            width = vmodel.width,
            radiusOut = width / 2,
            interval = vmodel.interval,
            radiusInner = (width - vmodel.widthInner) / 2
        if(type === "ball") vmodel.svgDur = interval * count / 1000 + "s"
        return function(loop) {
            var angel = Math.PI * (0.5 - 2 * loop / count)
            vmodel.data.push({
                "x": (radiusOut - radiusInner) * 　(Math.cos(angel) + 1),
                "y": (radiusInner - radiusOut) * (Math.sin(angel) - 1),
                "r": radiusInner,
                "begin": [interval * loop / 1000, "s"].join("")
            }) 
            vmodel.opacities.push((loop / count).toFixed(2))
        }
    }, function(vmodel, ele, tagList, callback) {
        // only for ie
        if(!isIE && (vmodel.type !== "ticks") && vmodel.type != "spinning-spin") return
        var tagList = Array.isArray(tagList) ? tagList : ["circle", "oval"]
            , tag = vmodel.svgSupport ? tagList[0] : tagList[1] 
            , ele = ele.getElementsByTagName(tag)
            , len = ele.length, index = len, eles = [], flag
        avalon.each(ele, function(i, item) {
            eles.push(avalon(item))
            // fix ie 7-8 render bug...
            if (i === len - 1 && !vmodel.svgSupport) {
                item.style.display = "none"
                item.style.display = "block"
            }
        })
        if(vmodel.type === "ticks") {
            index = 0;
            return function() {
                for(var i = 0; i < len; i++) {
                    var op = i > index ? vmodel.opacities[1] : vmodel.opacities[0]
                    if(eles[i]) {
                        eles[i].css("visibility", op >= 1 ? "visible" : "hidden")
                    }
                }
                index++
                if(index >= len) {
                    index = -1
                }
            }
        } 
        // share for type=ball and type=spokes
        return function() {
            // 顺时针
            index--
            if (index < 0) {
                index = len - 1
            }
            for (var i = 0; i < len; i++) {
                if(callback) {
                    callback(eles[i], i, index)
                } else {
                    var op = vmodel.opacities[(i + index) % len] * 100 / 100
                    eles[i] && eles[i].css("opacity", op)
                }
            }
        }
    })
    // 注册ticks，小球排列成一行
    addType("ticks", avalon.mix({}, _config["ball"], {
        count: 3,//@config type=ticks，小球个数
        height: 20,//@config type=ticks，高度
        interval: 360 //@config type=ticks，毫秒数，动画效果帧间隔
    }), function(vmodel) {
        var count = vmodel.count,
            rate = 2 + vmodel.circleMargin,
            radiusInner = (vmodel.width - vmodel.widthInner) / 2,
            marginLeft = (vmodel.width - radiusInner * ( 3 * count - 1)) / 2
        return function(loop) {
            vmodel.data.push({
                "x": marginLeft + (loop * rate * radiusInner),
                "y": vmodel.height / 2 - radiusInner,
                "r": radiusInner,
                "begin": [vmodel.interval * loop / 1000, "s"].join("")
            })
            vmodel.opacities.push(loop ? 0 : 1)
        }
    }, _config["ball"].effect)
    templateCache["ticks"] = templateCache["ball"]
    // 注册spin，圆环转圈
    addType("spin", {
        width: 32,
        widthInner: 26,
        angel: 90, //@config type=spin，转动的弧形的角度，单位是1度
        arc: "",
        circle: "",
        radius: "",
        opacity: 0.2, //@config type=spin，背景圆弧的透明度
        startangle: 0, //@config type=spin，圆弧开始的角度，单位1度
        endangle: 0,
        interval: 36, //@config type=spin，毫秒数，动画效果帧间隔
        $circleData: "",
        $partsData: "",
        spinPoint: "23 23",
        svgDur: "1s",
        data: [1]
    }, function(vmodel) {
        vmodel.radius = vmodel.width / 2 - vmodel.widthInner / 2
        if(vmodel.svgSupport) {
            vmodel.svgDur = vmodel.interval * 36 / 1000 + "s"
            vmodel.spinPoint = [vmodel.width / 2, vmodel.width / 2].join(" ")
            var circle = vmodel.$circleData = circleValueList(vmodel.width / 2, vmodel.width / 2 - vmodel.widthInner / 2),
                    parts = vmodel.$partsData = circle.slice(0, Math.floor(vmodel.angel / 360 * (circle.length - 1)))
            vmodel.arc = parts.join("")
            vmodel.circle = circle.join("")
        } else {
            vmodel.startangle = 0
            vmodel.endangle = vmodel.angel
        }
    }, function(vmodel, ele) {
        // only for ie
        if(!isIE) return
        var angel = stepper = vmodel.angel
        if(vmodel.svgSupport) {
            var len = vmodel.$circleData.length, ele = avalon(ele.getElementsByTagName("path")[0])
            angel = stepper = Math.floor(vmodel.angel / 360 * len)
            return function() {
                // 生成圆弧的点阵是36个点，因此步长用1就足够了
                stepper+=1;
                if(stepper >= len) stepper = 0
                // 改用rotate属性
                ele.attr("transform", "rotate(" + stepper * 10 + " " + vmodel.spinPoint + ")")
            }
        }
        return function() {
            stepper += 10
            var startangle = stepper - angel
            if (stepper > 360) {
                stepper = stepper - 360
                startangle = startangle - 360
            }
            vmodel.startangle = startangle
            vmodel.endangle = stepper
        }
    })
    // 注册小长方形圆形排列效果
    addType("spokes", {
        count: 8, //@config type=spokes，长方形个数
        width: 32, //@config type=spokes，效果宽度,
        spokesWidth: 4, //@config type=spokes，小长方形宽度
        spokesHeight: 8, //@config type=spokes，小长方形高度
        interval: 125, //@config type=spokes，效果动画间隔毫秒数
        svgPath: "M14 0 H18 V8 H14 z",
        svgDur: "1s"
    },function(vmodel) {
        var count = vmodel.count,w = vmodel.width, sw = vmodel.spokesWidth, sh = vmodel.spokesHeight, index = 0, interval = vmodel.interval;
        if(vmodel.svgSupport) {
            vmodel.svgPath = ["M", (w - sw) / 2, " 0 H", (w + sw) / 2, " V", sh, " H", (w - sw) / 2, " z"].join("")
            vmodel.svgDur = interval * count / 1000 + "s"
            var step = 360 / count
            return function(loop) {
                vmodel.data.push({     
                    "begin": [interval * loop / 1000, "s"].join(""),
                    "rotate": ["rotate(", loop * step, " ", [w / 2, w / 2].join(" ") + ")"].join("")
                })
                vmodel.opacities.push((loop / count).toFixed(2))
            }
        }
        var step = Math.PI * 2 / count, angel, halfSw = sw / 2
        return function(loop) {
            angel = Math.PI / 2 - step * loop
            var vsin = Math.sin(angel),
                vcos = Math.cos(angel),
                op = (loop / count).toFixed(2)
            vmodel.data.push({
                "spokesRotation": 360 * loop / count,
                "spokesOpacity": op * 50,
                "spokesLeft":(w / 2 - sw) * (1 + vcos),
                "spokesTop": (w /2 - sw)  * (1 - vsin)
            })
            vmodel.opacities.push(op)
        }
    }, function(vmodel, ele) {
        return _config["ball"].effect(vmodel, ele, ["path", "rect"])
    })
    // 注册小球排列成一个圆，半径变化
    addType("spinning-bubbles", avalon.mix({}, _config["ball"], {
        width: 64,//@config type=spinning-bubbles 宽度，小球的个数继承自type=ball
        widthInner: 54,//@config type=spinning-bubbles 内宽
        $zooms: []
    }), function(vmodel) {
        var drawer = _config["ball"].drawer(vmodel), count = vmodel.count
        if(count >= 7) {
            vmodel.$zooms = [0.2, 0.4, 0.8, 1, 0.8, 0.4, 0.2]
        } else if(count >= 5) {
            vmodel.$zooms = [0.2, 0.8, 1, 0.8, 0.2]
        } else {
            vmodel.$zooms = [1, 0.1, 0.1, 0.1]
        }
        while(vmodel.$zooms.length < vmodel.count) {
            vmodel.$zooms.push(0.1)
        }
        return function(loop) {
            drawer(loop)
        }
    }, function(vmodel, ele) {
        var r = (vmodel.width - vmodel.widthInner) / 2, count = vmodel.count
        if(vmodel.svgSupport) return _config["ball"].effect(vmodel, ele, ["circle", "oval"], function(ele, loop, step) {
            ele.attr("r", r * vmodel.$zooms[(loop + step) % count])
        })
        return _config["ball"].effect(vmodel, ele, ["circle", "oval"], function(ele, loop, step) {
            ele.css("zoom", vmodel.$zooms[(loop + step) % vmodel.count])
        })
    })
    // 注册bubbles, 高级浏览器
    addType("bubbles", avalon.mix({}, _config["spinning-bubbles"], {
        height: 30, //@config type=bubbles 高度，宽度继承type=spinning-bubbles
        widthInner:50,//@config type=bubbles 内宽
        count: 3,//@config type=bubbles 球的个数
        interval: 360,//@config type=bubbles 动画ms数
        "circleMargin": 0.5//@config type=bubbles bubbles效果下个小球的间距
    }), function(vmodel) {
        _config["spinning-bubbles"].drawer(vmodel)
        return _config["ticks"].drawer(vmodel)
    }, _config["spinning-bubbles"].effect)
    // 注册spinning-spin
    addType("spinning-spin", avalon.mix({}, _config["spin"], {
        opacities: [],
        data: [],
        radius: 1,
        interval: _config["ball"].interval, //@config type=spinning-spin 帧间隔，继承ball
        count: 8, //@config type=spinning-spin 小圆弧个数，一般请保证 360 / 8 % padding = 0
        width: 46, //@config type=spinning-spin 圆外直径
        widthInner: 38, //@config type=spinning-spin 圆内直径
        padding: 5//@config type=spinning-spin 小圆弧间间隔的角度数
    }), function(vmodel) {
        var ct = 360 / vmodel.padding * 3, r = vmodel.width / 2, dt = circleValueList(r, r - vmodel.widthInner / 2, ct), count = vmodel.count, interval = vmodel.interval, step = 360 / count
        vmodel.radius = vmodel.width / 2 - vmodel.widthInner / 2
        function writeOp(loop) {
            var cp = (loop / count).toFixed(2)
            cp = cp > 0.6 ? cp : 0.2
            vmodel.opacities.push(cp)
        }
        if(vmodel.svgSupport) {
            vmodel.svgDur = interval * count / 1000 + "s"
            vmodel.arc = dt.slice(0, Math.floor((1 / count - vmodel.padding / 360 ) * dt.length)).join("")
            return function(loop) {
                vmodel.data.push({
                    rotate: "rotate(" + step * loop + " " + r + " " + r + ")",
                    begin: [interval * loop / 1000, "s"].join("")
                })
                writeOp(loop)
            }
        }
        return function(loop) {
            vmodel.data.push({
                startangle: loop / count * 360,
                endangle: (loop + 1) / count * 360 - 10
            })
            writeOp(loop)
        }

    }, function(vmodel, ele) {
        return _config["ball"].effect(vmodel, ele, ["path", "arc"])
    })
    // 注册自定义图片
    addType("img", {
        src: "https://source.qunarzz.com/piao/images/loading_camel.gif",//@config type=img，loading效果的gif图片
        width: 52,//@config type=img，loading效果宽度
        height: 39,//@config type=img，loading效果高度
        miao: 0
    }, void 0, void 0)
    var svgSupport = !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect
    var widget = avalon.ui.loading = function(element, data, vmodels) {

        var options = data.loadingOptions
        //方便用户对原始模板进行修改,提高定制性
        options.template = options.getTemplate(template, options)
        if (!_config[options.type]) {
            options.type = "ball"
        }
        // 读入各种效果的配置
        avalon.each(_config[options.type], function(i, item) {
            if (options[i] === void 0) options[i] = item
        })

        var vmodel = avalon.define(data.loadingId, function(vm) {
            vm.height = ""
            vm.width = ""
            vm.data = []
            vm.opacities = []
            avalon.mix(vm, options)
            vm.widgetElement = element
            vm.rootElement = ""
            vm.svgSupport = svgSupport
            vm.$loadingID = widgetCount + "" + _key
            vm.$timer = ""
            vm.$skipArray = ["widgetElement", "template", "opacities", "data", "rootElement"]

            var inited
            vm.$init = function(continueScan) {
                if (inited)
                    return
                inited = true
                var id,
                    container = options.container || vmodel.widgetElement,
                    elementParent = ((avalon.type(container) === "object" && container.nodeType === 1 && document.body.contains(container)) ? container : document.getElementById(container)) || document.body,
                    type = vmodel.type,
                    // radiusOut = vmodel.width / 2,
                    html = (templateCache[type]||templateCache["ball"])[vmodel.svgSupport ? "svg" : "vml"],
                    index = 0
                vmodel.width = vmodel.width == false ? vmodel.height : vmodel.width
                vmodel.height = vmodel.height == false ? vmodel.width : vmodel.height
                // 计算绘图数据
                if(vmodel.drawer) {
                    var loop = 0, drawer = vmodel.drawer(vmodel)
                    while(loop < vmodel.count && drawer) {
                        drawer(loop)
                        loop++
                    }
                }
                var frag = avalon.parseHTML(vmodel.template.replace("{{MS_WIDGET_HTML}}", html).replace("{{MS_WIDGET_ID}}", vmodel.$loadingID))
                newDiv = frag.childNodes[0]
                elementParent.appendChild(newDiv)
                vm.rootElement = newDiv
                avalon.log("avalon请尽快升到1.3.7+")
                avalon.scan(elementParent, [vmodel].concat(vmodels))
                if (typeof options.onInit === "function") {
                    options.onInit.call(element, vmodel, options, vmodels)
                }
                vmodel._effect()
            }
            vm._effect = function() {
                if (vmodel.toggle) {
                    var ele = document.getElementById("oni-loading-" + vmodel.$loadingID)
                    if (ele) {
                        var effect = vmodel.effect && vmodel.effect(vmodel, ele)
                        if(effect) {
                            clearInterval(vmodel.$timer)
                            vmodel.$timer = setInterval(effect, vmodel.interval)
                        }
                    }
                }
            }
            vm.$remove = function() {
                clearInterval(vmodel.$timer)
                element.innerHTML = element.textContent = ""
            }

            //@interface showLoading() 显示loading效果
            vm.showLoading = function() {
                if (vmodel.toggle)
                    return
                vmodel.toggle = true
                vmodel._effect()
            }
            //@interface hideLoading() 隐藏loading
            vm.hideLoading = function() {
                vmodel.toggle = false
            }
            //@interface destroyLoading() 销毁loading
            vm.destroyLoading = function() {
                vmodel.toggle = false
                vmodel.$remove()
            }
            /**
             * @interface 将loading效果插入到指定的容器里
             * @param 目标容器元素，默认是绑定widget的元素
             */
            vm.appendTo = function(container) {
                var cnt = container || vm.widgetElement,
                    modal = g("modal" + vm.$id),
                    loading = g("loading" + vm.$id)
                if(modal) cnt.appendChild(modal)
                if(loading) cnt.appendChild(loading)
            }

        })

        vmodel.$watch("toggle", function(n) {
            if (!n) {
                clearInterval(vmodel.$timer)
            } else {
                vmodel._effect()
            }
        })
      
        widgetCount++

        return vmodel
    }
    widget.defaults = {
        //@config onInit(vmodel, options, vmodels) 完成初始化之后的回调,call as element's method
        onInit: avalon.noop,
        color: "#619FE8", //@config 效果的颜色
        type: "ball", //@config 类型，默认是ball，球，可取spin,ticks
        toggle: true, //@config 是否显示
        modal: true, //@config 是否显示遮罩
        modalOpacity: 0.1, //@config 遮罩透明度
        modalBackground: "#fff",//@config 遮罩背景色
        container: void 0, //@config loading效果显示的容器，默认是绑定widget的元素
        getTemplate: function(tmpl, opts, tplName) {
            return tmpl
        }, //@config getTemplate(tpl, opts, tplName) 定制修改模板接口
        $author: "skipper@123"
    }
});

define('text!pager/avalon.pager.html',[],function () { return '<div class="oni-pager" onselectstart="return false;" unselectable="on" ms-visible="!!totalPages">\n    <span class="oni-pager-prev"\n          ms-class="oni-state-disabled:firstPage==1"\n          ms-if="isShowPrev()"\n          ms-attr-title="getTitle(\'prev\')" \n          ms-click="jumpPage($event,\'prev\')" \n          ms-text="prevText"\n          ></span>\n    <span class="oni-pager-item"\n          ms-visible="firstPage!==1" \n          ms-attr-title="getTitle(\'first\', currentPage)" \n          ms-click="jumpPage($event,\'first\')" \n          ms-class-oni-state-active="currentPage == 1"\n          ms-hover="oni-state-hover">1</span>\n    <span class=\'oni-pager-omit\'\n          ms-if="showFirstOmit" \n          ms-text="ellipseText"\n          ></span>\n    <span  class="oni-pager-item" \n           ms-repeat="pages" \n           ms-attr-title="getTitle(el, currentPage)"\n           ms-hover="oni-state-hover"\n           ms-click="jumpPage($event,el)"\n           ms-class-oni-state-active="el == currentPage" \n           ms-text="el"\n           ></span>\n    <span class="oni-pager-omit"\n          ms-if="showLastOmit" \n          ms-text="ellipseText"\n          ></span>\n    <span class="oni-pager-item "\n          ms-visible="lastPage!==totalPages" \n          ms-attr-title="getTitle(\'last\', currentPage, totalPages)" \n          ms-hover="oni-state-hover" \n          ms-click="jumpPage($event,\'last\')"  \n          ms-text="totalPages"\n          ></span>\n    <span class="oni-pager-next"\n          ms-if="isShowNext()" \n          ms-attr-title="getTitle(\'next\')"\n          ms-click="jumpPage($event,\'next\')" \n          ms-class="oni-state-disabled:lastPage==totalPages"\n          ms-text="nextText"\n          ></span>\n    <div class="oni-pager-jump" ms-if="showJumper">\n        <span class="oni-pager-text" ms-html="_getTotalPages(totalPages)"></span>\n        <div class="oni-pager-textbox-wrapper">\n            <input class="oni-pager-textbox" ms-duplex="_currentPage" data-duplex-event="change" ms-keyup="changeCurrentPage">\n        </div>\n        <span class="oni-pager-text">{{regional.pageText}}</span>\n        <button class="oni-pager-button" ms-click="changeCurrentPage" >{{regional.confirmText}}</button>\n    </div>\n</div>\n';});


define('css!pager/avalon.pager',[],function(){});
/**
 * @cnName 分页组件
 * @enName pager
 * @introduce
 *  <p> 分页组件 用于各种列表与表格的下方 。</p>
 */

define('pager/avalon.pager',["avalon",
    "text!./avalon.pager.html",
    "css!../chameleon/oniui-common.css",
    "css!./avalon.pager.css"
], function (avalon, template) {

    var widget = avalon.ui.pager = function (element, data, vmodels) {
        var options = data.pagerOptions
        var pageOptions = options.options
        if (Array.isArray(pageOptions)) {
            options.options = pageOptions.map(function (el) {
                var obj = {}
                switch (typeof el) {
                    case "number":
                    case "string":
                        obj.value = el
                        obj.text = el
                        return obj
                    case "object":
                        return el
                }
            })
        } else {
            options.options = []
        }
        if (vmodels.cb) {
            template = template.replace(/ms-title/g, "ms-attr-title")
        }
        //方便用户对原始模板进行修改,提高制定性
        options.template = options.getTemplate(template, options)
        options._currentPage = options.currentPage
        var vmodel = avalon.define(data.pagerId, function (vm) {
            avalon.mix(vm, options, {
                regional: widget.defaultRegional
            })
            vm.widgetElement = element
            vm.rootElement = {}
            vm.$skipArray = ["showPages", "rootElement", "widgetElement", "template", "ellipseText", "alwaysShowPrev", "alwaysShowNext"]
            //这些属性不被监控
            vm.$init = function (continueScan) {
                var pageHTML = options.template
                element.style.display = "none"
                setTimeout(function () {
                    element.innerHTML = pageHTML
                    vm.rootElement = element.getElementsByTagName("*")[0]
                    element.style.display = "block"
                    if (continueScan) {
                        continueScan()
                    } else {
                        avalon.log("avalon请尽快升到1.3.7+")
                        avalon.scan(element, [vmodel].concat(vmodels))
                        if (typeof options.onInit === "function") {
                            options.onInit.call(element, vmodel, options, vmodels)
                        }
                    }
                }, 100)
            }
            vm.$remove = function () {
                element.innerHTML = element.textContent = ""
            }
            vm.jumpPage = function (event, page) {
                event.preventDefault()
                var enabled = this.className.indexOf("state-disabled") === -1
                if (enabled && page !== vm.currentPage) {
                    switch (page) {
                        case "first":
                            vm.currentPage = 1
                            break
                        case "last":
                            vm.currentPage = vm.totalPages
                            break
                        case "next":
                            vm.currentPage++
                            if (vm.currentPage > vm.totalPages) {
                                vm.currentPage = vm.totalPages
                            }
                            break
                        case "prev":
                            vm.currentPage--
                            if (vm.currentPage < 1) {
                                vm.currentPage = 1
                            }
                            break
                        default:
                            vm.currentPage = page
                            break
                    }
                    vm.onJump.call(element, event, vm)
                    efficientChangePages(vm.pages, getPages(vm))
                }
            }
            vm.$watch("totalItems", function () {
                efficientChangePages(vm.pages, getPages(vm))
            })
            vm.$watch("perPages", function (a) {
                vm.currentPage = 1
                efficientChangePages(vm.pages, getPages(vm))
            })
            vm.$watch("currentPage", function (a) {
                vmodel._currentPage = a
                efficientChangePages(vm.pages, getPages(vm))
            })
            vm.isShowPrev = function () {
                var a = vm.alwaysShowPrev;
                var b = vm.firstPage
                return a || b !== 1
            }
            vm.isShowNext = function () {
                var a = vm.alwaysShowNext
                var b = vm.lastPage
                var c = vm.totalPages
                return a || b !== c
            }

            vm.changeCurrentPage = function (e, value) {
                if (e.type === "keyup") {
                    value = this.value
                    if (e.keyCode !== 13)
                        return
                } else {
                    value = vmodel._currentPage
                }
                value = parseInt(value, 10) || 1
                if (value > vmodel.totalPages || value < 1)
                    return
                //currentPage需要转换为Number类型 fix lb1064@qq.com
                vmodel.currentPage = value
                vmodel.pages = getPages(vmodel)
                vmodel.onJump.call(element, e, vm);
            }
            vm.pages = []
            vm.getPages = getPages

            //设置语言包
            vm.setRegional = function (regional) {
                vmodel.regional = regional
            }
            vm._getTotalPages = function (totalPages) {
                //return {{regional.totalText}}{{totalPages}}{{regional.pagesText}}，{{regional.toText}}{{regional.numberText}}
                var regional = vmodel.regional,
                        html = [regional.totalText, totalPages]

                if (totalPages > 1) {
                    html.push(regional.pagesText)
                } else {
                    html.push(regional.pageText)
                }

                html = html.concat([" ", regional.jumpToText, regional.numberText])

                return html.join("")
            }

            /**
             * @config {Function} 获取页码上的title的函数
             * @param {String|Number} a 当前页码的类型，如first, prev, next, last, 1, 2, 3
             * @param {Number} currentPage 当前页码
             * @param {Number} totalPages 最大页码
             * @returns {String}
             */
            vm.getTitle = function (a, currentPage, totalPages) {

                var regional = vmodel.regional

                switch (a) {
                    case "first":
                        if (currentPage == 1) {
                            return regional.currentText
                        }
                        return regional.jumpToText + " " + regional.firstText
                    case "prev":
                        return regional.jumpToText + " " + regional.prevText
                    case "next":
                        return regional.jumpToText + " " + regional.nextText
                    case "last":
                        if (currentPage == totalPages) {
                            return regional.currentText
                        }
                        return regional.jumpToText + " " + regional.lastText
                    default:
                        if (a === currentPage) {
                            return regional.currentText
                        }
                        return regional.jumpToText + regional.numberText + " " + a + regional.pageText
                }
            }
        })
        vmodel.pages = getPages(vmodel)

        return vmodel
    }
    //vmodel.pages = getPages(vmodel) 会波及一些其他没有改动的元素节点,现在只做个别元素的添加删除操作
    function efficientChangePages(aaa, bbb) {
        var obj = {}
        for (var i = 0, an = aaa.length; i < an; i++) {
            var el = aaa[i]
            obj[el] = {action: "del", el: el}
        }
        for (var i = 0, bn = bbb.length; i < bn; i++) {
            var el = bbb[i]
            if (obj[el]) {
                obj[el] = {action: "retain", el: el}
            } else {
                obj[el] = {action: "add", el: el}
            }
        }
        var scripts = []
        for (var i in obj) {
            scripts.push({
                action: obj[i].action,
                el: obj[i].el
            })
        }
        scripts.sort(function (a, b) {
            return a.el - b.el
        })
        scripts.forEach(function (el, index) {
            el.index = index
        })
        //添加添加
        var reverse = []
        for (var i = 0, el; el = scripts[i++]; ) {
            switch (el.action) {
                case "add":
                    aaa.splice(el.index, 0, el.el)
                    break;
                case "del":
                    reverse.unshift(el)
                    break;
            }
        }
        //再删除
        for (var i = 0, el; el = reverse[i++]; ) {
            aaa.splice(el.index, 1)
        }

    }

    //默认语言包为中文简体
    widget.regional = []
    widget.regional["zh-CN"] = {
        prevText: "上一页",
        nextText: "下一页",
        confirmText: "确定",
        totalText: "共",
        pagesText: "页",
        pageText: "页",
        toText: "到",
        jumpToText: "跳转到",
        currentText: "当前页",
        firstText: "第一页",
        lastText: "最后一页",
        numberText: "第"
    }

    //设置默认语言包
    widget.defaultRegional = widget.regional["zh-CN"]

    widget.defaults = {
        perPages: 10, //@config {Number} 每页包含多少条目
        showPages: 10, //@config {Number} 中间部分一共要显示多少页(如果两边出现省略号,即它们之间的页数) 
        currentPage: 1, //@config {Number} 当前选中的页面 (按照人们日常习惯,是从1开始)，它会被高亮 
        _currentPage: 1, //@config {Number}  跳转台中的输入框显示的数字，它默认与currentPage一致
        totalItems: 200, //@config {Number} 总条目数
        totalPages: 0, //@config {Number} 总页数,通过Math.ceil(vm.totalItems / vm.perPages)求得
        pages: [], //@config {Array} 要显示的页面组成的数字数组，如[1,2,3,4,5,6,7]
        nextText: ">", //@config {String} “下一页”分页按钮上显示的文字 
        prevText: "<", //@config {String} “上一页”分页按钮上显示的文字 
        ellipseText: "…", //@config {String} 省略的页数用什么文字表示 
        firstPage: 0, //@config {Number} 当前可显示的最小页码，不能小于1
        lastPage: 0, //@config {Number} 当前可显示的最大页码，不能大于totalPages
        alwaysShowNext: false, //@config {Boolean} 总是显示向后按钮
        alwaysShowPrev: false, //@config {Boolean} 总是显示向前按钮
        showFirstOmit: false,
        showLastOmit: false,
        showJumper: false, //是否显示输入跳转台
        /*
         * @config {Function} 用于重写模板的函数 
         * @param {String} tmpl
         * @param {Object} opts
         * @returns {String}
         */
        getTemplate: function (tmpl, opts) {
            return tmpl
        },
        options: [], // @config {Array}数字数组或字符串数组或对象数组,但都转换为对象数组,每个对象都应包含text,value两个属性, 用于决定每页有多少页(看avalon.pager.ex3.html) 
        /**
         * @config {Function} 页面跳转时触发的函数,如果当前链接处于不可以点状态(oni-state-disabled),是不会触发的
         * @param {Event} e
         * @param {Object} vm  组件对应的VM
         */
        onJump: function (e, vm) {
        }
    }

    function getPages(vm) {
        var c = vm.currentPage, max = Math.ceil(vm.totalItems / vm.perPages), pages = [], s = vm.showPages,
                left = c, right = c
        //一共有p页，要显示s个页面
        vm.totalPages = max
        if (max <= s) {
            for (var i = 1; i <= max; i++) {
                pages.push(i)
            }
        } else {
            pages.push(c)
            while (true) {
                if (pages.length >= s) {
                    break
                }
                if (left > 1) {//在日常生活是以1开始的
                    pages.unshift(--left)
                }
                if (pages.length >= s) {
                    break
                }
                if (right < max) {
                    pages.push(++right)
                }
            }
        }
        vm.firstPage = pages[0] || 1
        vm.lastPage = pages[pages.length - 1] || 1
        vm.showFirstOmit = vm.firstPage > 2
        vm.showLastOmit = vm.lastPage < max - 1
        return  pages//[0,1,2,3,4,5,6]
    }
    return avalon
})
/**
 * @other
 * <p>pager 组件有一个重要的jumpPage方法，用于决定它的跳转方式。它有两个参数，第一个事件对象，第二个是跳转方式，见源码：</p>
 ```javascript
 vm.jumpPage = function(event, page) {
 event.preventDefault()
 if (page !== vm.currentPage) {
 switch (page) {
 case "first":
 vm.currentPage = 1
 break
 case "last":
 vm.currentPage = vm.totalPages
 break
 case "next":
 vm.currentPage++
 if (vm.currentPage > vm.totalPages) {
 vm.currentPage = vm.totalPages
 }
 break
 case "prev":
 vm.currentPage--
 if (vm.currentPage < 1) {
 vm.currentPage = 1
 }
 break
 default:
 vm.currentPage = page
 break
 }
 vm.onJump.call(element, event, vm)
 efficientChangePages(vm.pages, getPages(vm))
 }
 }
 ```
 */

/**
 *  @links
 [显示跳转台](avalon.pager.ex1.html)
 [指定回调onJump](avalon.pager.ex2.html)
 [改变每页显示的数量](avalon.pager.ex3.html)
 [指定上一页,下一页的文本](avalon.pager.ex4.html)
 [通过左右方向键或滚轮改变页码](avalon.pager.ex5.html)
 [总是显示上一页与下一页按钮](avalon.pager.ex6.html)
 [多语言支持](avalon.pager.ex7.html)
 *
 */
//http://luis-almeida.github.io/jPages/defaults.html
//http://gist.corp.qunar.com/jifeng.yao/gist/demos/pager/pager.html

;

define('text!dropdown/avalon.dropdown.html',[],function () { return '<div class="oni-dropdown"\n     ms-class="oni-dropdown-state-disabled:!enable"\n     ms-class-1="{{titleClass}}"\n     ms-css-width="{{width}}"\n     ms-class-2="oni-dropdown-state-focus: focusClass"\n     ms-hover="oni-dropdown-state-hover"\n     ms-mouseenter="_titleenter"\n     ms-mouseleave="_titleleave"\n     ms-keydown="_keydown"\n     tabindex="0">\n    <div class="oni-dropdown-source">\n        <div class="oni-dropdown-input"\n             ms-attr-title="title"\n             ms-css-width="titleWidth"\n             id="title-MS_OPTION_ID">{{label|sanitize|html}}</div>\n        <div class="oni-dropdown-icon-wrap">\n            <i class="oni-dropdown-icon oni-icon oni-icon-angle-up"\n               ms-visible="toggle">&#xf028;</i>\n            <i class="oni-dropdown-icon oni-icon oni-icon-angle-down"\n               ms-visible="!toggle">&#xf032;</i>\n        </div>\n    </div>\n</div>\nMS_OPTION_TEMPLATE\n<div class="oni-dropdown"\n     ms-class="oni-dropdown-menu:!multiple"\n     ms-class-1="{{listClass}}"\n     ms-css-width="{{listWidth}}"\n     ms-mouseenter="_listenter"\n     ms-mouseleave="_listleave"\n     ms-visible="toggle||multiple">\n    <div class="oni-dropdown-menu-inner"\n         ms-css-width="menuWidth"\n         ms-css-height="menuHeight"\n         ms-widget="scrollbar,scrollbar-MS_OPTION_ID" id="menu-MS_OPTION_ID">\n        <div class="oni-scrollbar-scroller"\n             id="list-MS_OPTION_ID">\n            <div ms-repeat="data" class="oni-dropdown-item"\n                 ms-click-12="_select($index, $event)"\n                 ms-attr-title="el.title||el.label"\n                 ms-visible="el.toggle"\n                 ms-hover="oni-dropdown-state-hover: el.enable"\n                 ms-class-1="oni-dropdown-state-disabled:!el.enable"\n                 ms-class-2="oni-dropdown-state-active:isActive(el, multipleChange)"\n                 ms-class-4="oni-dropdown-group:el.group"\n                 ms-class-5="oni-dropdown-divider:el.group && !$first"\n                 data-repeat-rendered="repeatRendered"\n                 >{{el.label|sanitize|html}}</div>\n        </div>\n    </div>\n</div>\n';});

define('avalon.getModel',["avalon"], function(avalon) {
    function getChildVM(expr, vm, strLen) {
        var t = vm, pre, _t;
        for (var i = 0, len = expr.length; i < len; i++) {
            var k = expr[i];
            _t = t.$model || t;
            if (typeof _t[k] !== 'undefined') {
                pre = t;
                t = t[k];
            } else {
                return;
            }
        }
        if (strLen > 1) {
            return pre[k];
        } else {
            return pre;
        }
    }
   // 在一堆VM中，提取某一个VM的符合条件的子VM
   // 比如 vm.aaa.bbb = {} ; 
   // avalon.getModel("aaa.bbb", vmodels) ==> ["bbb", bbbVM, bbbVM所在的祖先VM（它位于vmodels中）]
    avalon.getModel = function(expr, vmodels){
        if (!expr) {
            return null;
        }
        var str = expr.split('.'),
            strLen = str.length,
            last = str[strLen-1];
        if (str.length != 1) {
            str.pop();
        }
        for (var i = 0, len = vmodels.length; i < len; i++) {
            var ancestor = vmodels[i];
            var child = getChildVM(str, ancestor, strLen);
            if (typeof child !== 'undefined' && (child.hasOwnProperty(last) || Object.prototype.hasOwnProperty.call(child, last))) {
                return [last, child, ancestor];
            }
        }
        return null;
    }
    return avalon;
});

define('text!scrollbar/avalon.scrollbar.html',[],function () { return '<div ms-repeat-pos="_position" class="oni-scrollbar oni-helper-reset oni-helper-clearfix oni-widget"\n     ms-visible="!disabled"\n\t ms-class-100="oni-scrollbar-{{pos}}" \n\t ms-class-101="oni-scrollbar-{{size}} oni-scrollbar-{{pos}}-{{size}}"\n\t ms-class-102="oni-scrollbar-state-disabled:disabled" \n\t ms-mouseenter="_show($event, \'always\', $index)"\n\t ms-visible="toggle">\n\t<div ms-if="showBarHeader" class="oni-scrollbar-arrow oni-scrollbar-arrow-up" \n\t ms-click="_arrClick($event, \'up\', pos, $index)" \n\t ms-mousedown="_arrDown($event,\'up\', pos, $index)"\n\t ms-class-100="oni-scrollbar-state-disabled:disabled" \n\t ms-mouseup="_arrDown($event,\'up\', pos, $index,\'release\')" \n\t ms-hover="oni-scrollbar-state-hover oni-scrollbar-arrow-hover"><b class="oni-scrollbar-trangle  oni-scrollbar-trangle-up"></b></div>\n\t<div class="oni-scrollbar-draggerpar" ms-click="_barClick($event, pos, $index)">\n\t\t<div class="oni-scrollbar-dragger"\n\t\tms-attr-data-draggable-axis="pos == \'left\' || pos == \'right\' ? \'y\' : \'x\'" \n\t\tms-click="_stopPropagation($event)"\n\t\tms-class-100="oni-scrollbar-state-disabled:disabled" \n\t\tms-mouseover="_show($event,\'always\',$index)"\n\t\tms-mousedown="_draggerDown($event, true)" \n\t\tms-mouseup="_draggerDown($event, false)" \n\t\tms-mouseout="_draggerDown($event, false)"\n\t\tms-hover="oni-scrollbar-state-hover"\n\t\t>{{draggerHTML | html}}</div>\n\t</div>\n\t<div ms-if="showBarHeader" class="oni-scrollbar-arrow oni-scrollbar-arrow-down"\n\t ms-click="_arrClick($event, \'down\', pos, $index)"\n\t ms-mousedown="_arrDown($event,\'down\', pos, $index)" \n\t ms-mouseup="_arrDown($event,\'down\', pos, $index,\'release\')"\n\t ms-class-100="oni-scrollbar-state-disabled:disabled" \n\t ms-hover="oni-scrollbar-state-hover"><b class="oni-scrollbar-trangle oni-scrollbar-trangle-down"></b></div>\n</div>';});

define('draggable/avalon.draggable',["avalon"], function(avalon) {
    var defaults = {
        ghosting: false,
        //是否影子拖动，动态生成一个元素，拖动此元素，当拖动结束时，让原元素到达此元素的位置上,
        delay: 0,
        axis: 'xy',
        started: true,
        start: avalon.noop,
        beforeStart: avalon.noop,
        drag: avalon.noop,
        beforeStop: avalon.noop,
        stop: avalon.noop,
        scrollPlugin: true,
        scrollSensitivity: 20,
        scrollSpeed: 20
    };

    var styleEl = document.getElementById('avalonStyle');
    //拖动时禁止文字被选中，禁止图片被拖动
    var cssText = '.ui-helper-global-drag *{ -webkit-touch-callout: none;' + '-khtml-user-select: none;' + '-moz-user-select: none;' + '-ms-user-select: none;' + 'user-select: none;}' + '.ui-helper-global-drag img{-webkit-user-drag:none; ' + 'pointer-events:none;}';
    try {
        styleEl.innerHTML += cssText;
    } catch (e) {
        styleEl.styleSheet.cssText += cssText;
    }
    var body;
    var ua = navigator.userAgent;
    var isAndroid = /Android/i.test(ua);
    var isBlackBerry = /BlackBerry/i.test(ua);
    var isWindowPhone = /IEMobile/i.test(ua);
    var isIOS = /iPhone|iPad|iPod/i.test(ua);
    var isMobile = isAndroid || isBlackBerry || isWindowPhone || isIOS;
    if (!isMobile) {
        var dragstart = 'mousedown';
        var drag = 'mousemove';
        var dragstop = 'mouseup';
    } else {
        dragstart = 'touchstart';
        drag = 'touchmove';
        dragstop = 'touchend';
    }

    function getOptions(opts, vmodels) {
        var i = 0, l = vmodels.length;
        for (; i < l; i++) {
            if (typeof vmodels[i][opts] === 'object') {
                return vmodels[i];
            }
        }
        return vmodels[0];
    }

    var draggable = avalon.bindingHandlers.draggable = function (data, vmodels) {
            var args = data.value.match(avalon.rword) || [];
            var ID = args[0] || '$';
            var opts = args[1] || 'draggable';
            var model, vmOptions, optionsData;
            if (ID != '$') {
                model = avalon.vmodels[ID];
                //如果指定了此VM的ID
                if (!model) {
                    return;
                }
            }
            data.element.removeAttribute('ms-draggable');

            if (!model) {
                //如果使用$或绑定值为空，那么就默认取最近一个VM，没有拉倒
                // model = vmodels.length ? vmodels[0] : null;
                model = vmodels.length ? getOptions(opts, vmodels) : null;
            }
            var fnObj = model || {};
            if (model && typeof model[opts] === 'object') {
                //如果指定了配置对象，并且有VM
                vmOptions = model[opts];
                if (vmOptions.$model) {
                    vmOptions = vmOptions.$model;
                }
                fnObj = vmOptions;
            }
            var element = data.element;
            var $element = avalon(element);
            var options = avalon.mix({}, defaults, vmOptions || {}, data[opts] || {}, avalon.getWidgetData(element, 'draggable'));
            //修正drag,stop为函数
            'drag,stop,start,beforeStart,beforeStop'.replace(avalon.rword, function (name) {
                var method = options[name];
                if (typeof method === 'string') {
                    if (typeof fnObj[method] === 'function') {
                        options[name] = fnObj[method];
                    }
                }
            });
            if (options.axis !== '' && !/^(x|y|xy)$/.test(options.axis)) {
                options.axis = 'xy';
            }
            body = document.body;
            //因为到这里时，肯定已经domReady
            $element.bind(dragstart, function (e) {
                stopPropagation(e)

                var data = avalon.mix({}, options, {
                        element: element,
                        $element: $element,
                        pageX: getPosition(e, 'X'),
                        //相对于页面的坐标, 会改动
                        pageY: getPosition(e, 'Y'),
                        //相对于页面的坐标，会改动
                        marginLeft: parseFloat($element.css('marginLeft')) || 0,
                        marginTop: parseFloat($element.css('marginTop')) || 0
                    });
                data.startPageX = data.pageX;
                //一次拖放只赋值一次
                data.startPageY = data.pageY;
                //一次拖放只赋值一次
                options.axis.replace(/./g, function (a) {
                    data['drag' + a.toUpperCase()] = true;
                });
                if (!data.dragX && !data.dragY) {
                    data.started = false;
                }
                //在处理手柄拖动前做些事情
                if (typeof options.beforeStart === 'function') {
                    options.beforeStart.call(data.element, e, data);
                }
                if (data.handle && fnObj) {
                    // 实现手柄拖动
                    var handle = fnObj[data.handle];
                    handle = typeof handle === 'function' ? handle : data.handle;
                    if (typeof handle === 'function') {
                        var checked = handle.call(element, e, data);
                        //要求返回一节点
                        if (checked && checked.nodeType === 1) {
                            if (!element.contains(checked)) {
                                return;    // 不能返回 false，这会阻止文本被选择
                            }
                        } else {
                            return;
                        }
                    }
                }
                fixUserSelect();
                var position = $element.css('position');
                //如果原元素没有被定位
                if (!/^(?:r|a|f)/.test(position)) {
                    element.style.position = 'relative';
                    element.style.top = '0px';
                    element.style.left = '0px';
                }
                if (options.delay && isFinite(options.delay)) {
                    data.started = false;
                    setTimeout(function () {
                        data.started = true;
                    }, options.delay);
                }
                var startOffset = $element.offset();
                if (options.ghosting) {
                    var clone = element.cloneNode(true);
                    avalon(clone).css('opacity', 0.7).width(element.offsetWidth).height(element.offsetHeight);
                    data.clone = clone;
                    if (position !== 'fixed') {
                        clone.style.position = 'absolute';
                        clone.style.top = startOffset.top - data.marginTop + 'px';
                        clone.style.left = startOffset.left - data.marginLeft + 'px';
                    }
                    body.appendChild(clone);
                }
                var target = avalon(data.clone || data.element);
                //拖动前相对于offsetParent的坐标
                data.startLeft = parseFloat(target.css('left'));
                data.startTop = parseFloat(target.css('top'));
                //拖动后相对于offsetParent的坐标
                //如果是影子拖动，代理元素是绝对定位时，它与原元素的top, left是不一致的，因此当结束拖放时，不能直接将改变量赋给原元素
                data.endLeft = parseFloat($element.css('left')) - data.startLeft;
                data.endTop = parseFloat($element.css('top')) - data.startTop;
                data.clickX = data.pageX - startOffset.left;
                //鼠标点击的位置与目标元素左上角的距离
                data.clickY = data.pageY - startOffset.top;
                //鼠标点击的位置与目标元素左上角的距离
                setContainment(options, data);

                // 处理containment滚动
                if(data.originContainment === "parent"){
                    var container = elem = data.element.parentNode
                    data.scrollOffsetTop = avalon(container).offset().top
                }

                //修正containment
                draggable.dragData = data;
                //决定有东西在拖动
                'start,drag,beforeStop,stop'.replace(avalon.rword, function (name) {
                    //console.log(options[name])
                    draggable[name] = [options[name]];
                });
                draggable.plugin.call('start', e, data);
            });
        };
    var xy2prop = {
            'X': 'Left',
            'Y': 'Top'
        };
    //插件系统
    draggable.dragData = {};
    draggable.start = [];
    draggable.drag = [];
    draggable.stop = [];
    draggable.beforeStop = [];
    draggable.plugin = {
        add: function (name, set) {
            for (var i in set) {
                var fn = set[i];
                if (typeof fn === 'function' && Array.isArray(draggable[i])) {
                    fn.isPlugin = true;
                    fn.pluginName = name + 'Plugin';
                    draggable[i].push(fn);
                }
            }
        },
        call: function (name, e, data) {
            var array = draggable[name];
            if (Array.isArray(array)) {
                array.forEach(function (fn) {
                    //用户回调总会执行，插件要看情况
                    if (typeof fn.pluginName === 'undefined' ? true : data[fn.pluginName]) {
                        fn.call(data.element, e, data);
                    }
                });
            }
            if (name === 'stop') {
                for (var i in draggable) {
                    array = draggable[i];
                    if (Array.isArray(array)) {
                        array.forEach(function (fn) {
                            if (!fn.isPlugin) {
                                // 用户回调都是一次性的，插件的方法永远放在列队中
                                avalon.Array.remove(array, fn);
                            }
                        });
                    }
                }
            }
        }
    };
    //统一处理拖动的事件
    var lockTime = new Date() - 0, minTime = document.querySelector ? 12 : 30;
    avalon(document).bind(drag, function (e) {
        stopPropagation(e)

        var time = new Date() - lockTime;
        if (time > minTime) {
            //减少调用次数，防止卡死IE6-8
            lockTime = time;
            var data = draggable.dragData;
            if (data.started === true) {
                //fix touchmove bug;
                //IE 在 img 上拖动时默认不能拖动（不触发 mousemove，mouseup 事件，mouseup 后接着触发 mousemove ...）
                //防止 html5 draggable 元素的拖放默认行为 (选中文字拖放)
                e.preventDefault();
                //使用document.selection.empty()来清除选择，会导致捕获失败
                var element = data.clone || data.element;
                setPosition(e, element, data, 'X');
                setPosition(e, element, data, 'Y');
                draggable.plugin.call('drag', e, data);
            }
        }
    });

    //统一处理拖动结束的事件
    avalon(document).bind(dragstop, function (e) {
        stopPropagation(e)

        var data = draggable.dragData;
        if (data.started === true) {
            restoreUserSelect();
            var element = data.element;
            draggable.plugin.call('beforeStop', e, data);
            if (data.dragX) {
                setPosition(e, element, data, 'X', true);
            }
            if (data.dragY) {
                setPosition(e, element, data, 'Y', true);
            }
            if (data.clone) {
                body.removeChild(data.clone);
            }
            draggable.plugin.call('stop', e, data);
            draggable.dragData = {};
        }
    });
    function getPosition(e, pos) {
        var page = 'page' + pos;
        return isMobile ? e.changedTouches[0][page] : e[page];
    }
    function setPosition(e, element, data, pos, end) {
        var page = getPosition(e, pos);
        if (data.containment) {
            var min = pos === 'X' ? data.containment[0] : data.containment[1];
            var max = pos === 'X' ? data.containment[2] : data.containment[3];
            var check = page - (pos === 'X' ? data.clickX : data.clickY);
            if (check < min) {
                page += Math.abs(min - check);
            } else if (check > max) {
                page -= Math.abs(max - check);
            }
        }

        // 处理containment滚动
        if(data.originContainment === "parent" && pos === "Y"){
            var container = elem = data.element.parentNode
            page -= avalon(container).offset().top - data.scrollOffsetTop
        }

        data['page' + pos] = page;
        //重设pageX, pageY
        var Prop = xy2prop[pos];
        var prop = Prop.toLowerCase();
        var number = data['start' + Prop] + page - data['startPage' + pos] + (end ? data['end' + Prop] : 0);
        data[prop] = number;
        if (data['drag' + pos]) {
            //保存top, left
            element.style[prop] = number + 'px';
        }
    }
    var rootElement = document.documentElement;
    var fixUserSelect = function () {
        avalon(rootElement).addClass('ui-helper-global-drag');
    };
    var restoreUserSelect = function () {
        avalon(rootElement).removeClass('ui-helper-global-drag');
    };
    if (window.VBArray && !('msUserSelect' in rootElement.style)) {
        var _ieSelectBack;
        //fix IE6789
        function returnFalse() {
            var e = window.event || {};
            e.returnValue = false;
        }
        fixUserSelect = function () {
            _ieSelectBack = body.onselectstart;
            body.onselectstart = returnFalse;
        };
        restoreUserSelect = function () {
            body.onselectstart = _ieSelectBack;
        };
    }
    function setContainment(o, data) {
        if (!o.containment) {
            if (Array.isArray(data.containment)) {
                return;
            }
            data.containment = null;
            return;
        }
        var elemWidth = data.$element.width();
        var elemHeight = data.$element.height();
        if (o.containment === 'window') {
            var $window = avalon(window);
            //左， 上， 右， 下
            data.containment = [
                $window.scrollLeft(),
                $window.scrollTop(),
                $window.scrollLeft() + $window.width() - data.marginLeft - elemWidth,
                $window.scrollTop() + $window.height() - data.marginTop - elemHeight
            ];
            return;
        }
        if (o.containment === 'document') {
            data.containment = [
                0,
                0,
                avalon(document).width() - data.marginLeft,
                avalon(document).height() - data.marginTop
            ];
            return;
        }
        if (Array.isArray(o.containment)) {
            var a = o.containment;
            data.containment = [
                a[0],
                a[1],
                a[2] - elemWidth,
                a[3] - elemHeight
            ];
            return;
        }
        if (o.containment === 'parent' || o.containment.charAt(0) === '#') {
            var elem;
            if (o.containment === 'parent') {
                data.originContainment = 'parent'
                elem = data.element.parentNode;
            } else {
                elem = document.getElementById(o.containment.slice(1));
            }
            if (elem) {
                var $offset = avalon(elem).offset();
                data.containment = [
                    $offset.left + data.marginLeft,
                    //如果元素设置了marginLeft，设置左边界时需要考虑它
                    $offset.top + data.marginTop,
                    $offset.left + elem.offsetWidth - data.marginLeft - elemWidth,
                    $offset.top + elem.offsetHeight - data.marginTop - elemHeight
                ];
            }
        }
    }

    function stopPropagation(event) {
    	if (event.stopPropagation) {
    		event.stopPropagation();
    	} else if (event.cancelBubble !== undefined && event.cancelBubble !== true) {
    		event.cancelBubble = true;
    	}
    }

    return avalon
})
;

define('css!scrollbar/avalon.scrollbar',[],function(){});
/**
 * @cnName 滚动条组件
 * @enName scrollbar
 * @introduce
 *  <p> 自定义滚动条样式，绑定ms-widget="scrollbar"的元素内必须包含一个class="oni-scrollbar-scroller"的视窗元素</p>
 */
define('scrollbar/avalon.scrollbar',["avalon", "text!./avalon.scrollbar.html", "../draggable/avalon.draggable", "css!./avalon.scrollbar.css", "css!../chameleon/oniui-common.css"], function(avalon, template) {

    // get by className, not strict
    function getByClassName(cname, par) {
        var par = par || document.body
        if(par.getElementsByClassName) {
            return par.getElementsByClassName(cname)
        } else {
            var child = par.getElementsByTagName("*"),
                arr = []
            avalon.each(child, function(i, item) {
                var ele = avalon(item)
                if(ele.hasClass(cname)) arr.push(item)
            })
            return arr
        }
    }

    // IE 6,7,8滚动条不上效果
    var isIE678 = navigator.userAgent.match(/msie [678]/gi)

    function strToNumber(s) {
        return Math.round(parseFloat(s)) || 0
    }

    // 响应wheel,binded
    var wheelBinded,
        wheelArr = [],
        keyArr = [],
        scrollerGetted = []

    var widget = avalon.ui.scrollbar = function(element, data, vmodels) {
        var options = data.scrollbarOptions
        //方便用户对原始模板进行修改,提高定制性
        options.template = options.getTemplate(template, options)

        var vmodel = avalon.define(data.scrollbarId, function(vm) {
            avalon.mix(vm, options)
            vm.widgetElement = element
            vm.draggerHeight = vm.draggerWidth = ""
            vm.inFocuse = false
            vm._position = []
            vm.rootElement = element
            vm.viewElement = element
            vm.$skipArray = ["rootElement"]
            vm.dragging = false

            var inited,
                bars = [],
                scroller
            vm.$init = function(continueScan) {
                if(inited) return
                inited = true
                vmodel.widgetElement.style.position = "relative"
                //document body情形需要做一下修正
                vmodel.viewElement = vmodel.widgetElement == document.body ? document.getElementsByTagName(
                    "html")[0] : vmodel.widgetElement
                vmodel.viewElement.style.overflow = vmodel.viewElement.style.overflowX = vmodel.viewElement.style.overflowY = "hidden"
                if(vmodel.widgetElement == document.body) vmodel.widgetElement.style.overflow = vmodel.widgetElement.style.overflowX = vmodel.widgetElement.style.overflowY = "hidden"
                vmodel._position = vmodel.position.split(",")

                var frag = avalon.parseHTML(options.template)
                vmodel.widgetElement.appendChild(frag)
                if (continueScan) {
                    continueScan()
                } else {
                    avalon.log("avalon请尽快升到1.3.7+")
                    avalon.scan(element, [vmodel].concat(vmodels))
                    if (typeof options.onInit === "function") {
                        options.onInit.call(element, vmodel, options, vmodels)
                    }
                }
                var children = vmodel.widgetElement.childNodes
                avalon.each(children, function(i, item) {
                    var ele = avalon(item)
                    if(ele.hasClass("oni-scrollbar") || ele.hasClass("ui-scrollbar")) {
                        bars.push(ele)
                    } else if(ele.hasClass("oni-scrollbar-scroller") || ele.hasClass("ui-scrollbar-scroller")) {
                        scroller = ele
                    }
                })
                // 竖直方向支持滚轮事件
                if(vmodel.position.match(/left|right/g)) {
                    var vs = [],hs = []
                    avalon.each(vmodel._position, function(i, item) {
                        if(item.match(/left|right/g)) {
                            vs.push([i, item])
                        } else {
                            hs.push([i, item])
                        }
                    })

                    function wheelLike(diretion, arr, e, func) {
                        avalon.each(arr, function(i, item) {
                            if(!bars[i].data("oni-scrollbar-needed")) return
                            vmodel._computer(func || function(obj) {
                                return vmodel._clickComputer(obj, diretion)
                            }, item[0], item[1], function(breakOut) {
                                if(!breakOut) e.preventDefault()
                            }, "breakOutCallbackCannotIgnore")
                        })
                    }
                    function myOnWheel(e) {
                        if(vmodel.disabled) return
                        if(vmodel.inFocuse) {
                            wheelLike(e.wheelDelta > 0 ? "up" : "down", vs, e)
                        }
                    }
                    function myKeyDown(e) {
                        if(vmodel.disabled) return
                        var k = e.keyCode
                        if(k > 32 && k < 41 & vmodel.inFocuse) {
                            // 方向按键
                            if(k in {37:1, 39: 1, 38: 1, 40:1}) {
                                wheelLike(k in {37:1, 38:1} ? "up" : "down", k in {38: 1, 40:1} ? vs : hs, e)
                            // end or home
                            // pageup or pagedown
                            } else{
                                var diretion = k in {33: 1, 36: 1} ? "up" : "down"
                                wheelLike(diretion, vs, e, function(obj) {
                                    var _top = scroller[0].scrollTop
                                    // home, pageup
                                    if(k in {33: 1, 36: 1}) {
                                        if(_top) e.preventDefault()
                                    // end, pagedown
                                    } else {
                                        if(_top < obj.scrollerH - obj.viewH) e.preventDefault()
                                    }
                                    // home or end
                                    // end plus 100, easy to trigger breakout
                                    if(k in {36: 1, 35: 1}) {
                                        return {
                                            x: 0,
                                            y: k == 36 ? 0 : obj.draggerparHeight - obj.draggerHeight + 100
                                        }
                                    // pageup or pagedown
                                    // a frame
                                    } else {
                                        // frame 计算方式更新为百分比
                                        var frame = (obj.draggerparHeight - obj.draggerHeight) * obj.viewH / (obj.scrollerH - obj.viewH)
                                        return vmodel._clickComputer(obj, diretion, strToNumber(frame) || 1)
                                    }
                                })
                            }
                        }
                    }
                    // document.body直接如此处理
                    if(vmodel.widgetElement == document.body) {
                        vmodel.inFocuse = true
                        wheelArr.push(myOnWheel)
                        keyArr.push(myKeyDown)
                    } else {
                        avalon.bind(element, "mouseenter", function(e) {
                            vmodel.inFocuse = true
                            wheelArr.push(myOnWheel)
                            keyArr.push(myKeyDown)
                        })
                        avalon.bind(element, "mouseleave", function(e) {
                            vmodel.inFocuse = false
                            for(var i = 0, len = wheelArr.length; i < len; i++) {
                                if(wheelArr[i] === myOnWheel) {
                                    wheelArr.splice(i, 1)
                                    keyArr.splice(i, 1)
                                    break
                                }
                            }
                        })
                    }
                    // 所有组件实例公用一个事件绑定
                    if(!wheelBinded) {
                        wheelBinded = true
                        avalon.bind(document, "mousewheel", function(e) {
                            var cb = wheelArr[wheelArr.length - 1]
                            cb && cb(e)
                        })
                        // keyborad,,,simida
                        // left 37
                        // right 39
                        // top 38
                        // down 40
                        // pageup 33
                        // pagedown 34
                        // home 36
                        // end 35
                        avalon.bind(document, "keydown", function(e) {
                           var cb = keyArr[keyArr.length - 1]
                            cb && cb(e)
                        })
                    }

                }


                avalon.bind(element, "mouseenter", function() {
                    avalon.each(bars, function(i, item) {
                        vmodel._show("e", false, item)
                    })
                })
                avalon.bind(element, "mouseleave", function() {
                    vmodel._hide()
                })

                vmodel.update("init")

                if(scroller && scrollerGetted.length) {
                    avalon.each(scrollerGetted, function(i, func) {
                        func()
                    })
                    scrollerGetted = []
                }
            }

            // data-draggable-before-start="beforeStartFn" 
            // data-draggable-start="startFn" 
            // data-draggable-drag="dragFn" 
            // data-draggable-before-stop="beforeStopFn" 
            // data-draggable-stop="stopFn" 
            // data-draggable-containment="parent" 
            vm.$draggableOpts = {
                beforeStart: function() {
                    vmodel.dragging = true
                },
                drag: function(e, data) {
                    var dr = avalon(data.element)
                    vmodel._computer(function(obj) {
                        var a = {
                            x: strToNumber(dr.css("left")) >> 0,
                            y: strToNumber(dr.css("top")) >> 0
                        }
                        // easy to break out
                        if(a.x == obj.draggerparWidth - obj.draggerWidth) a.x += 100
                        if(a.y == obj.draggerparHeight - obj.draggerHeight) a.y += 100
                        return a
                    }, dr.attr("oni-scrollbar-index"), dr.attr("oni-scrollbar-pos"))
                }, 
                handle: function(e, data) {
                    return !vmodel.disabled && this
                },
                containment: "parent"
            }
            vm.$draggableOpts.stop = function(e, data) {
                vmodel.$draggableOpts.drag(e, data)
                vmodel.dragging = false
                avalon(data.element).removeClass("oni-scrollbar-state-active")
            }

            vm.$remove = function() {
                avalon.each(bars, function(i, bar) {
                    bar[0] && bar[0].parentNode && bar[0].parentNode.removeChild(bar[0])
                })
            }

            vm._onScroll = function() {
                if(vmodel.show != "scrolling") return     
                avalon.each(bars, function(i, item) {
                    vmodel._show("e", false, item)
                })
            }
            vm._show = function(e, always, index) {
                if(vmodel.show != "scrolling") return
                e.stopPropagation && e.stopPropagation()
                var item = index.css ? index : bars[index]
                if(item) {
                    clearTimeout(item.data("oni-scrollbar-hidetimer"))
                    item.css("visibility", "visible")
                    if(!isIE678) {
                        item.css("opacity", 1)
                        if(!always) {
                            item.data("oni-scrollbar-hidetimer", setTimeout(function() {
                                item.css("opacity", 0)
                            }, 1000))
                        }
                    }
                }
            }
            vm._hide = function(e,index) {
                if(vmodel.show != "scrolling" || !isIE678) return
                if(index && bars[index]) {
                    bars[index].css("opacity", 0)
                } else {
                    avalon.each(bars, function(i, item) {
                        item.css("opacity", 0)
                    })
                }
            }
            //@interface getBars()返回所有的滚动条元素，avalon元素对象
            vm.getBars = function() {
                return bars
            }
            //@interface getScroller()返回scroller avalon对象
            vm.getScroller = function() {
                return scroller
            }
            //@interface update()更新滚动条状态，windowresize，内容高度变化等情况下调用，不能带参数
            vm.update = function(ifInit, x, y) {
                if(vmodel.disabled) return
                if(!scroller) return scrollerGetted.push(function() {
                    vmodel.update(ifInit, x, y)
                })
                var ele = avalon(vmodel.viewElement),
                    // 滚动内容宽高
                    viewW,
                    viewH,
                    // 计算滚动条可以占据的宽或者高
                    // barH = strToNumber(ele.css("height")),
                    barH = vmodel.widgetElement === document.body? vmodel.viewElement.clientHeight : strToNumber(ele.css("height")),
                    barW = strToNumber(ele.css("width")),
                    // 滚动视野区宽高，存在滚动视野区宽高和滚动宽高不一致的情况
                    h = vmodel.viewHeightGetter(ele),
                    w = vmodel.viewWidthGetter(ele),
                    p = vmodel.position,
                    barDictionary,
                    barMinus = {},
                    y = y == void 0 ? vmodel.scrollTop : y,
                    x = x == void 0 ? vmodel.scrollLeft : x
                //document body情形需要做一下修正
                if(vmodel.viewElement != vmodel.widgetElement) {
                    p.match(/right|left/g) && avalon(vmodel.widgetElement).css("height", barH)
                }
                // 水平方向内间距
                var hPadding = scroller.width() - scroller.innerWidth(),
                    // 竖直方向内间距
                    vPadding = scroller.height() - scroller.innerHeight()
                if(h + vPadding > 0) scroller.css("height", h + vPadding)
                if(w + hPadding > 0) scroller.css("width", w + hPadding )
                viewW = scroller[0].scrollWidth
                viewH = scroller[0].scrollHeight
                barDictionary = {
                    "top": p.match(/top/g) && viewW > w,
                    "right": p.match(/right/g) && viewH > h,
                    "bottom": p.match(/bottom/g) && viewW > w,
                    "left": p.match(/left/g) && viewH > h
                }
                if(bars.length > 1) {
                    var ps = ["top", "right", "bottom", "left"]
                    for(var i = 0; i < 4; i++) {
                        barMinus[ps[i]] = [(barDictionary[i ? ps[i - 1] : ps[3]] && 1) >> 0, (barDictionary[i < 3 ? ps[i + 1] : ps[0]] && 1) >> 0]
                        if(i > 1) barMinus[ps[i]] = barMinus[ps[i]].reverse()
                    }
                }
                // 根据实际视窗计算，计算更新scroller的宽高
                // 更新视窗
                h = scroller.innerHeight()
                w = scroller.innerWidth()
                avalon.each(vmodel._position, function(i, item) {
                    var bar = bars[i],
                        isVertical = item.match(/left|right/),
                        dragger
                    if(bar) {
                        dragger = avalon(getByClassName("oni-scrollbar-dragger", bar.element)[0])
                    }
                    // 拖动逻辑前移，确保一定是初始化了的
                    if(ifInit && dragger) {
                        dragger.attr("ms-draggable", "$,$draggableOpts")
                        dragger.attr("oni-scrollbar-pos", item)
                        dragger.attr("oni-scrollbar-index", i)
                        avalon.scan(dragger[0], vmodel)
                    }
                    // hidden bar
                    if(!barDictionary[item]) {
                        if(bar) {
                            if(!isIE678) bar.css("opacity", 0)
                            bar.css("visibility", "hidden")
                            bar.data("oni-scrollbar-needed", false)
                        }
                        return
                    } else {
                        if(bar) {
                            bar.data("oni-scrollbar-needed", true)
                            bar.css("visibility", "visible")
                            if(!isIE678) {
                                if(vmodel.show == "scrolling" || vmodel.show == "never"){
                                    bar.css("opacity", 0)
                                } else {
                                    bar.css("opacity", 1)
                                }
                            }
                        }
                    }
                    if(bar) {
                        var sh = strToNumber(bar.css("height")),
                            sw = strToNumber(bar.css("width")),
                            bh = sh,
                            bw = sw,
                            draggerpar = avalon(getByClassName("oni-scrollbar-draggerpar", bar[0])[0]),
                            headerLength = vmodel.showBarHeader ? 2 : 0
                        // 更新滚动条没有两端的箭头的时候依旧要重新计算相邻两个bar的间隔
                        var draggerParCss = []
                        if(bars.length > 1) {
                            var barCss = [], minus = barMinus[item]
                            if(isVertical) {
                                barCss = [
                                    ["top", minus[0] * bw],
                                    ["height", (barH - bw * (minus[0] + minus[1]))]
                                ]
                                draggerParCss = [
                                    ["top", (headerLength/2) * bw],
                                    ["height", (barH - bw * (minus[0] + minus[1] + headerLength))]
                                ]
                            } else {
                                barCss = [
                                    ["left", minus[0] * bh],
                                    ["width", (barW - bh * (minus[0] + minus[1]))]
                                ]
                                draggerParCss = [
                                    ["left", (headerLength/2) * bh],
                                    ["width", (barW - bh * (headerLength + minus[0] + minus[1]))]
                                ]
                            }
                            avalon.each(barCss, function(index, css) {
                                if(index == 1 && css[1] <= 0) return
                                bar.css.apply(bar, css)
                            })
                            bh = bar.height()
                            bw = bar.width()
                        } else {
                            if(isVertical) {
                                draggerParCss = [
                                    ["top", bw],
                                    ["height", (barH - bw * 2)]
                                ]
                            } else {
                                draggerParCss = [
                                    ["left", bh],
                                    ["width", (barW - bh * 2)]
                                ]
                            }
                        }
                        var ex
                        if(isVertical) {
                            ex = vmodel.show == "always" ? bw : 0
                            if(w + hPadding - ex > 0) scroller.css("width", w + hPadding - ex)
                        } else {
                            ex = vmodel.show == "always" ? bh : 0
                            if(h + vPadding - ex) scroller.css("height", h + vPadding - ex)
                        }
                        avalon.each(draggerParCss, function(index, css) {
                            if(index == 1 && css[1] <= 0) return
                            draggerpar.css.apply(draggerpar, css)
                        })
                        sh = bh - headerLength * bw
                        sw = bw - headerLength * bh
                        // 更新滚动头
                        var draggerCss
                        if(isVertical) {
                            var draggerTop = y,
                                draggerHeight =strToNumber(h * sh / viewH)
                                // 限定一个dragger的最小高度
                                draggerHeight = vmodel.limitRateV * bw > draggerHeight && vmodel.limitRateV * bw || draggerHeight
                                draggerTop = draggerTop < 0 ? 0 : draggerTop
                                draggerTop = draggerTop > viewH - h ? viewH - h : draggerTop
                                //draggerTop = sh * draggerTop / viewH
                                draggerTop = strToNumber((sh - draggerHeight) * draggerTop / (viewH - h))
                                draggerTop = Math.min(sh - draggerHeight, draggerTop)
                            draggerCss = [
                                ["width", "100%"],
                                ["height", draggerHeight],
                                ["top", draggerTop]
                            ]
                            y = y > 0 ? (y > viewH - h + ex ?  viewH - h + ex : y) : 0
                        } else {
                            var draggerLeft = x,
                                draggerWidth = strToNumber(w * sw / viewW)
                                // limit width to limitRateH * bh
                                draggerWidth = vmodel.limitRateH * bh > draggerWidth && vmodel.limitRateH * bh || draggerWidth
                                draggerLeft = draggerLeft < 0 ? 0 : draggerLeft
                                draggerLeft = draggerLeft > viewW - w ? viewW - w : draggerLeft
                                // draggerLeft = sw * draggerLeft / viewW
                                draggerLeft = strToNumber((sw - draggerWidth) * draggerLeft / (viewW - w))
                                draggerLeft = Math.min(sw - draggerWidth, draggerLeft)
                            draggerCss = [
                                ["height", "100%"],
                                ["width", draggerWidth],
                                ["left", draggerLeft]
                            ]
                            x = x > 0 ? (x > viewW - w + ex ? viewW - w + ex : x) : 0
                        }
                        avalon.each(draggerCss, function(index, css) {
                            if(index == 2 && css[1] <= 0) return
                            dragger.css.apply(dragger, css)
                        })
                        if(ifInit) {
                            if(isVertical) {
                                vmodel._scrollTo(void 0, y)
                            } else {
                                vmodel._scrollTo(x, void 0)
                            }
                        }
                        if(vmodel.showBarHeader) {
                            if(y == 0 && isVertical || !isVertical && x == 0) {
                                avalon(getByClassName("oni-scrollbar-arrow-up", bar[0])[0]).addClass("oni-scrollbar-state-disabled")
                            } else {
                                avalon(getByClassName("oni-scrollbar-arrow-up", bar[0])[0]).removeClass("oni-scrollbar-state-disabled")
                            }
                            if(y >= draggerpar.innerHeight() - dragger.innerHeight() && isVertical || !isVertical && x >= draggerpar.innerWidth() - dragger.innerWidth()) {
                               !vmodel.breakOutCallback && avalon(getByClassName("oni-scrollbar-arrow-down", bar[0])[0]).addClass("oni-scrollbar-state-disabled")
                            } else {
                                avalon(getByClassName("oni-scrollbar-arrow-down", bar[0])[0]).removeClass("oni-scrollbar-state-disabled")
                            }
                        }
                    }
                })
            }

            // 点击箭头
            vm._arrClick = function(e, diretion, position, barIndex) {
                if(vmodel.disabled) return
                vmodel._computer(function(obj) {
                    return vmodel._clickComputer(obj, diretion)
                }, barIndex, position)
            }

            vm._clickComputer = function(obj, diretion, step) {
                var step = step || obj.step || 40,
                    l = strToNumber(obj.dragger.css("left")) >> 0,
                    r = strToNumber(obj.dragger.css("top")) >> 0,
                    x = diretion == "down" ? l + step : l - step,
                    y = diretion == "down" ? r + step : r - step
                return {
                    x: x,
                    y: y
                }
            }
            // 长按
            vm._arrDown = function($event, diretion, position, barIndex,ismouseup) {
                if(vmodel.disabled) return
                var se = this,
                    ele = avalon(se)
                clearInterval(ele.data("mousedownTimer"))
                clearTimeout(ele.data("setTimer"))
                var bar = bars[barIndex]
                if(ismouseup || ele.hasClass("oni-scrollbar-state-disabled")) {
                    return ele.removeClass("oni-scrollbar-state-active")
                }
                // 延时开启循环
                ele.data("setTimer", setTimeout(function(){
                    ele.addClass("oni-scrollbar-state-active")
                    ele.data("mousedownTimer", setInterval(function() {
                        return vmodel._computer(function(obj) {
                                return vmodel._clickComputer(obj, diretion)
                            }, barIndex, position ,function(breakOut) {
                                if(!breakOut) return
                                clearInterval(ele.data("mousedownTimer"))
                                clearTimeout(ele.data("setTimer"))
                            })
                    }, 120))
                }, 10))
            }
            // 点击滚动条
            vm._barClick = function(e, position, barIndex) {
                if(vmodel.disabled) return
                var ele = avalon(this)
                if(ele.hasClass("oni-scrollbar-dragger")) return
                vmodel._computer(function(obj) {
                    return {
                        x: Math.ceil(e.pageX - obj.offset.left - obj.draggerWidth / 2),
                        y : Math.ceil(e.pageY - obj.offset.top - obj.draggerHeight / 2)
                    }
                }, barIndex, position)
            }
            // 计算滚动条位置
            vm._computer = function(axisComputer, barIndex, position, callback, breakOutCallbackCannotIgnore) {
                if(vmodel.disabled) return
                var bar = bars[barIndex]
                if(bar && bar.data("oni-scrollbar-needed")) {
                    var obj = {},
                        isVertical = position.match(/left|right/g)
                    obj.dragger = avalon(getByClassName("oni-scrollbar-dragger", bar[0])[0])
                    obj.draggerWidth = strToNumber(obj.dragger.css("width"))
                    obj.draggerHeight = strToNumber(obj.dragger.css("height"))
                    obj.draggerpar = avalon(obj.dragger[0].parentNode)
                    obj.draggerparWidth = strToNumber(obj.draggerpar.css("width"))
                    obj.draggerparHeight = strToNumber(obj.draggerpar.css("height"))
                    obj.offset = obj.draggerpar.offset()
                    obj.up = avalon(getByClassName("oni-scrollbar-arrow-up", bar[0])[0])
                    obj.down = avalon(getByClassName("oni-scrollbar-arrow-down", bar[0])[0])
                    obj.viewer = avalon(vmodel.viewElement)
                    // obj.viewH = vmodel.viewHeightGetter(obj.viewer)
                    // obj.viewW = vmodel.viewWidthGetter(obj.viewer)
                    // 更新的时候要用viewer先计算
                    // 计算的时候直接用scroller作为视窗计算宽高
                    // obj.viewH = vmodel.viewHeightGetter(scroller)
                    // obj.viewW = vmodel.viewWidthGetter(scroller)
                    obj.viewH = scroller.innerHeight()
                    obj.viewW = scroller.innerWidth()
                    obj.scrollerH = scroller[0].scrollHeight
                    obj.scrollerW = scroller[0].scrollWidth
                    obj.step = isVertical ? 40 * (obj.draggerparHeight - obj.draggerHeight) / (obj.scrollerH - obj.viewH) : 40 * (obj.draggerparWidth - obj.draggerWidth) / (obj.scrollerW - obj.viewW)
                    obj.step = strToNumber(obj.step) || 1

                    var xy = axisComputer(obj),
                        breakOut
                        xy.x = strToNumber(xy.x)
                        xy.y = strToNumber(xy.y)

                    if(isVertical) {
                        if(xy.y < 0) {
                            xy.y = 0
                            obj.up.addClass("oni-scrollbar-state-disabled")
                            breakOut = ["v", "up"]
                        } else {
                            obj.up.removeClass("oni-scrollbar-state-disabled")
                        }
                        if(xy.y > obj.draggerparHeight - obj.draggerHeight) {
                            xy.y = obj.draggerparHeight - obj.draggerHeight
                            breakOut = ["v", "down"]
                            obj.down.addClass("oni-scrollbar-state-disabled")
                        } else {
                            obj.down.removeClass("oni-scrollbar-state-disabled")
                        }
                        var c = strToNumber((obj.scrollerH - obj.viewH) * xy.y / (obj.draggerparHeight - obj.draggerHeight)) - vmodel.scrollTop
                        obj.dragger.css("top", xy.y)
                        vmodel._scrollTo(void 0, strToNumber((obj.scrollerH - obj.viewH) * xy.y / (obj.draggerparHeight - obj.draggerHeight)))
                    } else {
                        if(xy.x < 0) {
                            xy.x = 0
                            breakOut = ["h", "up"]
                            obj.up.addClass("oni-scrollbar-state-disabled")
                        } else {
                            obj.up.removeClass("oni-scrollbar-state-disabled")
                        }
                        if(xy.x > obj.draggerparWidth - obj.draggerWidth) {
                            xy.x = obj.draggerparWidth - obj.draggerWidth
                            breakOut = ["h", "down"]
                            // 有溢出检测回调，不disable
                            !vmodel.breakOutCallback && obj.down.addClass("oni-scrollbar-state-disabled")
                        } else {
                            obj.down.removeClass("oni-scrollbar-state-disabled")
                        }
                        obj.dragger.css("left", xy.x)
                        vmodel._scrollTo(strToNumber((obj.scrollerW - obj.viewW) * xy.x / (obj.draggerparWidth - obj.draggerWidth)), void 0)
                    }

                }
                // 回调，溢出检测
                (!vmodel.breakOutCallback || breakOutCallbackCannotIgnore) && callback && callback(breakOut)
                vmodel.breakOutCallback && vmodel.breakOutCallback(breakOut, vmodel, obj)
            }
            vm._scrollTo = function(x, y) {
                if(!document.querySelector){ // fix IE 67下嵌套滚动条无效bug
                    if(avalon(scroller[0]).css("position") === "static"){
                        avalon(scroller[0]).css("position", "relative")
                    }
                }
                if(y != void 0) {
                    scroller[0].scrollTop = y
                    vmodel.scrollTop = scroller[0].scrollTop
                }
                if(x != void 0) {
                    scroller[0].scrollLeft = x
                    vmodel.scrollLeft = scroller[0].scrollLeft
                }
            }

            //@interface scrollTo(x,y) 滚动至 x,y
            vm.scrollTo = function(x, y) {
                vmodel.update(!"ifInit", x, y)
                vm._scrollTo(x, y)
            }

            vm._initWheel = function(e, type) {
                if(type == "enter") {
                    vmodel.inFocuse = true
                } else {
                    vmodel.inFocuse = false
                }
            }
            vm._draggerDown = function(e, isdown) {
                if(vmodel.disabled) return
                var ele = avalon(this)
                if(isdown) {
                    ele.addClass("oni-scrollbar-state-active")
                } else {
                    ele.removeClass("oni-scrollbar-state-active")
                }
            }
            vm._stopPropagation = function(e) {
                e.stopPropagation()
            }
        })
      
        vmodel.$watch("scrollLeft", function(newValue, oldValue) {
            vmodel._onScroll()
            vmodel.onScroll && vmodel.onScroll(newValue, oldValue, "h", vmodel)
        })
        vmodel.$watch("scrollTop", function(newValue, oldValue) {
            vmodel._onScroll()
            vmodel.onScroll && vmodel.onScroll(newValue, oldValue, "v", vmodel)
        })

        return vmodel
    }
    widget.defaults = {
        disabled: false, //@config 组件是否被禁用，默认为否
        toggle: true, //@config 组件是否显示，可以通过设置为false来隐藏组件
        position: "right", //@config scrollbar出现的位置,right右侧，bottom下侧，可能同时出现多个方向滚动条
        limitRateV: 1.5, //@config 竖直方向，拖动头最小高度和拖动头宽度比率
        limitRateH: 1.5, //@config 水平方向，拖动头最小宽度和高度的比率
        scrollTop: 0, //@config 竖直方向滚动初始值，负数会被当成0，设置一个极大值等价于将拖动头置于bottom
        scrollLeft: 0, //@config 水平方向滚动初始值，负数会被当成0处理，极大值等价于拖动头置于right
        show: "always", //@config never一直不可见，scrolling滚动和hover时候可见，always一直可见
        showBarHeader: true,//@config 是否显示滚动条两端的上下箭头
        draggerHTML: "", //@config 滚动条拖动头里，注入的html碎片
        breakOutCallback: false, //@config breakOutCallback(["h", "up"], vmodel) 滚动到极限位置的回调，用来实现无线下拉等效果 breakOutCallback(["h", "up"], vmodel) 第一个参数是一个数组，分别是滚动条方向【h水平，v竖直】和超出极限的方向【up是向上或者向左，down是向右或者向下】，第三个参数是一个对象，包含滚动条的元素，宽高等信息
        //@config onInit(vmodel, options, vmodels) 完成初始化之后的回调,call as element's method
        onInit: avalon.noop,
        viewHeightGetter: function(viewElement) {
            return viewElement.innerHeight()
        }, //@config viewHeightGetter(viewElement) 配置计算视窗高度计函数，默认返回innerHeight
        viewWidthGetter: function(viewElement) {
            return viewElement.innerWidth()
        }, //@config viewWidthGetter(viewElement) 配置计算视窗宽度计函数，默认返回innerWidth
        getTemplate: function(tmpl, opts) {
            return tmpl
        },//@config getTemplate(tpl, opts) 定制修改模板接口
        onScroll: function(newValue, oldValue, diretion, vmodel) {

        },//@config onScroll(newValue, oldValue, diretion, vmodel) 滚动回调,scrollLeft or scrollTop变化的时候触发，参数为newValue, oldValue, diretion, vmodel diretion = h 水平方向，= v 竖直方向
        size: "normal", //@config srollbar size,normal为10px，small为8px，large为14px
        $author: "skipper@123"
    }
});

define('css!dropdown/avalon.dropdown',[],function(){});
//avalon 1.3.6 2014.11.06
/**
 *
 * @cnName 下拉框
 * @enName dropdown
 * @introduce
 *
 <p>因为原生<code>select</code>实在是难用，avalon的dropdown组件在兼容原生<code>select</code>的基础上，对其进行了增强。</p>
 <ul>
 <li>1，支持在标题和下拉菜单项中使用html结构，可以用来信息的自定义显示</li>
 <li>2，同时支持通过html以及配置项两种方式设置组件</li>
 <li>3，通过配置，可以让下拉框自动识别在屏幕中的位置，来调整向上或者向下显示</li>
 </ul>
 */
define('dropdown/avalon.dropdown',["avalon",
    "text!./avalon.dropdown.html",
    "../avalon.getModel",
    "../scrollbar/avalon.scrollbar",
    "css!../chameleon/oniui-common.css",
    "css!./avalon.dropdown.css"
], function(avalon, template) {
    var styleReg = /^(\d+).*$/;
    var ie6=!-[1,]&&!window.XMLHttpRequest;
    var widget = avalon.ui.dropdown = function(element, data, vmodels) {
        var $element = avalon(element),
            elemParent = element.parentNode,
            options = data.dropdownOptions,
            hasBuiltinTemplate = true, //标志是否通过model值构建下拉列表
            dataSource,
            dataModel,
            templates, titleTemplate, listTemplate,
            blurHandler,
            scrollHandler,
            resizeHandler,
            keepState = false

        //将元素的属性值copy到options中
        "multiple,size".replace(avalon.rword, function(name) {
            if (hasAttribute(element, name)) {
                options[name] = element[name]
            }
        })
        //将元素的属性值copy到options中
        options.enable = !element.disabled

        //读取template
        templates = options.template = options.getTemplate(template, options)
            .replace(/MS_OPTION_ID/g, data.dropdownId).split("MS_OPTION_TEMPLATE")
        titleTemplate = templates[0]
        listTemplate = templates[1]
        dataSource = avalon.mix(true, [], options.data.$model || options.data)

        //由于element本身存在ms-if或者内部包含ms-repeat等绑定，在抽取数据之前，先对element进行扫描
        element.removeAttribute("ms-duplex");
        avalon.scan(element, vmodels);

        //数据抽取
        dataModel = getDataFromHTML(element)
        hasBuiltinTemplate = !!dataModel.length

        if (dataModel.length === 0) {
            dataModel = getDataFromOption(dataSource);
        }

        options.data = dataModel
        avalon(element).css('display', 'none');

        //转换option
        _buildOptions(options);
        for (var i = 0, n = dataModel.length; i < n; i++) {
            if (dataModel[i].value == options.value) {
                options.activeIndex = i
                options.currentOption = avalon.mix(true, {}, dataModel[i]);
                break;
            }
        }
        var titleNode, listNode;
        var vmodel = avalon.define(data.dropdownId, function(vm) {
            avalon.mix(vm, options);
            vm.$skipArray = ["widgetElement", "duplexName", "menuNode", "dropdownNode", "scrollWidget", "rootElement"];
            if(vm.multiple && vm.$hasDuplex && vm.$skipArray.indexOf("value") === -1) {
                vm.$skipArray.push("value")
            }
            vm.render = function(data) {
                if (data === void 0) {
                    return
                }
                vmodel.data = getDataFromOption(data.$model || data)
                if (vmodel.toggle) {
                    vmodel._styleFix(true)
                }
            }
            vm.widgetElement = element;
            vm.rootElement = {}
            vm.menuWidth = "auto";   //下拉列表框宽度
            vm.menuHeight = vm.height;  //下拉列表框高度
            vm.dataSource = dataSource;    //源节点的数据源，通过dataSource传递的值将完全模拟select
            vm.focusClass =  false
            vm.source = [];
            vm.$init = function(continueScan) {
                //根据multiple的类型初始化组件
                if (vmodel.multiple) {
                    //创建菜单
                    listNode = createListNode();
                    var list = listNode.firstChild;
                    elemParent.insertBefore(listNode, element);
                    list.appendChild(element);
                } else {//如果是单选
                    var title;
                    titleNode = avalon.parseHTML(titleTemplate);
                    title = titleNode.firstChild;
                    elemParent.insertBefore(titleNode, element);
                    title.appendChild(element);
                    titleNode = title;

                    //设置title宽度
                    vmodel.titleWidth = computeTitleWidth();
                    //设置label值
                    setLabelTitle(vmodel.value);

                    //注册blur事件
                    blurHandler = avalon.bind(document.body, "click", function(e) {
                        //判断是否点击发生在dropdown节点内部
                        //如果不在节点内部即发生了blur事件
                        if(titleNode.contains(e.target)) {
                            vmodel._toggle()
                            return
                        } else if(listNode && listNode.contains(e.target)) {
                            return
                        }
                        if (!vmodel.__cursorInList__ && !vmodel.multiple && vmodel.toggle) {
                            vmodel.toggle = false;
                        }
                    })

                    if(vmodel.position) {
                        //监听window的滚动及resize事件，重新定位下拉框的位置
                        scrollHandler = avalon.bind(window, "scroll", _positionListNode)
                        resizeHandler = avalon.bind(window, "resize", _positionListNode)
                    }

                }

                //如果原来的select没有子节点，那么为它添加option与optgroup
                if (!hasBuiltinTemplate) {
                    element.appendChild(getFragmentFromData(dataModel));
                    avalon.each(["multiple", "size"], function(i, attr) {
                        avalon(element).attr(attr, vmodel[attr]);
                    });
                }

                if (!vmodel.multiple) {
                    var duplexName = (element.msData["ms-duplex"] || "").trim(),
                        duplexModel;

                    if (duplexName && (duplexModel = avalon.getModel(duplexName, vmodels))) {
                        duplexModel[1].$watch(duplexModel[0], function(newValue) {
                            vmodel.value = newValue;
                        })
                    }

                    vmodel.$watch("value", function(n, o) {
                        avalon.nextTick(function(){
                            var onChange = avalon.type(vmodel.onChange) === "function" && vmodel.onChange || false
                            if (keepState) {
                                keepState = false
                                return
                            }
                            function valueStateKeep(stateKeep) {
                                if (stateKeep) {
                                    keepState = true
                                    vmodel.value = o
                                } else {
                                    if (duplexModel) {
                                        duplexModel[1][duplexModel[0]] = n
                                        element.value = n
                                    }
                                    vmodel.currentOption = setLabelTitle(n) || {};
                                }
                            }
                            if ((onChange && onChange.call(element, n, o, vmodel, valueStateKeep) !== false) || !onChange) {
                                if (duplexModel) {
                                    duplexModel[1][duplexModel[0]] = n
                                    element.value = n
                                }
                                var currentOption = setLabelTitle(n);
                                if(currentOption === null) {
                                    currentOption = {};
                                    vmodel.label = '';
                                }
                                vmodel.currentOption = currentOption;
                            }
                        })
                    });
                } else {
                    vmodel.value.$watch("length", function() {
                        vmodel.multipleChange = !vmodel.multipleChange;
                        optionsSync();
                    })
                }

                //同步disabled或者enabled
                var disabledAttr = element.msData["ms-disabled"] || element.msData["ms-attr-disabled"],
                    disabledModel,
                    enabledAttr = element.msData["ms-enabled"] || element.msData["ms-attr-enabled"],
                    enabledModel;

                if(disabledAttr && (disabledModel = avalon.getModel(disabledAttr, vmodels))) {
                    disabledModel[1].$watch(disabledModel[0], function(n) {
                        vmodel.enable = !n;
                    });
                    vmodel.enable = !disabledModel[1][disabledModel[0]];
                }

                if(enabledAttr && (enabledModel = avalon.getModel(enabledAttr, vmodels))) {
                    enabledModel[1].$watch(enabledModel[0], function(n) {
                        vmodel.enable = n;
                    })
                    vmodel.enable = enabledModel[1][enabledModel[0]];
                }
                vmodel.enable = !element.disabled;

                //同步readOnly
                var readOnlyAttr = vmodel.readonlyAttr,
                    readOnlyModel;

                if(readOnlyAttr && (readOnlyModel = avalon.getModel(readOnlyAttr, vmodels))) {
                    readOnlyModel[1].$watch(readOnlyModel[0], function(n) {
                        vmodel.readOnly = n;
                    });
                    vmodel.readOnly = readOnlyModel[1][readOnlyModel[0]];
                }

                // 获取$source信息(兼容$source异步传值)
                if(vmodel.$source) {
                    if(avalon.type(vmodel.$source) === "string") {
                        var sourceModel = avalon.getModel(vmodel.$source, vmodels);

                        sourceModel && ( vmodel.$source = sourceModel[1][sourceModel[0]] );

                    } else if(!vmodel.$source.$id) {
                        vmodel.$source = null
                    } else if(vmodel.$source.length > 0) {
                        vmodel._refresh(vmodel.$source.length);
                    }

                    //对data的改变做监听，由于无法检测到对每一项的改变，检测数据项长度的改变
                    vmodel.$source && vmodel.$source.$watch && vmodel.$source.$watch('length', function(n) {
                        vmodel._refresh(n)
                    });
                }
                // 新异步方式
                vmodel.source.$watch('length', function(n) {
                    vmodel._refresh(n)
                });
                avalon.scan(element.parentNode, [vmodel].concat(vmodels));
                if(continueScan){
                    continueScan()
                } else{
                    avalon.log("请尽快升到avalon1.3.7+")
                    if (typeof options.onInit === "function") {
                        options.onInit.call(element, vmodel, options, vmodels)
                    }
                }
                vmodel.multiple && optionsSync()
            }

            vm.repeatRendered = function() {
                if(vmodel.multiple) {
                    avalon.vmodels["scrollbar-" + vmodel.$id].update()
                }
            }

            /**
             * @interface 当组件移出DOM树时,系统自动调用的销毁函数
             */
            vm.$remove = function() {
                if (blurHandler) {
                    avalon.unbind(window, "click", blurHandler)
                }
                if(scrollHandler) {
                    avalon.unbind(window, "scroll", scrollHandler)
                }
                if(resizeHandler) {
                    avalon.unbind(window, "resize", resizeHandler)
                }
                vmodel.toggle = false;
                listNode && vmodel.container && vmodel.container.contains(listNode) && vmodel.container.removeChild(listNode);
                avalon.log("dropdown $remove")
            }


            vm._select = function(index, event) {
                var option = vmodel.data[index].$model;
                if (option && option.enable && !option.group) {
                    var oldValue = vmodel.value;
                    //根据multiple区分对待, 多选时可以为空值
                    if (vmodel.multiple) {
                        index = vmodel.value.indexOf(option.value)
                        if (index > -1) {
                            vmodel.value.splice(index, 1)
                        } else {
                            vmodel.value.push(option.value)
                        }

                    } else {
                        vmodel.value = option.value;
                    }
                    // vmodel.currentOption = option;
                    vmodel.toggle = false;
                    if(avalon.type(vmodel.onSelect) === "function") {
                        vmodel.onSelect.call(element, event, vmodel.value, oldValue, vmodel);
                    }
                    vmodel.activeIndex = index
                }
            };
            /**
             *
             * @param len 新数据长度
             * @private
             */
            vm._refresh = function(len) {
                vmodel.data.clear();
                vmodel.label = '';
                vmodel.__cursorInList__ = false
                if (len > 0) {
                    //当data改变时，解锁滚动条
                    vmodel._disabledScrollbar(false);
                    if(vmodel.$source){
                        vmodel.data.pushArray(getDataFromOption(vmodel.$source.$model || vmodel.$source));
                    }
                    vmodel.data.pushArray(getDataFromOption(vmodel.source.$model || vmodel.source));
                    var option
                    //当data改变时，尝试使用之前的value对label和title进行赋值，如果失败，使用data第一项
                    if (!(option = setLabelTitle(vmodel.value))) {
                        vmodel.currentOption = vmodel.data[0].$model;
                        vmodel.activeIndex = 0;
                        var v = vmodel.data[0].value;
                        if(vmodel.multiple && !(v instanceof Array)) v = [v]; // 保证类型一致
                        setLabelTitle(vmodel.value = v);
                    } else {
                        vmodel.activeIndex = vmodel.data.$model.indexOf(option)
                    }
                    if (vmodel.menuNode) {
                        vmodel._styleFix(true)
                    }
                }
            };


            vm._titleenter = function() {
                if (vmodel.hoverAutoShow) {
                    vmodel._toggle()
                    // vmodel.toggle = true
                }
            };
            vm._titleleave = function() {
                if (vmodel.hoverAutoShow) {
                    vmodel.toggle = false
                }
            };

            vm._keydown = function(event) {
                if(vmodel.keyboardEvent === false) {
                    return;
                }

                //如果是单选下拉框，可以通过键盘移动
                if (!vmodel.multiple) {
                    var index = vmodel.activeIndex || 0,
                        oldValue = vmodel.value;

                    //区分上下箭头和回车
                    switch (event.keyCode) {
                        case 9:
                        // tab
                        case 27:
                            // escape
                            event.preventDefault()
                            break;
                        case 13:
                            vmodel._select(index, event)
                            break;
                        case 38:
                        case 63233: //safari 向上
                            event.preventDefault();
                            index = getEnableOption(vmodel.data, index)
                            if(index === null) {
                                return
                            }
                            vmodel.value = vmodel.data[index].value
                            vmodel.activeIndex = index
                            vmodel.scrollTo(index)
                            if(avalon.type(vmodel.onSelect) === "function") {
                                vmodel.onSelect.call(element, event, vmodel.value, oldValue, vmodel);
                            }
                            break;
                        case 40:
                        case 63235: //safari 向下
                            event.preventDefault();
                            index = getEnableOption(vmodel.data, index, true)
                            if(index === null) {
                                return
                            }
                            vmodel.value = vmodel.data[index].value
                            vmodel.activeIndex = index
                            vmodel.scrollTo(index)
                            if(avalon.type(vmodel.onSelect) === "function") {
                                vmodel.onSelect.call(element, event, vmodel.value, oldValue, vmodel);
                            }
                            break
                    }
                }
            }
            //下拉列表的显示依赖toggle值，该函数用来处理下拉列表的初始化，定位
            vm._toggle = function(b) {
                if ((vmodel.data.length ===0 && !vmodel.realTimeData)|| !vmodel.enable || vmodel.readOnly) {
                    vmodel.toggle = false;
                    return;
                }

                //为了防止显示时调整高度造成的抖动，将节点初始化放在改变toggle值之前
                if (!listNode) {//只有单选下拉框才存在显示隐藏的情况
                    var list;
                    listNode = createListNode();
                    list = listNode.firstChild;
                    vmodel.container.appendChild(listNode)
                    listNode = list
                    vm.rootElement = list
                    avalon.scan(list, [vmodel].concat(vmodels))
                    vmodel.menuNode = document.getElementById("menu-" + vmodel.$id)     //下拉列表框内层容器 （包裹滚动条部分的容器）
                    vmodel.dropdownNode = document.getElementById("list-" + vmodel.$id) //下拉列表框内容（有滚动条的部分）
                }

                //如果参数b不为布尔值，对toggle值进行取反
                if (typeof b !== "boolean") {
                    vmodel.toggle = !vmodel.toggle;
                    return;
                }

                if (!b) {
                    avalon.type(vmodel.onHide) === "function" && vmodel.onHide.call(element, listNode, vmodel);
                } else {
                    var firstItemIndex, selectedItemIndex, value = vmodel.value;
                    if (avalon.type(value) !== "array") {
                        value = [value];
                    }

                    //计算activeIndex的值
                    if (vmodel.activeIndex == null) {
                        avalon.each(vmodel.data, function(i, item) {
                            if (firstItemIndex === void 0 && item.enable) {
                                firstItemIndex = i;
                            }
                            if (item.value === value[0]) {
                                selectedItemIndex = i;
                                return false;
                            }
                            return true;
                        });

                        if (!selectedItemIndex) {
                            selectedItemIndex = firstItemIndex;
                        }
                        vmodel.activeIndex = selectedItemIndex || 0;
                    }
                    vmodel.scrollWidget = avalon.vmodels["scrollbar-" + vmodel.$id];
                    vmodel._styleFix();
                    vmodel._position();
                    if(avalon.type(vmodel.onShow) === "function") {
                        vmodel.onShow.call(element, listNode, vmodel);
                    }
                }
            };

            vm.$watch("toggle", function(b) {
                vmodel.focusClass = b
                vmodel._toggle(b);
            });

            vm.toggle = false;

            vm._position = function() {
                var $titleNode = avalon(titleNode);
                //计算浮层当前位置，对其进行定位，默认定位正下方
                //获取title元素的尺寸及位置
                var offset = $titleNode.offset(),
                    outerHeight = $titleNode.outerHeight(true),
                    $listNode = avalon(listNode),
                    $sourceNode = avalon(titleNode.firstChild),
                    listHeight = $listNode.height(),
                    $window = avalon(window),
                    css = {},
                    offsetParent = listNode.offsetParent,
                    $offsetParent = avalon(offsetParent);

                while ($sourceNode.element && $sourceNode.element.nodeType != 1) {
                    $sourceNode = avalon($sourceNode.element.nextSibling);
                }

                //计算浮层的位置
                if (options.position && offset.top + outerHeight + listHeight > $window.scrollTop() + $window.height() && offset.top - listHeight > $window.scrollTop()) {
                    css.top = offset.top - listHeight;
                } else {
                    css.top = offset.top + outerHeight - $sourceNode.css("borderBottomWidth").replace(styleReg, "$1");
                }

                if(offsetParent && (offsetParent.tagName !== "BODY" && offsetParent.tagName !== "HTML")) {
                    //修正由于边框带来的重叠样式
                    css.top = css.top  - $offsetParent.offset().top + listNode.offsetParent.scrollTop;
                    css.left = offset.left - $offsetParent.offset().left + listNode.offsetParent.scrollLeft;
                } else {
                    //修正由于边框带来的重叠样式
                    css.left = offset.left;
                }

                //显示浮层
                $listNode.css(css);
            }
            //是否当前鼠标在list区域
            vm.__cursorInList__ = false

            //单选下拉框在失去焦点时会收起
            vm._listenter = function() {
                vmodel.__cursorInList__ = true
                if (vmodel.hoverAutoShow) {
                    vmodel.toggle = true
                }
            }

            vm._listleave = function() {
                vmodel.__cursorInList__ = false
                if (vmodel.hoverAutoShow) {
                    vmodel.toggle = false
                }
            };
            vm._blur = function() {
                if (!vmodel.__cursorInList__ && !vmodel.multiple && vmodel.toggle) {
                    vmodel.toggle = false;
                }
            }

            /**
             * @interface
             * @param newValue 设置控件的值，需要注意的是dropdown设置了multiple属性之后，值是数组，未设置multiple属性的时候，可以接受字符串，数字，布尔值；未设置该值时，效果是返回当前控件的值
             * @returns vmodel.value 控件当前的值
             */
            vm.val = function(newValue) {
                if (typeof newValue !== "undefined") {
                    if (avalon.type(newValue) !== "array") {
                        newValue = [newValue];
                    }
                    vmodel.value = newValue;
                }
                return vmodel.value;
            }

            vm.isActive = function(el) {
                var value = el.value, enable = el.enable, group = el.group;
                if (vmodel.multiple) {
                    return vmodel.value.indexOf(value) > -1 && enable && !group;
                } else {
                    return vmodel.value === value && enable && !group;
                }
            }

            //当下拉列表中的项目发生改变时，调用该函数修正显示，顺序是修正下拉框高宽 --> 滚动条更新显示 --> 定位下拉框
            vm._styleFix = function(resetHeight) {
                var MAX_HEIGHT = options.height || 200,
                    $menu = avalon(vmodel.menuNode),
                    height = ''

                if (resetHeight) {
                    vmodel.menuHeight = ''
                    avalon(vmodel.dropdownNode).css({ 'height': '' });
                }

                height = vmodel.dropdownNode.scrollHeight
                vmodel.menuWidth = !ie6 ? vmodel.listWidth - $menu.css("borderLeftWidth").replace(styleReg, "$1") - $menu.css("borderRightWidth").replace(styleReg, "$1") : vmodel.listWidth;
                if (height > MAX_HEIGHT) {
                    vmodel._disabledScrollbar(false);
                    height = MAX_HEIGHT;
                    avalon(vmodel.dropdownNode).css({
                        "width": vmodel.menuWidth - vmodel.scrollWidget.getBars()[0].width()
                    });
                } else {
                    vmodel._disabledScrollbar(true);
                    avalon(vmodel.dropdownNode).css({
                        "width": vmodel.menuWidth
                    })
                }
                vmodel.menuHeight = height;
                vmodel.updateScrollbar();
                vmodel.scrollTo(vmodel.activeIndex);
            };

            //利用scrollbar的样式改变修正父节点的样式
            vm.updateScrollbar = function() {
                vmodel.scrollWidget.update();
            }

            //通过当前的activeIndex，更新scrollbar的滚动位置
            vm.scrollTo = function(activeIndex) {

                if(!vmodel.dropdownNode) return;
                //计算是否需要滚动
                var nodes = siblings(vmodel.dropdownNode.firstChild),
                    $activeNode = avalon(nodes[activeIndex]),
                    menuHeight = vmodel.menuHeight,
                    nodeTop = nodes.length ? $activeNode.position().top - avalon(nodes[0]).position().top : 0,
                    nodeHeight = nodes.length ? $activeNode.height() : 0,
                    scrollTop = vmodel.dropdownNode.scrollTop

                if(nodeTop > scrollTop + menuHeight - nodeHeight || nodeTop + nodeHeight < scrollTop) {
                    vmodel.scrollWidget.scrollTo(0, nodeTop + nodeHeight - menuHeight)
                }
            }

            //禁用滚动条，当下拉列表的高度小于最大高度时，只显示当前高度，需要对滚动条做禁用
            vm._disabledScrollbar = function(b) {
                vmodel.scrollWidget && (vmodel.scrollWidget.disabled = !!b)
            }

        });

        vmodel.$watch("enable", function(n) {
            if(!n) {
                vmodel.toggle = false;
            }
        });

        vmodel.$watch("readOnly", function(n) {
            if(!!n) {
                vmodel.toggle = false;
            }
        });

        //在multiple模式下同步select的值
        //http://stackoverflow.com/questions/16582901/javascript-jquery-set-values-selection-in-a-multiple-select
        function optionsSync() {
            avalon.each(element.getElementsByTagName("option"), function(i, option) {
                if(vmodel.value.$model.indexOf(option.value) > -1 || vmodel.value.$model.indexOf( parseData(option.value) ) > -1) {
                    try {
                        option.selected = true
                    } catch(e) {
                        avalon(option).attr("selected", "selected");
                    }
                } else {
                    try {
                        option.selected = false
                    } catch(e) {
                        option.removeAttribute("selected")
                    }
                }
            })
        }

        function _buildOptions(opt) {
            //为options添加value与duplexName
            //如果原来的select元素绑定了ms-duplex，那么取得其值作value
            //如果没有，则先从上层VM的配置对象中取，再没有则从内置模板里抽取
            var duplexName = (element.msData["ms-duplex"] || "").trim()
            var duplexModel
            if (duplexName && (duplexModel = avalon.getModel(duplexName, vmodels))) {
                opt.value = duplexModel[1][duplexModel[0]]
                opt.$hasDuplex = true
            } else if (!hasBuiltinTemplate) {
                if (!Array.isArray(opt.value)) {
                    opt.value = [opt.value || ""]
                }
            } else {
                var values = []
                Array.prototype.forEach.call(element.options, function(option) {
                    if (option.selected) {
                        values.push(parseData(option.value))
                    }
                })
                opt.value = values
            }
            if (!opt.multiple) {
                if(Array.isArray(opt.value)) {
                    opt.value = opt.value[0] !== void 0 ? opt.value[0] : ""
                }
                //尝试在当前的data中查找value对应的选项，如果没有，将value设置为data中的option第一项的value
                var option = opt.data.filter(function(item) {
                        return item.value === opt.value  && !item.group
                    }),
                    options = opt.data.filter(function(item) {
                        return !item.group
                    })

                if(option.length === 0 && options.length > 0) {
                    opt.value = options[0].value

                    //如果存在duplex，同步该值
                    if(duplexModel) {
                        duplexModel[1][duplexModel[0]] = opt.value
                    }
                }
            }

            //处理data-duplex-changed参数
            var changedCallbackName = $element.attr("data-duplex-changed"),
                changedCallbackModel;    //回调函数
            if (changedCallbackName && (changedCallbackModel = avalon.getModel(changedCallbackName, vmodels))) {
                opt.changedCallback = changedCallbackModel[1][changedCallbackModel[0]]
            }
            opt.duplexName = duplexName

            //处理container
            var docBody = document.body, container = opt.container;

            // container必须是dom tree中某个元素节点对象或者元素的id，默认将dialog添加到body元素
            opt.container = (avalon.type(container) === "object" && container.nodeType === 1 && docBody.contains(container) ? container : document.getElementById(container)) || docBody;
        }

        /**
         * 生成下拉框节点
         * @returns {*}
         */
        function createListNode() {
            return avalon.parseHTML(listTemplate);
        }

        //设置label以及title
        function setLabelTitle(value) {
            if(!vmodel.multiple && avalon.type(value)==="array") {
                value = value[0];
            }

            var option = vmodel.data.$model.filter(function(item) {
                return item.value === value;
            });

            option = option.length > 0 ? option[0] : null

            if (option) {
                vmodel.label = option.label;
                vmodel.title = option.title || option.label || "";
            }

            return option;
        }

        //计算title的宽度
        function computeTitleWidth() {
            var title = document.getElementById("title-" + vmodel.$id),
                $title = avalon(title);
            return vmodel.width - $title.css("paddingLeft").replace(styleReg, "$1") - $title.css("paddingRight").replace(styleReg, "$1");
        }

        //定位listNode
        function _positionListNode() {
            if(!vmodel.multiple && listNode) {
                vmodel._position();
            }
        }

        return vmodel;
    };

    widget.version = "1.0";

    widget.defaults = {
        realTimeData: false,
        container: null, //@config 放置列表的容器
        width: 200, //@config 自定义宽度
        listWidth: 200, //@config 自定义下拉列表的宽度
        titleWidth: 0,  //@config title部分宽度
        height: 200, //@config 下拉列表的高度
        enable: true, //@config 组件是否可用
        readOnly: false, //@config 组件是否只读
        hoverAutoShow: false, //@config 是否开启鼠标移入打开下拉列表鼠标移出关闭下拉列表功能
        readonlyAttr: null, //@config readonly依赖的属性
        currentOption: null,  //@config 组件当前的选项
        data: [], //@config 下拉列表显示的数据模型
        $source: null, //@config 下拉列表的数据源
        textFiled: "text", //@config 模型数据项中对应显示text的字段,可以传function，根据数据源对text值进行格式化
        valueField: "value", //@config 模型数据项中对应value的字段
        value: [], //@config 设置组件的初始值
        label: "", //@config 设置组件的提示文案，可以是一个字符串，也可以是一个对象
        multiple: false, //@config 是否为多选模式
        listClass: "",   //@config 列表添加自定义className来控制样式
        title: "",
        titleClass: "",   //@config title添加自定义className来控制样式
        activeIndex: null,
        size: 1,
        menuNode: null,
        dropdownNode: null,
        scrollWidget: null,
        position: true, //@config 是否自动定位下拉列表
        onSelect: null,  //@config 点击选项时的回调
        onShow: null,    //@config 下拉框展示的回调函数
        onHide: null,    //@config 下拉框隐藏的回调函数
        onChange: null,  //@config value改变时的回调函数
        $hasDuplex: false,
        multipleChange: false,
        keyboardEvent: true,  //@config 是否支持键盘事件
        /**
         * @config 模板函数,方便用户自定义模板
         * @param str {String} 默认模板
         * @param opts {Object} VM
         * @returns {String} 新模板
         */
        getTemplate: function(str, options) {
            return str
        },
        onInit: avalon.noop     //@config 初始化时执行方法
    };

    //用于将字符串中的值转换成具体值
    function parseData(data) {
        try {
            data = data === "true" ? true :
                data === "false" ? false :
                    data === "null" ? null :
                        data + "" === data ? data : +data;
        } catch (e) {
        }
        return data
    }

    //根据dataSource构建数据结构
    //从VM的配置对象提取数据源, dataSource为配置项的data数组，但它不能直接使用，需要转换一下
    //它的每一个对象代表option或optGroup，
    //如果是option则包含label, enable, value
    //如果是optGroup则包含label, enable, options(options则包含上面的option)
    //每个对象中的enable如果不是布尔，则默认为true; group与parent则框架自动添加
    function getDataFromOption(data, arr, parent) {
        var ret = arr || []
        parent = parent || null
        for (var i = 0, el; el = data[i++]; ) {
            if (Array.isArray(el.options)) {
                ret.push({
                    label: el.label,
                    value: el.value,
                    enable: ensureBool(el.enable, true),
                    group: true,
                    parent: parent,
                    toggle: true
                })
                getDataFromOption(el.options, ret, el)
            } else {
                if(typeof el === "string") {
                    el = {
                        label: el,
                        value: el,
                        title: el
                    }
                }
                ret.push({
                    label: el.label,
                    value: el.value,
                    title: el.title,
                    enable: ensureBool(parent && parent.enable, true) && ensureBool(el.enable, true),
                    group: false,
                    parent: parent,
                    data: el,           //只有在dataModel的模式下有效
                    toggle: true
                })
            }
        }

        return ret
    }
    function getFragmentFromData(data) {
        var ret = document.createDocumentFragment(), parent, node
        for (var i = 0, el; el = data[i++]; ) {
            if (el.group) {
                node = document.createElement("optgroup")
                node.label = el.label
                node.disabled = !el.enable
                ret.appendChild(node)
                parent = node
            } else {
                node = document.createElement("option")
                node.text = el.label
                node.value = el.value
                node.disabled = !el.enable
                if (el.parent && parent) {
                    parent.appendChild(node)
                } else {
                    ret.appendChild(node)
                }
            }
        }
        return ret
    }

    function ensureBool(value, defaultValue) {
        return typeof value === "boolean" ? value : defaultValue
    }

    //从页面的模板提取数据源, option元素的value会进一步被处理
    //label： option或optgroup元素显示的文本
    //value: 其value值，没有取innerHTML
    //enable: 是否可用
    //group: 对应的元素是否为optgroup
    //parent: 是否位于分组内，是则为对应的对象
    function getDataFromHTML(select, arr, parent) {
        var ret = arr || []
        var elems = select.children
        parent = parent || null
        for (var i = 0, el; el = elems[i++]; ) {
            if (el.nodeType === 1) {//过滤注释节点
                if (el.tagName === "OPTGROUP") {
                    parent = {
                        label: el.label,
                        value: "__dropdownGroup",
                        enable: !el.disabled,
                        group: true,        //group不能添加ui-state-active
                        parent: false,
                        toggle: true
                    }
                    ret.push(parent)
                    getDataFromHTML(el, ret, parent)
                } else if (el.tagName === "OPTION") {
                    ret.push({
                        label: el.label.trim()||el.text.trim()||el.value.trim(), //IE9-10有BUG，没有进行trim操作
                        title: el.title.trim(),
                        value: parseData(el.value.trim()),
                        enable: ensureBool(parent && parent.enable, true) && !el.disabled,
                        group: false,
                        parent: parent,
                        toggle: true
                    })
                }
            }
        }
        return ret
    }

    /**
     * 在用户使用键盘上下箭头选择选项时，需要跳过被禁用的项，即向上或者向下找到非禁用项
     * @param data 用来选择的数据项
     * @param index 当前index
     * @param direction {Boolean} 方向，true为下，false为上，默认为上
     * @return ret 使用的项在数组中的下标
     */
    function getEnableOption(data, index, direction) {
        var size = data.size(),
            left = [],
            right = [],
            dataItem = {},
            i,
            ret

        //将data用index分成两段
        //当向上选择时，选择从左段的队尾到右段的队头
        //当向下选择时，选择从右端的对头到左段的队尾
        for(i = 0; i < index; i ++) {
            dataItem = data[i]
            if(dataItem.enable && !dataItem.group && dataItem.toggle) {
                left.push(i)
            }
        }
        for(i = index + 1; i < size; i ++) {
            dataItem = data[i]
            if(dataItem.enable && !dataItem.group && dataItem.toggle) {
                right.push(i)
            }
        }
        if(left.length === 0 && right.length === 0) {
            ret = null
        }else if(direction) {
            ret = right.length > 0? right.shift(): left.shift()
        } else {
            ret = left.length > 0? left.pop(): right.pop()
        }

        return ret
    }

    var hasAttribute = document.documentElement.hasAttribute ? function(el, attr) {
        return el.hasAttribute(attr)
    } : function(el, attr) {//IE67
        var outer = el.outerHTML, part = outer.slice(0, outer.search(/\/?['"]?>(?![^<]*<['"])/));
        return new RegExp("\\s" + attr + "\\b", "i").test(part);
    }
    return avalon;

    /**
     * 获取元素节点的所有兄弟节点
     * @param n
     * @returns {Array}
     */
    function siblings( n) {
        var r = [];

        for ( ; n; n = n.nextSibling ) {
            if ( n.nodeType === 1) {
                r.push( n );
            }
        }

        return r;
    }

});

/**
 @links

 [使用html配置multiple组件](avalon.dropdown.ex16.html)
 [使用html配置multiple组件](avalon.dropdown.ex1.html)
 [使用html配置multiple并使用双工绑定](avalon.dropdown.ex2.html)
 [使用option配置multiple并使用双工绑定](avalon.dropdown.ex3.html)
 [使用html配置dropdown组件](avalon.dropdown.ex4.html)
 [使用html配置dropdown并使用双工绑定](avalon.dropdown.ex5.html)
 [使用option配置dropdown并使用双工绑定](avalon.dropdown.ex6.html)
 [dropdown disabled](avalon.dropdown.ex7.html)
 [dropdown readOnly](avalon.dropdown.ex8.html)
 [options可以使用repeat生成](avalon.dropdown.ex9.html)
 [更改模板，使用button作为触发器](avalon.dropdown.ex10.html)
 [异步渲染组件的选项](avalon.dropdown.ex11.html)
 [联动的dropdown](avalon.dropdown.ex12.html)
 [dropdown状态保持功能](avalon.dropdown.ex13.html)
 [多个dropdown共享状态](avalon.dropdown.ex14.html)
 [鼠标移入移出下拉菜单自动显示隐藏](avalon.dropdown.ex15.html)
 */
;

define('css!button/avalon.button',[],function(){});
// avalon 1.3.6
/**
 * 
 * @cnName 按钮组件
 * @enName button
 * @introduce
 * <p>按钮组件提供丰富的样式、形式选择，除与bootstrap可用的button样式保持一致外，支持small、default、big、large四种尺寸，同时支持图标button，可以是仅有图标的button，图标在左边的button、图标在右边的button、两边都有图标的button，当然也支持图标组，有水平图标组、垂直图标组两种形式</p>
 */
define('button/avalon.button',["avalon", "css!../chameleon/oniui-common.css", "css!./avalon.button.css"], function(avalon) {
    var baseClasses = ["oni-button", "oni-widget", "oni-state-default"],
        typeClasses = "oni-button-icons-only oni-button-icon-only oni-button-text-icons oni-button-text-icon-primary oni-button-text-icon-secondary oni-button-text-only"

    var widget = avalon.ui.button = function(element, data, vmodels) {
        var options = data.buttonOptions,
            btnModel,
            $element = avalon(element)
            
        function stop(event) {
            if (options.disabled) {
                event.preventDefault()
                event.stopImmediatePropagation()
            }
        }
        btnModel = {
            $init: function() {
                var data = options.data,
                    elementType = "",
                    label = options.label,
                    buttonWidth = 0,
                    elementTagName = element.tagName.toLowerCase()

                if (options.groups && data.length > 1) {
                    var buttons = ""
                    
                    data.forEach(function(button, index) {
                        var buttonStr = "<span ms-widget='button'"
                        if (button.type !== void 0) {
                            buttonStr += " data-button-type='" + button.type + "'"
                        }
                        if (button.iconPosition !== void 0) {
                            buttonStr += " data-button-icon-position='" + button.iconPosition + "'"
                        }
                        if (button.icon !== void 0) {
                            buttonStr += " data-button-icon='" + button.icon + "'"
                        }
                        if (button.color !== void 0) {
                            buttonStr += " data-button-color='" + button.color + "'"
                        }
                        if (button.size !== void 0) {
                            buttonStr += " data-button-size='" + button.size + "'"
                        }
                        if (button.disabled !== void 0) {
                            buttonStr += " data-button-disabled='" + button.disabled + "'"
                        }
                        if (button.label !== void 0) {
                            buttonStr += " data-button-label='" + button.label + "'"
                        }
                        buttonStr += ">" + (button.text || "") + "</span>"
                        buttons += buttonStr
                    })
                    element.innerHTML = buttons
                    element.setAttribute("ms-widget", "buttonset")
                    if (options.direction == "vertical") {
                        element.setAttribute("data-buttonset-direction", "vertical")
                    }
                    if (!options.corner) {
                        element.setAttribute("data-buttonset-corner", options.corner)
                    }
                    if (options.width) {
                        element.setAttribute("data-buttonset-width", parseInt(options.width))
                    }
                    avalon.scan(element, vmodels)
                    return
                }
                if (typeof options.disabled !== "boolean") {
                    element.disabled = !!options.disabled
                } else {
                    element.disabled = options.disabled
                }

                if (elementTagName === "input") {
                    elementType = "input"
                }
                if (buttonWidth = parseInt(options.width)) {
                    element.style.width = buttonWidth + "px"
                }
                $element.bind("mousedown", function(event) {
                    stop(event)
                    $element.addClass("oni-state-active")
                })
                $element.bind("mouseup", function(event) {
                    stop(event)
                    $element.removeClass("oni-state-active")
                })
                $element.bind("blur", function() {
                    $element.removeClass("oni-state-active")
                    $element.removeClass("oni-state-focus");
                })
                $element.bind("focus", function() {
                    $element.addClass("oni-state-focus");
                })
                if (!options.label) {
                    label = elementType === "input" ? element.value : element.innerHTML
                }
                options.elementType = elementType
                options.label = label
                createButton(element, options)
                avalon.scan(element, vmodels)
            }
        }
        btnModel.$init()
    }
    avalon.ui.buttonset = function(element, data, vmodels) {
        var options = data.buttonsetOptions,
            buttonsetCorner = options.corner,
            direction = options.direction,
            $element = avalon(element)

        buttonsetCorner = buttonsetCorner !== void 0 ? buttonsetCorner : true
        var btnGroup = {
            $init: function() {
                var elementClass = []
                elementClass.push("oni-buttonset"),
                firstButtonClass = "oni-corner-left",
                lastButtonClass = "oni-corner-right",
                children = element.childNodes, 
                buttons = [] // 收集button组元素
                buttonWidth = options.width,
                firstElement = true

                for (var i = 0, el; el = children[i++]; ) {
                    if (el.nodeType === 1) {
                        el.setAttribute("data-button-corner", "false")
                        buttons.push(el)
                        if (firstElement) {
                            avalon(el).addClass("oni-button-first")
                            firstElement = false
                        }
                    }
                }
                var n = buttons.length
                if (n && buttonsetCorner) {
                    if (direction === "vertical") {
                        firstButtonClass = "oni-corner-top"
                        lastButtonClass = "oni-corner-bottom"
                    }
                    avalon(buttons[0]).addClass(firstButtonClass)
                    avalon(buttons[n - 1]).addClass(lastButtonClass)
                }
                if (direction === "vertical") {
                    elementClass.push("oni-buttonset-vertical")
                }
                $element.addClass(elementClass.join(" "))
                data.buttons = buttons
                avalon.scan(element, vmodels)
                if (buttonWidth = parseInt(buttonWidth)) {
                    (function(buttonWidth) {
                        var btns = [].concat(buttons)
                        setTimeout(function() {
                            for (var i = 0; button = btns[i++];) {
                                var $button = avalon(button),
                                    buttonName = button.tagName.toLowerCase()
                                if (buttonName === "input" || buttonName === "button") {
                                    button.style.width = buttonWidth + "px"
                                } else {
                                    button.style.width = (buttonWidth - parseInt($button.css("border-left-width")) - parseInt($button.css("border-right-width")) - parseInt($button.css("padding-left")) * 2) + "px"
                                }
                            }
                        }, 10)
                    })(buttonWidth)
                    return 
                }

                (function(buttons) {
                    var interval = 0,
                        maxButtonWidth = 0
                    buttons = buttons.concat()
                    interval = setInterval(function() {
                        var buttonWidth = 0,
                            innerWidth = 0,
                            $button
                        for (var i = 0, button; button = buttons[i++];) {
                            buttonWidth = Math.max(buttonWidth, avalon(button).outerWidth())
                        }
                        if (buttonWidth === maxButtonWidth) {
                            maxButtonWidth += 1
                            for (var i = 0, button; button = buttons[i++];) {
                                var buttonName = button.tagName.toLowerCase(),
                                    $button = avalon(button)

                                if (buttonName === "input" || buttonName === "button") {
                                    button.style.width = maxButtonWidth + "px"
                                    
                                } else {
                                    button.style.width = (maxButtonWidth - parseInt($button.css("border-left-width")) - parseInt($button.css("border-right-width")) - parseInt($button.css("padding-left")) * 2) + "px"
                                }
                            }
                            clearInterval(interval)
                            return 
                        }
                        maxButtonWidth = buttonWidth
                    }, 100)
                })(buttons)
            }
        }
        btnGroup.$init()
    }
    function createButton (element, options) {
        var buttonText, 
            buttonClasses = baseClasses.concat(),
            iconText = false,
            icons = options.icon || "",
            corner = options.corner

        options.label = options.label || ""
        if (corner) {
            buttonClasses.push("oni-corner-all")    
            if (corner = parseInt(corner)) {
                element.style.borderRadius = corner + "px"
            }        
        }
        if (options.size) {
            buttonClasses.push("oni-button-" + options.size)
        }
        if (options.color) {
            buttonClasses.push("oni-button-" + options.color)
        }
        if (options.disabled) {
            buttonClasses.push("oni-state-disabled")
        }
        avalon(element).addClass(buttonClasses.join(" "))
        if (options.elementType === "input" && options.label) {
            avalon(element).val(options.label)
            
            return
        }
        switch (options.type) {
            case "text":
                buttonText = "<span class='oni-button-text'>" + options.label + "</span>"
                break;
            case "labeledIcon": 
                iconText = true
            case "icon":
                switch (options.iconPosition) {
                    case "left": 
                        buttonText = "<i class='oni-icon oni-icon-left'>" + icons.replace(/\\/g, "") + "</i>" + "<span class='oni-button-text oni-button-text-right" + (!iconText ? " oni-button-text-hidden" : "") + "'>" + options.label + "</span>"
                    break;
                    case "right":
                        buttonText = "<span class='oni-button-text oni-button-text-left" + (!iconText ? " oni-button-text-hidden" : "") + "'>" + options.label + "</span>" + "<i class='oni-icon oni-icon-right'>" + icons.replace(/\\/g, "") + "</i>"
                    break;
                    case "left-right":
                        var iconArr = icons && icons.split("-") || ["", ""],
                            iconLeft = iconArr[0],
                            iconRight = iconArr[1]
                        buttonText = "<i class='oni-icon oni-icon-left'>" + iconLeft.replace(/\\/g, "") + "&nbsp;</i>" + "<span class='oni-button-text oni-button-text-middle" + (!iconText ? " oni-button-text-hidden" : "") + "'>" + options.label + "</span>" + "<i class='oni-icon oni-icon-right'>&nbsp;" + iconRight.replace(/\\/g, "") + "</i>"
                    break;
                }
            break;
        }
        element.innerHTML = buttonText
    }
    widget.version = 1.0
    widget.defaults = {
        groups: false, //@config 是否是button组
        direction: "", //@config button组的方向，有水平button组和垂直button组，默认是水平，可以设置为"vertical"
        /**
         * @config <p>data属性配置button组的内容，每一个数组元素都是一个包含单个按钮基本信息的对象。</p>
         * <p>注意，请只在button组由至少两个按钮组成时，才配置button组件为button组，也就是设置groups为true时，且配置相应的data</p>
         * <p>当然还有一种直接列出button组内容的方式，不过这种情况需要指定组件名为buttonset，请看<a href="./avalon.button.ex4.html">demo 4</a>a></p>
         * <pre>
            data: [{
                type: "labeledIcon",
                iconPosition: "right",
                icon: "\&\#xf04c;",
                size: "large",
                color: "success",
                text: "暂停"
            }, {
                type: "labeledIcon",
                iconPosition: "right",
                icon: "\&\#xf04b;",
                size: "large",
                color: "success",
                text: "播放"
            }, {
                type: "labeledIcon",
                iconPosition: "right",
                icon: "\&\#xf074;",
                size: "large",
                color: "success",
                text: "拖曳"
            }]                                
         </pre>
         */
        data: [], 
        type: "text", //@config 配置button的展示形式，仅文字展示，还是仅图标展示，或者文字加图标的展示方式，三种方式分别对应："text"、"icon"、"labeledIcon"
        iconPosition: "left", //@config 当type为icon或者labeledIcon时，定义icon在哪边，默认在text的左边，也可以配置为右边("right"),或者两边都有("left-right")
        icon: "", //@config  当type为icon或者labeledIcon时，定义展示icon的内容，本组件的icon是使用web font实现，当iconPosition为"left"或者"right"时，将icon的码赋给icon，当iconPosition为"left-right",将left icon与right icon的码以"-"分隔，比如data-button-icon="\&\#xf001;-\&\#xf06b;"
        size: "", //@config button有四个尺寸"small", "default", "big", "large"
        color: "", //@config 定义button的颜色，默认提供了"primary", "warning", "danger", "success", "info", "inverse", "default" 7中颜色，与bootstrap保持一致
        corner: true, //@config 设置是否显示圆角，可以布尔值或者Number类型，布尔只是简单的说明显示或者不显示，Number则在表示显示与否的同时，也是在指定圆角的大小，圆角默认是2px。
        style: "", // 用于定义button的展现形式，比如"flat" "glow" "rounded" "3D" "pill" 本组件，仅提供flat的实现
        disabled: false, //@config 配置button的禁用状态
        label: "", //@config 设置button的显示文字，label的优先级高于元素的innerHTML
        width: "" //@config 设置button的宽度，注意button的盒模型设为了border-box
    }
    return avalon
})
/**
 @links
 [设置button的大小、宽度，展示不同类型的button](avalon.button.ex1.html)
 [设置button的width和color](avalon.button.ex2.html)
 [通过ms-widget="button, $, buttonConfig"的方式设置button组](avalon.button.ex3.html)
 [通过ms-widget="buttonset"的方式设置button](avalon.button.ex4.html)
 */
;

define('css!smartgrid/avalon.smartgrid',[],function(){});
// avalon 1.3.6
/**
 *
 * @cnName 表格
 * @enName smartgrid
 * @introduce
 *    <p>smartgrid与simplegrid最大的不同是数据的渲染是通过静态模板实现的，当然也可以方便的实现动态更新视图。同时smartgrid实现了grid adapter的所有功能，不过部分使用方式会有些差异，下面会详细说明</p>
 */
define('smartgrid/avalon.smartgrid',["avalon",
    "text!./avalon.smartgrid.html",
    "../loading/avalon.loading",
    "../pager/avalon.pager",
    "../dropdown/avalon.dropdown",
    "../button/avalon.button",
    "css!../chameleon/oniui-common.css",
    "css!./avalon.smartgrid.css",
], function(avalon, template) {
    var regional = {
        confirmText: '确定',
        cancelText: '取消',
        optDefaultText: '默认',
        optAllText: '全部',
        optCustomText: '自定义',
        noDataText: '暂时没有数据',
        loadingText: '数据读取中',
        pagerSizeText: '每页显示',
        pagerUnitText: '条',
        pagerResultText: '条结果'
    }

    var tempId = new Date() - 0, templateArr = template.split('MS_OPTION_EJS'), gridHeader = templateArr[0],
        // 表格视图结构
        userAgent = (window.navigator.userAgent || '').toLowerCase(), positionAbsolute = userAgent.indexOf('msie 6') !== -1 || userAgent.indexOf('msie 7') !== -1, remptyfn = /^function\s+\w*\s*\([^)]*\)\s*{\s*}$/m, sorting = false,
        // 页面在排序的时候不用更新排序icon的状态为ndb，但如果是重新渲染数据的话重置icon状态为ndb
        callbacksNeedRemove = {};
    template = templateArr[1];
    // 静态模板渲染部分view
    var EJS = avalon.ejs = function (id, data, opts) {
            var el, source;
            if (!EJS.cache[id]) {
                opts = opts || {};
                var doc = opts.doc || document;
                data = data || {};
                if ($.fn) {
                    //如果引入jQuery, mass
                    el = $(id, doc)[0];
                } else if (doc.querySelectorAll) {
                    //如果是IE8+与标准浏览器
                    el = doc.querySelectorAll(id)[0];
                } else {
                    el = doc.getElementById(id.slice(1));
                }
                if (!el)
                    throw 'can not find the target element';
                source = el.innerHTML;
                if (!/script|textarea/i.test(el.tagName)) {
                    source = avalon.filters.unescape(source);
                }
                var fn = EJS.compile(source, opts);
                ejs.cache[id] = fn;
            }
            return ejs.cache[id](data);
        };
    //如果第二配置对象指定了tid，则使用它对应的编译模板
    EJS.compile = function (source, opts) {
        opts = opts || {};
        var tid = opts.tid;
        if (typeof tid === 'string' && typeof EJS.cache[tid] == 'function') {
            return EJS.cache[tid];
        }
        var open = opts.open || '<&';
        var close = opts.close || '&>';
        var helperNames = [], helpers = [];
        for (var name in opts) {
            if (opts.hasOwnProperty(name) && typeof opts[name] == 'function') {
                helperNames.push(name);
                helpers.push(opts[name]);
            }
        }
        var flag = true;
        //判定是否位于前定界符的左边
        var codes = [];
        //用于放置源码模板中普通文本片断
        var time = new Date() * 1;
        // 时间截,用于构建codes数组的引用变量
        var prefix = ' ;r += txt' + time + '[';
        //渲染函数输出部分的前面
        var postfix = '];';
        //渲染函数输出部分的后面
        var t = 'return function(data){\'use strict\'; try{var r = \'\',line' + time + ' = 0;';
        //渲染函数的最开始部分
        var rAt = /(^|[^\w\u00c0-\uFFFF_])(@)(?=\w)/g;
        var rstr = /(['"])(?:\\[\s\S]|[^\ \\r\n])*?\1/g;
        // /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/
        var rtrim = /(^-|-$)/g;
        var rmass = /mass/;
        var js = [];
        var pre = 0, cur, code, trim;
        for (var i = 0, n = source.length; i < n;) {
            cur = source.indexOf(flag ? open : close, i);
            if (cur < pre) {
                if (flag) {
                    //取得最末尾的HTML片断
                    t += prefix + codes.length + postfix;
                    code = source.slice(pre + close.length);
                    if (trim) {
                        code = code.trim();
                        trim = false;
                    }
                    codes.push(code);
                } else {
                    throw Error('\u53D1\u751F\u9519\u8BEF\u4E86');
                }
                break;
            }
            code = source.slice(i, cur);
            //截取前后定界符之间的片断
            pre = cur;
            if (flag) {
                //取得HTML片断
                t += prefix + codes.length + postfix;
                if (trim) {
                    code = code.trim();
                    trim = false;
                }
                codes.push(code);
                i = cur + open.length;
            } else {
                //取得javascript罗辑
                js.push(code);
                t += ';line' + time + '=' + js.length + ';';
                switch (code.charAt(0)) {
                case '=':
                    //直接输出
                    code = code.replace(rtrim, function () {
                        trim = true;
                        return '';
                    });
                    code = code.replace(rAt, '$1data.');
                    if (code.indexOf('|') > 1) {
                        //使用过滤器
                        var arr = [];
                        var str = code.replace(rstr, function (str) {
                                arr.push(str);
                                //先收拾所有字符串字面量
                                return 'mass';
                            }).replace(/\|\|/g, '@');
                        //再收拾所有短路或
                        if (str.indexOf('|') > 1) {
                            var segments = str.split('|');
                            var filtered = segments.shift().replace(/\@/g, '||').replace(rmass, function () {
                                    return arr.shift();
                                });
                            for (var filter; filter = arr.shift();) {
                                segments = filter.split(':');
                                name = segments[0];
                                args = '';
                                if (segments[1]) {
                                    args = ', ' + segments[1].replace(rmass, function () {
                                        return arr.shift();    //还原
                                    });
                                }
                                filtered = 'avalon.filters.' + name + '(' + filtered + args + ')';
                            }
                            code = '=' + filtered;
                        }
                    }
                    t += ' ;r +' + code + ';';
                    break;
                case '#':
                    //注释,不输出
                    break;
                case '-':
                default:
                    //普通逻辑,不输出
                    code = code.replace(rtrim, function () {
                        trim = true;
                        return '';
                    });
                    t += code.replace(rAt, '$1data.');
                    break;
                }
                i = cur + close.length;
            }
            flag = !flag;
        }
        t += ' return r; }catch(e){ avalon.log(e);\navalon.log(js' + time + '[line' + time + '-1]) }}';
        var body = [
                'txt' + time,
                'js' + time,
                'filters'
            ];
        var fn = Function.apply(Function, body.concat(helperNames, t));
        var args = [
                codes,
                js,
                avalon.filters
            ];
        var compiled = fn.apply(this, args.concat(helpers));
        if (typeof tid === 'string') {
            return EJS.cache[tid] = compiled;
        }
        return compiled;
    };
    EJS.cache = {};
    //用于保存编译好的模板函数
    avalon.filters.unescape = function (target) {
        return target.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        //处理转义的中文和实体字符
        return target.replace(/&#([\d]+);/g, function ($0, $1) {
            return String.fromCharCode(parseInt($1, 10));
        });
    };
    var cnt = 0;
    function guid() {
        return 'smartgridTr' + cnt++;
    }
    var countter = 0;
    var widget = avalon.ui.smartgrid = function (element, data, vmodels) {
            var options = data.smartgridOptions, $element = avalon(element), pager = options.pager, vmId = data.smartgridId, gridEle, containerWrapper, smartgridHeader, $initRender = true, _dataVM, _data = [];
            options._parentContainer = null;
            options._parentContainerWidth = 0;
            if (typeof options.data === 'number') {
                for (var i = 0, v; v = vmodels[i++];) {
                    if (v._uiName && v._uiName === 'smartgrid') {
                        options.data = v.data[options.data][options.field] || [];
                        break;
                    }
                }
            }
            initContainer(options, element);
            perfectColumns(options, element, vmId);
            options._position = positionAbsolute ? 'absolute' : 'fixed';
            options.$pagerConfig = {
                canChangePageSize: true,
                options: [
                    10,
                    20,
                    50,
                    100
                ],
                //默认[10,20,50,100]
                onInit: function (pagerVM, options, vmodels) {
                    vmodel && (vmodel.pager = pagerVM);
                }
            };
            options.pageable = options.pageable !== void 0 ? options.pageable : true;
            if (avalon.type(pager) === 'object') {
                if (options.pageable) {
                    pager.getTemplate = typeof pager.getTemplate === 'function' ? pager.getTemplate : function (tmpl, options) {
                        var optionsStr = '';
                        if (Array.isArray(pager.options) && options.canChangePageSize) {
                            optionsStr = '<div class="oni-smartgrid-pager-options"><div class="oni-smartgrid-showinfo">'
                                + regional.pagerSizeText
                                + '</div><select ms-widget="dropdown" data-dropdown-list-width="50" data-dropdown-width="50" ms-duplex="perPages">'
                                + '<option ms-repeat="options" ms-value="el.value" ms-attr-label="el.value">{{el.text}}</option></select>'
                                + '<div class="oni-smartgrid-showinfo">' + regional.pagerUnitText + ', {{totalItems}}'
                                + regional.pagerResultText + '</div></div>';
                        } else {
                            optionsStr = '<div class="oni-smartgrid-pager-options">{{totalItems}}\u6761\u7ED3\u679C</div>';
                        }
                        return tmpl + optionsStr;
                    };
                }
                if (pager.onInit && typeof pager.onInit === 'function') {
                    var onInit = pager.onInit;
                    pager.onInit = function (pagerVM, options, vmodels) {
                        vmodel && (vmodel.pager = pagerVM);
                        onInit(pagerVM, options, vmodels);
                    };
                }
                avalon.mix(options.$pagerConfig, pager);
            }
            options.pager = null;
            //方便用户对原始模板进行修改,提高制定性
            options.template = options.getTemplate(template, options);
            options.$skipArray = [
                'smartgrid',
                '_uiName',
                '_allEnabledData',
                'template',
                'widgetElement',
                'container',
                'htmlHelper',
                'selectable',
                'pageable',
                'noResult',
                'sortable',
                'pager',
                'data',
                // 一定不要去掉啊，去掉了就会出错
                '_disabledData',
                '_enabledData',
                '_filterCheckboxData',
                'maxGridWidth',
                'bodyHeight',
                '_parentContainer',
                '_parentContainerWidth'
            ].concat(options.$skipArray);
            var vmodel = avalon.define(vmId, function (vm) {
                    avalon.mix(vm, options);
                    vm.widgetElement = element;
                    vm._headerTop = 0 + options.affixHeight;
                    vm._fixHeaderToggle = false;
                    vm._gridWidth = 'auto';
                    vm._pagerShow = false;
                    vm._allEnabledData = [];
                    vm._disabledData = [];
                    vm._enabledData = [];
                    vm._filterCheckboxData = [];
                    vm._dataRender = false;
                    vm.perPages = void 0;
                    vm.maxGridWidth = 0;
                    vm.$headerElement = null;
                    vm.adjustColumnWidth = function(){return adjustColumnWidth(vmodel)};
                    vm._hiddenAffixHeader = function (column, allChecked) {
                        var selectable = vmodel.selectable;
                        return selectable && selectable.type && column.key == 'selected' && !allChecked;
                    };
                    /**
             * @interface 获取表格数据,当然也可以通过vmodel.data直接获得表格数据
             */
                    vm.getRawData = function () {
                        return vmodel.data;
                    };
                    /**
             * @interface 获取选中表格行的数据集合
             */
                    vm.getSelected = function () {
                        var disabledData = vmodel._disabledData, selectedData = [];
                        disabledData.forEach(function (dataItem, index) {
                            if (dataItem.selected) {
                                selectedData.push(dataItem);
                            }
                        });
                        return selectedData.concat(vmodel._enabledData);
                    };
                    /**
             * @interface {Function} 全选表格，或者全不选
             * @param b {Boolean} true表示全选，false表示全不选，为空时以true对待
             */
                    vm.selectAll = function (b) {
                        b = b !== void 0 ? b : true;
                        vmodel._selectAll(null, b);
                    };
                    /**
             * @interface {Function} 判断表过是否全选
             * @returns {Boolean} true表示全选，false表示全不选
             */
                    vm.isSelectAll = function () {
                        return vmodel._allSelected;
                    };
                    vm.sortColumn = function (column, index, event) {
                        var target = event.target, $target = avalon(target), sortTrend = '', field = column.key, trend = 0, onColumnSort = vmodel.onColumnSort;
                        if (!vmodel.data.length)
                            return;
                        if ($target.hasClass('oni-helper-sort-top')) {
                            sortTrend = 'asc';
                        } else {
                            sortTrend = 'desc';
                        }
                        sorting = true;
                        sortTrend == 'asc' ? trend = 1 : trend = -1;
                        column.sortTrend = sortTrend;
                        if (vmodel.sortable.remoteSort && typeof vmodel.remoteSort === 'function' && !remptyfn.test(vmodel.remoteSort)) {
                            vmodel.remoteSort(field, sortTrend, vmodel);
                            // onColumnSort回调对于远程排序的最好时机是在remoteSort中数据渲染之后自行处理
                            ;
                        } else if (typeof column.localSort === 'function' && !remptyfn.test(column.localSort)) {
                            // !isEmptyFn(el.localSort)
                            //如果要在本地排序,并且指定排数函数
                            vmodel.data.sort(function (a, b) {
                                return trend * column.localSort(a, b, field, vmodel.$model) || 0;
                            });
                            vmodel.render();
                            if (avalon.type(onColumnSort) === 'function') {
                                onColumnSort.call(vmodel, sortTrend, field);
                            }
                        } else {
                            //否则默认处理
                            if (column.type === 'Number') {
                                vmodel.data.sort(function (a, b) {
                                    return trend * (a[field] - b[field]) || 0;
                                });
                            } else {
                                vmodel.data.sort(function (a, b) {
                                    try {
                                        return trend * a[field].localeCompare(b[field]);
                                    } catch (e) {
                                        return trend * (a[field] - b[field]) || 0;
                                    }
                                });
                            }
                            vmodel.render();
                            if (avalon.type(onColumnSort) === 'function') {
                                onColumnSort.call(vmodel, sortTrend, field);
                            }
                        }
                    };
                    /**
             * @interface {Function} 设置列的显示或者隐藏
             * @param columns {String|Array} 可以是字符串，也可以是数组，列出要设置的列的key值
             * @param b {Boolean} true为显示列，false为隐藏列，设置了列的isLock属性为ture时始终显示列
             */
                    vm.setColumns = function (columns, b) {
                        var columnsOption = vmodel.columns;
                        columns = [].concat(columns);
                        b = b !== void 0 ? b : true;
                        for (var i = 0, len = columnsOption.length; i < len; i++) {
                            var column = columnsOption[i], key = column.$model.key, keyIndex = columns.indexOf(key);
                            if (keyIndex != -1 && !column.isLock) {
                                column.toggle = b;
                            }
                        }
                        adjustColumnWidth(vmodel);
                    };
                    /**
             * @interface {Function} 调用此方法清空表格数据
             * @param text {String} 无数据情况下的说明文字，默认为“暂时没有数据”
             */
                    vm.showNoResult = function (text) {
                        // 只要数据为空组件会自动showNoResult,考虑到使用习惯保留了showNoResult，不过其实完全可以不用
                        vmodel.noResult = text || vmodel.noResult;
                        vmodel.data = [];
                        vmodel.render();
                    };
                    /**
             * @interface {Function} 显示缓冲提示
             */
                    vm.showLoading = function () {
                        // vmodel.loadingVModel.toggle = true; // TODO
                    };
                    /**
             * @interface {Function} 隐藏缓冲提示
             */
                    vm.hideLoading = function () {
                        // vmodel.loadingVModel.toggle = false; // TODO
                    };
                    /**
             * 响应window.resize以调整宽度为百分比的内容
             */
                    vm._adjustColWidth = function () {
                        var cols = vmodel.columns, parentWidth = avalon(vmodel.container.parentNode).width();
                        for (var i = 0, len = cols.length; i < len; i++) {
                            var col = cols[i];
                            if (String(col.originalWidth).indexOf('%') !== -1) {
                                col.width = Math.floor(parentWidth * parseInt(col.originalWidth, 10) / 100) - 1;
                            }
                        }
                    };
                    vm._selectAll = function (event, selected) {
                        var datas = vmodel.data, rows = containerWrapper.children, onSelectAll = vmodel.onSelectAll, val = event ? event.target.checked : selected, enableData = datas.concat();
                        for (var i = 0, len = rows.length; i < len; i++) {
                            var row = rows[i], $row = avalon(row);
                            if (!$row.hasClass('oni-smartgrid-row')) {
                                continue;
                            }
                            var input = row.children[0].getElementsByTagName('input')[0], dataIndex = input && avalon(input).attr('data-index'), data;
                            if (dataIndex !== null && dataIndex !== void 0) {
                                data = datas[dataIndex];
                                if (!data.disable) {
                                    data.selected = val;
                                    input.checked = val;
                                    $row[val ? 'addClass' : 'removeClass']('oni-smartgrid-selected');
                                }
                            } else {
                                continue;
                            }
                        }
                        if (val) {
                            vmodel._enabledData = vmodel._allEnabledData.concat();
                        } else {
                            vmodel._enabledData = [];
                        }
                        if (avalon.type(onSelectAll) === 'function') {
                            onSelectAll.call(vmodel, datas, val);
                        }
                        setTimeout(function () {
                            vmodel._allSelected = val;
                        }, 100);
                    };
                    vm._toggleColumn = function (toggle, index) {
                        if (!containerWrapper)
                            return toggle;
                        var rows = containerWrapper.children, column = null;
                        for (var i = 0, row, len = rows.length; i < len; i++) {
                            row = rows[i];
                            if (!avalon(row).hasClass('oni-smartgrid-row')) {
                                continue;
                            }
                            column = row.children[index];
                            if (column) {
                                if (toggle) {
                                    column.style.display = 'table-cell';
                                } else {
                                    column.style.display = 'none';
                                }
                            }
                        }
                        return toggle;
                    };
                    vm._setColumnWidth = function (resize) {
                        var parentContainerWidth = avalon(vmodel.container.parentNode).width() - 2, columnsInfo = getMaxWidthColumn(vmodel.columns), showColumnWidth = columnsInfo.showColumnWidth, maxWidthColumn = columnsInfo.maxWidthColumn, maxWidth = maxWidthColumn.configWidth, adjustColumns = [maxWidthColumn], autoWidth = parentContainerWidth - showColumnWidth + maxWidth, rows = Array.prototype.slice.call(containerWrapper.children);
                        if (!autoWidth) {
                            return false;
                        }
                        setColumnWidth(adjustColumns, autoWidth);
                        rows.forEach(function (row, index) {
                            var columns = vmodel.columns.$model, rowColumns = row.children, columnsLen = columns.length;
                            if (rowColumns.length < columnsLen) {
                                return false;
                            }
                            for (var i = 0; i < columnsLen; i++) {
                                rowColumns[i].style.width = columns[i].width + 'px';
                            }
                        });
                    };
                    vm._getTemplate = function (defineDatas, startIndex) {
                        var fn, html, id = 'smartgrid_tmp_' + tempId, dt = defineDatas || vmodel.data, _columns = vmodel.columns, columns = _columns.$model, selectableType = vmodel.selectable && vmodel.selectable.type || '', datas = [];
                        avalon.each(dt, function (i, item) {
                            if (item.$id && item.$id != 'remove')
                                datas.push(item);
                        });
                        var dataLen = datas.length, checkRow = selectableType === 'Checkbox';
                        if (!EJS[id]) {
                            fn = EJS.compile(options.template, vmodel.htmlHelper);
                            EJS[id] = fn;
                        } else {
                            fn = EJS[id];
                        }
                        for (var i = 0, len = columns.length; i < len; i++) {
                            var column = columns[i], name = column.key;
                            if (!sorting) {
                                //如果sortTrend属性不存在，在IE下直接给它赋值会报错
                                _columns[i].sortTrend && (_columns[i].sortTrend = 'ndb');
                            }
                            for (var j = 0; j < dataLen; j++) {
                                var data = datas[j];
                                data[name] = data[name] !== void 0 ? data[name] : column.defaultValue;
                            }
                        }
                        html = fn({
                            data: datas,
                            columns: _columns,
                            len: 2,
                            noResult: vmodel.noResult,
                            vmId: vmId,
                            startIndex: startIndex || 0,
                            checkRow: checkRow
                        });
                        return html;
                    };
                    vm._getAllCheckboxDisabledStatus = function (allSelected) {
                        var disabledCheckboxLen = vmodel._filterCheckboxData.length, disabledData = vmodel._disabledData.length, noneSelectedDataLen = disabledCheckboxLen + disabledData;
                        if (allSelected) {
                            return noneSelectedDataLen === vmodel.data.length ? true : false;
                        } else {
                            return false;
                        }
                    };
                    /**
             * @interface 增加行，已經渲染的不會再操作
             * @param data {Array} 新增的行
             * @param init {Boolean} 是否为初始化grid
             * @param noShowLoading {Boolean} 渲染期间是否显示loading
             */
                    vm.addRows = function (data, init, noShowLoading) {
                        // 防止 addRows([])带来问题
                        if ((!data || !data.length) && !init)
                            return;
                        var tableTemplate = '', rows, container = vmodel.container, selectable = vmodel.selectable, len = vmodel.getLen(vmodel.data), arrLen = vmodel.data.length;
                        if (!containerWrapper)
                            return;
                        if (len === 0 || init)
                            avalon.clearHTML(containerWrapper);
                        vmodel._pagerShow = !len ? false : true;
                        // 做数据拷贝
                        if (data) {
                            var _data = [];
                            avalon.each(data, function (i, item) {
                                _data.push(avalon.mix({}, item));
                                _data[i].$id = guid();
                            });
                            vmodel.data.push.apply(vmodel.data, _data);
                        }
                        avalon.each(vmodel.data, function (i, item) {
                            item.$id = item.$id || guid();
                        });
                        tableTemplate = vmodel.addRow(vmodel._getTemplate(data ? vmodel.data.slice(arrLen) : data, data ? arrLen : 0), vmodel.columns.$model, vmodels);
                        rows = avalon.parseHTML(tableTemplate);
                        containerWrapper.appendChild(rows);
                        if (selectable && (selectable.type === 'Checkbox' || selectable.type === 'Radio')) {
                            var allSelected = isSelectAll(vmodel.data);
                            vmodel._allSelected = allSelected;
                            getSelectedData(vmodel);
                        }
                        if (!noShowLoading){
                            vmodel.showLoading(vmodel.data);
                        }
                        avalon.nextTick(function () {
                            avalon.scan(vmodel.container, [vmodel].concat(vmodels));
                            if (!noShowLoading)
                                vmodel.hideLoading();
                        })
                        if (sorting){
                            sorting = false;
                        }
                    };
                    vm.getLen = function (arr) {
                        var cnt = 0;
                        for (var i = 0, len = arr.length; i < len; i++) {
                            if (arr[i] && arr[i].$id != 'remove')
                                cnt++;
                        }
                        return cnt;
                    };
                    vm.removeRow = function (index, removeData) {
                        var data = vmodel.data[index];
                        if (!data)
                            return;
                        var id = data.$id, tr = document.getElementById(id);
                        tr && tr.parentNode.removeChild(tr);
                        if (removeData === false) {
                            data.$id = 'remove';
                        } else {
                            vmodel.data.splice(index, 1);
                        }
                        if (!vmodel.getLen(vmodel.data))
                            vmodel.render(void 0, true);
                    };
                    /**
             * @interface {Function} 用新的数据重新渲染表格视图
             * @param data {Array} 重新渲染表格的数据集合
             * @param init {Boolean} 是否为初始化grid
             * @param noShowLoading {Boolean} 渲染期间是否显示loading
             */
                    vm.render = function (data, init, noShowLoading) {
                        if (avalon.type(data) === 'array') {
                            vmodel.data = data;
                        } else {
                            init = data;
                        }
                        init = init === void 0 || init ? true : false;
                        if (!$initRender) {
                            dataFracte(vmodel);
                            vmodel._dataRender = !vmodel._dataRender;
                        } else {
                            $initRender = false;
                        }
                        if (!vmodel.noHeader && init && vmodel.isAffix && !vmodel.maxGridWidth) {
                            vmodel._gridWidth = avalon(gridEle).innerWidth();
                        }
                        vmodel.addRows(void 0, init, noShowLoading);
                        if (avalon.type(data) === 'array' && data.length) {
                            adjustColumnWidth(vmodel);
                        }
                        if (sorting) {
                            sorting = false;
                        } else if (!init) {
                            vmodel.container.scrollIntoView();
                        }
                        // vm._adjustColWidth();
                    };
                    vm.$init = function () {
                        var container = vmodel.container, gridFrame = '';
                        gridFrame = gridHeader.replace('MS_OPTION_ID', vmodel.$id);
                        container.innerHTML = gridFrame;
                        dataFracte(vmodel);
                        avalon.scan(container, [vmodel].concat(vmodels));
                        gridEle = document.getElementById('oni-smartgrid');
                        containerWrapper = document.getElementById('oni-smartgrid-body');
                        vmodel.$headerElement = smartgridHeader = document.getElementById('oni-smartgrid-header');
                        if (vmodel.maxGridWidth) {
                            var gridMainEle = document.getElementById('oni-smartgrid-main');
                            gridMainEle.style.width = vmodel.maxGridWidth + 'px';

                            vmodel._position = 'relative';
                            gridMainEle.parentNode.style.cssText = '*overflow-x: scroll;_overflow-x: scroll;';
                        }

                        gridEle.id = '';
                        containerWrapper.id = '';
                        smartgridHeader.id = '';
                        document.getElementById('oni-smartgrid-main').id = '';

                        if (!vmodel.bodyHeight) {
                            containerWrapper.parentNode.style.cssText = '*overflow-y:hidden;_overflow-y:hidden;';
                        } else {
                            containerWrapper.parentNode.style.cssText = '*overflow-y:scroll;_overflow-y:scroll;height:' + vmodel.bodyHeight + 'px';
                        }
                        avalon.nextTick(function () {
                            vmodel.render(true);
                            bindEvents(vmodel, container);
                        });
                        if (vmodel.isAffix) {
                            if (!callbacksNeedRemove.scrollCallback) {
                                callbacksNeedRemove.scrollCallback = avalon(window).bind('scroll', function () {
                                    var scrollTop = Math.max(document.body.scrollTop, document.documentElement.scrollTop), offsetTop = $element.offset().top, headerHeight = avalon(smartgridHeader).css('height'), top = scrollTop - offsetTop + vmodel.affixHeight, clientHeight = avalon(window).height(), tableHeight = $element.outerHeight(), _position = vmodel._position;
                                    if (tableHeight > clientHeight && scrollTop > offsetTop + headerHeight && offsetTop + tableHeight > scrollTop) {
                                        if (vmodel._position !== 'fixed') {
                                            vmodel._headerTop = Math.floor(top);
                                        }
                                        if (!vmodel.$model._fixHeaderToggle) {
                                            vmodel._fixHeaderToggle = true;
                                        }
                                    } else {
                                        vmodel._headerTop = 0;
                                        if (vmodel.$model._fixHeaderToggle) {
                                            vmodel._fixHeaderToggle = false;
                                        }
                                    }
                                });
                            }
                        }
                        element.resizeTimeoutId = 0;
                        if (vmodel.colHandlerContainer !== '') {
                            addColHandlerTo(vmodel.colHandlerContainer, vmodel);
                        }
                        if (typeof options.onInit === 'function') {
                            options.onInit.call(element, vmodel, options, vmodels);
                        }
                        setTimeout(function(){
                            adjustColumnWidth(vmodel);
                            setTimeout(function(){
                                avalon(vmodel.widgetElement.children[0]).css({
                                    opacity: 1
                                })
                            }, 100)
                        }, 200)
                        if (window.addEventListener) {
                            window.addEventListener('resize', function () {
                                adjustColumnWidth(vmodel);
                            });
                        } else {
                            window.attachEvent('onresize', function () {
                                adjustColumnWidth(vmodel);
                            });
                        }

                        // show loading
                        var loadingText = document.getElementById('oni-smartgrid-loading-text')

                        avalon(loadingText).css({
                            marginTop: - loadingText.offsetHeight / 2 + 'px',
                            marginLeft: - loadingText.offsetWidth / 2 + 'px',
                            opacity: 1
                        })
                        loadingText.id = '';
                    };
                    vm.$remove = function () {
                        var container = vmodel.container;
                        container.innerHTML = container.textContent = '';
                        avalon(window).unbind('scroll', callbacksNeedRemove.scrollCallback);
                    };
                });
            return vmodel;
        };
    widget.defaults = {
        _uiName: 'smartgrid',
        container: '',
        //@config 设置组件的容器元素，可以是字符串,表示对应元素的id，也可以是元素对象
        pageable: true,
        //@config 表格是否需要分页，默认需要，false不需要
        noHeader: false,
        //@config 是否显示表格头部
        noFooter: false,
        //@config 是否显示表格底部
        data: [],
        //@config 表格数据
        /* @config 表格列信息对象的集合
         * <pre>[{
    key: "name", <span>//列标志 </span>
    name: "姓名", <span>//列名</span>
    sortable: true, <span>//是否可对列排序</span>
    isLock: true, <span>//是否锁死列，设为true会始终显示此列，无论配置如何</span>
    align": "left", <span>//设置列的对齐方式，"left"|"center"|"right"默认为"center"</span>
    defaultValue: "shirly", <span>//列的默认值，当数据中没有为此列设置值时显示此默认值</span>
    customClass: "custom", <span>//设置此列单元格的自定义类</span>
    toggle: false, <span>//是否显示此列，true显示false不显示</span>
    width: 400, <span>//设置列宽，必须是Number</span>
    localSort: function(a, b, f) { <span>//自定义列的本地排序规则</span>
        return a[f].localeCompare(b[f]);
    },
    format: "upperCaseName" <span>//包装列数据的方法，此方法名对应到htmlHelper对象中的方法</span>
}, ...]</pre>
         */
        columns: [],
        colHandlerContainer: '',
        //@config 为列显隐设置按钮指定一个容器，不配置该项则按钮不出现，可传DOM节点或id
        allChecked: true,
        //@config 当设置selectable之后，是否显示表头的全选框，默认显示，false不显示
        htmlHelper: {},
        //@config 包装数据的方法集合,可<a href="avalon.smartgrid.ex2.html">参见实例2</a>的使用
        noResult: regional.noDataText,
        //@config 数据为空时表格的提示信息
        /**
         * @config {Function} 远程排序操作的方法
         * @param field {String} 待排序的列名
         * @param sortTrend {String} 排序规则，"asc"为升序"desc"为降序
         * @param vmodel {Object} smartgrid组件对应的Vmodel
         */
        remoteSort: avalon.noop,
        isAffix: false,
        //@config 表头在表格内容超过可视区高度时是否吸顶，true吸顶，false不吸顶，默认不吸顶
        affixHeight: 0,
        //@config 配置吸顶元素距离窗口顶部的高度
        selectable: false,
        //@config 为表格添加Checkbox或者Radio操作项，格式为<pre>{type: 'Checkbox', width: '25px'}</pre>
        bodyHeight: 0,
        //@config 设置loading缓冲的配置项，具体使用方法参见loading文档
        loadingToggle: false,
        loadingText: regional.loadingText + "...",

        // TODO
        // modal: true,
        // modalBackground: '#fff',
        // modalOpacity: '0.6',

        pager: {},
        //@config 设置pager的配置项，smartgrid组件默认会添加pager，也可以改变表格显示数目，默认可选10、20、50、100条数据，如果不希望显示此选项，可以设置canChangePageSize为false
        //@config 是否进行远程排序，默认true，进行远程排序必须配置远程排序的方法：remoteSort
        sortable: { remoteSort: true },
        /**
         * @config {Function} 为表格添加新行
         * @param tmp {String} 表格的body模板
         * @param columns {Array} 列信息数组
         * @param vmodel {Object} smartgrid组件对应的Vmodel
         * @returns {String} 用户定制后的模板
         */
        addRow: function (tmpl, columns, vmodel) {
            return tmpl;
        },
        getTemplate: function (str, options) {
            return str;
        },
        /**
         * @config {Function} 排序回调
         * @param sortType {String} 排序规则，"asc"为升序"desc"为降序
         * @param field {String} 排序的列名
         */
        onColumnSort: avalon.noop,
        /**
         * @config {Function} 用户选中一行或者取消一行选中状态的回调
         * @param rowData {Object} 被操作行的数据对象
         * @param isSelected {Boolean} 行的选中状态，true选中状态，false非选中状态
         * @param dataIndex {Number} 当前行数据在data中的索引
         */
        onRowSelect: avalon.noop,
        /**
         * @config {Function} 用户全选或全不选的回调
         * @param datas {Array} 表格数据
         * @param isSelectedAll {Boolean} 全选状态，true选中状态，false非选中状态
         */
        onSelectAll: avalon.noop,
        bodyMinHeight: 'auto'
    };
    function adjustColumnWidth(vmodel) {
        var columns = vmodel.columns,
            containerWidth = avalon(vmodel.$headerElement).width(),
            allColumnWidth = 0,
            maxWidth = 0,
            maxWidthColumn = null,
            needResizeColumns = []

        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            if (column.width === 'auto' || column.auto === true) {
                column.auto = true
                needResizeColumns.push(column);
            } else{
                var calculateWidth = 0
                if(typeof column.width === 'string' && column.width.indexOf('%') > -1 || column.percentage){
                    column.percentage = column.percentage || column.width
                    column.width = calculateWidth = containerWidth * parseFloat(column.percentage) / 100
                } else {
                    calculateWidth = column.width
                }

                if(column.toggle){
                    allColumnWidth += calculateWidth

                    if(calculateWidth > maxWidth){
                        maxWidthColumn = column
                    }
                    maxWidth = Math.max(maxWidth, calculateWidth)
                }
            }
        }

        var scrollBarWidthBlank = 30,
            autoWidth = Math.floor(containerWidth - allColumnWidth + maxWidth - scrollBarWidthBlank);
        if (allColumnWidth > containerWidth && needResizeColumns.length === 0) {
            needResizeColumns.push(maxWidthColumn);
            setColumnWidth(needResizeColumns, autoWidth);
        } else {
            if (maxWidth) {
                if (!needResizeColumns.length) {
                    needResizeColumns.push(maxWidthColumn);
                } else {
                    autoWidth = containerWidth - allColumnWidth - scrollBarWidthBlank;
                }
            }
            setColumnWidth(needResizeColumns, autoWidth);
        }
    }
    function initContainer(options, element) {
        var container = options.container;
        if (container) {
            if (typeof container == 'string') {
                container = document.getElementById(container);
            }
            if (!container.nodeType || container.nodeType != 1 || !document.body.contains(container)) {
                container = null;
            }
        }
        container = container || element;
        options.container = container;
    }
    function bindEvents(options, containerWrapper) {
        if (!options.selectable) {
            return;
        }
        var type = options.selectable.type;
        if (type === 'Checkbox' || type === 'Radio') {
            avalon.bind(containerWrapper, 'click', function (event) {
                var target = event.target, $target = avalon(target), $row = avalon(target.parentNode.parentNode.parentNode), datas = options.data, onSelectAll = options.onSelectAll, enabledData = options._enabledData, disabledData = options._disabledData, dataIndex = $target.attr('data-index'), filterCheckboxData = options._filterCheckboxData;
                if (!$target.attr('data-role') || dataIndex === null) {
                    return;
                }
                if ($target.attr('data-role') === 'selected') {
                    var rowData = datas[dataIndex], isSelected = target.checked;
                    if (isSelected) {
                        options.selectable.type === 'Checkbox' ? $row.addClass('oni-smartgrid-selected') : 0;
                        if (options.selectable.type === 'Radio') {
                            enabledData.splice(0, enabledData.length);
                        }
                        rowData.selected = true;
                        avalon.Array.ensure(enabledData, rowData);
                    } else {
                        $row.removeClass('oni-smartgrid-selected');
                        rowData.selected = false;
                        avalon.Array.remove(enabledData, rowData);
                    }
                    if (avalon.type(options.onRowSelect) === 'function') {
                        options.onRowSelect.call($row[0], rowData, isSelected, dataIndex);
                    }
                }
                if (enabledData.length == datas.length - disabledData.length - filterCheckboxData.length) {
                    options._allSelected = true;
                } else {
                    options._allSelected = false;
                }
            });
        }
    }
    function dataFracte(vmodel) {
        var data = vmodel.data, enabledData = vmodel._enabledData = [], disabledData = vmodel._disabledData = [], filterCheckboxData = vmodel._filterCheckboxData = [];
        for (var i = 0, len = data.length, dataItem; i < len; i++) {
            dataItem = data[i];
            if (dataItem.disable) {
                disabledData.push(dataItem);
                continue;
            }
            if (dataItem.checkboxShow == false) {
                filterCheckboxData.push(dataItem);
                continue;
            }
            enabledData.push(dataItem);
        }
        vmodel._allEnabledData = enabledData.concat();
    }
    function getSelectedData(vmodel) {
        var datas = vmodel.data, enabledData = vmodel._enabledData = [];
        for (var i = 0, len = datas.length; i < len; i++) {
            var data = datas[i], selected = data.selected;
            if (selected && !data.disable) {
                enabledData.push(data);
            }
        }
    }
    function getMaxWidthColumn(columns, vmodel) {
        var maxWidth = 0, maxWidthColumn = null, showColumnWidth = 0, _columns = columns.$model || columns;
        for (var i = 0, len = _columns.length; i < len; i++) {
            var column = _columns[i], columnWidth = column.width;
            if (column.toggle) {
                columnWidth > maxWidth ? (maxWidth = columnWidth) && (maxWidthColumn = columns[i]) : 0;
                showColumnWidth += columnWidth;
            }
        }
        return {
            maxWidthColumn: maxWidthColumn,
            showColumnWidth: showColumnWidth
        };
    }
    function isSelectAll(datas) {
        var allSelected = true, len = datas.length, checkboxFilterAll = 0;
        if (!len) {
            return false;
        }
        for (var i = 0; i < len; i++) {
            var data = datas[i];
            if (data.selected === void 0) {
                data.selected = false;
            }
            if (data.checkboxShow !== false && !data.selected && !data.disable) {
                allSelected = false;
            }
            if (data.checkboxShow === false) {
                checkboxFilterAll++;
            }
        }
        if (checkboxFilterAll === len) {
            allSelected = false;
        }
        return allSelected;
    }
    function perfectColumns(options, element, vmId) {
        var columns = options.columns, selectColumn = {}, parentContainer = avalon(options.container.parentNode),
            parentContainerWidth = parentContainer.width() - 2

        options._parentContainer = parentContainer;
        options._parentContainerWidth = parentContainerWidth;
        for (var i = 0, len = columns.length; i < len; i++) {
            var column = columns[i], format = column.format, htmlFunction = '', _columnWidth = column.width, columnWidth = ~~_columnWidth;
            column.align = column.align || 'center';
            column.auto = false;
            column.percentage = null;
            column.originalWidth = _columnWidth;
            if (column.toggle === void 0 || column.isLock) {
                column.toggle = true;
            }
            column.configWidth = columnWidth;
            if (!columnWidth && _columnWidth) {
                if (_columnWidth.indexOf('%')) {
                    columnWidth = column.width
                } else {
                    columnWidth = 'auto';
                }
            }
            if (_columnWidth === void 0) {
                columnWidth = 'auto';
            }
            column.width = columnWidth;
            column.customClass = column.customClass || '';
            if (column.sortable) {
                column.sortTrend = 'ndb';
            }
            // 防止某些情形下format被覆盖
            if (avalon.isFunction(format))
                return;
            if (format && !options.htmlHelper[format]) {
                options.htmlHelper[format] = function (vmId, field, index, cellValue, rowData) {
                    avalon.log('\u65B9\u6CD5' + format + '\u672A\u5B9A\u4E49');
                    if (typeof cellValue === 'string') {
                        return avalon.filters.sanitize(cellValue);
                    }
                    return cellValue;
                };
            }
            htmlFunction = options.htmlHelper[format];
            if (!htmlFunction) {
                htmlFunction = function (vmId, field, index, cellValue, rowData) {
                    if (typeof cellValue === 'string') {
                        return avalon.filters.sanitize(cellValue);
                    }
                    return cellValue;
                };
            }
            column.format = htmlFunction;
            // EJS模板对于helper的渲染是通过将helper中的方法分别作为compiler的参数存在的，为了在静态模板中可以使用fn()这种方式渲染数据，只好统一将渲染数据的方法保存在format中
            ;
        }
        if (options.selectable) {
            var type = options.selectable.type, selectFormat, allSelected = true, selectableWidth = options.selectable.width || 25;
            if (typeof selectableWidth === 'string') {
                if (selectableWidth.indexOf('%') !== -1) {
                    selectableWidth = parseInt(selectableWidth, 10) / 100 * parentContainerWidth;
                } else {
                    selectableWidth = parseInt(selectableWidth, 10);
                }
            }
            if (type === 'Checkbox' || type === 'Radio') {
                selectFormat = function (vmId, field, index, selected, rowData, disable, allSelected) {
                    if (allSelected && type === 'Radio')
                        return;
                    if (rowData.checkboxShow === false) {
                        return '';
                    }
                    var disableStr = disable ? ' disabled ' : ' ms-disabled=\'_getAllCheckboxDisabledStatus(' + (allSelected ? true : false) + ', _dataRender)\' ';
                    return '<input type=\'' + type.toLowerCase() + '\'' + disableStr + (selected ? 'checked=\'checked\'' : '') + ' name=\'selected\' ' + (allSelected ? ' ms-on-click=\'_selectAll\' ms-duplex-radio=\'_allSelected\'' : ' data-index=\'' + index + '\'') + ' data-role=\'selected\'/>';
                };
                options._allSelected = false;
            }
            selectColumn = {
                key: 'selected',
                name: selectFormat(options.$id, 'selected', -1, allSelected, [], null, true),
                width: selectableWidth,
                configWidth: selectableWidth,
                originalWidth: options.selectable.width || 25,
                sortable: false,
                type: options.selectable.type,
                format: selectFormat,
                toggle: true,
                align: 'center',
                customClass: '',
                auto: false,
                percentage: null
            };
            columns.unshift(selectColumn);
        }

        options.columns = columns;
    }
    function setColumnWidth(columns, width) {
        var column = null, len = columns.length, columnWidth = width / len;
        for (var i = 0; i < len; i++) {
            column = columns[i];
            column.width = columnWidth - 1;
        }
    }

    return avalon;

    // 添加对列显示/隐藏的控制
    function addColHandlerTo(container, sgVmodel) {
        if (!container) {
            return;
        }
        if (typeof container === 'string') {
            container = document.getElementById(sgVmodel.colHandlerContainer);
        }
        var containerCtrlId = 'colHandler_' + Date.now();
        container.setAttribute('ms-controller', containerCtrlId);
        var handlerWrap = document.createElement('div'), handlerTpl = '';
        handlerTpl += '<div class="oni-smartgrid-handler-toggle"';
        handlerTpl += '     ms-class="oni-smartgrid-handler-toggle-active: handlerWindowVisible"';
        handlerTpl += '     ms-click="toggleHandlerWindow()">';
        handlerTpl += '</div>';
        handlerTpl += '<div class="oni-smartgrid-handler" ms-visible="handlerWindowVisible">';
        handlerTpl += '    <div class="oni-smartgrid-handler-mode">';
        handlerTpl += '        <span class="oni-smartgrid-handler-mode-item"';
        handlerTpl += '              ms-repeat="colHandlerModes"';
        handlerTpl += '              ms-class="oni-smartgrid-handler-mode-active: colHandlerMode === $key"';
        handlerTpl += '              ms-click="changeColHandlerMode($key)">';
        handlerTpl += '            {{$val}}';
        handlerTpl += '        </span>';
        handlerTpl += '    </div>';
        handlerTpl += '    <ul class="oni-smartgrid-handler-list">';
        handlerTpl += '        <li class="oni-smartgrid-handler-list-item" ms-repeat="colHandlerData">';
        handlerTpl += '            <label>';
        handlerTpl += '                <input type="checkbox"';
        handlerTpl += '                       ms-duplex-checked="el.toggle"';
        handlerTpl += '                       ms-attr-disabled="el.isLock"/>';
        handlerTpl += '                <span class="oni-smartgrid-handler-name">{{el.name}}</span>';
        handlerTpl += '            </label>';
        handlerTpl += '        </li>';
        handlerTpl += '    </ul>';
        handlerTpl += '    <div class=\"oni-smartgrid-handler-ope\">';
        handlerTpl += '        <button ms-widget=\"button\" data-button-size=\"small\" data-button-color=\"success\" ';
        handlerTpl += '              ms-click=\"confirmColHandler()\">' + regional.confirmText + '<\/button>';
        handlerTpl += '        <button ms-widget=\"button\" data-button-size=\"small\" ms-click=\"cancelColHandler()\">' + regional.cancelText + '<\/span>';
        handlerTpl += '    <\/div>';
        handlerTpl += '</div>';
        handlerWrap.innerHTML = handlerTpl;
        container.appendChild(handlerWrap);
        avalon.define(containerCtrlId, function (vm) {
            // 列显隐窗口是否可见
            vm.handlerWindowVisible = false;
            vm.toggleHandlerWindow = function () {
                vm.handlerWindowVisible = !vm.handlerWindowVisible;
                if (vm.handlerWindowVisible) {
                    vm.colHandlerMode = 'defaults';
                    vm.changeColHandlerMode('defaults');
                }
            };
            // 控制列显示/隐藏模式
            vm.colHandlerModes = {
                defaults: regional.optDefaultText,
                all: regional.optAllText,
                custom: regional.optCustomText
            };
            vm.colHandlerMode = 'defaults';
            vm.changeColHandlerMode = function (mode) {
                vm.colHandlerMode = mode;
                // 根据显隐模式更新显隐数据
                if (mode === 'defaults') {
                    updateHandlerData(vm.defaultColHandlerData);
                } else if (mode === 'all') {
                    updateHandlerData();
                } else {
                    updateHandlerData(getColumnData());
                }
                function updateHandlerData(dataSource) {
                    var colHandlerData = vm.colHandlerData;
                    for (var i = 0, len = colHandlerData.length; i < len; i++) {
                        if (typeof dataSource === 'object') {
                            colHandlerData[i].toggle = dataSource[i].toggle;
                        } else {
                            colHandlerData[i].toggle = true;
                        }
                    }
                }
            };
            // 维护列显隐数据
            vm.defaultColHandlerData = avalon.mix(true, [], getColumnData());
            vm.colHandlerData = avalon.mix(true, [], getColumnData());
            /**
             * 点击确定时，将列显隐数据应用到表格中
             */
            vm.confirmColHandler = function () {
                var visibleColKeys = [], unVisibleColKeys = [], colHandlerData = vm.colHandlerData;
                for (var i = 0, len = colHandlerData.length; i < len; i++) {
                    if (colHandlerData[i].toggle) {
                        visibleColKeys.push(colHandlerData[i].key);
                    } else {
                        unVisibleColKeys.push(colHandlerData[i].key);
                    }
                }
                sgVmodel.setColumns(visibleColKeys, true);
                sgVmodel.setColumns(unVisibleColKeys, false);
                adjustColumnWidth(sgVmodel);
                vm.handlerWindowVisible = false;
            };
            /**
             * 点击取消，隐藏设置框
             */
            vm.cancelColHandler = function () {
                vm.handlerWindowVisible = false;
            };
        });
        setHandlerLayout();
        /**
         * 设置列显隐处理布局样式
         */
        function setHandlerLayout() {
            avalon(handlerWrap).addClass('oni-smartgrid-handler-wrap');
            // 控制小窗口往哪边出现
            var offsetLeft = getOffsetLeft(handlerWrap), clientWidth = avalon.css(document.body, 'width');
            if (offsetLeft > clientWidth / 2) {
                avalon(handlerWrap).addClass('oni-smartgrid-handler-wrap-right');
            }
            function getOffsetLeft(ele) {
                var left = 0;
                do {
                    left += ele.offsetLeft || 0;
                    ele = ele.offsetParent;
                } while (ele);
                return left;
            }
        }
        /**
         * 获取当前表格中每列的显示/隐藏情况
         */
        function getColumnData() {
            var columnsData = [], columns = sgVmodel.columns;
            for (var i = 0, len = columns.length; i < len; i++) {
                if (columns[i].key === 'selected' && columns[i].name.slice(1, 6) === 'input') {
                    continue;
                }
                columnsData.push({
                    key: columns[i].key,
                    name: columns[i].name,
                    toggle: columns[i].toggle,
                    isLock: columns[i].isLock
                });
            }
            return columnsData;
        }
        avalon.scan();
    }
})
/**
 @links
 [除设置columns和data外都是默认配置的smartgrid](avalon.smartgrid.ex1.html)
 [通过htmlHelper配置数据包装函数集合，定义columns时设置要包装列的format为对应的包装函数](avalon.smartgrid.ex2.html)
 [演示表格吸顶效果，并且取消pager的显示](avalon.smartgrid.ex3.html)
 [表格排序操作](avalon.smartgrid.ex4.html)
 [自定义smartgrid各种事件回调](avalon.smartgrid.ex5.html)
 [供用户调用API](avalon.smartgrid.ex6.html)
 [配置addRow为表格添加新行](avalon.smartgrid.ex7.html)
 [通过data的disable属性禁用部分数据](avalon.smartgrid.ex8.html)
 [通过avalon.filters.sanitize(str)来防止xss攻击](avalon.smartgrid.ex9.html)
 [嵌套的表格](avalon.smartgrid.ex10.html)
 [grid会根据columns配置的width自主决定是否显示水平滚动条](avalon.smartgrid.ex11.html)
 [通过设置bodyHeight使得表格体可以垂直滚动](avalon.smartgrid.ex12.html)
 [自定义列的显示/隐藏](avalon.smartgrid.ex13.html)
 */

/**
 * @other
 *  <p>下面附上实现相同展示效果的情况下，smartgrid与simplegrid的渲染情况对比</p>
 <div>
 <h2>smartgrid渲染10条表格数据</h2>
 <img src="smartgrid10.png" style="width:100%"/>
 <h2>simplegrid渲染10条表格数据</h2>
 <img src="simplegrid10.png" style="width:100%"/>
 <h2>smartgrid渲染200条表格数据</h2>
 <img src="smartgrid200.png" style="width:100%"/>
 <h2>simplegrid渲染200条表格数据</h2>
 <img src="simplegrid200.png"style="width:100%"/>
 </div>
 */
;
///用于设置路由

require(["./mmRouter/mmState"], function() {
    avalon.define({       //这个一定要写再里面
        $id     :       'adminIndex'
    });

    avalon.state.config({
        onBeforeUnload: function (formstate, tostate) {
            // if(tostate.stateName == 'admin'){
            //     avalon.router.go('admin.addSpendType');
            // }
        },
        onError: function() {
            //   console.log(arguments)
        }, // 强烈打开错误配置
        onLoad : function (fromstate, tostate) {
            if(tostate.stateName == 'admin'){//这个很烦，如果不主动切换过去，登录进去后右边页面不会自动跳到第一个选项“添加类别”
                avalon.router.go('admin.addSpendType');
            }
        }
    });
    avalon.router.error(function() {
        //avalon.router.navigate('/index');
        avalon.router.go('admin.addSpendType');//其他路由选项，直接跳到定义的第一个li
    })
    avalon.state('admin', {
        url: '/',
        views: {
            //顶层部分
            '': {
                templateUrl: '/tpl/indexAdmin.html'
            },
            //左侧导航部分
            'navSideBar@admin': { //footer部分
                templateUrl: '/tpl/navSideBar.html'
            }
        },
        onEnter : function () {
            // avalon.router.redirect('/admin/addSpendType');
        },
        onExit : function () {
            avalon.router.go('admin.addSpendType');
        }
    });
//设置子路由添加类别，这里开始配置右下方主要内容部分
    avalon.state('admin.addSpendType', {
        url: 'addSpendType',
        controller : 'addSpendType',
        views : {
            '' : {
                templateUrl: '/tpl/addSpendType.html'
            }
        }
    })
    //设置子路由查看全部类别
    avalon.state('admin.seeAllType', {
        url: 'admin/seeAllType',
        views : {
            '' : {
                templateUrl: '/tpl/seeAllType.html'
            }
        }
    })
    //添加消费支出
    avalon.state('admin.addSpending', {
        url: 'admin/addSpending',
        views : {
            '' : {
                templateUrl: '/tpl/addSpending.html'
            }
        }
    })
    //查看所有消费
    avalon.state('admin.seeAllSpend', {
        url: 'admin/seeAllSpend',
        views : {
            '' : {
                templateUrl: '/tpl/seeAllSpend.html'
            }
        }
    })
    //图表echarts
    avalon.state('admin.echarts', {
        url: 'admin/echarts',
        views : {
            '' : {
                templateUrl: '/tpl/echarts.html'
            }
        }
    })
    //添加管理员
    avalon.state('admin.addAdmin',{
        url: 'admin/addAdmin',
        views : {
            '' : {
                templateUrl: '/tpl/addAdmin.html'
            }
        }
    })
    //添加管理员
    avalon.state('admin.manageAccount',{
        url: 'admin/manageAccount',
        views : {
            '' : {
                templateUrl: '/tpl/manageAccount.html'
            }
        }
    })
    //启动路由
    avalon.history.start({
        // basepath : '/'
    });
    //go!!!!!!!!!
    avalon.scan();

})
//后台页面控制器
var navCtrlVm = avalon.define({
    $id : 'navCtrl',
    navGroups : [{
        navName: '添加类别', //显示的名称
        urlName: 'addSpendType' //对应URL的名称
    }, {
        navName: '管理全部类别',
        urlName: 'seeAllType'
    }, {
        navName: '添加消费支出',
        urlName: 'addSpending'
    }, {
        navName: '管理全部消费',
        urlName: 'seeAllSpend'
    }, {
        navName: '统计分析',
        urlName: 'echarts'
    }, {
        navName: '添加管理员',
        urlName: 'addAdmin'
    }, {
        navName: '更改密码',
        urlName: 'manageAccount'
    }],
    active : 'active',
    addActive : function (e) {
        var all = document.getElementsByClassName('nav-sidebar')[0].children;
        var li = e.target;
        for(var i = 0; i<all.length;i++){
            avalon(all[i].children[0]).removeClass('active');
        }
        avalon(li).addClass('active');
    },
    initActive : function () {
        var all = document.getElementsByClassName('nav-sidebar')[0].children;
        avalon(all[0].children[0]).addClass('active');
    },
    rendered : function () {
        navCtrlVm.initActive();
    }
});

//添加类别
var addSpendTypeVm = avalon.define({
    $id : "addSpendType",
    typeName : '',
    addType : function (e){
        e.preventDefault();
        if(addSpendTypeVm.typeName == ''){
            return;
        }
        var formData = {
            typeName: addSpendTypeVm.typeName
        };
        fetch('/addSpendType',{
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        }).then(function successCallback(response) {
            if (response.status === 200) {
                addSpendTypeVm.typeName = "";
                response.json().then(function(data) {
                    alert(data.success);
                });
            }
        }, function errorCallback(response) {
            alert("添加类别失败");
        });
    }
})

//require表格simplegrid
require(["./smartgrid/avalon.smartgrid"], function () {
    function  getData(url) {
        var data = null;
        fetch(url,{
            method: 'get',
            headers: {
                'Accept': 'application/json'
            }
        }).then(function successCallback(response) {
            if (response.status === 200) {
                addSpendTypeVm.typeName = "";
                response.json().then(function(data) {
                    data = data;
                });
            }
        }, function errorCallback(response) {
            alert("获取数据失败");
        });
        return data;
    }

    //查看所有类别
    avalon.define("seeAlltype", function(vm){
        vm.smartgrid = {
            columns : [
                {key: "Sort_id", name: "ID", sortable : true, align: "center", width: "10%"},
                {key: "Sort_name", name: "类别名", sortable : true, align: "center", width: "10%"}
            ],

            data : getData('/seeAlltype')
        }
        vm.$skipArray = ["smartgrid"]
    })
    avalon.scan();
});
define("admin", function(){});


(function(c){var d=document,a='appendChild',i='styleSheet',s=d.createElement('style');s.type='text/css';d.getElementsByTagName('head')[0][a](s);s[i]?s[i].cssText=c:s[a](d.createTextNode(c));})
('\n/*\n这是每个都组件都应该引用的部分\n*/\ndiv.oni-loading {\n  position: absolute; }\n\n.oni-loading {\n  position: absolute;\n  left: 50%;\n  top: 50%; }\n  .oni-loading-modal {\n    position: absolute;\n    height: 100%;\n    width: 100%;\n    top: 0;\n    left: 0;\n    background: #fff; }\n    .oni-loading-modal iframe {\n      position: absolute;\n      width: 100%;\n      height: 100%;\n      left: 0;\n      top: 0;\n      z-index: -1;\n      zoom: 1;\n      background: transparent;\n      border: none; }\n\n/*\nchameleon\nby 司徒正美 2014.6.28 拉萨开往西宁的火车上\n这里放置所有组件都共用的类名，它们根据compass构建\n\noinui的CSS规范\n\n不能出现大写,以连字符风格命名 \n表示状态的应该用ui-state-*命名 \n表示功能的应该用ui-helper-*命名\n表示布局的应用用ui-uiname-* 命名, 它的子元素应该全部包在 .oni-uiname这个根类下\n如 .oni-grid .oni-grid-tbody{ ... }\n如果某一个区域的背景要换肤,能用ui-widget-header或ui-widget-content就尽用\n其他细微之后的换肤,使用ui-state-*-?-color实现,或至少包在if(oniui-theme === xxx){}分支内\n\n\n样式规则的出现顺序\n1 display float position overflow表示布局的样式\n2 width height line-height 表示尺寸的样式\n3 margin border padding 表示盒子模型的样式\n4 cursor font-size vertical-align text-align user-select outline....装饰用的样式\n5 color background 表示换肤的样式(上面的bordrer-color outline-color也可以放到这里)\n\n\nCSSShrink 是一个压缩 CSS 的在线工具。压缩比真高！\n\nhttp://cssshrink.com/\n*/\n.oni-helper-hidden {\n  display: none; }\n\n.oni-helper-hidden-accessible {\n  border: 0;\n  clip: rect(0 0 0 0);\n  height: 1px;\n  margin: -1px;\n  overflow: hidden;\n  padding: 0;\n  position: absolute;\n  width: 1px; }\n\n.oni-helper-reset {\n  margin: 0;\n  padding: 0;\n  border: 0;\n  outline: 0;\n  line-height: 1.3;\n  text-decoration: none;\n  font-size: 100%;\n  list-style: none; }\n\n.oni-helper-noselect {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  user-select: none; }\n  .oni-helper-noselect img, .oni-helper-noselect a {\n    -webkit-user-drag: none;\n    pointer-events: none; }\n\n.oni-helper-clearfix {\n  *zoom: 1; }\n  .oni-helper-clearfix:after {\n    content: \"\\0020\";\n    display: block;\n    height: 0;\n    clear: both;\n    overflow: hidden;\n    visibility: hidden; }\n\nhtml .oni-helper-max-index, body .oni-helper-max-index {\n  z-index: 1000; }\n\n@font-face {\n  font-family: fontawesome;\n  font-style: normal;\n  font-weight: normal;\n  src: url(\"http://source.qunarzz.com/fonts/oniui/0.0.3/oniui-webfont.eot?v=4.2.0\");\n  src: url(\"http://source.qunarzz.com/fonts/oniui/0.0.3/oniui-webfont.eot?#iefix&v=4.2.0\") format(\"embedded-opentype\"), \n       url(\"http://source.qunarzz.com/fonts/oniui/0.0.3/oniui-webfont.woff?v=4.2.0\") format(\"woff\"), \n       url(\"http://source.qunarzz.com/fonts/oniui/0.0.3/oniui-webfont.ttf?v=4.2.0\") format(\"truetype\"), \n       url(\"http://source.qunarzz.com/fonts/oniui/0.0.3/oniui-webfont.svg?v=4.2.0#fontawesomeregular\") format(\"svg\");}\n.oni-icon {\n  -webkit-touch-callout: none;\n  -webkit-user-select: none;\n  -moz-user-select: none;\n  user-select: none;\n  cursor: default;\n  font-family: fontawesome !important;\n  font-size: 14px;\n  -moz-osx-font-smoothing: grayscale;\n  -webkit-font-smoothing: antialiased;\n  font-style: normal;\n  font-weight: normal;\n  line-height: 18px;\n  vertical-align: middle; }\n\na .oni-icon, .oni-btn .oni-icon {\n  cursor: pointer; }\n\n.oni-state-error {\n  border: 1px solid #ff8888; }\n\n.oni-pager {\n  font: normal 12px/1.5 tahoma, arial, \'Hiragino Sans GB\', \'\\5b8b\\4f53\', sans-serif; }\n\n/*\n这是每个都组件都应该引用的部分\n*/\n.oni-pager {\n  display: -moz-inline-stack;\n  display: inline-block;\n  vertical-align: middle;\n  *vertical-align: auto;\n  zoom: 1;\n  *display: inline;\n  vertical-align: middle;\n  white-space: nowrap;\n  /*!省略掉的页数*/\n  /*!页面跳转部分的样式*/\n  /*!输入域的容器*/\n  /*!输入域*/\n  /*!里面的按钮的样式*/\n  /*!里面的文本全部包在一个容器内，以便实现居中*/ }\n  .oni-pager .oni-pager-items {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    vertical-align: middle; }\n  .oni-pager .oni-pager-prev, .oni-pager .oni-pager-next, .oni-pager .oni-pager-item {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    background-color: white;\n    color: #333;\n    height: 24px;\n    line-height: 24px;\n    margin-right: 5px;\n    border: 1px solid #d4d4d4;\n    padding: 0 10px;\n    -webkit-border-radius: 2px;\n    -moz-border-radius: 2px;\n    -ms-border-radius: 2px;\n    -o-border-radius: 2px;\n    border-radius: 2px;\n    cursor: pointer;\n    font-size: 12px;\n    vertical-align: middle;\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    -moz-user-select: none;\n    user-select: none;\n    /*!当前页,没有边框*/\n    /*!掠过*/\n    /*!禁用*/ }\n    .oni-pager .oni-pager-prev.oni-state-active, .oni-pager .oni-pager-next.oni-state-active, .oni-pager .oni-pager-item.oni-state-active {\n      color: #ff8888;\n      border: 0 none;\n      padding: 1px 11px;\n      cursor: default;\n      background: transparent; }\n    .oni-pager .oni-pager-prev.oni-state-hover, .oni-pager .oni-pager-next.oni-state-hover, .oni-pager .oni-pager-item.oni-state-hover {\n      border-color: #ff8888; }\n    .oni-pager .oni-pager-prev.oni-state-disabled, .oni-pager .oni-pager-next.oni-state-disabled, .oni-pager .oni-pager-item.oni-state-disabled {\n      border-color: #d9d9d9;\n      background-color: whitesmoke;\n      color: #999999;\n      cursor: default; }\n  .oni-pager .oni-pager-omit {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    height: 24px;\n    line-height: 24px;\n    margin-right: 5px;\n    padding: 1px 0;\n    vertical-align: middle;\n    font-size: 12px;\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    -moz-user-select: none;\n    user-select: none;\n    cursor: default; }\n  .oni-pager .oni-pager-jump {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    vertical-align: middle;\n    padding-left: 5px;\n    padding-right: 5px;\n    vertical-align: middle; }\n  .oni-pager .oni-pager-textbox-wrapper {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    width: 26px;\n    margin-left: 5px;\n    margin-right: 5px;\n    padding: 3px 5px;\n    vertical-align: middle;\n    font-size: 0;\n    outline: none;\n    background-color: white;\n    border: 1px solid #d4d4d4; }\n  .oni-pager .oni-pager-textbox {\n    display: inline;\n    float: left;\n    position: relative;\n    width: 26px;\n    height: 18px;\n    line-height: 18px;\n    padding: 0;\n    border: 0 none;\n    font-size: 12px;\n    outline: medium none;\n    vertical-align: middle;\n    text-align: center;\n    color: #333333;\n    background: #fff; }\n  .oni-pager .oni-pager-button {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    overflow: visible;\n    _overflow-y: hidden;\n    height: 26px;\n    margin-left: 5px;\n    border-radius: 2px;\n    outline: none;\n    cursor: pointer;\n    font-size: 12px;\n    vertical-align: middle;\n    padding: 0 10px;\n    text-decoration: none;\n    border: 1px solid #ccc;\n    background-color: #f8f8f8;\n    color: #333; }\n    .oni-pager .oni-pager-button:hover {\n      border-color: #bbb; }\n  .oni-pager .oni-pager-text {\n    display: -moz-inline-stack;\n    display: inline-block;\n    vertical-align: middle;\n    *vertical-align: auto;\n    zoom: 1;\n    *display: inline;\n    font-size: 12px;\n    vertical-align: middle; }\n/*\n这是每个都组件都应该引用的部分\n*/\n.oni-scrollbar {\n  position: absolute;\n  margin: 0;\n  padding: 0;\n  border: 0;\n  width: 10px;\n  height: 100%;\n  left: auto;\n  right: 0;\n  top: 0;\n  bottom: auto;\n  background: #f8f8f8;\n  z-index: 100;\n  -webkit-transition: opacity 0.5s;\n  -moz-transition: opacity 0.5s;\n  -ms-transition: opacity 0.5s;\n  -o-transition: opacity 0.5s;\n  transition: opacity 0.5s; }\n  .oni-scrollbar-arrow {\n    position: absolute;\n    background: #eee;\n    top: 0;\n    left: 0;\n    width: 10px;\n    height: 10px; }\n    .oni-scrollbar-state-hover {\n      background: #aaa; }\n    .oni-scrollbar-state-active {\n      background: #999; }\n    .oni-scrollbar-state-disabled {\n      background: #e9e9e9; }\n    .oni-scrollbar-arrow b {\n      width: 0;\n      height: 0;\n      line-height: 0;\n      font-size: 0;\n      border-top: 0 none;\n      border-right: 4px dashed transparent;\n      border-bottom: 4px solid #bcbcbc;\n      border-left: 4px dashed transparent;\n      position: absolute;\n      top: 50%;\n      left: 50%;\n      margin-top: -2px;\n      margin-left: -4px;\n      font-size: 0;\n      line-height: 0; }\n    .oni-scrollbar-arrow-down {\n      top: auto;\n      bottom: 0; }\n      .oni-scrollbar-arrow-down b {\n        width: 0;\n        height: 0;\n        line-height: 0;\n        font-size: 0;\n        border-top: 4px solid #bcbcbc;\n        border-right: 4px dashed transparent;\n        border-bottom: 0;\n        border-left: 4px dashed transparent; }\n  .oni-scrollbar-left .oni-scrollbar-state-active .oni-scrollbar-trangle-up, .oni-scrollbar-right .oni-scrollbar-state-active .oni-scrollbar-trangle-up {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 0 none;\n    border-right: 4px dashed transparent;\n    border-bottom: 4px solid #fff;\n    border-left: 4px dashed transparent; }\n  .oni-scrollbar-left .oni-scrollbar-state-active .oni-scrollbar-trangle-down, .oni-scrollbar-right .oni-scrollbar-state-active .oni-scrollbar-trangle-down {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 4px solid #fff;\n    border-right: 4px dashed transparent;\n    border-bottom: 0;\n    border-left: 4px dashed transparent; }\n  .oni-scrollbar-top .oni-scrollbar-state-active .oni-scrollbar-trangle-up, .oni-scrollbar-bottom .oni-scrollbar-state-active .oni-scrollbar-trangle-up {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 4px dashed transparent;\n    border-right: 4px solid #fff;\n    border-bottom: 4px dashed transparent;\n    border-left: 0; }\n  .oni-scrollbar-top .oni-scrollbar-state-active .oni-scrollbar-trangle-down, .oni-scrollbar-bottom .oni-scrollbar-state-active .oni-scrollbar-trangle-down {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 4px dashed transparent;\n    border-right: 0;\n    border-bottom: 4px dashed transparent;\n    border-left: 4px solid #fff; }\n  .oni-scrollbar-scroller {\n    overflow: hidden; }\n  .oni-scrollbar-left {\n    left: 0;\n    right: auto; }\n  .oni-scrollbar-top {\n    width: 100%;\n    height: 10px;\n    left: 0;\n    top: 0;\n    bottom: auto; }\n  .oni-scrollbar-bottom {\n    width: 100%;\n    height: 10px;\n    left: 0;\n    top: auto;\n    bottom: 0; }\n  .oni-scrollbar-draggerpar {\n    position: absolute;\n    left: 0;\n    top: 0;\n    width: 100%;\n    height: 100%; }\n    .oni-scrollbar-draggerpar .oni-scrollbar-dragger {\n      position: absolute;\n      width: 100%;\n      left: 0;\n      background: #ccc; }\n    .oni-scrollbar-draggerpar .oni-scrollbar-state-hover {\n      background: #999; }\n    .oni-scrollbar-draggerpar .oni-scrollbar-state-active {\n      background: #888; }\n    .oni-scrollbar-draggerpar .oni-scrollbar-state-disabled {\n      background: #e9e9e9; }\n  .oni-scrollbar-top .oni-scrollbar-ragger, .oni-scrollbar-bottom .oni-scrollbar-ragger {\n    height: 100%;\n    width: auto;\n    top: 0; }\n  .oni-scrollbar-top .oni-scrollbar-arrow b, .oni-scrollbar-bottom .oni-scrollbar-arrow b {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 4px dashed transparent;\n    border-right: 4px solid #bcbcbc;\n    border-bottom: 4px dashed transparent;\n    border-left: 0;\n    margin-top: -4px;\n    margin-left: -2px; }\n  .oni-scrollbar-top .oni-scrollbar-arrow-down, .oni-scrollbar-bottom .oni-scrollbar-arrow-down {\n    right: 0;\n    left: auto; }\n    .oni-scrollbar-top .oni-scrollbar-arrow-down b, .oni-scrollbar-bottom .oni-scrollbar-arrow-down b {\n      width: 0;\n      height: 0;\n      line-height: 0;\n      font-size: 0;\n      border-top: 4px dashed transparent;\n      border-right: 0;\n      border-bottom: 4px dashed transparent;\n      border-left: 4px solid #bcbcbc; }\n\n.oni-scrollbar-large {\n  width: 14px; }\n  .oni-scrollbar-large .oni-scrollbar-arrow {\n    width: 14px;\n    height: 14px; }\n  .oni-scrollbar-large .oni-scrollbar-top, .oni-scrollbar-large .oni-scrollbar-bottom {\n    height: 14px; }\n\n.oni-scrollbar-bottom-large {\n  height: 14px; }\n\n.oni-scrollbar-small {\n  width: 8px; }\n  .oni-scrollbar-small .oni-scrollbar-arrow {\n    width: 8px;\n    height: 8px; }\n\n.oni-scrollbar-bottom-small {\n  height: 8px; }\n\n.ui-scrollbar-scroller {\n  overflow: hidden; }\n@charset \"UTF-8\";\n.oni-dropdown {\n  font: normal 12px/1.5 tahoma, arial, \'Hiragino Sans GB\', \'\\5b8b\\4f53\', sans-serif; }\n\n/*\n这是每个都组件都应该引用的部分\n*/\n.oni-dropdown {\n  display: inline-block;\n  vertical-align: middle;\n  *display: inline;\n  *zoom: 1;\n  outline: none; }\n  .oni-dropdown .oni-dropdown-source {\n    border: 1px solid #ccc;\n    background-color: #fff;\n    cursor: pointer; }\n    .oni-dropdown .oni-dropdown-source .oni-dropdown-input {\n      display: inline-block;\n      vertical-align: middle;\n      *display: inline;\n      *zoom: 1;\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      overflow: hidden;\n      height: 18px;\n      padding: 3px 21px 3px 6px;\n      word-break: normal;\n      word-wrap: normal; }\n  .oni-dropdown .oni-icon {\n    cursor: pointer;\n    font-size: 12px;\n    vertical-align: baseline; }\n  .oni-dropdown .oni-dropdown-icon {\n    display: none;\n    color: #b5b5b5;\n    cursor: pointer;\n    padding: 0 6px;\n    position: absolute;\n    right: 0;\n    text-align: center;\n    top: -21px; }\n  .oni-dropdown .oni-dropdown-icon-wrap {\n    display: block;\n    position: relative;\n    height: 0; }\n    .oni-dropdown .oni-dropdown-icon-wrap .oni-icon-angle-down, .oni-dropdown .oni-dropdown-icon-wrap .oni-icon-angle-up {\n      display: block; }\n  .oni-dropdown .oni-dropdown-menu-inner {\n    -webkit-box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.1);\n    -moz-box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.1);\n    -ms-box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.1);\n    -o-box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.1);\n    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.1);\n    background-color: #fff;\n    border: 1px solid #d4d4d4;\n    overflow-y: scroll;\n    padding: 3px 0; }\n    .oni-dropdown .oni-dropdown-menu-inner .oni-dropdown-state-disabled {\n      border-color: #D9D9D9;\n      background-color: #F5F5F5;\n      color: #999; }\n    .oni-dropdown .oni-dropdown-menu-inner .oni-dropdown-state-hover {\n      border-color: #f8f8f8;\n      background-color: #f8f8f8;\n      color: #000; }\n    .oni-dropdown .oni-dropdown-menu-inner .oni-dropdown-state-active {\n      border-color: #3775c0;\n      background-color: #3775c0;\n      color: #fff; }\n      .oni-dropdown .oni-dropdown-menu-inner .oni-dropdown-state-active .oni-icon {\n        color: #fff; }\n  .oni-dropdown .oni-dropdown-item {\n    white-space: nowrap;\n    overflow: hidden;\n    text-overflow: ellipsis;\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    -moz-user-select: none;\n    user-select: none;\n    *zoom: 1;\n    width: 100%;\n    padding: 3px 0;\n    height: 24px;\n    line-height: 24px;\n    text-indent: 20px;\n    cursor: pointer;\n    word-break: normal;\n    word-wrap: normal; }\n    .oni-dropdown .oni-dropdown-item.oni-dropdown-group {\n      font-size: 14px;\n      font-weight: bold;\n      text-indent: 10px; }\n    .oni-dropdown .oni-dropdown-item.oni-dropdown-divider {\n      border-top: 1px solid #f2f2f2; }\n\n.oni-dropdown-menu {\n  display: none;\n  left: 0;\n  position: absolute;\n  top: -1px;\n  width: 100%;\n  _width: auto !important;\n  z-index: 1001; }\n\n.oni-dropdown-state-hover .oni-dropdown-source {\n  border-color: #999; }\n\n.oni-dropdown-state-focus .oni-dropdown-source {\n  border-color: #3775c0; }\n\n.oni-dropdown-state-disabled .oni-dropdown-source {\n  background-color: #F5F5F5;\n  border-color: #D9D9D9;\n  color: #ccc;\n  cursor: default; }\n.oni-dropdown-state-disabled .oni-dropdown-icon {\n  cursor: default; }\n\n.oni-state-small .oni-dropdown-source {\n  border-radius: 2px; }\n.oni-state-small .oni-dropdown-input {\n  padding-top: 1px;\n  padding-bottom: 1px; }\n.oni-state-small .oni-dropdown-icon {\n  top: -19px; }\n\n.oni-dropdown-state-error .oni-dropdown-source, .oni-dropdown-state-error:hover .oni-dropdown-source {\n  border-color: #ff8888; }\n@charset \"UTF-8\";\n/*\n这是每个都组件都应该引用的部分\n*/\nbutton.oni-button, input.oni-button {\n  height: 26px; }\n  button.oni-button .oni-icon, button.oni-button .oni-button-text, input.oni-button .oni-icon, input.oni-button .oni-button-text {\n    *margin-top: -2px; }\n\n.oni-button {\n  display: inline-block;\n  vertical-align: middle;\n  *display: inline;\n  *zoom: 1;\n  *vertical-align: auto;\n  overflow: hidden;\n  _display: inline;\n  padding: 0 10px;\n  margin: 0;\n  font-size: 12px;\n  border: 1px solid transparent;\n  text-align: center;\n  cursor: pointer;\n  color: #333;\n  text-decoration: none;\n  outline: 0;\n  height: 24px; }\n  .oni-button:link {\n    text-decoration: none; }\n  .oni-button.oni-state-default {\n    border-color: #ccc;\n    background-color: #f8f8f8; }\n  .oni-button:hover {\n    background-color: #f5f5f5;\n    border-color: #d9d9d9; }\n  .oni-button.oni-state-active, .oni-button:active {\n    background-color: #e6e6e6;\n    background-color: #d9d9d9 \\9;\n    background-image: none;\n    outline: 0;\n    -webkit-box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);\n    -moz-box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);\n    -ms-box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);\n    -o-box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);\n    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15); }\n  .oni-button.oni-state-disabled, .oni-button[disabled] {\n    background-color: #f8f8f8;\n    border-color: #d9d9d9;\n    color: #cccccc; }\n  .oni-button.oni-button-primary {\n    background-color: #3775c0;\n    border-color: #1d5eac;\n    color: #ffffff; }\n    .oni-button.oni-button-primary:hover {\n      background-color: #3d8be9;\n      border-color: #1a5092; }\n    .oni-button.oni-button-primary.oni-state-disabled {\n      background-color: #428bca;\n      color: #357ebd;\n      color: #ffffff;\n      opacity: 0.6;\n      filter: alpha(opacity=60); }\n  .oni-button.oni-button-warning {\n    background-color: #f0ad4e;\n    border-color: #eea236;\n    color: #ffffff; }\n    .oni-button.oni-button-warning:hover {\n      background-color: #ec971f;\n      border-color: #d58512; }\n    .oni-button.oni-button-warning.oni-state-disabled {\n      background-color: #f0ad4e;\n      border-color: #eea236;\n      color: #ffffff;\n      opacity: 0.6;\n      filter: alpha(opacity=60); }\n  .oni-button.oni-button-danger {\n    background-color: #d9534f;\n    border-color: #d43f3a;\n    color: #ffffff; }\n    .oni-button.oni-button-danger:hover {\n      background-color: #c9302c;\n      border-color: #ac2925; }\n    .oni-button.oni-button-danger.oni-state-disabled {\n      background-color: #d9534f;\n      border-color: #d43f3a;\n      color: #ffffff;\n      opacity: 0.6;\n      filter: alpha(opacity=60); }\n  .oni-button.oni-button-success {\n    background-color: #58b359;\n    border-color: #45a846;\n    color: #ffffff; }\n    .oni-button.oni-button-success:hover {\n      background-color: #68c969;\n      border-color: #3e973e; }\n    .oni-button.oni-button-success.oni-state-disabled {\n      background-color: #5cb85c;\n      border-color: #4cae4c;\n      color: #ffffff;\n      opacity: 0.6;\n      filter: alpha(opacity=60); }\n  .oni-button.oni-button-info {\n    background-color: #5bc0de;\n    border-color: #46b8da;\n    color: #ffffff; }\n    .oni-button.oni-button-info:hover {\n      background-color: #31b0d5;\n      border-color: #269abc; }\n    .oni-button.oni-button-info.oni-state-disabled {\n      background-color: #5bc0de;\n      border-color: #46b8da;\n      color: #ffffff;\n      opacity: 0.6;\n      filter: alpha(opacity=60); }\n  .oni-button.oni-button-inverse {\n    background-color: #333;\n    border-color: #222;\n    color: #ffffff; }\n    .oni-button.oni-button-inverse:hover {\n      background-color: #222;\n      border-color: #000; }\n    .oni-button.oni-button-inverse.oni-state-disabled {\n      background-color: #333;\n      border-color: #222;\n      opacity: 0.6;\n      filter: alpha(opacity=60); }\n  .oni-button.oni-corner-all {\n    -webkit-border-radius: 2px;\n    -moz-border-radius: 2px;\n    -ms-border-radius: 2px;\n    -o-border-radius: 2px;\n    border-radius: 2px; }\n  .oni-button.oni-corner-left {\n    -moz-border-radius-topleft: 2px;\n    -webkit-border-top-left-radius: 2px;\n    border-top-left-radius: 2px;\n    -moz-border-radius-bottomleft: 2px;\n    -webkit-border-bottom-left-radius: 2px;\n    border-bottom-left-radius: 2px; }\n  .oni-button.oni-corner-right {\n    -moz-border-radius-topright: 2px;\n    -webkit-border-top-right-radius: 2px;\n    border-top-right-radius: 2px;\n    -moz-border-radius-bottomright: 2px;\n    -webkit-border-bottom-right-radius: 2px;\n    border-bottom-right-radius: 2px; }\n  .oni-button.oni-corner-top {\n    -moz-border-radius-topleft: 2px;\n    -webkit-border-top-left-radius: 2px;\n    border-top-left-radius: 2px;\n    -moz-border-radius-topright: 2px;\n    -webkit-border-top-right-radius: 2px;\n    border-top-right-radius: 2px; }\n  .oni-button.oni-corner-bottom {\n    -moz-border-radius-bottomleft: 2px;\n    -webkit-border-bottom-left-radius: 2px;\n    border-bottom-left-radius: 2px;\n    -moz-border-radius-bottomright: 2px;\n    -webkit-border-bottom-right-radius: 2px;\n    border-bottom-right-radius: 2px; }\n  .oni-button .oni-icon {\n    font-size: 12px;\n    overflow: hidden;\n    line-height: 24px;\n    height: 24px;\n    display: inline-block;\n    vertical-align: middle;\n    *display: inline;\n    *zoom: 1;\n    *vertical-align: auto;\n    _display: inline;\n    font-style: normal; }\n  .oni-button .oni-button-text {\n    font-size: 12px;\n    line-height: 24px;\n    height: 24px;\n    word-break: keep-all;\n    white-space: nowrap;\n    display: inline-block;\n    vertical-align: middle;\n    *display: inline;\n    *zoom: 1;\n    *vertical-align: auto;\n    _display: inline; }\n    .oni-button .oni-button-text.oni-button-text-left {\n      padding-right: 5px; }\n    .oni-button .oni-button-text.oni-button-text-right {\n      padding-left: 5px; }\n    .oni-button .oni-button-text.oni-button-text-middle {\n      padding-left: 5px;\n      padding-right: 5px; }\n    .oni-button .oni-button-text.oni-button-text-hidden {\n      display: none;\n      padding: 0; }\n\nbutton.oni-button-small, input.oni-button-small {\n  height: 22px; }\n\n.oni-button-small {\n  padding: 0 5px;\n  height: 20px; }\n  .oni-button-small .oni-icon {\n    font-size: 12px;\n    line-height: 20px;\n    height: 20px; }\n  .oni-button-small .oni-button-text {\n    font-size: 12px;\n    line-height: 20px;\n    height: 20px; }\n\nbutton.oni-button-big, input.oni-button-big {\n  height: 32px; }\n\n.oni-button-big {\n  font-size: 14px;\n  padding: 0 15px;\n  height: 30px; }\n  .oni-button-big .oni-icon {\n    font-size: 14px;\n    line-height: 30px;\n    height: 30px; }\n  .oni-button-big .oni-button-text {\n    font-size: 14px;\n    line-height: 30px;\n    height: 30px; }\n\nbutton.oni-button-large, input.oni-button-large {\n  height: 40px; }\n\n.oni-button-large {\n  padding: 0 25px;\n  height: 38px; }\n  .oni-button-large .oni-icon {\n    font-size: 14px;\n    line-height: 38px;\n    height: 38px; }\n  .oni-button-large .oni-button-text {\n    font-size: 14px;\n    line-height: 38px;\n    height: 38px; }\n\n.oni-buttonset {\n  font-size: 0;\n  display: inline-block;\n  vertical-align: middle;\n  *display: inline;\n  *zoom: 1;\n  *vertical-align: auto;\n  _display: inline; }\n  .oni-buttonset .oni-button {\n    margin: 0;\n    float: left;\n    border-left-width: 0; }\n  .oni-buttonset .oni-button-first {\n    border-left-width: 1px; }\n  .oni-buttonset .oni-icon {\n    *margin-top: 0; }\n  .oni-buttonset .oni-button-text {\n    *margin-top: 0; }\n\n.oni-buttonset-vertical {\n  _width: 100px; }\n  .oni-buttonset-vertical .oni-button {\n    display: block;\n    float: none;\n    border-left-width: 1px;\n    border-top-width: 0; }\n  .oni-buttonset-vertical .oni-button-first {\n    border-top-width: 1px; }\n@charset \"UTF-8\";\n/*\n这是每个都组件都应该引用的部分\n*/\n.oni-smartgrid {\n  font-size: 12px;\n  line-height: 20px;\n  position: relative;\n  opacity: 0;\n  /* IE 8 */\n  -ms-filter: \"progid:DXImageTransform.Microsoft.Alpha(Opacity=0)\";\n  /* IE 5-7 */\n  filter: alpha(opacity=0);\n  /*三种容器的规则*/\n  /*三种容器下三角形的共同点*/\n  /*上三角*/\n  /*下三角*/ }\n  .oni-smartgrid .oni-helper-asc, .oni-smartgrid .oni-helper-desc, .oni-smartgrid .oni-helper-ndb {\n    width: 12px;\n    height: 12px;\n    line-height: 1;\n    display: inline-block;\n    vertical-align: middle;\n    *display: inline;\n    *zoom: 1;\n    *vertical-align: auto;\n    position: relative;\n    cursor: pointer; }\n  .oni-smartgrid .oni-helper-asc span, .oni-smartgrid .oni-helper-desc span, .oni-smartgrid .oni-helper-ndb span {\n    position: absolute;\n    top: 0px;\n    left: 4px; }\n  .oni-smartgrid .oni-helper-ndb .oni-helper-sort-top, .oni-smartgrid .oni-helper-desc .oni-helper-sort-top {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 0 none;\n    border-right: 6px dashed transparent;\n    border-bottom: 6px solid #ccc;\n    border-left: 6px dashed transparent;\n    top: 0px;\n    left: 0px; }\n  .oni-smartgrid .oni-helper-asc .oni-helper-sort-top {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 0 none;\n    border-right: 6px dashed transparent;\n    border-bottom: 6px solid #000;\n    border-left: 6px dashed transparent;\n    top: 0px;\n    left: 0px; }\n  .oni-smartgrid .oni-helper-ndb .oni-helper-sort-bottom, .oni-smartgrid .oni-helper-asc .oni-helper-sort-bottom {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 6px solid #ccc;\n    border-right: 6px dashed transparent;\n    border-bottom: 0;\n    border-left: 6px dashed transparent;\n    top: 8px;\n    left: 0px; }\n  .oni-smartgrid .oni-helper-desc .oni-helper-sort-bottom {\n    width: 0;\n    height: 0;\n    line-height: 0;\n    font-size: 0;\n    border-top: 6px solid #000;\n    border-right: 6px dashed transparent;\n    border-bottom: 0;\n    border-left: 6px dashed transparent;\n    top: 8px;\n    left: 0px; }\n  .oni-smartgrid .oni-pager {\n    float: right; }\n  .oni-smartgrid input {\n    margin: 0; }\n\n.oni-smartgrid-hide {\n  display: none; }\n\n.oni-smartgrid-hover {\n  background-color: #e8f5fd; }\n\n.oni-smartgrid-selected {\n  background-color: #fff7e6; }\n\n.oni-smartgrid-disabled {\n  color: #ccc;\n  background: #fff; }\n\n.oni-smartgrid-hidden input {\n  visibility: hidden; }\n\n.oni-smartgrid-main-wrapper {\n  position: relative;\n  overflow-x: auto;\n  _width: 100%;\n  border: 1px solid #e5e5e5; }\n\n.oni-smartgrid-header {\n  background-color: #f8f8f8;\n  border-bottom: 1px solid #e5e5e5;\n  zoom: 1; }\n  .oni-smartgrid-header-fixed {\n    background-color: #f8f8f8;\n    border-top: 1px solid #e5e5e5;\n    border-bottom: 1px solid #e5e5e5;\n    z-index: 1; }\n\n.oni-smartgrid-body-wrapper {\n  overflow-y: auto;\n  zoom: 1; }\n  .oni-smartgrid-body-wrapper .oni-smartgrid-body {\n    background: #fff; }\n    .oni-smartgrid-body-wrapper .oni-smartgrid-body .oni-smartgrid-nodata {\n      padding: 23px 0;\n      text-align: center;\n      line-height: 15px; }\n\n.oni-smartgrid-footer {\n  background-color: #f8f8f8;\n  font-size: 0;\n  border: 1px solid #e5e5e5;\n  border-width: 0 1px; }\n  .oni-smartgrid-footer .oni-smartgrid-pager-wrapper {\n    width: 100%;\n    padding: 5px 0px;\n    overflow: hidden;\n    border: 1px solid #e5e5e5;\n    border-width: 0 0 1px; }\n\n.oni-smartgrid-row {\n  border-bottom: 1px solid #f3f3f3;\n  font-size: 0; }\n\n.oni-smartgrid-column {\n  font-size: 12px;\n  display: inline-block;\n  vertical-align: middle;\n  *display: inline;\n  *zoom: 1;\n  *vertical-align: auto;\n  overflow: hidden; }\n  .oni-smartgrid-column-cell {\n    padding: 7px 5px;\n    word-wrap: break-word;\n    word-break: normal; }\n\n.oni-smartgrid-pager-options {\n  float: left;\n  height: 26px;\n  line-height: 26px;\n  padding-left: 5px;\n  font-size: 12px; }\n  .oni-smartgrid-pager-options .oni-smartgrid-showinfo {\n    display: inline-block;\n    vertical-align: middle;\n    *display: inline;\n    *zoom: 1;\n    *vertical-align: auto; }\n  .oni-smartgrid-pager-options .oni-dropdown {\n    margin: 0 5px; }\n\n/*列设置*/\n.oni-smartgrid-handler-wrap {\n  display: inline-block;\n  vertical-align: middle;\n  *display: inline;\n  *zoom: 1;\n  *vertical-align: auto;\n  position: relative;\n  z-index: 1;\n  text-align: left;\n  font-size: 12px; }\n  .oni-smartgrid-handler-wrap-right .oni-smartgrid-handler {\n    left: auto;\n    right: 0; }\n  .oni-smartgrid-handler-wrap .oni-smartgrid-handler-toggle {\n    width: 24px;\n    height: 24px;\n    border: 1px #ccc solid;\n    border-radius: 2px;\n    cursor: pointer;\n    text-align: center;\n    line-height: 28px;\n    outline: none;\n    background: #f8f8f8 url(http://7xkm02.com1.z0.glb.clouddn.com/smartgridsetting.png) no-repeat center;\n    -webkit-touch-callout: none;\n    -webkit-user-select: none;\n    -moz-user-select: none;\n    user-select: none; }\n    .oni-smartgrid-handler-wrap .oni-smartgrid-handler-toggle-active {\n      border-color: #3775c0; }\n\n.oni-smartgrid-handler {\n  position: absolute;\n  top: 25px;\n  left: 0;\n  width: 290px;\n  background-color: #fff;\n  border: 1px solid #ccc; }\n  .oni-smartgrid-handler .oni-smartgrid-handler-mode {\n    padding: 9px 10px;\n    line-height: 14px;\n    border-bottom: 1px #f2f2f2 solid;\n    color: #0084bb; }\n    .oni-smartgrid-handler .oni-smartgrid-handler-mode .oni-smartgrid-handler-mode-item {\n      display: inline-block;\n      vertical-align: middle;\n      *display: inline;\n      *zoom: 1;\n      *vertical-align: auto;\n      margin: 0 10px 0 0;\n      cursor: pointer;\n      -webkit-touch-callout: none;\n      -webkit-user-select: none;\n      -moz-user-select: none;\n      user-select: none; }\n    .oni-smartgrid-handler .oni-smartgrid-handler-mode-active {\n      font-weight: bold; }\n  .oni-smartgrid-handler .oni-smartgrid-handler-list {\n    margin: 0;\n    padding: 9px 10px;\n    list-style: none;\n    overflow: hidden; }\n    .oni-smartgrid-handler .oni-smartgrid-handler-list .oni-smartgrid-handler-name {\n      display: inline-block;\n      vertical-align: middle;\n      *display: inline;\n      *zoom: 1;\n      *vertical-align: auto;\n      max-width: 110px;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap; }\n    .oni-smartgrid-handler .oni-smartgrid-handler-list .checkbox {\n      display: inline-block;\n      vertical-align: middle;\n      *display: inline;\n      *zoom: 1;\n      *vertical-align: auto;\n      margin-left: 0;\n      cursor: pointer;\n      *vertical-align: -3px; }\n    .oni-smartgrid-handler .oni-smartgrid-handler-list-item {\n      float: left;\n      width: 135px;\n      height: 20px;\n      line-height: 20px; }\n      .oni-smartgrid-handler .oni-smartgrid-handler-list-item label {\n        display: inline-block;\n        vertical-align: middle;\n        *display: inline;\n        *zoom: 1;\n        *vertical-align: auto;\n        cursor: pointer; }\n  .oni-smartgrid-handler .oni-smartgrid-handler-ope {\n    padding: 4px 5px;\n    text-align: right;\n    background-color: #f8f8f8;\n    font-size: 0; }\n    .oni-smartgrid-handler .oni-smartgrid-handler-ope .oni-button {\n      margin-left: 5px; }\n\n.oni-smartgrid-handler-wrap-right .oni-smartgrid-handler {\n  left: auto;\n  right: 0; }\n');
