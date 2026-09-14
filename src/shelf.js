/* =============================================================================
   时光 · shelf 模块初始化
   1) 这一年的这一天：年份切换（含舞台高度的平滑过渡 + 键盘 ←→ Home End）
   3) 语音卡波形：轻微呼吸动画（尊重 prefers-reduced-motion）
   外层统一调用 initShelf()，本文件不自动执行。
   ========================================================================== */

function initShelf() {
  'use strict';

  var root = document.querySelector('.sf-root');
  if (!root) { return; }

  var reduced = false;
  try {
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduced = false; }

  /* -------------------------------------------------------------------------
     1 · 这一年的这一天
     ---------------------------------------------------------------------- */

  var rail = document.getElementById('sf-otd-rail');
  var stage = document.getElementById('sf-otd-stage');

  if (rail && stage) {
    var tabs = Array.prototype.slice.call(rail.querySelectorAll('.sf-otd-node'));
    var panels = tabs.map(function (tab) {
      return document.getElementById(tab.getAttribute('aria-controls'));
    });

    var current = 0;
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute('aria-selected') === 'true') { current = i; }
    }

    var heightTimer = null;

    function clearStageHeight() {
      stage.style.height = '';
    }

    function selectYear(next, moveFocus) {
      if (next < 0 || next >= tabs.length) { return; }
      if (next === current) {
        if (moveFocus) { tabs[next].focus(); }
        return;
      }

      var fromPanel = panels[current];
      var toPanel = panels[next];
      var startH = stage.offsetHeight;

      tabs[current].setAttribute('aria-selected', 'false');
      tabs[current].setAttribute('tabindex', '-1');
      tabs[next].setAttribute('aria-selected', 'true');
      tabs[next].setAttribute('tabindex', '0');

      if (fromPanel) {
        fromPanel.hidden = true;
        fromPanel.classList.remove('is-active', 'is-anim');
      }
      if (toPanel) {
        toPanel.hidden = false;
        toPanel.classList.add('is-active');
        if (!reduced) {
          toPanel.classList.remove('is-anim');
          void toPanel.offsetWidth;
          toPanel.classList.add('is-anim');
        }
      }

      current = next;

      // 让年份节点保持在可视范围内（窄屏时轨道会横向滚动）
      if (tabs[next].scrollIntoView) {
        try {
          tabs[next].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        } catch (err) {
          tabs[next].scrollIntoView(false);
        }
      }

      if (moveFocus) { tabs[next].focus({ preventScroll: true }); }

      if (reduced) { clearStageHeight(); return; }

      // 高度过渡：先锁旧高度，下一帧给新高度，结束后交还给内容
      var endH = stage.scrollHeight;
      window.clearTimeout(heightTimer);
      stage.style.height = startH + 'px';
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          stage.style.height = endH + 'px';
        });
      });
      heightTimer = window.setTimeout(clearStageHeight, 620);
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { selectYear(index, false); });
      tab.addEventListener('keydown', function (ev) {
        var key = ev.key;
        if (key === 'ArrowRight' || key === 'ArrowDown') {
          ev.preventDefault();
          selectYear((index + 1) % tabs.length, true);
        } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
          ev.preventDefault();
          selectYear((index - 1 + tabs.length) % tabs.length, true);
        } else if (key === 'Home') {
          ev.preventDefault();
          selectYear(0, true);
        } else if (key === 'End') {
          ev.preventDefault();
          selectYear(tabs.length - 1, true);
        }
      });
    });

    // 窗口尺寸变化时，正在过渡的高度锁要及时释放
    window.addEventListener('resize', clearStageHeight);
  }

  /* -------------------------------------------------------------------------
     3 · 语音波形的轻微呼吸
     ---------------------------------------------------------------------- */

  var wave = document.getElementById('sf-wave');
  if (wave && !reduced) {
    var bars = wave.querySelectorAll('rect');
    for (var b = 0; b < bars.length; b++) {
      // 每 11 根一个循环，形成一道很慢的横向波，而不是整排一起跳
      bars[b].style.setProperty('--sf-i', String(b % 11));
    }

    var waveOn = function () { wave.classList.add('is-live'); };
    var waveOff = function () { wave.classList.remove('is-live'); };

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var k = 0; k < entries.length; k++) {
          if (entries[k].isIntersecting) { waveOn(); } else { waveOff(); }
        }
      }, { threshold: 0.2 });
      io.observe(wave);
    } else {
      waveOn();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { waveOff(); }
      else if ('IntersectionObserver' in window === false) { waveOn(); }
    });
  }
}
