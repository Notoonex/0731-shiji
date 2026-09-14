/* =============================================================================
   时光 · 动效运行时 motion.js
   纯原生，无依赖。所有能力挂在 window.SG.motion（别名 window.SGMotion）下。
   模块：reduced / raf / reveal / photo / kenBurns / lightbox / nav / memories /
        dropzone / ring / perf
   ============================================================================= */
(function (win, doc) {
  'use strict';

  if (win.SGMotion && win.SGMotion.__ready) { return; }

  var root = doc.documentElement;
  root.classList.add('sg-js'); /* 无 JS 时不隐藏内容，见 CSS 的 .sg-js 前缀 */

  /* ===========================================================================
     0. 基础工具
     =========================================================================== */

  var reduceMQ = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /** 是否应当降低动效：系统设置 或 页面内的 <html data-motion="off"> 开关 */
  function prefersReduced() {
    if (root.getAttribute('data-motion') === 'off') { return true; }
    return !!(reduceMQ && reduceMQ.matches);
  }

  function syncReduceClass() {
    root.classList.toggle('reduce-motion', prefersReduced());
  }
  syncReduceClass();
  if (reduceMQ) {
    if (reduceMQ.addEventListener) { reduceMQ.addEventListener('change', syncReduceClass); }
    else if (reduceMQ.addListener) { reduceMQ.addListener(syncReduceClass); }
  }

  function noop() {}

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /** 每帧最多执行一次；返回的函数可安全绑到 scroll / resize / pointermove */
  function rafThrottle(fn) {
    var ticking = false, lastArgs = null;
    return function () {
      lastArgs = arguments;
      if (ticking) { return; }
      ticking = true;
      win.requestAnimationFrame(function () {
        ticking = false;
        fn.apply(null, lastArgs);
      });
    };
  }

  /** 强制同步布局，用于「重启 CSS 动画」与 FLIP 的 Invert→Play 之间 */
  function reflow(el) { return el && el.offsetWidth; }

  /** 按文档顺序排序（滚动揭示的 stagger 依赖它，IO 回调顺序不保证） */
  function docOrder(a, b) {
    var pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) { return -1; }
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) { return 1; }
    return 0;
  }

  /** 读取 CSS 变量的数值（px / 无单位都可） */
  function cssNum(el, name, fallback) {
    var raw = win.getComputedStyle(el || root).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    return isFinite(n) ? n : fallback;
  }

  /* will-change 只在动画期间挂载，动画结束立刻卸掉，避免常驻图层吃显存 */
  function lift(el, props) {
    if (!el) { return; }
    el.style.willChange = props || 'transform, opacity';
    el.classList.add('is-animating');
  }
  function drop(el) {
    if (!el) { return; }
    el.style.willChange = '';
    el.classList.remove('is-animating');
  }

  /** 暂停 / 恢复某个子树上所有正在跑的动画（CSS 动画 + WAAPI 都吃这一套） */
  function setPlayState(el, state) {
    if (!el || typeof el.getAnimations !== 'function') { return; }
    var list = el.getAnimations({ subtree: true });
    for (var i = 0; i < list.length; i++) {
      try { state === 'pause' ? list[i].pause() : list[i].play(); } catch (e) {}
    }
  }

  /** 等待一次 transition/animation 结束，带超时兜底，避免 will-change 永远挂着 */
  function onceDone(el, timeout, cb) {
    var fired = false;
    function fire() {
      if (fired) { return; }
      fired = true;
      el.removeEventListener('transitionend', handler);
      el.removeEventListener('animationend', handler);
      cb();
    }
    function handler(e) { if (e.target === el) { fire(); } }
    el.addEventListener('transitionend', handler);
    el.addEventListener('animationend', handler);
    win.setTimeout(fire, timeout);
  }

  function esc(sel) {
    if (win.CSS && win.CSS.escape) { return win.CSS.escape(sel); }
    return String(sel).replace(/["\\]/g, '\\$&');
  }

  /* ===========================================================================
     1. 图片加载：主色占位 → 解码完成再淡入
     =========================================================================== */

  /**
   * 单张图片的「主色占位 → 淡入」流程。
   * 结构约定：<figure class="ph" style="--ph-color:#3b4a5e"><img …></figure>
   * 已在缓存里的图直接置为 loaded（跳过淡入），避免二次访问时闪一下。
   */
  function hydrateImage(img) {
    if (!img || img.__sgHydrated) { return; }
    img.__sgHydrated = true;

    var frame = img.closest ? img.closest('.ph') : img.parentNode;

    function done() {
      if (frame) { frame.classList.add('is-loaded'); }
      img.classList.add('is-loaded');
      /* 缓存命中时用 is-instant 关掉淡入，两帧后摘掉，别影响后续 hover 过渡 */
      if (frame && frame.classList.contains('is-instant')) {
        win.requestAnimationFrame(function () {
          win.requestAnimationFrame(function () { frame.classList.remove('is-instant'); });
        });
      }
    }
    function fail() {
      if (frame) { frame.classList.add('is-error'); }
    }

    if (img.complete && img.naturalWidth > 0) {
      if (frame) { frame.classList.add('is-instant'); }
      done();
      return;
    }
    if (typeof img.decode === 'function') {
      img.decode().then(done, function () {
        if (img.complete && img.naturalWidth > 0) { done(); } else { fail(); }
      });
    } else {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', fail, { once: true });
    }
  }

  function hydrateImages(scope) {
    var list = (scope || doc).querySelectorAll('.ph > img, img[data-hydrate]');
    for (var i = 0; i < list.length; i++) { hydrateImage(list[i]); }
  }

  /* ===========================================================================
     2. 滚动揭示：IntersectionObserver + 分批 stagger
     =========================================================================== */

  var REVEAL_STEP = 60;   /* 每个兄弟元素的错峰步长 ms */
  var REVEAL_MAX = 8;     /* 最多错峰几级，防止长列表最后一张等 3 秒 */
  var revealIO = null;

  function revealNow(el, delay) {
    if (!el || el.classList.contains('is-in')) { return; }
    el.style.setProperty('--reveal-delay', (delay || 0) + 'ms');
    lift(el);
    el.classList.add('is-in');
    onceDone(el, (delay || 0) + 1400, function () {
      drop(el);
      el.setAttribute('data-reveal-done', '');
      el.dispatchEvent(new CustomEvent('sg:revealed', { bubbles: true }));
    });
  }

  function onReveal(entries, obs) {
    var hits = [];
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) { hits.push(entries[i].target); }
    }
    if (!hits.length) { return; }
    hits.sort(docOrder);

    var counters = Object.create(null);
    var reduced = prefersReduced();

    for (var j = 0; j < hits.length; j++) {
      var el = hits[j];
      var key = el.getAttribute('data-reveal-group') || '__all';
      var n = counters[key] === undefined ? 0 : counters[key] + 1;
      counters[key] = n;

      var step = parseFloat(el.getAttribute('data-reveal-step'));
      if (!isFinite(step)) { step = REVEAL_STEP; }
      var max = parseInt(el.getAttribute('data-reveal-max'), 10);
      if (!isFinite(max)) { max = REVEAL_MAX; }

      revealNow(el, reduced ? 0 : Math.min(n, max) * step);
      obs.unobserve(el);
    }
  }

  /** 观察 scope 内所有 [data-reveal]；对动态插入的内容可重复调用 */
  function observeReveals(scope) {
    var list = (scope || doc).querySelectorAll('[data-reveal]:not([data-reveal-bound])');
    if (!('IntersectionObserver' in win)) {
      for (var k = 0; k < list.length; k++) {
        list[k].setAttribute('data-reveal-bound', '');
        revealNow(list[k], 0);
      }
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(onReveal, {
        /* 底部收 10%：元素真正「进入视野」而不是刚露一根头发就播 */
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.01
      });
    }
    for (var i = 0; i < list.length; i++) {
      list[i].setAttribute('data-reveal-bound', '');
      revealIO.observe(list[i]);
    }
  }

  /* ===========================================================================
     3. Ken Burns 轮播控制器
     =========================================================================== */

  var KB_VARIANTS = ['kb-a', 'kb-b', 'kb-c', 'kb-d', 'kb-e', 'kb-f'];

  /**
   * 结构约定：
   * <div class="kb" data-kenburns data-kb-hold="7000" data-kb-fade="1600">
   *   <div class="kb__layer"><img class="kb__img" src alt></div>
   *   <div class="kb__layer"><img class="kb__img" src alt></div>
   * </div>
   * 接缝处理：每一层的位移动画「只跑一次」（fill: both），跑完就一直停在终点；
   * 复位发生在该层 opacity 已经为 0 之后，所以永远看不到回弹。
   */
  function KenBurns(el, options) {
    if (!el) { return null; }
    if (el.__kb) { return el.__kb; }
    if (!(this instanceof KenBurns)) { return new KenBurns(el, options); }

    var o = options || {};
    this.el = el;
    this.layers = [].slice.call(el.querySelectorAll('.kb__layer'));
    this.hold = parseInt(el.getAttribute('data-kb-hold'), 10) || o.hold || 7000;
    this.fade = parseInt(el.getAttribute('data-kb-fade'), 10) || o.fade || 1600;
    this.loop = el.getAttribute('data-kb-loop') !== 'false';
    this.index = -1;
    this.z = 1;
    this.vPrev = -1;
    this.timer = null;
    this.deadline = 0;
    this.remain = 0;
    this.paused = true;
    this.visible = true;
    this.io = null;

    el.__kb = this;
    this._init();
  }

  KenBurns.prototype._init = function () {
    var self = this;
    if (!this.layers.length) { return; }

    /* 只有一层时不轮播，但仍然让它做一次超慢的呼吸 */
    this.show(0);
    if (this.layers.length < 2) { return; }

    if ('IntersectionObserver' in win) {
      this.io = new IntersectionObserver(function (entries) {
        var vis = entries[0] && entries[0].isIntersecting;
        self.visible = !!vis;
        vis ? self.play() : self.pause(true);
      }, { threshold: 0.15 });
      this.io.observe(this.el);
    }
    doc.addEventListener('visibilitychange', function () {
      doc.hidden ? self.pause(true) : self.play();
    });
    this.play();
  };

  KenBurns.prototype._variant = function () {
    if (this.layers.length < 2) { return KB_VARIANTS[0]; }
    var i;
    do { i = Math.floor(Math.random() * KB_VARIANTS.length); } while (i === this.vPrev);
    this.vPrev = i;
    return KB_VARIANTS[i];
  };

  /** 立刻切到第 i 层（顶层淡入，底层原样保持，避免 crossfade 中间的亮度塌陷） */
  KenBurns.prototype.show = function (i) {
    var layers = this.layers;
    if (!layers.length) { return; }
    i = ((i % layers.length) + layers.length) % layers.length;
    if (i === this.index) { return; }

    var prevIdx = this.index;
    var next = layers[i];
    var img = next.querySelector('.kb__img') || next.firstElementChild;
    var reduced = prefersReduced();

    next.classList.remove('is-mute');
    next.style.zIndex = String(++this.z);
    next.style.setProperty('--kb-dur', (this.hold + this.fade) + 'ms');
    next.style.setProperty('--kb-fade', this.fade + 'ms');

    if (img && !reduced) {
      for (var v = 0; v < KB_VARIANTS.length; v++) { img.classList.remove(KB_VARIANTS[v]); }
      img.style.animation = 'none';
      reflow(img);                 /* 关键：不 reflow 的话 class 换来换去动画不会重启 */
      img.style.animation = '';
      img.classList.add(this._variant());
    }

    lift(next);
    /* 下一帧再点亮，确保 opacity 的过渡有起点 */
    win.requestAnimationFrame(function () { next.classList.add('is-live'); });

    this.index = i;

    if (prevIdx >= 0 && layers[prevIdx]) {
      var prev = layers[prevIdx];
      var fade = this.fade;
      win.setTimeout(function () {
        /* 淡入已经结束，此刻旧层被完全盖住，可以无痕熄灭 + 复位 */
        prev.classList.add('is-mute');
        prev.classList.remove('is-live');
        drop(prev);
        var pimg = prev.querySelector('.kb__img') || prev.firstElementChild;
        if (pimg) {
          for (var v2 = 0; v2 < KB_VARIANTS.length; v2++) { pimg.classList.remove(KB_VARIANTS[v2]); }
        }
        win.requestAnimationFrame(function () { prev.classList.remove('is-mute'); });
      }, fade + 40);
    }

    this.el.dispatchEvent(new CustomEvent('kb:change', { detail: { index: i }, bubbles: true }));
  };

  KenBurns.prototype._schedule = function (ms) {
    var self = this;
    win.clearTimeout(this.timer);
    this.deadline = (win.performance ? performance.now() : Date.now()) + ms;
    this.timer = win.setTimeout(function () { self.next(); }, ms);
  };

  KenBurns.prototype.next = function () {
    if (!this.loop && this.index === this.layers.length - 1) { return this.pause(); }
    this.show(this.index + 1);
    if (!this.paused) { this._schedule(this.hold); }
  };

  KenBurns.prototype.prev = function () {
    this.show(this.index - 1);
    if (!this.paused) { this._schedule(this.hold); }
  };

  KenBurns.prototype.play = function () {
    if (!this.paused || !this.visible || doc.hidden || this.layers.length < 2) { return; }
    this.paused = false;
    setPlayState(this.el, 'play');
    this._schedule(this.remain > 0 ? this.remain : this.hold);
    this.remain = 0;
  };

  KenBurns.prototype.pause = function (keepRemaining) {
    if (this.paused) { return; }
    this.paused = true;
    win.clearTimeout(this.timer);
    if (keepRemaining) {
      var now = win.performance ? performance.now() : Date.now();
      this.remain = Math.max(400, this.deadline - now);
    }
    setPlayState(this.el, 'pause');
  };

  KenBurns.prototype.destroy = function () {
    this.pause();
    if (this.io) { this.io.disconnect(); }
    this.el.__kb = null;
  };

  /* ===========================================================================
     4. FLIP 灯箱（网格照片 → 全屏）
     =========================================================================== */

  var ICON = {
    close: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
  };

  var Lightbox = (function () {
    var box = null, stage = null, imgEl = null, capEl = null, countEl = null;
    var btnClose = null, btnPrev = null, btnNext = null, flipEl = null;
    var items = [], index = -1, opened = false, busy = false;
    var lastFocus = null, inerted = [];

    function build() {
      if (box) { return; }
      box = doc.createElement('div');
      box.className = 'lb';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', '照片查看器');
      box.hidden = true;
      box.innerHTML =
        '<div class="lb__scrim" data-lb-dismiss aria-hidden="true"></div>' +
        '<div class="lb__stage" data-lb-dismiss><img class="lb__img" alt=""></div>' +
        '<div class="lb__bar">' +
          '<p class="lb__cap"></p>' +
          '<span class="lb__count" aria-live="polite"></span>' +
        '</div>' +
        '<button type="button" class="lb__btn lb__btn--close" aria-label="关闭（Esc）">' + ICON.close + '</button>' +
        '<button type="button" class="lb__btn lb__btn--prev" aria-label="上一张（左方向键）">' + ICON.prev + '</button>' +
        '<button type="button" class="lb__btn lb__btn--next" aria-label="下一张（右方向键）">' + ICON.next + '</button>';
      doc.body.appendChild(box);

      stage = box.querySelector('.lb__stage');
      imgEl = box.querySelector('.lb__img');
      capEl = box.querySelector('.lb__cap');
      countEl = box.querySelector('.lb__count');
      btnClose = box.querySelector('.lb__btn--close');
      btnPrev = box.querySelector('.lb__btn--prev');
      btnNext = box.querySelector('.lb__btn--next');

      btnClose.addEventListener('click', close);
      btnPrev.addEventListener('click', function () { go(-1); });
      btnNext.addEventListener('click', function () { go(1); });
      box.addEventListener('click', function (e) {
        if (e.target.hasAttribute && e.target.hasAttribute('data-lb-dismiss')) { close(); }
      });
      box.addEventListener('keydown', onKey);
      imgEl.addEventListener('load', function () { imgEl.classList.add('is-ready'); });
    }

    function thumbImg(node) {
      return node && node.tagName === 'IMG' ? node : (node ? node.querySelector('img') : null);
    }

    /* 按自然比例在 box 里做 contain 计算，得到「最终」矩形 */
    function fit(nw, nh, b) {
      var s = Math.min(b.width / nw, b.height / nh);
      var w = nw * s, h = nh * s;
      return { x: b.left + (b.width - w) / 2, y: b.top + (b.height - h) / 2, w: w, h: h };
    }

    function radiusOf(node) {
      var r = parseFloat(win.getComputedStyle(node).borderTopLeftRadius);
      return isFinite(r) ? r : 0;
    }

    /**
     * FLIP 核心。
     * 缩略图是 object-fit: cover（裁过），全屏是 contain（完整），比例不同。
     * 不用非等比 scale（会拉变形），而是：等比放大到刚好盖住缩略图矩形，
     * 再用 clip-path: inset() 把多出来的部分裁掉 —— 裁出来的就是原本的 cover 取景。
     * Play 阶段同时把 transform 收回 identity、inset 收回 0，视觉上就是「裁切慢慢让开」。
     */
    function flipRun(thumb, dir) {
      var src = thumbImg(thumb);
      if (!src || prefersReduced()) { return Promise.resolve(); }

      var first = src.getBoundingClientRect();
      if (!first.width || !first.height) { return Promise.resolve(); }

      var nw = src.naturalWidth || parseFloat(thumb.getAttribute('data-w')) || first.width;
      var nh = src.naturalHeight || parseFloat(thumb.getAttribute('data-h')) || first.height;
      var b = stage.getBoundingClientRect();
      var last = fit(nw, nh, b);
      if (!last.w || !last.h) { return Promise.resolve(); }

      var s = Math.max(first.width / last.w, first.height / last.h);
      var dx = (first.left + first.width / 2) - (last.x + last.w / 2);
      var dy = (first.top + first.height / 2) - (last.y + last.h / 2);
      var insetX = Math.max(0, (last.w - first.width / s) / 2);
      var insetY = Math.max(0, (last.h - first.height / s) / 2);
      var r0 = radiusOf(src.parentNode.classList.contains('ph') ? src.parentNode : src) / s;
      var r1 = cssNum(box, '--lb-radius', 10);

      if (flipEl && flipEl.parentNode) { flipEl.parentNode.removeChild(flipEl); }
      flipEl = doc.createElement('div');
      flipEl.className = 'lb__flip';
      flipEl.setAttribute('aria-hidden', 'true');
      flipEl.style.backgroundImage = 'url("' + String(src.currentSrc || src.src).replace(/"/g, '\\"') + '")';
      flipEl.style.left = last.x + 'px';
      flipEl.style.top = last.y + 'px';
      flipEl.style.width = last.w + 'px';
      flipEl.style.height = last.h + 'px';
      box.appendChild(flipEl);

      var shrunk = {
        transform: 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')',
        clipPath: 'inset(' + insetY.toFixed(2) + 'px ' + insetX.toFixed(2) + 'px ' +
                  insetY.toFixed(2) + 'px ' + insetX.toFixed(2) + 'px round ' + r0.toFixed(2) + 'px)'
      };
      var full = {
        transform: 'translate(0px,0px) scale(1)',
        clipPath: 'inset(0px 0px 0px 0px round ' + r1 + 'px)'
      };

      var dur = cssNum(box, '--lb-dur', 460);
      var ease = win.getComputedStyle(box).getPropertyValue('--lb-ease').trim() || 'cubic-bezier(.16,1,.3,1)';
      var frames = dir > 0 ? [shrunk, full] : [full, shrunk];

      var anim = flipEl.animate(frames, { duration: dur, easing: ease, fill: 'both' });
      thumb.classList.add('is-lb-source');            /* 原位隐藏，避免「两张同时存在」 */
      return (anim.finished || Promise.resolve()).catch(noop);
    }

    function clearFlip() {
      if (!flipEl) { return; }
      var el = flipEl;
      flipEl = null;
      el.classList.add('is-out');
      win.setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 260);
    }

    function render(i) {
      var node = items[i];
      var src = thumbImg(node);
      if (!src) { return; }
      imgEl.classList.remove('is-ready');
      imgEl.src = node.getAttribute('data-full') || src.currentSrc || src.src;
      imgEl.alt = src.alt || '';
      var cap = node.getAttribute('data-caption') || src.alt || '';
      capEl.textContent = cap;
      capEl.hidden = !cap;
      countEl.textContent = (i + 1) + ' / ' + items.length;
      var many = items.length > 1;
      btnPrev.hidden = !many;
      btnNext.hidden = !many;
      /* 预解码相邻张，翻页时不空窗 */
      [items[i - 1], items[i + 1]].forEach(function (n) {
        var im = thumbImg(n);
        if (!im) { return; }
        var pre = new Image();
        pre.src = (n.getAttribute('data-full') || im.currentSrc || im.src);
      });
    }

    function applyInert(on) {
      if (on) {
        inerted = [];
        [].forEach.call(doc.body.children, function (child) {
          if (child === box || child.hasAttribute('inert')) { return; }
          child.setAttribute('inert', '');
          inerted.push(child);
        });
      } else {
        inerted.forEach(function (c) { c.removeAttribute('inert'); });
        inerted = [];
      }
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); return; }
      if (e.key !== 'Tab') { return; }
      var f = [].filter.call(box.querySelectorAll('button:not([hidden])'), function (b) {
        return b.offsetParent !== null;
      });
      if (!f.length) { return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function go(step) {
      if (!opened || items.length < 2) { return; }
      var prevNode = items[index];
      index = (index + step + items.length) % items.length;
      if (prevNode) { prevNode.classList.remove('is-lb-source'); }
      items[index].classList.add('is-lb-source');
      clearFlip();
      stage.classList.add(step > 0 ? 'is-slide-next' : 'is-slide-prev');
      win.setTimeout(function () {
        stage.classList.remove('is-slide-next', 'is-slide-prev');
      }, 420);
      render(index);
    }

    function open(node, list) {
      build();
      if (opened) { return; }
      items = list && list.length ? [].slice.call(list) : [node];
      index = Math.max(0, items.indexOf(node));
      lastFocus = doc.activeElement;
      opened = true;
      busy = true;

      box.hidden = false;
      root.classList.add('lb-open');
      applyInert(true);
      render(index);
      reflow(box);
      box.classList.add('is-open');

      flipRun(items[index], 1).then(function () {
        busy = false;
        imgEl.classList.add('is-ready');
        clearFlip();
      });
      btnClose.focus({ preventScroll: true });
      box.dispatchEvent(new CustomEvent('lb:open', { detail: { index: index }, bubbles: true }));
    }

    function close() {
      if (!opened) { return; }
      var node = items[index];
      opened = false;
      box.classList.remove('is-open');

      var src = thumbImg(node);
      if (src) {
        var r = src.getBoundingClientRect();
        var outOfView = r.bottom < 0 || r.top > win.innerHeight;
        if (outOfView && node.scrollIntoView) {
          node.scrollIntoView({ block: 'center', inline: 'nearest' });
        }
      }
      imgEl.classList.remove('is-ready');

      flipRun(node, -1).then(function () {
        box.hidden = true;
        clearFlip();
        applyInert(false);
        root.classList.remove('lb-open');
        items.forEach(function (n) { n.classList.remove('is-lb-source'); });
        imgEl.removeAttribute('src');
        if (lastFocus && lastFocus.focus) { lastFocus.focus({ preventScroll: true }); }
        box.dispatchEvent(new CustomEvent('lb:close', { bubbles: true }));
      });
    }

    /* 事件委托：任何 [data-lightbox] 都能开；值相同的归为一组，可左右翻 */
    function bind() {
      doc.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('[data-lightbox]') : null;
        if (!t) { return; }
        e.preventDefault();
        var group = t.getAttribute('data-lightbox');
        var list = group ? doc.querySelectorAll('[data-lightbox="' + esc(group) + '"]') : [t];
        open(t, list);
      });
    }

    return { open: open, close: close, next: function () { go(1); }, prev: function () { go(-1); }, bind: bind };
  })();

  /* ===========================================================================
     5. 毛玻璃导航 + 大标题收缩
     =========================================================================== */

  var navBound = false;

  /**
   * 把滚动进度写进两个 CSS 变量：
   *   --nav-p   0→1  控制毛玻璃层的透明度与发丝线
   *   --title-p 0→1  控制大标题收进导航栏
   * 浏览器原生支持 scroll() 时间线时自动让位给 CSS（见 motionCss 里的 @supports）。
   */
  function initNav(opts) {
    if (navBound) { return; }
    navBound = true;
    var o = opts || {};
    var navDist = o.navDistance || 88;
    var titleDist = o.titleDistance || 160;
    var nativeTimeline = !!(win.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
    if (nativeTimeline) { root.setAttribute('data-scroll-timeline', 'native'); }

    var nav = doc.querySelector('[data-nav]');
    var update = rafThrottle(function () {
      var y = win.scrollY || win.pageYOffset || 0;
      var p = clamp(y / navDist, 0, 1);
      var tp = clamp(y / titleDist, 0, 1);
      if (!nativeTimeline) {
        root.style.setProperty('--nav-p', p.toFixed(3));
        root.style.setProperty('--title-p', tp.toFixed(3));
      }
      root.classList.toggle('is-scrolled', y > 4);
      if (nav) {
        nav.classList.toggle('is-collapsed', tp > 0.92);
        /* 折叠后小标题才对读屏可见，避免同一句话被念两遍 */
        var small = nav.querySelector('.nav__title');
        if (small) { small.setAttribute('aria-hidden', tp > 0.92 ? 'false' : 'true'); }
      }
    });
    win.addEventListener('scroll', update, { passive: true });
    win.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ===========================================================================
     6. 回忆播放器（全屏自动播放）
     =========================================================================== */

  /**
   * 结构约定：
   * <section class="mem" data-memories data-mem-hold="4200">
   *   <div class="mem__track">
   *     <article class="mem__slide" data-hold="5200">
   *       <img class="mem__img" …>
   *       <div class="mem__cap"><p class="mem__line"><span>2019 · 大理</span></p>…</div>
   *     </article>…
   *   </div>
   *   <div class="mem__bar" data-mem-bar></div>
   *   …控制按钮…
   * </section>
   */
  function Memories(el, options) {
    if (!el) { return null; }
    if (el.__mem) { return el.__mem; }
    if (!(this instanceof Memories)) { return new Memories(el, options); }

    var o = options || {};
    this.el = el;
    this.slides = [].slice.call(el.querySelectorAll('.mem__slide'));
    this.bar = el.querySelector('[data-mem-bar]');
    this.hold = parseInt(el.getAttribute('data-mem-hold'), 10) || o.hold || 4200;
    this.fade = parseInt(el.getAttribute('data-mem-fade'), 10) || o.fade || 900;
    this.index = -1;
    this.anim = null;
    this.playing = false;
    this.segs = [];
    this.idleTimer = 0;
    this.vPrev = -1;

    el.__mem = this;
    this._buildBar();
    this._bind();
    return this;
  }

  Memories.prototype._buildBar = function () {
    if (!this.bar) { return; }
    this.bar.innerHTML = '';
    this.bar.setAttribute('role', 'progressbar');
    this.bar.setAttribute('aria-label', '回忆播放进度');
    this.bar.setAttribute('aria-valuemin', '1');
    this.bar.setAttribute('aria-valuemax', String(this.slides.length));
    for (var i = 0; i < this.slides.length; i++) {
      var seg = doc.createElement('span');
      seg.className = 'mem__seg';
      seg.innerHTML = '<i class="mem__fill"></i>';
      this.bar.appendChild(seg);
      this.segs.push(seg.firstChild);
    }
  };

  Memories.prototype._holdOf = function (i) {
    var s = this.slides[i];
    var h = s ? parseInt(s.getAttribute('data-hold'), 10) : 0;
    if (!isFinite(h) || !h) { h = this.hold; }
    /* 降低动效时给更长的停留，让人有时间看清而不是被闪 */
    return prefersReduced() ? Math.round(h * 1.5) : h;
  };

  Memories.prototype._variant = function () {
    var i;
    do { i = Math.floor(Math.random() * 4); } while (i === this.vPrev);
    this.vPrev = i;
    return KB_VARIANTS[i];
  };

  Memories.prototype.goTo = function (i) {
    var slides = this.slides;
    if (!slides.length) { return; }
    if (i >= slides.length) { return this.finish(); }
    if (i < 0) { i = 0; }

    var self = this;
    var prev = this.slides[this.index];
    if (prev) {
      prev.classList.remove('is-active');
      prev.setAttribute('aria-hidden', 'true');
      [].forEach.call(prev.querySelectorAll('.mem__line'), function (l) { l.classList.remove('is-in'); });
      win.setTimeout(function () { if (!prev.classList.contains('is-active')) { setPlayState(prev, 'pause'); } }, self.fade + 60);
    }

    this.index = i;
    var cur = slides[i];
    var img = cur.querySelector('.mem__img');
    if (img && !prefersReduced()) {
      for (var v = 0; v < KB_VARIANTS.length; v++) { img.classList.remove(KB_VARIANTS[v]); }
      img.style.animation = 'none';
      reflow(img);
      img.style.animation = '';
      img.classList.add(this._variant());
    }
    var dur = this._holdOf(i);
    cur.style.setProperty('--mem-dur', (dur + this.fade) + 'ms');
    cur.classList.add('is-active');
    cur.setAttribute('aria-hidden', 'false');
    setPlayState(cur, 'play');

    /* 字幕按行错峰升起 */
    var lines = cur.querySelectorAll('.mem__line');
    [].forEach.call(lines, function (l, n) {
      l.style.setProperty('--i', n);
      win.requestAnimationFrame(function () { l.classList.add('is-in'); });
    });

    /* 预热下一张 */
    var nextImg = slides[i + 1] && slides[i + 1].querySelector('img');
    if (nextImg) { nextImg.loading = 'eager'; hydrateImage(nextImg); }

    this._runProgress(i, dur);
    if (this.bar) { this.bar.setAttribute('aria-valuenow', String(i + 1)); }
    this.el.dispatchEvent(new CustomEvent('mem:change', { detail: { index: i }, bubbles: true }));
  };

  /* 进度条用 WAAPI 驱动：暂停/继续零漂移，onfinish 直接就是「该翻页了」 */
  Memories.prototype._runProgress = function (i, dur) {
    var self = this;
    if (this.anim) { try { this.anim.cancel(); } catch (e) {} this.anim = null; }
    for (var k = 0; k < this.segs.length; k++) {
      this.segs[k].style.transform = k < i ? 'scaleX(1)' : 'scaleX(0)';
    }
    var seg = this.segs[i];
    if (!seg) { return; }
    this.anim = seg.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: dur, easing: 'linear', fill: 'forwards' }
    );
    this.anim.onfinish = function () { self.next(); };
    if (!this.playing) { this.anim.pause(); }
  };

  Memories.prototype.next = function () { this.goTo(this.index + 1); };
  Memories.prototype.prev = function () { this.goTo(Math.max(0, this.index - 1)); };

  Memories.prototype.play = function () {
    this.playing = true;
    this.el.classList.add('is-playing');
    this.el.classList.remove('is-paused');
    if (this.index < 0) { this.goTo(0); }
    else {
      if (this.anim) { this.anim.play(); }
      setPlayState(this.slides[this.index], 'play');
    }
    this._resetIdle();
  };

  Memories.prototype.pause = function () {
    this.playing = false;
    this.el.classList.remove('is-playing');
    this.el.classList.add('is-paused');
    if (this.anim) { this.anim.pause(); }
    if (this.slides[this.index]) { setPlayState(this.slides[this.index], 'pause'); }
    this.el.classList.remove('is-idle');
  };

  Memories.prototype.toggle = function () { this.playing ? this.pause() : this.play(); };

  Memories.prototype.finish = function () {
    this.pause();
    this.el.classList.add('is-finished');
    this.el.dispatchEvent(new CustomEvent('mem:finish', { bubbles: true }));
  };

  Memories.prototype.exit = function () {
    this.pause();
    this.el.classList.remove('is-open', 'is-finished');
    root.classList.remove('mem-open');
    this.el.dispatchEvent(new CustomEvent('mem:exit', { bubbles: true }));
  };

  Memories.prototype.openFullscreen = function () {
    this.el.classList.add('is-open');
    root.classList.add('mem-open');
    this.el.focus && this.el.focus({ preventScroll: true });
    this.goTo(0);
    this.play();
  };

  Memories.prototype._resetIdle = function () {
    var self = this;
    this.el.classList.remove('is-idle');
    win.clearTimeout(this.idleTimer);
    if (!this.playing) { return; }
    this.idleTimer = win.setTimeout(function () { self.el.classList.add('is-idle'); }, 2400);
  };

  Memories.prototype._bind = function () {
    var self = this;
    var el = this.el;
    if (!el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '-1'); }

    el.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); self.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); self.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); self.prev(); }
      else if (e.key === 'Escape') { e.preventDefault(); self.exit(); }
    });
    el.addEventListener('pointermove', rafThrottle(function () { self._resetIdle(); }));

    [].forEach.call(el.querySelectorAll('[data-mem-action]'), function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var a = btn.getAttribute('data-mem-action');
        if (a === 'toggle') { self.toggle(); }
        else if (a === 'next') { self.next(); }
        else if (a === 'prev') { self.prev(); }
        else if (a === 'exit') { self.exit(); }
        self._resetIdle();
      });
    });

    /* 左右三分之一点按翻页，中间点按暂停（和 iOS 一致的手感） */
    var track = el.querySelector('.mem__track');
    if (track) {
      track.addEventListener('click', function (e) {
        var r = track.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        if (x < 0.3) { self.prev(); } else if (x > 0.7) { self.next(); } else { self.toggle(); }
      });
    }
    doc.addEventListener('visibilitychange', function () {
      if (doc.hidden && self.playing) { self.pause(); }
    });
  };

  Memories.prototype.destroy = function () {
    this.pause();
    this.el.__mem = null;
  };

  /* ===========================================================================
     7. 微交互辅助：拖拽上传 / 进度环
     =========================================================================== */

  function initDropzone(zone, onFiles) {
    if (!zone || zone.__dz) { return; }
    zone.__dz = true;
    var depth = 0;
    ['dragenter', 'dragover'].forEach(function (t) {
      zone.addEventListener(t, function (e) {
        e.preventDefault();
        if (t === 'dragenter') { depth++; }
        zone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'dragend'].forEach(function (t) {
      zone.addEventListener(t, function () {
        depth = Math.max(0, depth - 1);
        if (!depth) { zone.classList.remove('is-dragover'); }
      });
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      depth = 0;
      zone.classList.remove('is-dragover');
      zone.classList.add('is-dropped');
      win.setTimeout(function () { zone.classList.remove('is-dropped'); }, 600);
      if (typeof onFiles === 'function' && e.dataTransfer) { onFiles(e.dataTransfer.files, e); }
    });
  }

  /** 进度环：p 传 0–1。--ring-p 已在 CSS 里用 @property 注册过，所以能平滑过渡 */
  function setRingProgress(el, p) {
    if (!el) { return; }
    p = clamp(Number(p) || 0, 0, 1);
    el.style.setProperty('--ring-p', String(p));
    el.setAttribute('role', 'progressbar');
    el.setAttribute('aria-valuemin', '0');
    el.setAttribute('aria-valuemax', '100');
    el.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    el.classList.toggle('is-done', p >= 1);
  }

  /* ===========================================================================
     8. 入口
     =========================================================================== */

  var booted = false;

  function init(scope) {
    scope = scope || doc;
    hydrateImages(scope);
    observeReveals(scope);

    [].forEach.call(scope.querySelectorAll('[data-kenburns]'), function (el) { new KenBurns(el); });
    [].forEach.call(scope.querySelectorAll('[data-memories]'), function (el) { new Memories(el); });
    [].forEach.call(scope.querySelectorAll('[data-dropzone]'), function (el) { initDropzone(el); });

    if (!booted) {
      booted = true;
      Lightbox.bind();
      initNav();
      /* 打开回忆播放器的按钮：<button data-mem-open="#mem-2019"> */
      doc.addEventListener('click', function (e) {
        var t = e.target.closest ? e.target.closest('[data-mem-open]') : null;
        if (!t) { return; }
        var target = doc.querySelector(t.getAttribute('data-mem-open'));
        if (target) { new Memories(target).openFullscreen(); }
      });
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', function () { init(doc); });
  } else {
    init(doc);
  }

  var API = {
    __ready: true,
    prefersReduced: prefersReduced,
    rafThrottle: rafThrottle,
    clamp: clamp,
    reflow: reflow,
    lift: lift,
    drop: drop,
    setPlayState: setPlayState,
    hydrateImage: hydrateImage,
    hydrateImages: hydrateImages,
    observeReveals: observeReveals,
    revealNow: revealNow,
    KenBurns: KenBurns,
    kenBurns: function (el, o) { return new KenBurns(el, o); },
    lightbox: Lightbox,
    initNav: initNav,
    Memories: Memories,
    memories: function (el, o) { return new Memories(el, o); },
    initDropzone: initDropzone,
    setRingProgress: setRingProgress,
    init: init
  };

  win.SG = win.SG || {};
  win.SG.motion = API;
  win.SGMotion = API;

})(window, document);