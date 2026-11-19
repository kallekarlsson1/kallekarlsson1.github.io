// Top bar: on the home page it appears once the big intro has scrolled away,
// and it underlines the section you are currently reading.
(function () {
  const nav = document.querySelector('.topnav');
  if (!nav) return;

  const heroNav = document.querySelector('.hero-nav');
  if (heroNav) {
    new IntersectionObserver(([e]) => nav.classList.toggle('shown', !e.isIntersecting)).observe(heroNav);
  } else {
    nav.classList.add('shown');
  }

  const links = [...nav.querySelectorAll('[data-section]')];
  const sections = links.map(a => document.getElementById(a.dataset.section)).filter(Boolean);
  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.dataset.section === e.target.id));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
})();
