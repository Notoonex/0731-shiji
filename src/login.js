/* ===========================================================================
   account · 账户菜单（本机账号，无外部登录）
   =========================================================================== */
function initLogin() {
  var menu = document.getElementById('lg-menu');
  var anchor = document.getElementById('sh-me');
  if (!menu || !anchor) { return; }
  var open = false;

  function show() {
    var r = anchor.getBoundingClientRect();
    menu.hidden = false;
    open = true;
    var w = menu.offsetWidth || 262;
    menu.style.left = Math.max(12, Math.min(r.right - w, window.innerWidth - w - 12)) + 'px';
    menu.style.top = (r.bottom + 10) + 'px';
    anchor.setAttribute('aria-expanded', 'true');
  }

  function hide() {
    if (!open) { return; }
    menu.hidden = true;
    open = false;
    anchor.setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('#sh-me')) {
      e.preventDefault();
      if (open) { hide(); } else { show(); }
      return;
    }
    if (open && !menu.contains(e.target)) { hide(); }
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.lg-menu__row')) { hide(); }
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hide(); } });
  window.addEventListener('resize', hide, { passive: true });
  window.addEventListener('scroll', hide, { passive: true });
}
