/* ===============================
    GLOBAL CONFIG & STATE
  =============================== */
let heroSplideInstance = null;

const CONFIG = {
  paths: {
    hero: "./json/hero.json",
    specializations: "./json/specializations.json",
    realizations: "./json/realizations.json",
  },
  dom: {
    get heroTextContainer() {
      return document.getElementById("hero-text-container");
    },
    get heroSliderList() {
      return document.getElementById("hero-slider-list");
    },
    get portfolioGrid() {
      return document.getElementById("portfolio-grid");
    },
    get specializationsGrid() {
      return document.getElementById("specializations-grid");
    },
    get galleryView() {
      return document.getElementById("project-gallery-view");
    },
    get galleryContainer() {
      return document.getElementById("project-gallery");
    },
    get projectTitle() {
      return document.getElementById("project-title");
    },
    get backBtn() {
      return document.getElementById("back-to-projects");
    },
    get realizationsSection() {
      return document.getElementById("realizations-section");
    },
  },
};

let appState = {
  projects: [],
  specializations: [],
  isGalleryOpen: false,
};
appState.expandedDescriptions = new Set();
appState.autoCloseDescriptions = true;

/* ===============================
    INIT APP
  =============================== */
document.addEventListener("DOMContentLoaded", initApp);

function isMobile() {
  return window.matchMedia("(max-width: 768px)").matches;
}

async function initApp() {
  try {
    // HERO — pierwszy, ASAP
    const heroData = await fetchData(CONFIG.paths.hero);
    renderHero(heroData);

    // Reszta równolegle w tle
    const [specsData, projectsData] = await Promise.all([
      fetchData(CONFIG.paths.specializations),
      fetchData(CONFIG.paths.realizations),
    ]);

    appState.specializations = specsData;
    appState.projects = projectsData;

    renderSpecializations(specsData);
    renderPortfolio(projectsData);

    // Logika UI
    setupEventListeners();
    initScrollSpy();
    checkCookies();

    document.documentElement.classList.remove("no-js");

    // Bajery na końcu
    requestIdleCallback(() => {
      initAnimations();
    });
  } catch (error) {
    console.error("Critical Error initializing app:", error);
  }
}

/* ===============================
    DATA FETCHING
  =============================== */
async function fetchData(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
}

/* ===============================
    RENDERING FUNCTIONS
  =============================== */

function renderHero(data) {
  const list = CONFIG.dom.heroSliderList;
  if (!list || !data?.sliderImages?.length) return;

  const slidesHTML = data.sliderImages
    .slice(1)
    .map((img) => {
      const srcSet = getSrcSet(img.src);

      return `
        <li class="splide__slide">
          <figure class="gallery-item">
            <div class="gallery-image-container">
              <img
                src="${img.src.replace(".webp", "-md.webp")}"
                srcset="${srcSet}"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1920px"
                alt="${img.alt}"
                class="gallery-image"
                width="1365"
                height="2048"
                loading="lazy"
                decoding="async"
              />
            </div>

            <figcaption class="photo-caption">
              <p class="photo-caption__title">${img.caption}</p>
              <time class="photo-caption__date">${img.date}</time>
            </figcaption>
          </figure>
        </li>
      `;
    })
    .join("");

  list.insertAdjacentHTML("beforeend", slidesHTML);

  initHeroSlider();
}

// Renderowanie sekcji Specjalizacji (Górna)
function renderSpecializations(data) {
  const container = CONFIG.dom.specializationsGrid;
  if (!container) return;

  container.innerHTML = data
    .map(
      (item) => `
      <div class="category-card">
        <div class="category-image">
          <img src="${item.image.replace(".webp", "-sm.webp")}" alt="${item.title}" loading="lazy" />
        </div>
        <div class="category-content">
          <h3 class="category-title">${item.title}</h3>
          <p class="category-description">${item.description}</p>
          <button class="category-btn" data-category="${item.id}">
            ${item.btnText || "Wybierz"}
          </button>
        </div>
      </div>
    `,
    )
    .join("");
}

