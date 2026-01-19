/* ===============================
   CORE – WSPÓLNE FUNKCJE
=============================== */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  setFooterYear();
});

/* ===== MOBILE MENU ===== */
function initMobileMenu() {
  const header = document.querySelector(".header");
  const toggle = document.querySelector(".header__toggle");
  const navLinks = document.querySelectorAll(".header__nav a");

  if (!header || !toggle) return;

  toggle.addEventListener("click", toggleMenu);

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu();
    });
  });
}

function toggleMenu() {
  const header = document.querySelector(".header");
  const toggle = document.querySelector(".header__toggle");

  if (!header || !toggle) return;

  const isOpen = header.classList.toggle("header--open");
  toggle.setAttribute("aria-expanded", isOpen);
  document.body.classList.toggle("menu-open", isOpen);
}

function closeMenu() {
  const header = document.querySelector(".header");
  const toggle = document.querySelector(".header__toggle");

  header?.classList.remove("header--open");
  toggle?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

/* ===== FOOTER YEAR ===== */
function setFooterYear() {
  const yearSpan = document.getElementById("current-year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
}
