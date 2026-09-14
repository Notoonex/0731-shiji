/* =============================================================================
   时光 · 首页 hero「今日精选」运行时
   外层统一调用 initHero()，本文件不自动执行。
   ============================================================================= */

function initHero() {
  'use strict';

  var root = document.getElementById('hero');
  if (!root || root.dataset.heroReady === '1') { return; }
  root.dataset.heroReady = '1';

  var slides = Array.prototype.slice.call(root.querySelectorAll('.hero-slide'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('.hero-dot'));
  var copy = document.getElementById('hero-copy');
  var titleText = document.getElementById('hero-title-text');
  var metaText = document.getElementById('hero-meta-text');
  var playBtn = document.getElementById('hero-play');
  var dotsBox = document.getElementById('hero-dots');
  var scrollBtn = document.getElementById('hero-scroll');

  if (!slides.length || !copy) { return; }

  /* 与 CSS 保持一致：停留 7.6s + 交叉淡入 1.6s（--dur-fade） */
  var FADE = 1600;
  var HOLD = 7600;
  var CYCLE = HOLD + FADE;
  var SWAP = 220;               /* 文案让位的时长，对应 CSS 的 --dur-2 */

  var index = 0;
  var zTop = 1;
  var progress = null;          /* 指示器进度动画，同时充当轮播时钟 */
  var swapTimer = 0;
  var muteTimer = 0;
  var hoverPaused = false;
  var focusPaused = false;
  var hiddenPaused = false;

  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var hoverMQ = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;

  function reduced() {
    if (document.documentElement.getAttribute('data-motion') === 'off') { return true; }
    return !!(reduceMQ && reduceMQ.matches);
  }

  function reflow(el) { return el && el.offsetWidth; }

  /* --- 文案 --------------------------------------------------------------- */

  function renderMeta(raw) {
    var parts = String(raw || '').split('|');
    metaText.textContent = '';
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) {
        var sep = document.createElement('span');
        sep.className = 'hero-meta-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '·';
        metaText.appendChild(sep);
      }
      metaText.appendChild(document.createTextNode(parts[i]));
    }
  }

  function writeCopy(slide) {
    titleText.textContent = slide.dataset.title || '';
    renderMeta(slide.dataset.meta);
    if (playBtn) {
      playBtn.dataset.memoryTitle = slide.dataset.memoryTitle || '';
      playBtn.dataset.memorySub = slide.dataset.memorySub || '';
      playBtn.dataset.memoryPhotos = slide.dataset.memoryPhotos || '';
      playBtn.setAttribute('aria-label', '播放回忆：' + (slide.dataset.memoryTitle || ''));
    }
  }

  function swapCopy(slide) {
    window.clearTimeout(swapTimer);
    if (reduced()) {
      writeCopy(slide);
      copy.classList.remove('is-out');
      copy.classList.add('is-in');
      return;
    }
    copy.classList.add('is-out');
    swapTimer = window.setTimeout(function () {
      writeCopy(slide);
      copy.classList.remove('is-in', 'is-out');
      reflow(copy);
      copy.classList.add('is-in');
    }, SWAP);
  }

  /* --- 指示器 ------------------------------------------------------------- */

  function resetFills(active) {
    for (var i = 0; i < dots.length; i++) {
      var fill = dots[i].querySelector('.hero-dot-fill');
      if (!fill) { continue; }
      if (i === active) { continue; }
      var running = fill.getAnimations ? fill.getAnimations() : [];
      for (var k = 0; k < running.length; k++) { try { running[k].cancel(); } catch (e) {} }
      fill.style.transform = 'scaleX(0)';
    }
    for (var d = 0; d < dots.length; d++) {
      dots[d].setAttribute('aria-current', d === active ? 'true' : 'false');
    }
  }

  function runProgress(i) {
    if (progress) { try { progress.cancel(); } catch (e) {} progress = null; }
    var fill = dots[i] && dots[i].querySelector('.hero-dot-fill');
    if (!fill) { return; }

    if (reduced() || typeof fill.animate !== 'function') {
      fill.style.transform = 'scaleX(1)';
      return;
    }
    fill.style.transform = '';
    progress = fill.animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: CYCLE, easing: 'linear', fill: 'forwards' }
    );
    progress.onfinish = function () { show(index + 1); };
    if (isPaused()) { progress.pause(); }
  }

  /* --- 切换 --------------------------------------------------------------- */

  function show(next) {
    var total = slides.length;
    next = ((next % total) + total) % total;

    var prev = slides[index];
    var cur = slides[next];
    if (cur === prev && cur.classList.contains('is-live')) {
      index = next;
      resetFills(index);
      runProgress(index);
      return;
    }

    cur.classList.remove('is-mute');
    cur.style.zIndex = String(++zTop);

    /* 重启这一层的推镜：换类不 reflow 的话动画不会从头走 */
    var img = cur.querySelector('.hero-img');
    if (img && !reduced()) {
      img.style.animation = 'none';
      reflow(img);
      img.style.animation = '';
    }

    window.requestAnimationFrame(function () { cur.classList.add('is-live'); });

    if (prev && prev !== cur) {
      window.clearTimeout(muteTimer);
      muteTimer = window.setTimeout(function () {
        /* 此刻新层已完全盖住旧层，熄灭与复位都看不见 */
        prev.classList.add('is-mute');
        prev.classList.remove('is-live');
        window.requestAnimationFrame(function () { prev.classList.remove('is-mute'); });
      }, FADE + 40);
    }

    index = next;
    swapCopy(cur);
    resetFills(index);
    runProgress(index);
  }

  /* --- 暂停与恢复 --------------------------------------------------------- */

  function isPaused() { return hoverPaused || focusPaused || hiddenPaused; }

  function sync() {
    var paused = isPaused();
    root.classList.toggle('is-paused', paused);
    if (!progress) { return; }
    try { paused ? progress.pause() : progress.play(); } catch (e) {}
  }

  if (!hoverMQ || hoverMQ.matches) {
    root.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') { return; }
      hoverPaused = true;
      sync();
    });
    root.addEventListener('pointerleave', function () {
      hoverPaused = false;
      sync();
    });
  }

  root.addEventListener('focusin', function () { focusPaused = true; sync(); });
  root.addEventListener('focusout', function () {
    if (!root.contains(document.activeElement)) { focusPaused = false; sync(); }
  });

  document.addEventListener('visibilitychange', function () {
    hiddenPaused = document.hidden;
    sync();
  });

  /* 视口外不空转：hero 滚出屏幕后停下 */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var vis = entries[0] && entries[0].isIntersecting;
      hiddenPaused = !vis || document.hidden;
      sync();
    }, { threshold: 0.12 });
    io.observe(root);
  }

  /* --- 交互 --------------------------------------------------------------- */

  for (var i = 0; i < dots.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        show(parseInt(btn.dataset.index, 10) || 0);
      });
    })(dots[i]);
  }

  if (dotsBox) {
    dotsBox.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
      e.preventDefault();
      var step = e.key === 'ArrowRight' ? 1 : -1;
      show(index + step);
      if (dots[index]) { dots[index].focus(); }
    });
  }

  if (scrollBtn) {
    scrollBtn.addEventListener('click', function () {
      var y = root.getBoundingClientRect().bottom + (window.scrollY || window.pageYOffset || 0);
      window.scrollTo({ top: Math.round(y), behavior: reduced() ? 'auto' : 'smooth' });
    });
  }

  /* --- 起步 --------------------------------------------------------------- */

  var first = slides[0];
  first.style.zIndex = String(zTop);
  writeCopy(first);
  resetFills(0);

  window.requestAnimationFrame(function () {
    copy.classList.remove('is-in');
    reflow(copy);
    copy.classList.add('is-in');
    runProgress(0);
    sync();
  });
}
