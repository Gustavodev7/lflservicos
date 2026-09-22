/* Grupo LFL Serviços — movimento e interação. Complementa js/main.js.
   Tudo aqui adiciona classes/atributos em runtime; o HTML não muda.
   Sem JS (ou com erro), nada fica escondido: o estado inicial dos reveals
   só existe sob `html.js-motion` (css/motion.css). */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktopMedia = window.matchMedia("(min-width: 960px)");

  var supportsObserver = "IntersectionObserver" in window;
  var supportsClosest = typeof Element.prototype.closest === "function";

  if (!supportsObserver || !supportsClosest) return;

  // A classe entra cedo (o script fica no fim do body, antes do primeiro
  // paint) para que a animação do hero comece já no primeiro frame.
  root.classList.add("js-motion");

  function prefersReduced() {
    return reduceMotion.matches;
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ------------------------------------------------------------------
     Hero: sequência eyebrow → título → parágrafo → botões → selos → foto
     ------------------------------------------------------------------ */
  // A foto pode estar solta (.hero-photo) ou dentro de um bloco de mídia
  // (.hero-media, com moldura decorativa): anima-se o bloco inteiro.
  function heroMedia() {
    var photo = document.querySelector(".hero .hero-photo");
    if (!photo) return null;
    var wrap = photo.closest(".hero-media");
    return wrap && !wrap.classList.contains("hero-inner") ? wrap : photo;
  }

  function setupHero() {
    var text = document.querySelector(".hero-text");
    var media = heroMedia();
    if (!text) return;

    var children = Array.prototype.slice.call(text.children);
    var index = 0;
    for (; index < children.length; index++) {
      children[index].setAttribute("data-hero", "");
      children[index].style.setProperty("--hero-i", String(index));
    }

    if (media) media.setAttribute("data-hero", "media");

    // Selos fora do texto (ex.: dentro do bloco de mídia já animado)
    var seals = document.querySelector(".hero .hero-seals");
    if (seals && !seals.closest("[data-hero]")) {
      seals.setAttribute("data-hero", "");
      seals.style.setProperty("--hero-i", String(index));
    }
  }

  /* ------------------------------------------------------------------
     Reveal no scroll
     ------------------------------------------------------------------ */
  var STAGGER_MS = 70;
  var STAGGER_CAP = 6; // depois do 7º item, todos entram juntos

  // Grupos de irmãos: entram em cascata curta
  var GROUPS = [
    ".trust-item",
    ".ledger > li",
    ".diff-grid > li",
    ".seg",
    ".step",
    ".contact-form .field",
    ".contact-form .btn",
    ".footer-cols > *"
  ];

  // Elementos que entram sozinhos (delay 0)
  var SINGLES = [
    ".split-text",
    ".contact-text",
    ".steps-photo",
    ".ledger-cta"
  ];

  function markReveal(el, delayMs) {
    if (!el || el.hasAttribute("data-reveal")) return false;
    // Não marca nada dentro do hero nem dentro de outro reveal
    if (el.closest(".hero") || (el.parentElement && el.parentElement.closest("[data-reveal]"))) {
      return false;
    }
    el.setAttribute("data-reveal", "");
    if (delayMs) el.style.setProperty("--reveal-delay", delayMs + "ms");
    return true;
  }

  function collectTargets() {
    var i, j, items;

    // Cabeçalho de cada seção: eyebrow → título → lead → ctas
    var sections = qsa(".section");
    for (i = 0; i < sections.length; i++) {
      var head = qsa(
        ":scope > .eyebrow, :scope > .h2, :scope > .lead, :scope > .ctas, " +
          ".section-head-text > *, .diff-intro > *",
        sections[i]
      );
      for (j = 0; j < head.length; j++) markReveal(head[j], j * 80);
    }

    for (i = 0; i < SINGLES.length; i++) {
      items = qsa(SINGLES[i]);
      for (j = 0; j < items.length; j++) markReveal(items[j], 0);
    }

    // Foto do split entra logo depois do texto
    var splitPhotos = qsa(".split-photo");
    for (i = 0; i < splitPhotos.length; i++) markReveal(splitPhotos[i], 120);

    for (i = 0; i < GROUPS.length; i++) {
      items = qsa(GROUPS[i]);
      for (j = 0; j < items.length; j++) {
        markReveal(items[j], Math.min(j, STAGGER_CAP) * STAGGER_MS);
      }
    }

    return qsa("[data-reveal]");
  }

  function setupReveal() {
    if (prefersReduced()) return;

    var targets = collectTargets();
    if (!targets.length) return;

    var pending = targets.slice();

    function reveal(el) {
      el.classList.add("is-visible");
      observer.unobserve(el);
      var idx = pending.indexOf(el);
      if (idx !== -1) pending.splice(idx, 1);
    }

    var observer = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          // Revela ao entrar na tela — ou se já passou por ela
          var passed = entry.boundingClientRect.bottom < 0;
          if (entry.isIntersecting || passed) reveal(entry.target);
        }
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    for (var i = 0; i < targets.length; i++) observer.observe(targets[i]);

    // Varredura barata: elementos que ficaram para trás sem nunca cruzar
    // a tela (salto de âncora, rolagem muito rápida) são revelados.
    var sweepAt = 0;
    function sweep() {
      if (!pending.length) return;
      var now = Date.now();
      if (now - sweepAt < 300) return;
      sweepAt = now;
      var list = pending.slice();
      for (var k = 0; k < list.length; k++) {
        if (list[k].getBoundingClientRect().bottom < 0) reveal(list[k]);
      }
    }

    window.addEventListener("scroll", sweep, { passive: true });
    window.addEventListener("load", function () { sweepAt = 0; sweep(); });
    window.addEventListener("hashchange", function () { sweepAt = 0; sweep(); });

    // Se o usuário passar a preferir menos movimento, revela tudo de vez
    function revealAll() {
      observer.disconnect();
      pending.length = 0;
      for (var k = 0; k < targets.length; k++) targets[k].classList.add("is-visible");
    }

    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", function (e) {
        if (e.matches) revealAll();
      });
    }

    // Rede de segurança: ao imprimir, nada pode estar escondido
    window.addEventListener("beforeprint", revealAll);
  }

  /* ------------------------------------------------------------------
     Header: .is-scrolled ao rolar; has-fixed-header se for fixo/sticky
     Parallax da foto do hero (desktop, sem reduced-motion)
     ------------------------------------------------------------------ */
  function setupScroll() {
    var header = document.querySelector(".header");
    var hero = document.querySelector(".hero");
    var photo = heroMedia();
    if (photo) photo.setAttribute("data-parallax", "");

    var SCROLL_THRESHOLD = 40;
    var PARALLAX_FACTOR = 0.08;
    var PARALLAX_MAX_RATIO = 0.04; // no máximo 4% da altura da foto

    var ticking = false;
    var isScrolled = false;
    var headerFixed = false;
    var heroBottom = 0;
    var parallaxOn = false;
    var lastParallax = null;

    function measure() {
      if (header) {
        var position = window.getComputedStyle(header).position;
        headerFixed = position === "fixed" || position === "sticky";
        root.classList.toggle("has-fixed-header", headerFixed);
        root.style.setProperty("--header-h", header.offsetHeight + "px");
      }

      if (hero) {
        var rect = hero.getBoundingClientRect();
        heroBottom = rect.top + window.pageYOffset + rect.height;
      }

      parallaxOn = Boolean(photo) && desktopMedia.matches && !prefersReduced();
      if (!parallaxOn && photo) {
        photo.style.removeProperty("--parallax-y");
        lastParallax = null;
      }
    }

    function update() {
      ticking = false;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;

      if (header) {
        var next = y > SCROLL_THRESHOLD;
        if (next !== isScrolled) {
          isScrolled = next;
          header.classList.toggle("is-scrolled", next);
        }
      }

      if (parallaxOn && y <= heroBottom) {
        var max = photo.offsetHeight * PARALLAX_MAX_RATIO;
        var offset = Math.min(y * PARALLAX_FACTOR, max);
        var rounded = Math.round(offset * 10) / 10;
        if (rounded !== lastParallax) {
          lastParallax = rounded;
          photo.style.setProperty("--parallax-y", rounded + "px");
        }
      }
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    function remeasure() {
      measure();
      requestUpdate();
    }

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    window.addEventListener("orientationchange", remeasure);

    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", remeasure);
    }
    if (typeof desktopMedia.addEventListener === "function") {
      desktopMedia.addEventListener("change", remeasure);
    }

    // Fontes/logo podem mudar a altura do header depois do primeiro layout
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(remeasure).catch(function () {});
    }

    remeasure();
  }

  /* ------------------------------------------------------------------
     Formulário: rearma a animação do feedback a cada envio
     (main.js só troca o texto quando ele já está visível)
     ------------------------------------------------------------------ */
  function setupForm() {
    var form = document.getElementById("form-contato");
    if (!form) return;

    var feedback = form.querySelector(".form-feedback");
    if (!feedback) return;

    form.addEventListener("submit", function () {
      if (prefersReduced()) return;
      // main.js trata o submit no mesmo evento; escondemos por um frame
      // para que o `:not([hidden])` reative a animação de entrada.
      feedback.hidden = true;
      void feedback.offsetWidth; // força reflow: cancela a animação anterior
      window.requestAnimationFrame(function () {
        if (feedback.textContent) feedback.hidden = false;
      });
    });
  }

  function init() {
    try {
      setupHero();
      setupReveal();
      setupScroll();
      setupForm();
    } catch (error) {
      // Qualquer falha: remove o modo animado para nada ficar escondido
      root.classList.remove("js-motion");
      var hidden = qsa("[data-reveal]");
      for (var i = 0; i < hidden.length; i++) hidden[i].removeAttribute("data-reveal");
      if (window.console && console.warn) console.warn("motion.js desativado:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
