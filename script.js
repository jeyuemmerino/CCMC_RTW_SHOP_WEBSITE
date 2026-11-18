// Promotional slider
const slides = Array.from(document.querySelectorAll(".hero-slide"));
const dots = Array.from(document.querySelectorAll(".slider-dot"));
const searchInput = document.querySelector("#product-search");
const productCards = Array.from(document.querySelectorAll(".product-card"));
const cart = new Map();
const pageSections = {
  home: document.querySelector("#home"),
  shop: document.querySelector("#shop"),
  categories: document.querySelector("#categories"),
  about: document.querySelector("#about"),
  contact: document.querySelector("#contact")
};
const supplementalSections = [document.querySelector(".quick-points")];
const siteFooter = document.querySelector(".site-footer");
const navigationLinks = Array.from(document.querySelectorAll(".desktop-nav a, .mobile-nav a"));
let activeSlide = 0;
let slideTimer;
let toastTimer;

function showSection(sectionName, scrollToTop = false) {
  const activeSection = pageSections[sectionName] ? sectionName : "home";
  Object.entries(pageSections).forEach(([name, section]) => {
    section.hidden = name !== activeSection;
  });
  supplementalSections.forEach((section) => { section.hidden = true; });
  siteFooter.hidden = activeSection === "home";
  navigationLinks.forEach((link) => {
    if (link.hash === `#${activeSection}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href^='#']");
  if (!link || !document.contains(link)) return;
  const sectionName = link.hash.slice(1);
  if (!pageSections[sectionName]) return;

  event.preventDefault();
  if (window.location.hash !== `#${sectionName}`) {
    window.history.pushState({ section: sectionName }, "", `#${sectionName}`);
  }
  showSection(sectionName, true);
});
window.addEventListener("popstate", () => showSection(window.location.hash.slice(1), true));
window.addEventListener("hashchange", () => showSection(window.location.hash.slice(1), true));
showSection(window.location.hash.slice(1));

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, position) => {
    const active = position === activeSlide;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    dots[position].classList.toggle("is-active", active);
    if (active) dots[position].setAttribute("aria-current", "true");
    else dots[position].removeAttribute("aria-current");
  });
}

function startSlider() {
  window.clearInterval(slideTimer);
  slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 6500);
}

document.querySelector(".slider-prev").addEventListener("click", () => {
  showSlide(activeSlide - 1);
  startSlider();
});
document.querySelector(".slider-next").addEventListener("click", () => {
  showSlide(activeSlide + 1);
  startSlider();
});
dots.forEach((dot, index) => dot.addEventListener("click", () => {
  showSlide(index);
  startSlider();
}));
document.querySelector(".hero").addEventListener("mouseenter", () => window.clearInterval(slideTimer));
document.querySelector(".hero").addEventListener("mouseleave", startSlider);
document.querySelector(".hero").addEventListener("focusin", () => window.clearInterval(slideTimer));
document.querySelector(".hero").addEventListener("focusout", startSlider);
startSlider();

// Cart state is kept in memory for this front-end homepage demo.
const cartDrawer = document.querySelector(".cart-drawer");
const drawerBackdrop = document.querySelector(".drawer-backdrop");
const toast = document.querySelector(".toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function cartQuantity() {
  return Array.from(cart.values()).reduce((total, item) => total + item.quantity, 0);
}

function renderCart() {
  const quantity = cartQuantity();
  document.querySelector(".cart-count").textContent = quantity;
  document.querySelector(".cart-button").setAttribute("aria-label", `Open shopping bag, ${quantity} ${quantity === 1 ? "item" : "items"}`);
  document.querySelector(".drawer-count").textContent = `(${quantity})`;
  const items = document.querySelector(".cart-items");
  items.replaceChildren();
  let subtotal = 0;

  cart.forEach((item, name) => {
    subtotal += item.price * item.quantity;
    const row = document.createElement("div");
    row.className = "cart-item";
    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = name;
    const price = document.createElement("p");
    price.textContent = `₱${item.price.toLocaleString("en-PH")} each`;
    details.append(title, price);

    const controls = document.createElement("div");
    controls.className = "quantity-control";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${name}`);
    decrease.addEventListener("click", () => changeQuantity(name, -1));
    const amount = document.createElement("span");
    amount.textContent = item.quantity;
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${name}`);
    increase.addEventListener("click", () => changeQuantity(name, 1));
    controls.append(decrease, amount, increase);
    row.append(details, controls);
    items.append(row);
  });

  document.querySelector(".cart-empty").hidden = quantity > 0;
  document.querySelector(".cart-footer").hidden = quantity === 0;
  document.querySelector(".cart-subtotal strong").textContent = `₱${subtotal.toLocaleString("en-PH")}`;
}

