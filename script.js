const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#product-search");
const searchToggle = document.querySelector(".search-toggle");
const currentYear = document.querySelector("#current-year");

if (currentYear) currentYear.textContent = new Date().getFullYear();

document.querySelectorAll("nav a[href]").forEach((link) => {
  const linkPage = new URL(link.href, window.location.href).pathname.split("/").pop();
  const currentPage = window.location.pathname.split("/").pop() || "home.html";
  if (linkPage === currentPage) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
});

if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const open = mobileNav.hidden;
    mobileNav.hidden = !open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
    });
  });
} else if (menuToggle) {
  const legacyNav = document.querySelector(".nav-links");
  if (legacyNav) {
    menuToggle.addEventListener("click", () => {
      const open = legacyNav.classList.toggle("active");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });
    legacyNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        legacyNav.classList.remove("active");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
      });
    });
  }
}

if (searchToggle && searchInput) {
  searchToggle.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 768px)").matches && searchForm) {
      const open = !searchForm.classList.contains("is-open");
      searchForm.classList.toggle("is-open", open);
      searchToggle.setAttribute("aria-label", open ? "Hide search" : "Show search");
      if (open) searchInput.focus();
    } else {
      searchInput.focus();
    }
  });
}

const cartButton = document.querySelector(".cart-button");
if (cartButton && !document.querySelector(".cart-drawer")) {
  cartButton.addEventListener("click", () => {
    window.location.href = "collection.html";
  });
}
