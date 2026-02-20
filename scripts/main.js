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
    get heroGalleryContainer() {
      return document.getElementById("hero-static-gallery");
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
      return document.getElementById("realizacje");
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
    // Reszta równolegle w tle
    const [specsData, projectsData] = await Promise.all([
      fetchData(CONFIG.paths.specializations),
      fetchData(CONFIG.paths.realizations),
    ]);

    appState.specializations = specsData;
    appState.projects = projectsData;

    renderSpecializations(specsData);
    renderPortfolio(projectsData);
    initProjectPrefetch();

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

// Renderowanie sekcji Specjalizacji (Górna)
function renderSpecializations(data) {
  const container = CONFIG.dom.specializationsGrid;
  if (!container) return;

  container.innerHTML = data
    .map(
      (item) => `
      <div class="category-card" data-category="${item.id}">
        <div class="category-image">
          <img src="${item.image.replace(".webp", "-sm.webp")}" alt="${item.title}" loading="lazy" />
        </div>
        <div class="category-content">
          <h3 class="category-title">${item.title}</h3>
          <p class="category-description">${item.description}</p>
          <button class="category-btn">
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
  requestAnimationFrame(() => {
    initProjectPrefetch();
  });
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

  // jeśli galeria była otwarta – zamknij ją
  if (appState.isGalleryOpen) {
    returnToPortfolio();
  }

  scrollToPortfolioGridMobile();
}

/* ===============================
    LOGIC & EVENTS
  =============================== */

function setupEventListeners() {
  // 1. Kliknięcia w Realizacje (Cała karta)
  CONFIG.dom.portfolioGrid.addEventListener("click", (e) => {
    // Szukamy najbliższego elementu karty
    const card = e.target.closest(".portfolio-item");
    if (!card) return;

    // ZABLOKOWANIE: Jeśli kliknięto w przycisk "Rozwiń opis", nie otwieraj galerii
    if (e.target.closest(".desc-toggle")) return;

    // Jeśli kliknięto dokładnie w link, zapobiegamy domyślnej akcji (np. skokowi do #)
    const linkClicked = e.target.closest(".portfolio-link");
    if (linkClicked) {
      e.preventDefault();
    }

    // Ignorujemy, jeśli użytkownik tylko zaznacza tekst myszką
    if (window.getSelection().toString()) return;

    const link = card.querySelector(".portfolio-link");
    if (!link) return;

    const project = appState.projects.find((p) => p.id === link.dataset.id);
    if (project) openProjectGallery(project);
  });

  // 2. Kliknięcia w Specjalizacje (Cała karta)
  CONFIG.dom.specializationsGrid.addEventListener("click", (e) => {
    // Szukamy najbliższej karty specjalizacji
    const card = e.target.closest(".category-card");
    if (!card) return;

    // Pobieramy kategorię z atrybutu data-category całej karty
    const category = card.dataset.category;

    handleCategoryFilter(category);

    // Czyszczenie i nadawanie stanu 'active' na przyciskach wewnątrz kart
    CONFIG.dom.specializationsGrid
      .querySelectorAll(".category-btn")
      .forEach((btn) => btn.classList.remove("active"));

    // Znajdź przycisk w klikniętej karcie i dodaj mu klasę active
    const btnInside = card.querySelector(".category-btn");
    if (btnInside) btnInside.classList.add("active");

    // Aktualizacja filtrów w innym miejscu (jeśli istnieją)
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === category);
    });

    // Płynny scroll do sekcji
    const section = CONFIG.dom.realizationsSection;
    if (section) {
      const y = section.getBoundingClientRect().top + window.pageYOffset - 80;

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
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
  CONFIG.dom.galleryContainer.innerHTML = `
    <div class="masonry-col" id="col-0"></div>
    <div class="masonry-col" id="col-1"></div>
    <div class="masonry-col" id="col-2"></div>
  `;
  // 1. Tablica do Lightboxa - używamy wersji LARGE (-lg.webp) dla jakości
  const lightboxImages = project.images.map((fileName) => {
    const cleanName = fileName.replace(/\.(webp|jpg|png|jpeg)$/i, "");
    return `${project.basePath}${cleanName}-lg.webp`;
  });

  project.images.forEach((fileName, index) => {
    const img = document.createElement("img");
    img.src = (project.basePath + fileName).replace(".webp", "-lg.webp");
    img.srcset = getSrcSet(project.basePath, fileName);
    img.sizes = "(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw";
    img.alt = `${project.title} - zdjęcie ${index + 1}`;
    img.className = "gallery-detail-image";
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(index, lightboxImages));

    // Dystrybuuj zdjęcia do kolumn równomiernie
    const colIndex = index % 3;
    document.getElementById(`col-${colIndex}`).appendChild(img);
  });

  CONFIG.dom.galleryView.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToPortfolioGridMobile() {
  if (!isMobile()) return;

  const grid = CONFIG.dom.portfolioGrid;
  if (!grid) return;

  const y = grid.getBoundingClientRect().top + window.pageYOffset - 110; // offset pod header

  window.scrollTo({
    top: y,
    behavior: "smooth",
  });
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
  document.body.style.overflow = "hidden";
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
    document.body.style.overflow = "";
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("keyup", handleKeyup); // <-- DODANA LINIJKA
    lb.remove();
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

  // Co się dzieje, gdy WCIŚNIEMY klawisz
  const handleKeydown = (e) => {
    if (e.key === "Escape") {
      closeBtn.classList.add("keyboard-active");
      // Dajemy delikatne opóźnienie, by zdążyć zobaczyć animację przed zniknięciem modala
      setTimeout(() => closeLb(), 100);
    }

    if (e.key === "ArrowLeft") {
      prevBtn.classList.add("keyboard-active");
      showImage(currentIndex - 1);
    }

    if (e.key === "ArrowRight") {
      nextBtn.classList.add("keyboard-active");
      showImage(currentIndex + 1);
    }
  };

  // Co się dzieje, gdy PUŚCIMY klawisz
  const handleKeyup = (e) => {
    if (e.key === "ArrowLeft") {
      prevBtn.classList.remove("keyboard-active");
    }
    if (e.key === "ArrowRight") {
      nextBtn.classList.remove("keyboard-active");
    }
  };

  // Dodajemy nasłuchiwanie na oba zdarzenia
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);

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
  const cookieBanner = document.getElementById("cookie-banner");
  const acceptBtn = document.getElementById("accept-cookies");
  const rejectBtn = document.getElementById("reject-cookies"); // Nowy przycisk

  // Sprawdzamy, czy użytkownik podjął już decyzję
  const consentStatus = localStorage.getItem("cookiesConsent");

  if (!consentStatus) {
    // Jeśli nie, pokazujemy baner z opóźnieniem
    setTimeout(() => {
      cookieBanner.classList.add("show");
    }, 2000);
  } else if (consentStatus === "accepted") {
    // Jeśli wcześniej zaakceptował, ładujemy GA4 od razu!
    loadGA4();
  }

  // Kliknięcie "Akceptuję"
  acceptBtn.addEventListener("click", () => {
    localStorage.setItem("cookiesConsent", "accepted");
    cookieBanner.classList.remove("show");
    loadGA4(); // Odpalamy śledzenie
  });

  // Kliknięcie "Odrzucam"
  rejectBtn.addEventListener("click", () => {
    localStorage.setItem("cookiesConsent", "rejected");
    cookieBanner.classList.remove("show");
    // Nie wywołujemy loadGA4()
  });
}

// Funkcja odpowiedzialna za wczytanie Google Analytics 4
function loadGA4() {
  // UWAGA: Zmień 'G-XXXXXXXXXX' na Twój własny identyfikator pomiaru z GA4
  const gaId = "G-PVKBFERBHJ";

  // Tworzymy skrypt Google w locie
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  // Inicjalizujemy ustawienia
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", gaId);

  console.log("GA4 zostało załadowane (zgoda udzielona).");
}

function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".header__nav a");

  if (!sections.length || !navLinks.length) return;

  const headerHeight = document.querySelector(".header")?.offsetHeight ?? 90;

  const setActive = (id) => {
    navLinks.forEach((link) => {
      const targetId = link.getAttribute("href")?.replace("#", "");
      link.classList.toggle("active", targetId === id);
    });
  };

  const onScroll = () => {
    let bestId = "";
    let bestDistance = Infinity;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const top = rect.top - headerHeight;

      if (top <= 50) {
        const distance = Math.abs(top);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = section.id;
        }
      }
    });

    if (bestId) setActive(bestId);
  };

  window.addEventListener("scroll", onScroll, { passive: true });

  // Obsługa resize i zoom
  window.addEventListener("resize", onScroll, { passive: true });

  // Uruchom od razu
  onScroll();
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

function prefetchProjectImages(project) {
  if (!project?.images?.length) return;

  project.images.forEach((fileName) => {
    const cleanName = fileName.replace(/\.(webp|jpg|png|jpeg)$/i, "");
    const fullPath = `${project.basePath}${cleanName}-lg.webp`;

    const img = new Image();
    img.src = fullPath;
  });
}

function initProjectPrefetch() {
  const items = document.querySelectorAll(".portfolio-item");

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const projectId =
            entry.target.querySelector(".portfolio-link")?.dataset.id;

          const project = appState.projects.find((p) => p.id === projectId);

          if (project) {
            prefetchProjectImages(project);
          }

          obs.unobserve(entry.target); // odpal tylko raz
        }
      });
    },
    {
      rootMargin: "300px",
      threshold: 0.1,
    },
  );

  items.forEach((item) => observer.observe(item));
}
