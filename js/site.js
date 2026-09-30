(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var hero = document.querySelector('.hero');
  var progress = document.querySelector('.progress-line');
  var links = Array.from(document.querySelectorAll('.chapter-nav a'));
  var chapters = links.map(function (link) {
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);
  var buttons = document.querySelectorAll('.fragment-toggle');

  // Collapsed content is removed from both the tab order and accessibility tree.
  buttons.forEach(function (button) {
    var detail = document.getElementById(button.getAttribute('aria-controls'));
    if (!detail) return;
    button.disabled = false;
    button.setAttribute('aria-expanded', 'false');
    detail.inert = true;
    detail.setAttribute('aria-hidden', 'true');
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open));
      button.classList.toggle('is-open', open);
      detail.classList.toggle('is-open', open);
      detail.inert = !open;
      detail.setAttribute('aria-hidden', String(!open));
      scheduleUpdate();
    });
  });
  root.classList.add('js-ready');

  var revealSelector = '.name-block, .tagline, .profile-overview, .zone, .chapter, .cluster, .breath, .fragment';
  var revealElements = document.querySelectorAll(revealSelector);
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -32px 0px' });
    revealElements.forEach(function (element) { observer.observe(element); });
  } else {
    revealElements.forEach(function (element) { element.classList.add('is-visible'); });
  }

  // Focus and direct chapter links should never wait for a reveal.
  function revealAncestors(element) {
    while (element && element !== root) {
      if (element.matches(revealSelector)) element.classList.add('is-visible');
      element = element.parentElement;
    }
  }
  document.addEventListener('focusin', function (event) { revealAncestors(event.target); });
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      revealAncestors(target);
      target.querySelectorAll(revealSelector).forEach(function (element) {
        element.classList.add('is-visible');
      });
    });
  });

  var ticking = false;
  var current = -1;
  var reading = false;
  var offsets = [];
  var heroHeight = 0;
  var scrollRange = 0;

  function measure() {
    offsets = chapters.map(function (chapter) {
      var heading = chapter.querySelector('.name-block, .zone-head, .chapter-sub') || chapter;
      return heading.getBoundingClientRect().top + window.scrollY;
    });
    heroHeight = hero ? hero.offsetHeight : 0;
    scrollRange = Math.max(0, root.scrollHeight - window.innerHeight);
    scheduleUpdate();
  }
  function update() {
    var y = window.scrollY;
    var isReading = y > heroHeight * 0.65;
    if (isReading !== reading) {
      reading = isReading;
      root.classList.toggle('is-reading', reading);
    }
    if (hero) hero.classList.toggle('has-scrolled', y > 80);
    if (progress) progress.style.setProperty('--progress', scrollRange > 0 ? Math.min(1, y / scrollRange) : 0);
    var active = 0;
    var line = y + Math.min(window.innerHeight * 0.3, 220);
    offsets.forEach(function (offset, index) { if (offset <= line) active = index; });
    if (y >= scrollRange - 4 && scrollRange > 0) active = links.length - 1;
    if (active !== current) {
      current = active;
      links.forEach(function (link, index) {
        if (index === active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    ticking = false;
  }
  function scheduleUpdate() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  if ('ResizeObserver' in window) {
    new ResizeObserver(measure).observe(document.body);
  } else {
    document.addEventListener('transitionend', measure);
    window.addEventListener('load', measure);
  }
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
})();
