/* Grupo LFL Serviços — comportamento da landing page */
(function () {
  "use strict";

  // Número no formato internacional, só dígitos (55 + DDD + número).
  // TODO: substituir pelo número comercial da LFL.
  var WHATSAPP_NUMBER = "5511972915400";
  var WHATSAPP_MESSAGE =
    "Olá! Vim pelo site da Grupo LFL Serviços e gostaria de saber mais sobre os serviços.";

  var SUCCESS_MESSAGE =
    "Obrigado pelo contato. Nossa equipe retornará pelo WhatsApp ou e-mail informado.";
  var ERROR_MESSAGE =
    "Preencha os campos obrigatórios para enviar a solicitação.";

  /* ------------------------------------------------------------------
     Links do WhatsApp (todos os elementos com data-whatsapp)
     ------------------------------------------------------------------ */
  function setupWhatsAppLinks() {
    var url =
      "https://wa.me/" +
      WHATSAPP_NUMBER +
      "?text=" +
      encodeURIComponent(WHATSAPP_MESSAGE);

    var links = document.querySelectorAll("[data-whatsapp]");
    for (var i = 0; i < links.length; i++) {
      links[i].setAttribute("href", url);
    }
  }

  /* ------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------ */
  function setupMobileMenu() {
    var header = document.querySelector(".header");
    var toggle = document.querySelector(".menu-toggle");
    var panel = document.querySelector(".nav-mobile");
    if (!header || !toggle || !panel) return;

    function setOpen(isOpen) {
      header.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    }

    toggle.addEventListener("click", function () {
      setOpen(!header.classList.contains("is-open"));
    });

    // Fecha ao escolher um destino
    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    // Fecha com Esc
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     Formulário de contato
     Envia o lead para o Web App do Google Apps Script (apps-script/Code.gs),
     que grava uma linha na planilha de leads.
     ------------------------------------------------------------------ */
  // URL do Web App (termina em /exec). Ver instruções em apps-script/Code.gs.
  var LEADS_ENDPOINT =
    "https://script.google.com/macros/s/AKfycbzZcwBTur1F4r0jB-legNjY5r7UgqlhatcmMIaSl6QZ60Xp2XhOp8ZCt88nGG5XnbQaNA/exec";
  var pageLoadedAt = Date.now();

  function submitLead(data) {
    if (!LEADS_ENDPOINT) {
      return Promise.reject(new Error("LEADS_ENDPOINT não configurado"));
    }

    // Corpo urlencoded = requisição "simples", sem preflight de CORS.
    var body = new URLSearchParams(data);
    body.set("t", String(Date.now() - pageLoadedAt));

    var controller = new AbortController();
    var timeout = setTimeout(function () {
      controller.abort();
    }, 15000);

    return fetch(LEADS_ENDPOINT, {
      method: "POST",
      body: body,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    })
      .then(function (response) {
        clearTimeout(timeout);
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (result) {
        if (!result || !result.ok) throw new Error("Lead recusado");
        return result;
      });
  }

  function setupContactForm() {
    var form = document.getElementById("form-contato");
    if (!form) return;

    var feedback = form.querySelector(".form-feedback");
    var submitButton = form.querySelector('[type="submit"]');

    function showFeedback(message, isError) {
      feedback.textContent = message;
      feedback.classList.toggle("is-error", Boolean(isError));
      feedback.hidden = false;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        showFeedback(ERROR_MESSAGE, true);
        var firstInvalid = form.querySelector(":invalid");
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      var data = {};
      var formData = new FormData(form);
      formData.forEach(function (value, key) {
        data[key] = String(value).trim();
      });

      submitButton.disabled = true;

      submitLead(data)
        .then(function () {
          form.reset();
          showFeedback(SUCCESS_MESSAGE, false);
        })
        .catch(function () {
          showFeedback(
            "Não foi possível enviar agora. Tente novamente ou fale pelo WhatsApp.",
            true
          );
        })
        .then(function () {
          submitButton.disabled = false;
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupWhatsAppLinks();
    setupMobileMenu();
    setupContactForm();
  });
})();
