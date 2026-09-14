/* =============================================================================
   时光 · 首页模块：为你回忆 + 最近的日子
   由外层统一调用 initMemories()，本文件不自动执行
   ============================================================================= */

function initMemories() {
  'use strict';

  var scope = document.getElementById('mem-scope');
  if (!scope || scope.dataset.memReady === '1') { return; }
  scope.dataset.memReady = '1';

  var rail     = document.getElementById('mem-rail');
  var railWrap = document.getElementById('mem-railwrap');
  var btnPrev  = document.getElementById('mem-prev');
  var btnNext  = document.getElementById('mem-next');
  var fadeL    = document.getElementById('mem-fade-l');
  var fadeR    = document.getElementById('mem-fade-r');

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() {
    if (document.documentElement.getAttribute('data-motion') === 'off') { return true; }
    return !!(reduceMQ && reduceMQ.matches);
  }

  /* 每帧最多跑一次，绑 scroll / resize 用 */
  function rafThrottle(fn) {
    var ticking = false;
    return function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () {
        ticking = false;
        fn();
      });
    };
  }

  /* -------------------------------------------------------------------------
     1. 入场：分块 stagger 上浮淡入
     ------------------------------------------------------------------------- */

  var STEP = 70;   /* 每张卡的错峰步长 */
  var MAX_I = 7;   /* 最多错峰到第 8 张，后面的不再继续等 */

  function revealAll(list) {
    for (var i = 0; i < list.length; i++) {
      list[i].style.transitionDelay = '0ms';
      list[i].classList.add('is-in');
    }
  }

  function setupReveal() {
    var items = scope.querySelectorAll('.mem-reveal');
    if (!items.length) { return; }

    if (!('IntersectionObserver' in window)) {
      revealAll(items);
      return;
    }

    scope.classList.add('is-armed');
    var soft = reduced();

    var io = new IntersectionObserver(function (entries, obs) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (!e.isIntersecting) { continue; }
        var el = e.target;
        var idx = parseInt(el.getAttribute('data-mem-i'), 10);
        if (!isFinite(idx) || idx < 0) { idx = 0; }
        if (idx > MAX_I) { idx = MAX_I; }
        el.style.transitionDelay = soft ? '0ms' : (idx * STEP) + 'ms';
        el.classList.add('is-in');
        obs.unobserve(el);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    for (var k = 0; k < items.length; k++) { io.observe(items[k]); }

    /* 兜底：万一 IO 因某些环境不回调，2.4s 后强制显示 */
    window.setTimeout(function () {
      var left = scope.querySelectorAll('.mem-reveal:not(.is-in)');
      for (var j = 0; j < left.length; j++) {
        var r = left[j].getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          left[j].style.transitionDelay = '0ms';
          left[j].classList.add('is-in');
        }
      }
    }, 2400);
  }

  setupReveal();

  if (!rail) { return; }

  /* -------------------------------------------------------------------------
     2. 边缘渐隐与箭头可用性
     ------------------------------------------------------------------------- */

  function maxScroll() {
    return Math.max(0, rail.scrollWidth - rail.clientWidth);
  }

  function updateEdges() {
    var max = maxScroll();
    var x = rail.scrollLeft;
    var atStart = x <= 8;
    var atEnd = x >= max - 8;
    var scrollable = max > 8;

    if (fadeL) { fadeL.classList.toggle('is-on', scrollable && !atStart); }
    if (fadeR) { fadeR.classList.toggle('is-on', scrollable && !atEnd); }
    if (btnPrev) { btnPrev.disabled = !scrollable || atStart; }
    if (btnNext) { btnNext.disabled = !scrollable || atEnd; }
  }

  var onScroll = rafThrottle(updateEdges);
  rail.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', rafThrottle(updateEdges), { passive: true });

  /* -------------------------------------------------------------------------
     3. 箭头翻页：按「整数张卡」滚动，避免半张卡卡在边缘
     ------------------------------------------------------------------------- */

  function pageAmount() {
    var card = rail.querySelector('.mem-card');
    if (!card) { return Math.round(rail.clientWidth * 0.8); }
    var cs = window.getComputedStyle(rail);
    var gap = parseFloat(cs.columnGap || cs.gap) || 0;
    var pad = parseFloat(cs.paddingLeft) || 0;
    var unit = card.getBoundingClientRect().width + gap;
    var room = rail.clientWidth - pad;
    var per = Math.max(1, Math.floor(room / unit));
    return Math.round(unit * per);
  }

  function page(dir) {
    var amount = pageAmount() * dir;
    var target = Math.max(0, Math.min(maxScroll(), rail.scrollLeft + amount));
    if (typeof rail.scrollTo === 'function') {
      rail.scrollTo({ left: target, behavior: reduced() ? 'auto' : 'smooth' });
    } else {
      rail.scrollLeft = target;
    }
  }

  if (btnPrev) { btnPrev.addEventListener('click', function () { page(-1); }); }
  if (btnNext) { btnNext.addEventListener('click', function () { page(1); }); }

  /* 键盘：轨道聚焦时用 ←→ 滚动一屏，不用 Tab 逐张穿越 */
  rail.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); page(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); }
    else if (e.key === 'Home') { e.preventDefault(); rail.scrollLeft = 0; }
    else if (e.key === 'End') { e.preventDefault(); rail.scrollLeft = maxScroll(); }
  });

  /* -------------------------------------------------------------------------
     4. 拖拽滚动（鼠标 / 触控笔）：跟手，松手按速度惯性吸附到最近一张
     ------------------------------------------------------------------------- */

  var dragging = false;
  var moved = 0;
  var startX = 0;
  var startScroll = 0;
  var lastX = 0;
  var lastT = 0;
  var velocity = 0;
  var pid = null;

  function snapNearest(extra) {
    var card = rail.querySelector('.mem-card');
    if (!card) { return; }
    var cs = window.getComputedStyle(rail);
    var gap = parseFloat(cs.columnGap || cs.gap) || 0;
    var unit = card.getBoundingClientRect().width + gap;
    var target = rail.scrollLeft + (extra || 0);
    target = Math.round(target / unit) * unit;
    target = Math.max(0, Math.min(maxScroll(), target));
    if (typeof rail.scrollTo === 'function') {
      rail.scrollTo({ left: target, behavior: reduced() ? 'auto' : 'smooth' });
    } else {
      rail.scrollLeft = target;
    }
  }

  rail.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') { return; }   /* 触摸交给系统原生滚动 */
    if (e.button !== 0) { return; }
    dragging = true;
    moved = 0;
    startX = lastX = e.clientX;
    startScroll = rail.scrollLeft;
    lastT = e.timeStamp;
    velocity = 0;
    pid = e.pointerId;
    rail.classList.add('is-dragging');
    if (rail.setPointerCapture) {
      try { rail.setPointerCapture(pid); } catch (err) { /* 忽略 */ }
    }
  });

  rail.addEventListener('pointermove', function (e) {
    if (!dragging || e.pointerId !== pid) { return; }
    var dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    var dt = e.timeStamp - lastT;
    if (dt > 0) { velocity = (e.clientX - lastX) / dt; }
    lastX = e.clientX;
    lastT = e.timeStamp;
    rail.scrollLeft = startScroll - dx;
    if (moved > 4) { e.preventDefault(); }
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pid)) { return; }
    dragging = false;
    rail.classList.remove('is-dragging');
    if (pid !== null && rail.releasePointerCapture) {
      try { rail.releasePointerCapture(pid); } catch (err) { /* 忽略 */ }
    }
    pid = null;
    /* 松手时按速度多滑一点，再吸附到最近的卡片起点 */
    var fling = Math.max(-520, Math.min(520, -velocity * 260));
    snapNearest(Math.abs(velocity) > 0.15 ? fling : 0);
    updateEdges();
  }

  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('lostpointercapture', endDrag);

  /* 拖动结束后紧接着的那次 click 不该打开回忆播放器 */
  rail.addEventListener('click', function (e) {
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
      moved = 0;
    }
  }, true);

  rail.addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* -------------------------------------------------------------------------
     5. 首帧状态
     ------------------------------------------------------------------------- */

  updateEdges();
  window.requestAnimationFrame(updateEdges);
  window.setTimeout(updateEdges, 400);   /* 图片解码完成后宽度可能变化，再校一次 */
}
