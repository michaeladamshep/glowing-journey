// footer.js — global footer injected on every page
(function () {
  const footer = document.querySelector('footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-left">
        <a href="index.html" class="footer-brand">Head Gone Wrong by Noise</a>
      </div>
      <div class="footer-center">
        <nav class="footer-nav">
          <a href="Solodyn.html">Solodyn</a>
          <a href="applemusic.html">Apple Music</a>
          <a href="writing.html">Writing</a>
          <a href="thinking.html">Thinking Out Loud</a>
          <a href="misc.html">MISC</a>
          <a href="contact.html">Contact</a>
        </nav>
      </div>
      <div class="footer-right">
        <span class="footer-copy">&copy; ${new Date().getFullYear()} Head Gone Wrong by Noise</span>
      </div>
    </div>
  `;
})();
