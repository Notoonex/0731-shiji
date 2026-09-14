/* =============================================================================
   时光 · 首页模块：人物 / 旅程 / 地点
   由外层统一调用 initPeopleTrips()，本文件不自动执行
   ============================================================================= */

function initPeopleTrips() {
  'use strict';

  var section = document.getElementById('pt-people');
  if (section && section.dataset.ptReady === '1') { return; }
  if (section) { section.dataset.ptReady = '1'; }

  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  function raf(fn) {
    var ticking = false;
    return function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; fn(); });
    };
  }

  /* -------------------------------------------------------------------------
     1. 人物横滑：箭头、键盘、边界状态
     ------------------------------------------------------------------------- */

  (function people() {
    var rail = document.getElementById('pt-people-rail');
    var prev = document.getElementById('pt-people-prev');
    var next = document.getElementById('pt-people-next');
    if (!rail) { return; }

    // 一次滚动的距离：尽量接近「一屏」，但保留一张卡的重叠，便于视线接续
    function pageSize() {
      var card = rail.querySelector('.pt-person');
      var step = card ? card.getBoundingClientRect().width + 24 : 140;
      var n = Math.max(1, Math.floor(rail.clientWidth / step) - 1);
      return n * step;
    }

    function scrollBy(dir) {
      rail.scrollTo({
        left: rail.scrollLeft + dir * pageSize(),
        behavior: reduced ? 'auto' : 'smooth'
      });
    }

    var syncEdges = raf(function () {
      var max = rail.scrollWidth - rail.clientWidth - 1;
      var atStart = rail.scrollLeft <= 1;
      var atEnd = rail.scrollLeft >= max;
      var noOverflow = max <= 1;
      if (prev) { prev.setAttribute('aria-disabled', (atStart || noOverflow) ? 'true' : 'false'); }
      if (next) { next.setAttribute('aria-disabled', (atEnd || noOverflow) ? 'true' : 'false'); }
    });

    if (prev) { prev.addEventListener('click', function () { scrollBy(-1); }); }
    if (next) { next.addEventListener('click', function () { scrollBy(1); }); }

    rail.addEventListener('scroll', syncEdges, { passive: true });
    window.addEventListener('resize', syncEdges, { passive: true });

    // 键盘：焦点在轨道本身时用左右键翻一屏；焦点在某张卡上时交给浏览器 Tab
    rail.addEventListener('keydown', function (e) {
      if (e.target !== rail) { return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollBy(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); scrollBy(-1); }
      else if (e.key === 'Home') { e.preventDefault(); rail.scrollTo({ left: 0, behavior: 'smooth' }); }
      else if (e.key === 'End') { e.preventDefault(); rail.scrollTo({ left: rail.scrollWidth, behavior: 'smooth' }); }
    });

    // Tab 进入某张卡时，把它完整带进视野，避免半张卡被切在边缘
    rail.addEventListener('focusin', function (e) {
      var card = e.target.closest ? e.target.closest('.pt-person') : null;
      if (!card) { return; }
      var cr = card.getBoundingClientRect();
      var rr = rail.getBoundingClientRect();
      if (cr.left < rr.left + 8) {
        rail.scrollTo({ left: rail.scrollLeft - (rr.left - cr.left) - 24, behavior: 'smooth' });
      } else if (cr.right > rr.right - 8) {
        rail.scrollTo({ left: rail.scrollLeft + (cr.right - rr.right) + 24, behavior: 'smooth' });
      }
    });

    syncEdges();
    // 图片解码后宽度才稳定，补一次
    window.setTimeout(syncEdges, 600);
  })();

  /* -------------------------------------------------------------------------
     2. 旅程主卡：照片堆叠展开成扇形
     ------------------------------------------------------------------------- */

  (function trip() {
    var hero = document.getElementById('pt-trip-hero');
    if (!hero) { return; }

    var timer = 0;

    function fan(on) {
      window.clearTimeout(timer);
      if (on) {
        hero.classList.add('is-fanned');
      } else {
        // 离开时稍作停顿再收拢，鼠标掠过边缘不会抖
        timer = window.setTimeout(function () { hero.classList.remove('is-fanned'); }, 120);
      }
    }

    hero.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') { return; }
      fan(true);
    });
    hero.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'touch') { return; }
      fan(false);
    });
    hero.addEventListener('focus', function () { fan(true); });
    hero.addEventListener('blur', function () { fan(false); });
  })();

  /* -------------------------------------------------------------------------
     3. 地图光点 ↔ 地点卡：双向悬停联动
     ------------------------------------------------------------------------- */

  (function places() {
    var map = document.getElementById('pt-map');
    var grid = document.getElementById('pt-place-grid');
    if (!map || !grid) { return; }

    var dots = Array.prototype.slice.call(map.querySelectorAll('.pt-dot'));
    var links = Array.prototype.slice.call(map.querySelectorAll('.pt-map-link'));
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.pt-place'));
    var current = null;

    function apply(place) {
      if (place === current) { return; }
      current = place;

      var on = !!place;
      map.classList.toggle('is-linking', on);
      grid.classList.toggle('is-linking', on);

      dots.forEach(function (d) {
        d.classList.toggle('is-active', on && d.getAttribute('data-place') === place);
      });
      cards.forEach(function (c) {
        c.classList.toggle('is-active', on && c.getAttribute('data-place') === place);
      });
      links.forEach(function (l) {
        var pair = (l.getAttribute('data-link') || '').split('|');
        l.classList.toggle('is-active', on && pair.indexOf(place) !== -1);
      });
    }

    function bind(el) {
      var place = el.getAttribute('data-place');
      if (!place) { return; }
      el.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') { return; }
        apply(place);
      });
      el.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') { return; }
        apply(null);
      });
      el.addEventListener('focus', function () { apply(place); });
      el.addEventListener('blur', function () { apply(null); });
    }

    dots.forEach(bind);
    cards.forEach(bind);

    // 指针离开整块地点区域时兜底复位（快速划出时 pointerleave 可能丢失）
    var wrapper = map.parentNode;
    if (wrapper && wrapper.addEventListener) {
      wrapper.addEventListener('pointerleave', function () { apply(null); });
    }
  })();
}