// Renderowanie sekcji Realizacji (Dolna)
function renderPortfolio(projects, filter = "all") {
  const container = CONFIG.dom.portfolioGrid;
  if (!container) return;
  container.innerHTML = "";

  const filteredProjects =
    filter === "all" ? projects : projects.filter((p) => p.category === filter);

  if (filteredProjects.length === 0) {
    container.innerHTML = `<p class="no-results">Brak realizacji w tej kategorii.</p>`;
    return;
  }

  const getCategoryName = (catId) => {
    const spec = appState.specializations.find((s) => s.id === catId);
    return spec ? spec.title : catId;
  };

  filteredProjects.forEach((project) => {
    const item = document.createElement("div");
    item.className = "portfolio-item animate";
    item.dataset.category = project.category;

    // ... wewnątrz pętli filteredProjects.forEach ...
    const mainImgSrc = project.basePath + project.mainImage;
    const srcSet = getSrcSet(project.basePath, project.mainImage);

    // sizes: Na mobile (do 768px) obraz ma 90-100% szerokości
    // Na desktopie (powyżej) obraz ma ok. 33% szerokości kontenera
    const sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";

    item.innerHTML = `
  <div class="portfolio-image">
    <img 
        src="${mainImgSrc.replace(".webp", "-lg.webp")}"
        srcset="${srcSet}"
        sizes="${sizes}"
        alt="${project.title}" 
        loading="lazy"
        width="800" height="600" 
    >
  </div>
  <div class="portfolio-content">
     <div class="portfolio-category">${getCategoryName(project.category)}</div>
    <h3 class="portfolio-title">${project.title}</h3>

    <div class="portfolio-description-container">
      <p class="portfolio-description clamp" id="desc-${project.id}" data-full-text="${project.shortDescription}">
        ${project.shortDescription}
      </p>
      <button class="desc-toggle" hidden aria-expanded="false" aria-controls="desc-${project.id}">
        Rozwiń opis
      </button>
    </div>

    <a href="#" class="portfolio-link" data-id="${project.id}">
      Zobacz więcej →
    </a>
  </div>
`;

    container.appendChild(item);
  });

  initAnimations();

  // ✅ TU
  initDescriptionToggles();
}

function initDescriptionToggles(container = document) {
  container
    .querySelectorAll(".portfolio-description-container")
    .forEach((wrapper) => {
      const desc = wrapper.querySelector(".portfolio-description");
      const toggle = wrapper.querySelector(".desc-toggle");

      if (!desc || !toggle) return;

      const id = desc.id;

      setTimeout(() => {
        const isOverflowing = isMobile()
          ? desc.scrollHeight > desc.clientHeight
          : desc.textContent.length > 120;

        if (!isOverflowing) {
          toggle.remove();
          return;
        }

        toggle.hidden = false;

        if (appState.expandedDescriptions.has(id)) {
          desc.classList.add("expanded");
          desc.classList.remove("clamp");
          toggle.textContent = "Zwiń";
          toggle.setAttribute("aria-expanded", "true");
        }

        toggle.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const expanded = desc.classList.toggle("expanded");
          desc.classList.toggle("clamp", !expanded);

          toggle.textContent = expanded ? "Zwiń" : "Rozwiń opis";
          toggle.setAttribute("aria-expanded", expanded);

          if (expanded) {
            appState.expandedDescriptions.add(id);
          } else {
            appState.expandedDescriptions.delete(id);
          }
        });
      }, 100); // Zwiększ do 100ms dla pewności
    });
}

function handleCategoryFilter(category) {
  // filtruj realizacje
  renderPortfolio(appState.projects, category);

  // opcjonalnie: jeśli galeria była otwarta – zamknij ją
  if (appState.isGalleryOpen) {
    returnToPortfolio();
  }
}

/* ===============================
    LOGIC & EVENTS
  =============================== */

function setupEventListeners() {
  // 1. Kliknięcia w Portfolio (Otwieranie projektu)
  CONFIG.dom.portfolioGrid.addEventListener("click", (e) => {
    const link = e.target.closest(".portfolio-link");
    if (!link) return;
    e.preventDefault();

    const project = appState.projects.find((p) => p.id === link.dataset.id);
    if (project) openProjectGallery(project);
  });

  // 2. Kliknięcia w Specjalizacje (Filtrowanie) - Event Delegation
  CONFIG.dom.specializationsGrid.addEventListener("click", (e) => {
    if (e.target.classList.contains("category-btn")) {
      const category = e.target.dataset.category;

      handleCategoryFilter(category);

      // Active states
      CONFIG.dom.specializationsGrid
        .querySelectorAll(".category-btn")
        .forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");

      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.filter === category);
      });

      // ✅ PEWNY SCROLL
      const section = CONFIG.dom.realizationsSection;
      if (section) {
        const y = section.getBoundingClientRect().top + window.pageYOffset - 80;

        window.scrollTo({
          top: y,
          behavior: "smooth",
        });
      }
    }
  });

  // 3. Filtry w menu (jeśli istnieją przyciski .filter-btn)
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      handleCategoryFilter(this.dataset.filter);
      // UI Update przycisków
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // 4. Powrót
  CONFIG.dom.backBtn.addEventListener("click", returnToPortfolio);

  document.addEventListener("keydown", (e) => {
    // ESC – zamknij wszystkie
    if (e.key === "Escape") {
      document
        .querySelectorAll(".portfolio-description.expanded")
        .forEach((desc) => {
          const toggle = desc
            .closest(".portfolio-content")
            .querySelector(".desc-toggle");

          desc.classList.remove("expanded");
          desc.classList.add("clamp");
          toggle.textContent = "Rozwiń opis";
          toggle.setAttribute("aria-expanded", "false");

          appState.expandedDescriptions.delete(desc.id);
        });
    }

    // Shift + E – rozwiń wszystkie
    if (e.shiftKey && e.key.toLowerCase() === "e") {
      expandAllDescriptions(CONFIG.dom.portfolioGrid);
    }
  });
}

