// header.js — global header injected on every page
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  header.id = 'header';
  header.innerHTML = `
    <div class="header-content">
      <a href="index.html" class="header-brand">
        <h1>Head Gone By Noise</h1>
      </a>
      <span class="header-page-title"></span>
      <nav>
        <ul>
          <li>
            <a href="writing.html" class="image-button">
              <img src="images/comp2.png" alt="Writing" data-full="100" data-min="50">
            </a>
          </li>
          <li>
            <a href="contact.html" class="nav-text-btn">Contact</a>
          </li>
        </ul>
      </nav>
    </div>
  `;

  // Set initial image sizes
  header.querySelectorAll('.image-button img').forEach(img => {
    img.style.width = img.dataset.full + 'px';
    img.style.height = 'auto';
  });

  // Shrink header on scroll
  window.addEventListener('scroll', function () {
    const scrolled = document.documentElement.scrollTop > 50;
    header.classList.toggle('minimized', scrolled);
    header.querySelectorAll('.image-button img').forEach(img => {
      img.style.width = (scrolled ? img.dataset.min : img.dataset.full) + 'px';
    });
  });

  // Mirror the page's own <h1> (if it has one) into the header, centered,
  // so the title stays visible while scrolling since the header is fixed.
  document.addEventListener('DOMContentLoaded', function () {
    const pageH1 = document.querySelector('.thinking-page > h1');
    if (!pageH1) return;
    header.querySelector('.header-page-title').textContent = pageH1.textContent;
  });
})();
