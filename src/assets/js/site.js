// Beyond Senior Living — small progressive enhancements. Site works without JS.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function setNavTop() {
    if (header) document.documentElement.style.setProperty('--nav-top', header.getBoundingClientRect().bottom + 'px');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      setNavTop();
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('is-open', !open);
      document.body.style.overflow = open ? '' : 'hidden';
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1080 && nav.classList.contains('is-open')) toggle.click();
    });
  }

  // Submenus: click to toggle (mobile + keyboard), close others, Esc closes.
  var subToggles = document.querySelectorAll('.sub-toggle');
  subToggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      subToggles.forEach(function (b) { if (b !== btn) b.setAttribute('aria-expanded', 'false'); });
      btn.setAttribute('aria-expanded', String(!open));
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    subToggles.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (nav && nav.classList.contains('is-open')) { toggle.click(); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (window.innerWidth > 1080 && !e.target.closest('.has-sub')) subToggles.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
  });

  // Map facade: only load Google Maps when asked (keeps pages fast).
  document.querySelectorAll('[data-map-src]').forEach(function (box) {
    var btn = box.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = box.getAttribute('data-map-src');
      f.title = box.getAttribute('data-map-title') || 'Map';
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      box.appendChild(f);
      btn.remove();
    });
  });

  // Gallery lightbox
  var dlg = document.querySelector('.lightbox');
  if (dlg && typeof dlg.showModal === 'function') {
    var dImg = dlg.querySelector('img'), dCap = dlg.querySelector('p');
    document.querySelectorAll('[data-full]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var img = btn.querySelector('img');
        dImg.src = btn.getAttribute('data-full');
        dImg.alt = img ? img.alt : '';
        dCap.textContent = img ? img.alt : '';
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.lightbox__close')) dlg.close(); });
  }
})();