function openProjectGallery(project) {
  appState.isGalleryOpen = true;
  CONFIG.dom.portfolioGrid.style.display = "none";
  CONFIG.dom.galleryView.style.display = "block";
  CONFIG.dom.projectTitle.textContent = project.title;
  CONFIG.dom.galleryContainer.innerHTML = "";

  // 1. Tablica do Lightboxa - używamy wersji LARGE (-lg.webp) dla jakości
  const lightboxImages = project.images.map((fileName) => {
    const cleanName = fileName.replace(/\.(webp|jpg|png|jpeg)$/i, "");
    return `${project.basePath}${cleanName}-lg.webp`;
  });

  project.images.forEach((fileName, index) => {
    // 2. Miniatury na stronie - responsywne
    const img = document.createElement("img");
    // Src fallback
    img.src = (project.basePath + fileName).replace(".webp", "-lg.webp");
    // Srcset dla wydajności
    img.srcset = getSrcSet(project.basePath, fileName);
    // Sizes: Galeria to pewnie siatka, np. 3 kolumny
    img.sizes = "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw";

    img.alt = `${project.title} - zdjęcie ${index + 1}`;
    img.className = "gallery-detail-image";
    img.loading = "lazy";

    // Kliknięcie otwiera lightbox z wersjami -lg
    img.addEventListener("click", () => openLightbox(index, lightboxImages));

    CONFIG.dom.galleryContainer.appendChild(img);
  });

  CONFIG.dom.galleryView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function returnToPortfolio() {
  appState.isGalleryOpen = false;
  CONFIG.dom.galleryView.style.display = "none";
  CONFIG.dom.portfolioGrid.style.display = "grid";
  CONFIG.dom.realizationsSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/* ===== LIGHTBOX Z NAWIGACJĄ (WCAG) - WERSJA FINALNA ===== */
function openLightbox(startIndex, images) {
  let currentIndex = startIndex;

  // 1. Struktura HTML
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Podgląd zdjęcia");

  // Ikony SVG
  const closeIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const leftIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>`;
  const rightIcon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`;

  lb.innerHTML = `
    <button class="lb-btn lb-close" aria-label="Zamknij galerię">
      ${closeIcon}
    </button>

    <div class="lb-counter" aria-live="polite"></div>

    <div class="lightbox-content">
      <button class="lb-btn lb-prev" aria-label="Poprzednie zdjęcie">
        ${leftIcon}
      </button>

      <img src="${images[currentIndex]}" alt="Powiększone zdjęcie">

      <button class="lb-btn lb-next" aria-label="Następne zdjęcie">
        ${rightIcon}
      </button>
    </div>
  `;

  document.body.appendChild(lb);

  // 2. Elementy DOM
  const imgEl = lb.querySelector("img");
  const closeBtn = lb.querySelector(".lb-close");
  const prevBtn = lb.querySelector(".lb-prev");
  const nextBtn = lb.querySelector(".lb-next");
  const counterEl = lb.querySelector(".lb-counter");
  const contentEl = lb.querySelector(".lightbox-content");

  const updateCounter = () => {
    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  };

  // 3. Funkcja zmiany zdjęcia
  const showImage = (index) => {
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;

    currentIndex = index;
    imgEl.src = images[currentIndex];
    updateCounter();
  };

  // 4. Funkcja zamykająca (sprząta eventy i usuwa element)
  function closeLb() {
    document.removeEventListener("keydown", handleKeydown);
    lb.remove();
    // Opcjonalnie: przywróć focus na element, który otworzył galerię (jeśli masz do niego referencję)
  }

  // 5. Obsługa zdarzeń (Mysz)
  closeBtn.addEventListener("click", closeLb);

  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showImage(currentIndex - 1);
  });

  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showImage(currentIndex + 1);
  });

  // Kliknięcie w tło zamyka (ale nie w zdjęcie)
  lb.addEventListener("click", (e) => {
    if (e.target === lb || e.target.classList.contains("lightbox-content")) {
      closeLb();
    }
  });

  // 6. Obsługa Klawiatury (WCAG)
  const handleKeydown = (e) => {
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
  };
  document.addEventListener("keydown", handleKeydown);

  // 7. Focus trap (Dla dostępności)
  closeBtn.focus();

  updateCounter();

  /* =========================================
      8. NOWOŚĆ: Obsługa gestów dotykowych (SWIPE)
      ========================================= */
  let touchStartX = 0;
  let touchEndX = 0;
  const minSwipeDistance = 50; // Minimalna odległość w px, żeby uznać za swipe

  // Zapisz punkt początkowy dotyku
  contentEl.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  // Zapisz punkt końcowy i sprawdź różnicę
  contentEl.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true },
  );

  function handleSwipe() {
    const distance = touchStartX - touchEndX;

    // Jeśli przesunięcie było większe niż 50px
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        // Swipe w lewo (palec idzie w lewo -> następne zdjęcie)
        showImage(currentIndex + 1);
      } else {
        // Swipe w prawo (palec idzie w prawo -> poprzednie zdjęcie)
        showImage(currentIndex - 1);
      }
    }
  }
}

