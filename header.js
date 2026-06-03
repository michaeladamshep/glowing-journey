// header.js — global header injected on every page
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  header.id = 'header';
  header.innerHTML = `
    <div class="header-content">
      <a href="index.html" class="header-brand">
        <svg class="karenin-logo" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 20 Q4 9 10 6 Q15 4 15 15" fill="#1c1c1e"/>
          <path d="M29 20 Q32 9 26 6 Q21 4 21 15" fill="#1c1c1e"/>
          <circle cx="18" cy="21" r="12" fill="#1c1c1e"/>
          <ellipse cx="18" cy="26" rx="6" ry="4" fill="#2c2c2e"/>
          <ellipse cx="18" cy="23.5" rx="2.8" ry="1.8" fill="#0a0a0a"/>
          <circle cx="13.5" cy="19" r="1.8" fill="white" opacity="0.65"/>
          <circle cx="22.5" cy="19" r="1.8" fill="white" opacity="0.65"/>
        </svg>
        <h1>Head Gone Wrong by Noise</h1>
      </a>
      <nav>
        <ul>
          <li>
            <a href="Solodyn.html" class="image-button">
              <img src="images/7397-removebg-preview.png" alt="Solodyn" data-full="100" data-min="50">
            </a>
          </li>
          <li>
            <a href="applemusic.html" class="image-button">
              <img src="images/apple-music-icon.png" alt="Apple Music" data-full="75" data-min="40">
            </a>
          </li>
          <li>
            <a href="writing.html" class="image-button">
              <img src="images/comp2.png" alt="Writing" data-full="100" data-min="50">
            </a>
          </li>
          <li>
            <a href="misc.html" class="image-button">
              <img src="images/MISC_Group_Logo_2023.png" alt="MISC" data-full="100" data-min="50">
            </a>
          </li>
          <li>
            <a href="contact.html" class="image-button">
              <img src="images/contact.png" alt="Contact" data-full="100" data-min="50">
            </a>
          </li>
          <li><a href="lol.html" class="nav-text-btn">LoL</a></li>
          <li><a href="catchphrase.html" class="nav-text-btn">Catchphrase</a></li>
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
})();
