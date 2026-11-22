const slides = Array.from(document.querySelectorAll(".hero-slide"));
const dots = Array.from(document.querySelectorAll(".slider-dot"));
const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
const searchForm = document.querySelector(".search-form");
const searchInput = document.querySelector("#product-search");
const searchToggle = document.querySelector(".search-toggle");
const currentYear = document.querySelector("#current-year");
let activeSlide = 0;
let slideTimer;

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

if (slides.length) {
  function showSlide(index) {
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      const active = position === activeSlide;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      if (dots[position]) {
        dots[position].classList.toggle("is-active", active);
        if (active) dots[position].setAttribute("aria-current", "true");
        else dots[position].removeAttribute("aria-current");
      }
    });
  }

  function startSlider() {
    window.clearInterval(slideTimer);
    slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 6500);
  }

  const hero = document.querySelector(".hero");
  const previous = document.querySelector(".slider-prev");
  const next = document.querySelector(".slider-next");
  if (previous) previous.addEventListener("click", () => {
    showSlide(activeSlide - 1);
    startSlider();
  });
  if (next) next.addEventListener("click", () => {
    showSlide(activeSlide + 1);
    startSlider();
  });
  dots.forEach((dot, index) => dot.addEventListener("click", () => {
    showSlide(index);
    startSlider();
  }));
  if (hero) {
    hero.addEventListener("mouseenter", () => window.clearInterval(slideTimer));
    hero.addEventListener("mouseleave", startSlider);
    hero.addEventListener("focusin", () => window.clearInterval(slideTimer));
    hero.addEventListener("focusout", startSlider);
  }
  startSlider();
}

const productCards = Array.from(document.querySelectorAll(".product-card"));
const pdModal = document.querySelector(".pd-modal");
const cartDrawer = document.querySelector(".cart-drawer");

if (productCards.length && pdModal && cartDrawer) {
  const cart = new Map();
  const maxQuantity = 10;
  const cartButton = document.querySelector(".cart-button");
  const drawerBackdrop = document.querySelector(".drawer-backdrop");
  const toast = document.querySelector(".toast");
  const searchResults = document.querySelector(".results-count");
  const clearFilter = document.querySelector(".clear-filter");
  const emptyState = document.querySelector(".empty-state");
  const pdImage = pdModal.querySelector(".pd-image");
  const pdCategory = pdModal.querySelector(".pd-category");
  const pdTitle = pdModal.querySelector(".pd-title");
  const pdPrice = pdModal.querySelector(".pd-price");
  const pdDescription = pdModal.querySelector(".pd-description");
  const pdError = pdModal.querySelector(".pd-error");
  const pdQtyValue = pdModal.querySelector(".pd-qty-value");
  const pdSizeInputs = Array.from(pdModal.querySelectorAll("input[name='pd-size']"));
  const searchParams = new URLSearchParams(window.location.search);
  let categoryFilter = searchParams.get("category") || "";
  let searchQuery = searchParams.get("q") || "";
  let toastTimer;
  let pdProduct = null;
  let pdQuantity = 1;
  let pdLastFocus = null;

  if (searchInput) searchInput.value = searchQuery;

  function showToast(message) {
    if (!toast) return;
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
    cartButton.setAttribute("aria-label", `Open shopping bag, ${quantity} ${quantity === 1 ? "item" : "items"}`);
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
    item.quantity = Math.min(item.quantity + amount, maxQuantity);
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
    if (item) item.quantity = Math.min(item.quantity + quantity, maxQuantity);
    else cart.set(key, { name, size, price, image, quantity });
    renderCart();
    showToast(`${name} (${size}) added to your cart`);
  }

  const productDescriptions = {
    "CCMC Essential Tee": "A soft, easy everyday tee with a regular fit. Comfortable enough for errands, weekends, and everything in between.",
    "Active Dry-Fit Shirt": "A lightweight shirt made for training days. Designed to keep you comfortable while you move.",
    "Weekend Utility Shorts": "Easy-wearing shorts with an everyday comfort cut, great for weekends, casual days, and light workouts.",
    "Everyday Jogger Pants": "Comfortable jogger pants with a tapered fit, made for rest days, errands, and easy everyday wear.",
    "Classic Zip Jacket": "A lightweight zip jacket that is easy to layer over your favorite tee on cooler days or after your workout.",
    "Relaxed Graphic Tee": "A relaxed-fit tee with a casual streetwear look, made for comfortable all-day wear."
  };

  function setPdQuantity(value) {
    pdQuantity = Math.min(Math.max(value, 1), maxQuantity);
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
    pdDescription.textContent = productDescriptions[pdProduct.name] || "A comfortable everyday favorite from CCMC RTW Shop.";
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
    cartButton.focus();
  }

  cartButton.addEventListener("click", openCart);
  document.querySelector(".close-cart").addEventListener("click", closeCart);
  document.querySelector(".continue-shopping").addEventListener("click", closeCart);
  drawerBackdrop.addEventListener("click", closeCart);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && cartDrawer.classList.contains("is-open")) closeCart();
    if (event.key === "Escape" && searchForm && searchForm.classList.contains("is-open")) {
      searchForm.classList.remove("is-open");
      searchToggle.setAttribute("aria-label", "Show search");
      searchToggle.focus();
    }
  });
  document.querySelector(".checkout-button").addEventListener("click", () => showToast("Checkout is a demo. Thanks for shopping CCMC!"));

  function filterProducts() {
    const query = searchQuery.trim().toLowerCase();
    const category = categoryFilter.trim().toLowerCase();
    let visibleCount = 0;
    productCards.forEach((card) => {
      const matchesCategory = !category || card.dataset.category.toLowerCase() === category;
      const matchesQuery = !query || `${card.dataset.name} ${card.dataset.category}`.toLowerCase().includes(query);
      card.hidden = !(matchesCategory && matchesQuery);
      if (!card.hidden) visibleCount += 1;
    });

    let description = categoryFilter ? ` in ${categoryFilter}` : "";
    if (searchQuery) description += ` matching “${searchQuery}”`;
    searchResults.textContent = categoryFilter || searchQuery
      ? `Showing ${visibleCount} ${visibleCount === 1 ? "style" : "styles"}${description}`
      : "Our everyday favorites";
    emptyState.hidden = visibleCount > 0;
    clearFilter.hidden = !categoryFilter && !searchQuery;
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      searchQuery = searchInput.value.trim();
      filterProducts();
    });
  }
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      searchQuery = searchInput.value.trim();
      filterProducts();
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (searchQuery) params.set("q", searchQuery);
      const queryString = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${queryString ? `?${queryString}` : ""}`);
    });
  }
  clearFilter.addEventListener("click", () => {
    categoryFilter = "";
    searchQuery = "";
    searchInput.value = "";
    filterProducts();
    window.history.replaceState(null, "", window.location.pathname);
    searchInput.focus();
  });

  renderCart();
  filterProducts();
} else if (document.querySelector(".cart-button")) {
  document.querySelector(".cart-button").addEventListener("click", () => {
    window.location.href = "collection.html";
  });
}