/* ===============================
    UTILS & UI (Slider, Animacje, Cookie)
  =============================== */
async function initHeroSlider() {
  const splideEl = document.querySelector("#gallery");
  if (!splideEl) return;

  // ❗ nie inicjalizuj drugi raz
  if (heroSplideInstance) return;

  if (typeof Splide === "undefined") {
    console.error("Splide JS not loaded");
    return;
  }

  heroSplideInstance = new Splide(splideEl, {
    type: "loop",
    perPage: 3,
    gap: "1rem",
    arrows: true,
    pagination: true,
    autoplay: true,
    interval: 2000,
    breakpoints: {
      992: { perPage: 2 },
      600: { perPage: 1 },
    },
  });

  heroSplideInstance.mount();
}

function initAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 },
  );

  document.querySelectorAll(".animate").forEach((el) => observer.observe(el));
}

function checkCookies() {
  /* ===== COOKIES ===== */
  const cookieBanner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("accept-cookies");

  // Sprawdź czy użytkownik już zaakceptował
  if (!localStorage.getItem("cookiesAccepted")) {
    setTimeout(() => {
      cookieBanner.classList.add("show");
    }, 2000); // Pokaż po 2 sekundach
  } else {
    cookieBanner.style.display = "none"; // Ukryj całkowicie jeśli zaakceptowane
  }

  acceptBtn.addEventListener("click", () => {
    localStorage.setItem("cookiesAccepted", "true");
    cookieBanner.classList.remove("show");
  });
}

function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".header__nav a");

  if (!sections.length || !navLinks.length) return;

  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            const targetId = link.getAttribute("href")?.replace("#", "");
            link.classList.toggle("active", targetId === entry.target.id);
          });
        }
      });
    },
    {
      rootMargin: "-40% 0px -40% 0px",
      threshold: 0,
    },
  );

  sections.forEach((section) => spyObserver.observe(section));
}

/**
 * Generuje string srcset dla plików WebP wygenerowanych przez skrypt
 * @param {string} basePath - np. "./assets/img/auto/"
 * @param {string} fileName - np. "foto.webp" (lub pełna ścieżka jeśli brak basePath)
 * @returns {string} - string do atrybutu srcset
 */
function getSrcSet(pathStr, fileName = "") {
  // Obsługa przypadku, gdy podano pełną ścieżkę w pierwszym argumencie (dla Hero)
  let fullPath = fileName ? pathStr + fileName : pathStr;

  // Usuwamy rozszerzenie .webp (i ewentualnie inne)
  const cleanPath = fullPath.replace(/\.(webp|jpg|png|jpeg)$/i, "");

  return `
        ${cleanPath}-xs.webp 480w,
        ${cleanPath}-sm.webp 800w,
        ${cleanPath}-md.webp 1200w,
        ${cleanPath}-lg.webp 1920w
    `;
}
