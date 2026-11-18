(() => {
  const searchInput = document.querySelector("#catalog-search");
  const clearSearchButton = document.querySelector(".catalog-clear-search");
  const filterButtons = Array.from(document.querySelectorAll(".catalog-filter"));
  const productCards = Array.from(document.querySelectorAll(".catalog-product-card"));
  const resultsCount = document.querySelector(".catalog-results-count");
  const emptyState = document.querySelector(".catalog-empty-state");
  let selectedCategory = "all";

  function applyCatalogFilters() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    let visibleCount = 0;

    productCards.forEach((card) => {
      const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
      const matchesSearch = card.dataset.name.toLocaleLowerCase().includes(query);
      const isVisible = matchesCategory && matchesSearch;

      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    });

    resultsCount.textContent = `${visibleCount} ${visibleCount === 1 ? "product" : "products"}`;
    emptyState.hidden = visibleCount > 0;
    clearSearchButton.hidden = searchInput.value.length === 0;
  }

  function showImageFallback(image) {
    const fallback = image.parentElement.querySelector(".catalog-image-fallback");
    image.hidden = true;
    fallback.hidden = false;
  }

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      selectedCategory = button.dataset.category;
      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });
      applyCatalogFilters();
    });
  });

  searchInput.addEventListener("input", applyCatalogFilters);
  clearSearchButton.addEventListener("click", () => {
    searchInput.value = "";
    applyCatalogFilters();
    searchInput.focus();
  });

  document.querySelectorAll("[data-catalog-image]").forEach((image) => {
    image.addEventListener("error", () => showImageFallback(image), { once: true });

    if (image.complete && image.naturalWidth === 0) {
      showImageFallback(image);
    }
  });

  applyCatalogFilters();
})();
