/* =============================================================================
   时光 · shell 模块初始化
   导航 / hash 路由 / 视图切换 / 搜索 / 人物排序 / 地图联动 / 移动端 sheet
   外层统一调用 initShell()，此处不自动执行
   ============================================================================= */
function initShell() {
  'use strict';

  var VIEWS = ['home', 'library', 'messages', 'people', 'places', 'talks'];
  var VIEW_TITLE = {
    home: '0731 史记', library: '图库', messages: '回忆',
    people: '人物', places: '地点', talks: '话'
  };

  var shell = document.getElementById('sh-shell');
  if (!shell) { return; }

  var topbar = document.getElementById('sh-topbar');
  var navEl = document.getElementById('sh-nav');
  var tabbar = document.getElementById('sh-tabbar');
  var sheet = document.getElementById('sh-sheet');
  var moreBtn = document.getElementById('sh-more');
  var searchWrap = document.getElementById('sh-search');
  var searchField = document.getElementById('sh-search-field');
  var searchInput = document.getElementById('sh-search-input');
  var searchPanel = document.getElementById('sh-search-panel');
  var searchList = document.getElementById('sh-search-list');
  var searchEmpty = document.getElementById('sh-search-empty');

  var current = 'home';
  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* -------------------------------------------------------------------------
     1 · 滚动揭示：观察全局 .reveal（含其它模块写入的元素）
     ------------------------------------------------------------------------- */
  var revealIO = null;

  function revealIn(el) {
    if (el.classList.contains('is-in')) { return; }
    var step = parseInt(el.getAttribute('data-reveal-delay'), 10);
    if (!isFinite(step)) { step = 0; }
    el.style.animationDelay = reduced ? '0ms' : (Math.min(step, 8) * 70) + 'ms';
    el.classList.add('is-in');
  }

  function observeReveals(scope) {
    var list = (scope || document).querySelectorAll('.reveal:not([data-sh-bound])');
    var i;
    if (!('IntersectionObserver' in window)) {
      for (i = 0; i < list.length; i++) {
        list[i].setAttribute('data-sh-bound', '');
        revealIn(list[i]);
      }
      return;
    }
    if (!revealIO) {
      revealIO = new IntersectionObserver(function (entries, obs) {
        for (var k = 0; k < entries.length; k++) {
          if (!entries[k].isIntersecting) { continue; }
          revealIn(entries[k].target);
          obs.unobserve(entries[k].target);
        }
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    }
    for (i = 0; i < list.length; i++) {
      list[i].setAttribute('data-sh-bound', '');
      revealIO.observe(list[i]);
    }
  }

  /* IO 之外的兜底：滚动时手动扫一遍，且若 IO 始终没生效就全部显现，
     防止内容永久停在 opacity:0（隐藏视口、IO 被禁用等异常环境） */
  var sweepQueued = false;

  function sweepReveals() {
    var list = document.querySelectorAll('.reveal:not(.is-in)');
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (!vh) { return; }
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.top < vh * 0.94 && r.bottom > 0) { revealIn(list[i]); }
    }
  }

  function queueSweep() {
    if (sweepQueued) { return; }
    sweepQueued = true;
    requestAnimationFrame(function () { sweepQueued = false; sweepReveals(); });
  }

  function installRevealFallback() {
    window.addEventListener('scroll', queueSweep, { passive: true });
    window.addEventListener('resize', queueSweep, { passive: true });
    window.setTimeout(function () {
      if (document.querySelectorAll('.reveal.is-in').length) { return; }
      var all = document.querySelectorAll('.reveal');
      for (var i = 0; i < all.length; i++) { revealIn(all[i]); }
    }, 2500);
  }

  /* -------------------------------------------------------------------------
     2 · 视图切换与 hash 路由
     ------------------------------------------------------------------------- */
  function normalize(name) {
    return VIEWS.indexOf(name) >= 0 ? name : 'home';
  }

  function markCurrent(name) {
    var items = shell.querySelectorAll('.sh-nav__item, .sh-tabbar__btn, .sh-sheet__row');
    for (var i = 0; i < items.length; i++) {
      var target = items[i].getAttribute('data-goto');
      if (!target) { continue; }
      if (target === name) { items[i].setAttribute('aria-current', 'page'); }
      else { items[i].removeAttribute('aria-current'); }
    }
  }

  function render(name, opts) {
    name = normalize(name);
    var silent = opts && opts.silent;
    var section = document.getElementById('view-' + name);
    if (!section) { return; }

    for (var i = 0; i < VIEWS.length; i++) {
      var s = document.getElementById('view-' + VIEWS[i]);
      if (!s) { continue; }
      if (VIEWS[i] === name) { s.removeAttribute('hidden'); }
      else { s.setAttribute('hidden', ''); }
    }

    markCurrent(name);
    document.title = (name === 'home')
      ? '0731 史记 · 老友记的八年'
      : (VIEW_TITLE[name] + ' · 时光');

    if (!silent) {
      window.scrollTo(0, 0);
      if (!reduced) {
        section.classList.remove('is-entering');
        void section.offsetWidth;
        section.classList.add('is-entering');
        window.setTimeout(function () { section.classList.remove('is-entering'); }, 520);
      }
      if (!section.hasAttribute('tabindex')) { section.setAttribute('tabindex', '-1'); }
      try { section.focus({ preventScroll: true }); } catch (e) { section.focus(); }
    }

    current = name;
    observeReveals(section);
    document.dispatchEvent(new CustomEvent('shell:view', { detail: { view: name } }));
  }

  function go(name) {
    name = normalize(name);
    closeSheet();
    closeSearch();
    if (name === current) {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    if (window.location.hash.replace('#', '') !== name) {
      window.location.hash = name;   /* 交给 hashchange 渲染，前进后退可用 */
    } else {
      render(name);
    }
  }

  window.addEventListener('hashchange', function () {
    render(window.location.hash.replace('#', ''));
  });

  /* .js-goto 全局委托（含其它模块的元素） */
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('.js-goto') : null;
    if (!t) { return; }
    var name = t.getAttribute('data-goto');
    if (!name) { return; }
    e.preventDefault();
    go(name);
  });

  /* -------------------------------------------------------------------------
     3 · 搜索
     ------------------------------------------------------------------------- */
  var searchOpen = false;

  function openSearch() {
    if (searchOpen) { return; }
    searchOpen = true;
    searchWrap.classList.add('is-open');
    searchInput.setAttribute('aria-expanded', 'true');
    filterSuggestions('');
    window.setTimeout(function () { searchInput.focus(); }, 40);
  }

  function closeSearch() {
    if (!searchOpen) { return; }
    searchOpen = false;
    searchWrap.classList.remove('is-open');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.blur();
  }

  function filterSuggestions(q) {
    var rows = searchList.querySelectorAll('.sh-search__row');
    var shown = 0;
    q = (q || '').trim().toLowerCase();
    for (var i = 0; i < rows.length; i++) {
      var hay = (rows[i].getAttribute('data-q') + ' ' + rows[i].textContent).toLowerCase();
      var hit = !q || hay.indexOf(q) >= 0;
      if (hit) { rows[i].removeAttribute('hidden'); shown++; }
      else { rows[i].setAttribute('hidden', ''); }
      rows[i].classList.remove('is-active');
    }
    if (searchEmpty) {
      if (shown) { searchEmpty.setAttribute('hidden', ''); }
      else { searchEmpty.removeAttribute('hidden'); }
    }
  }

  function submitSearch(q) {
    q = (q || '').trim();
    if (!q) { return; }
    searchInput.value = q;
    closeSearch();
    document.dispatchEvent(new CustomEvent('shell:search', { detail: { query: q } }));
    go('library');
  }

  searchField.addEventListener('click', function () { openSearch(); });
  searchInput.addEventListener('focus', openSearch);
  searchInput.addEventListener('input', function () { filterSuggestions(searchInput.value); });

  searchInput.addEventListener('keydown', function (e) {
    var rows = [];
    var all = searchList.querySelectorAll('.sh-search__row');
    for (var i = 0; i < all.length; i++) { if (!all[i].hasAttribute('hidden')) { rows.push(all[i]); } }
    var idx = -1;
    for (var j = 0; j < rows.length; j++) { if (rows[j].classList.contains('is-active')) { idx = j; } }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!rows.length) { return; }
      if (idx >= 0) { rows[idx].classList.remove('is-active'); }
      idx = e.key === 'ArrowDown'
        ? (idx + 1) % rows.length
        : (idx <= 0 ? rows.length - 1 : idx - 1);
      rows[idx].classList.add('is-active');
      rows[idx].scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      submitSearch(idx >= 0 ? rows[idx].getAttribute('data-q') : searchInput.value);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchInput.value) { searchInput.value = ''; filterSuggestions(''); }
      else { closeSearch(); }
    }
  });

  searchList.addEventListener('click', function (e) {
    var row = e.target.closest ? e.target.closest('.sh-search__row') : null;
    if (!row) { return; }
    submitSearch(row.getAttribute('data-q'));
  });

  document.addEventListener('pointerdown', function (e) {
    if (!searchOpen) { return; }
    if (searchWrap.contains(e.target)) { return; }
    closeSearch();
  });

  var sheetSearchBtn = document.getElementById('sh-sheet-search');
  if (sheetSearchBtn) {
    sheetSearchBtn.addEventListener('click', function () {
      closeSheet();
      window.setTimeout(openSearch, 220);
    });
  }

  /* -------------------------------------------------------------------------
     4 · 移动端「更多」sheet
     ------------------------------------------------------------------------- */
  var sheetOpen = false;

  function openSheet() {
    if (sheetOpen || !sheet) { return; }
    sheetOpen = true;
    sheet.classList.add('is-open');
    void sheet.offsetWidth;
    sheet.classList.add('is-in');
    moreBtn.setAttribute('aria-expanded', 'true');
    moreBtn.classList.add('is-open');
  }

  function closeSheet() {
    if (!sheetOpen || !sheet) { return; }
    sheetOpen = false;
    sheet.classList.remove('is-in');
    moreBtn.setAttribute('aria-expanded', 'false');
    moreBtn.classList.remove('is-open');
    window.setTimeout(function () {
      if (!sheetOpen) { sheet.classList.remove('is-open'); }
    }, 340);
  }

  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      if (sheetOpen) { closeSheet(); } else { openSheet(); }
    });
  }
  if (sheet) {
    sheet.addEventListener('click', function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute('data-sheet-close')) { closeSheet(); }
    });
  }

  /* -------------------------------------------------------------------------
     5 · 人物排序
     ------------------------------------------------------------------------- */
  var sortBar = document.getElementById('sh-people-sort');
  var peopleGrid = document.getElementById('sh-people-grid');

  function sortPeople(mode) {
    if (!peopleGrid) { return; }
    var cards = [].slice.call(peopleGrid.querySelectorAll('.sh-person'));
    cards.sort(function (a, b) {
      if (mode === 'name') {
        var pa = a.getAttribute('data-pinyin') || '';
        var pb = b.getAttribute('data-pinyin') || '';
        return pa < pb ? -1 : (pa > pb ? 1 : 0);
      }
      var key = mode === 'recent' ? 'data-recent' : 'data-count';
      return (parseInt(b.getAttribute(key), 10) || 0) - (parseInt(a.getAttribute(key), 10) || 0);
    });
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.setProperty('--sh-order', i);
      peopleGrid.appendChild(cards[i]);
      if (!cards[i].classList.contains('is-in')) { revealIn(cards[i]); }
    }
  }

  if (sortBar) {
    sortBar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.sh-seg__btn') : null;
      if (!btn) { return; }
      var btns = sortBar.querySelectorAll('.sh-seg__btn');
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute('aria-pressed', btns[i] === btn ? 'true' : 'false');
      }
      sortPeople(btn.getAttribute('data-sort'));
    });
  }

  /* -------------------------------------------------------------------------
     6 · 地图点 → 地点卡
     ------------------------------------------------------------------------- */
  var map = document.getElementById('sh-map');
  var placesGrid = document.getElementById('sh-places-grid');
  var hlTimer = 0;

  if (map && placesGrid) {
    map.addEventListener('click', function (e) {
      var pt = e.target.closest ? e.target.closest('.sh-map__pt') : null;
      if (!pt) { return; }
      var name = pt.getAttribute('data-place');
      var pts = map.querySelectorAll('.sh-map__pt');
      for (var i = 0; i < pts.length; i++) { pts[i].classList.toggle('is-active', pts[i] === pt); }

      var card = placesGrid.querySelector('.sh-place[data-place="' + name + '"]');
      if (!card) { return; }
      revealIn(card);
      card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      var cards = placesGrid.querySelectorAll('.sh-place');
      for (var j = 0; j < cards.length; j++) { cards[j].classList.remove('is-highlight'); }
      card.classList.add('is-highlight');
      window.clearTimeout(hlTimer);
      hlTimer = window.setTimeout(function () { card.classList.remove('is-highlight'); }, 2400);
    });
  }

  /* -------------------------------------------------------------------------
     7 · 顶栏滚动进度（motion.js 在时交给它，否则自己写 --nav-p）
     ------------------------------------------------------------------------- */
  function initNavProgress() {
    if (window.SGMotion && typeof window.SGMotion.initNav === 'function') {
      window.SGMotion.initNav({ navDistance: 88, titleDistance: 160 });
      return;
    }
    var root = document.documentElement;
    var ticking = false;
    function write() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      var p = Math.max(0, Math.min(1, y / 88));
      root.style.setProperty('--nav-p', p.toFixed(3));
      root.classList.toggle('is-scrolled', y > 4);
    }
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(write);
    }, { passive: true });
    write();
  }

  /* -------------------------------------------------------------------------
     8 · 键盘
     ------------------------------------------------------------------------- */
  function isTyping(el) {
    if (!el) { return false; }
    var tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  }

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      openSearch();
      return;
    }
    if (e.key === 'Escape') {
      if (sheetOpen) { e.preventDefault(); closeSheet(); return; }
      if (searchOpen) { e.preventDefault(); closeSearch(); return; }
      return;
    }
    if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) { return; }
    if (e.key === '/') { e.preventDefault(); openSearch(); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 6) { e.preventDefault(); go(VIEWS[n - 1]); }
  });

  /* -------------------------------------------------------------------------
     9 · 启动
     ------------------------------------------------------------------------- */
  initNavProgress();
  observeReveals(document);
  installRevealFallback();
  render(window.location.hash.replace('#', '') || 'home', { silent: true });

  /* 供其它模块调用 */
  window.SHELL = {
    go: go,
    current: function () { return current; },
    openSearch: openSearch,
    closeSearch: closeSearch,
    observeReveals: observeReveals
  };
}
