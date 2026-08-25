// header.js — global header + sidebar nav injected on every page
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  header.id = 'header';
  header.innerHTML = `
    <div class="header-content">
      <div class="header-top-row">
        <button class="header-menu-toggle" id="menu-toggle" aria-label="Open menu" aria-expanded="false">
          Head Gone By Noise
        </button>
      </div>
      <h1 class="header-page-title"></h1>
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
    <aside class="sidebar" id="sidebar">
      <button class="sidebar-close" id="sidebar-close" aria-label="Close menu">&times;</button>
      <nav class="sidebar-nav">
        <ul>
          <li><a href="index.html">Home</a></li>
          <li>
            <a href="writing.html" class="image-button">
              <img src="images/comp2.png" alt="Writing">
            </a>
          </li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </nav>
    </aside>
  `);

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggle = document.getElementById('menu-toggle');
  const closeBtn = document.getElementById('sidebar-close');

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
  });
  closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebar();
  });

  // Shrink header on scroll
  window.addEventListener('scroll', function () {
    header.classList.toggle('minimized', document.documentElement.scrollTop > 50);
  });

  // Pages that define PAGE_TITLE get it as a second row in the header,
  // centered, so it stays visible while scrolling (the header is fixed)
  // without also duplicating a heading in the page body. Deferred to
  // DOMContentLoaded since PAGE_TITLE is declared in a later inline
  // <script>.
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof PAGE_TITLE === 'undefined') return;
    header.classList.add('has-title');
    header.querySelector('.header-page-title').textContent = PAGE_TITLE;
  });
})();
