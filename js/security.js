// SECURITY & HIDDEN ADMIN SHORTCUTS
document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
  // Deshabilitar inspección directa
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    (e.ctrlKey && e.key === 'U')
  ) {
    e.preventDefault();
  }

  // Atajo secreto de administración: Ctrl + Shift + A
  if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
    e.preventDefault();
    window.location.href = 'admin.html';
  }
});

// Atajo por triple clic en el logo de la marca
document.addEventListener('DOMContentLoaded', () => {
  const brandLogos = document.querySelectorAll('.navbar-brand');
  brandLogos.forEach(logo => {
    let clickCount = 0;
    let clickTimer = null;
    logo.addEventListener('click', (e) => {
      clickCount++;
      if (clickCount === 3) {
        e.preventDefault();
        window.location.href = 'admin.html';
        clickCount = 0;
      }
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
    });
  });
});

