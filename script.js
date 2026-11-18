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
  siteFooter.hidden = false;
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

const PRODUCT_INFO = {
  "CCMC Essential Tee": "A soft, easy everyday tee with a regular fit. Comfortable enough for errands, weekends, and everything in between.",
  "Active Dry-Fit Shirt": "A lightweight shirt made for training days. Designed to keep you comfortable while you move.",
  "Weekend Utility Shorts": "Easy-wearing shorts with an everyday comfort cut, great for weekends, casual days, and light workouts.",
  "Everyday Jogger Pants": "Comfortable jogger pants with a tapered fit, made for rest days, errands, and easy everyday wear.",
  "Classic Zip Jacket": "A lightweight zip jacket that is easy to layer over your favorite tee on cooler days or after your workout.",
  "Relaxed Graphic Tee": "A relaxed-fit tee with a casual streetwear look, made for comfortable all-day wear."
};
const MAX_QTY = 10;

function renderCart() {
  const quantity = cartQuantity();
  document.querySelector(".cart-count").textContent = quantity;
  document.querySelector(".cart-button").setAttribute("aria-label", `Open shopping bag, ${quantity} ${quantity === 1 ? "item" : "items"}`);
  document.querySelector(".drawer-count").textContent = `(${quantity})`;
  const items = document.querySelector(".cart-items");
  items.replaceChildren();
  let subtotal = 0;

  cart.forEach((item, key) => {
    subtotal += item.price * item.quantity;
    const row = document.createElement("div");
    row.className = "cart-item";

    const thumb = document.createElement("img");
    thumb.className = "cart-item-image";
    thumb.src = item.image;
    thumb.alt = "";

    const details = document.createElement("div");
    details.className = "cart-item-info";
    const title = document.createElement("h3");
    title.textContent = item.name;
    const meta = document.createElement("p");
    meta.textContent = `Size ${item.size} · ₱${item.price.toLocaleString("en-PH")} each`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cart-remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${item.name}, size ${item.size}, from cart`);
    remove.addEventListener("click", () => removeFromCart(key));
    details.append(title, meta, remove);

    const controls = document.createElement("div");
    controls.className = "quantity-control";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${item.name}, size ${item.size}`);
    decrease.addEventListener("click", () => changeQuantity(key, -1));
    const amount = document.createElement("span");
    amount.textContent = item.quantity;
    const increase = document.createElement("button");
    increase.type = "button";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${item.name}, size ${item.size}`);
    increase.addEventListener("click", () => changeQuantity(key, 1));
    controls.append(decrease, amount, increase);

    row.append(thumb, details, controls);
    items.append(row);
  });

  document.querySelector(".cart-empty").hidden = quantity > 0;
  document.querySelector(".cart-footer").hidden = quantity === 0;
  document.querySelector(".cart-subtotal strong").textContent = `₱${subtotal.toLocaleString("en-PH")}`;
}

function changeQuantity(key, amount) {
  const item = cart.get(key);
  if (!item) return;
  item.quantity = Math.min(item.quantity + amount, MAX_QTY);
  if (item.quantity <= 0) cart.delete(key);
  renderCart();
}

function removeFromCart(key) {
  const item = cart.get(key);
  if (!item) return;
  cart.delete(key);
  renderCart();
  showToast(`${item.name} (${item.size}) removed from your cart`);
}

function addToCart(name, size, price, image, quantity) {
  const key = `${name} | ${size}`;
  const item = cart.get(key);
  if (item) item.quantity = Math.min(item.quantity + quantity, MAX_QTY);
  else cart.set(key, { name, size, price, image, quantity });
  renderCart();
  showToast(`${name} (${size}) added to your cart`);
}

const pdModal = document.querySelector(".pd-modal");
const pdImage = pdModal.querySelector(".pd-image");
const pdCategory = pdModal.querySelector(".pd-category");
const pdTitle = pdModal.querySelector(".pd-title");
const pdPrice = pdModal.querySelector(".pd-price");
const pdDescription = pdModal.querySelector(".pd-description");
const pdError = pdModal.querySelector(".pd-error");
const pdQtyValue = pdModal.querySelector(".pd-qty-value");
const pdSizeInputs = Array.from(pdModal.querySelectorAll("input[name='pd-size']"));
let pdProduct = null;
let pdQuantity = 1;
let pdLastFocus = null;

function setPdQuantity(value) {
  pdQuantity = Math.min(Math.max(value, 1), MAX_QTY);
  pdQtyValue.textContent = pdQuantity;
}

function openProductDetails(card) {
  const addButton = card.querySelector(".add-to-cart");
  const image = card.querySelector(".product-image img");
  pdProduct = {
    name: card.dataset.name,
    category: card.dataset.category,
    price: Number(addButton.dataset.price),
    image: image.src
  };
  pdImage.src = image.src;
  pdImage.alt = image.alt;
  pdCategory.textContent = pdProduct.category;
  pdTitle.textContent = pdProduct.name;
  pdPrice.textContent = `₱${pdProduct.price.toLocaleString("en-PH")}`;
  pdDescription.textContent = PRODUCT_INFO[pdProduct.name] || "A comfortable everyday favorite from CCMC RTW Shop.";
  pdSizeInputs.forEach((input) => { input.checked = false; });
  pdError.hidden = true;
  setPdQuantity(1);
  pdLastFocus = document.activeElement;
  pdModal.hidden = false;
  document.body.classList.add("no-scroll");
  pdModal.querySelector(".pd-close").focus();
}

function closeProductDetails() {
  pdModal.hidden = true;
  document.body.classList.remove("no-scroll");
  if (pdLastFocus) pdLastFocus.focus();
}

pdModal.querySelector(".pd-close").addEventListener("click", closeProductDetails);
pdModal.querySelector(".pd-backdrop").addEventListener("click", closeProductDetails);
pdModal.querySelector(".pd-qty-minus").addEventListener("click", () => setPdQuantity(pdQuantity - 1));
pdModal.querySelector(".pd-qty-plus").addEventListener("click", () => setPdQuantity(pdQuantity + 1));
pdSizeInputs.forEach((input) => input.addEventListener("change", () => { pdError.hidden = true; }));
pdModal.querySelector(".pd-add").addEventListener("click", () => {
  const selected = pdSizeInputs.find((input) => input.checked);
  if (!selected) {
    pdError.hidden = false;
    pdSizeInputs[0].focus();
    return;
  }
  addToCart(pdProduct.name, selected.value, pdProduct.price, pdProduct.image, pdQuantity);
  closeProductDetails();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !pdModal.hidden) closeProductDetails();
});

productCards.forEach((card) => {
  card.querySelectorAll(".product-image img, .product-details h3, .add-to-cart, .quick-add").forEach((element) => {
    element.addEventListener("click", () => openProductDetails(card));
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