function changeQuantity(name, amount) {
  const item = cart.get(name);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart.delete(name);
  renderCart();
}

function addToCart(name, price) {
  const item = cart.get(name);
  if (item) item.quantity += 1;
  else cart.set(name, { price, quantity: 1 });
  renderCart();
  showToast(`${name} added to your cart`);
}

document.querySelectorAll(".add-to-cart, .quick-add").forEach((button) => {
  button.addEventListener("click", () => {
    const addButton = button.closest(".product-card").querySelector(".add-to-cart");
    addToCart(addButton.dataset.product, Number(addButton.dataset.price));
  });
});

function openCart() {
  cartDrawer.classList.add("is-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  drawerBackdrop.hidden = false;
  requestAnimationFrame(() => drawerBackdrop.classList.add("is-visible"));
  document.body.classList.add("no-scroll");
  document.querySelector(".close-cart").focus();
}

function closeCart() {
  cartDrawer.classList.remove("is-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  drawerBackdrop.classList.remove("is-visible");
  document.body.classList.remove("no-scroll");
  window.setTimeout(() => { drawerBackdrop.hidden = true; }, 250);
  document.querySelector(".cart-button").focus();
}

document.querySelector(".cart-button").addEventListener("click", openCart);
document.querySelector(".close-cart").addEventListener("click", closeCart);
document.querySelector(".continue-shopping").addEventListener("click", closeCart);
drawerBackdrop.addEventListener("click", closeCart);
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (cartDrawer.classList.contains("is-open")) closeCart();
  else if (searchForm.classList.contains("is-open")) {
    searchForm.classList.remove("is-open");
    searchToggle.setAttribute("aria-label", "Show search");
    searchToggle.focus();
  }
});
document.querySelector(".checkout-button").addEventListener("click", () => showToast("Checkout is a demo. Thanks for shopping CCMC!"));

// Search and category links share the same product filtering behavior.
function filterProducts() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;
  productCards.forEach((card) => {
    const matches = !query || `${card.dataset.name} ${card.dataset.category}`.toLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  document.querySelector(".results-count").textContent = query
    ? `Showing ${visibleCount} ${visibleCount === 1 ? "style" : "styles"} for “${searchInput.value.trim()}”`
    : "Our everyday favorites";
  document.querySelector(".empty-state").hidden = visibleCount > 0;
  document.querySelector(".clear-filter").hidden = !query;
}

searchInput.addEventListener("input", filterProducts);
document.querySelector(".search-form").addEventListener("submit", (event) => event.preventDefault());
document.querySelector(".clear-filter").addEventListener("click", () => {
  searchInput.value = "";
  filterProducts();
  searchInput.focus();
});

function selectCategory(category) {
  searchInput.value = category;
  filterProducts();
}

document.querySelectorAll("[data-category-link]").forEach((link) => {
  link.addEventListener("click", () => selectCategory(link.dataset.categoryLink));
});
document.querySelectorAll("[data-footer-category]").forEach((link) => {
  link.addEventListener("click", () => selectCategory(link.dataset.footerCategory));
});

// Mobile menu and search controls
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const searchForm = document.querySelector(".search-form");
const searchToggle = document.querySelector(".search-toggle");

menuToggle.addEventListener("click", () => {
  const open = mobileNav.hidden;
  mobileNav.hidden = !open;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});
mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mobileNav.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Open menu");
}));
searchToggle.addEventListener("click", () => {
  if (window.matchMedia("(max-width: 700px)").matches) {
    const open = !searchForm.classList.contains("is-open");
    searchForm.classList.toggle("is-open", open);
    searchToggle.setAttribute("aria-label", open ? "Hide search" : "Show search");
    if (open) searchInput.focus();
  } else {
    searchInput.focus();
  }
});

document.querySelector(".account-button").addEventListener("click", () => showToast("Account features are not part of this homepage demo."));
document.querySelector("#current-year").textContent = new Date().getFullYear();
renderCart();
