const slides = Array.from(document.querySelectorAll(".hero-slide"));
const dots = Array.from(document.querySelectorAll(".slider-dot"));
let activeSlide = 0;
let slideTimer;

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
