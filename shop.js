/* Victoria Boutique - public shop page: renders the items for sale from
   data/products.json (managed from admin.html). Includes a client-side search box and
   a "read more" toggle so long descriptions can never blow up a card.

   >>> CHANGE: the WhatsApp number below (and the strings if you want other wording). */
(function () {
  "use strict";

  var WA_BASE      = "https://wa.me/355695557373";   // Victoria Boutique WhatsApp
  var FALLBACK_IMG = "/vik.jpeg";                    // shown if a product photo is missing

  /* Per-language UI text. The page's <html lang="..."> picks the set; falls back to sq. */
  var STRINGS = {
    sq: {
      order: "Porosit në WhatsApp", more: "Lexo më shumë", less: "Lexo më pak",
      message: function (p) { return "Përshëndetje Victoria Boutique, jam i/e interesuar për \"" + p.name + "\" (" + p.price + ")."; }
    },
    it: {
      order: "Ordina su WhatsApp", more: "Leggi di più", less: "Leggi meno",
      message: function (p) { return "Salve Victoria Boutique, sono interessato/a a \"" + p.name + "\" (" + p.price + ")."; }
    },
    en: {
      order: "Order on WhatsApp", more: "Read more", less: "Read less",
      message: function (p) { return "Hello Victoria Boutique, I'm interested in \"" + p.name + "\" (" + p.price + ")."; }
    }
  };

  var grid  = document.querySelector(".shop-grid");
  var empty = document.getElementById("shopEmpty");
  if (!grid) return;

  var t = STRINGS[document.documentElement.lang] || STRINGS.sq;

  /* lowercase + strip accents, so "kerko" matches "Kërko" and search is accent-insensitive */
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  /* ?ts= plus no-store: never render a stale product list (Pages/Cloudflare cache). */
  fetch("/data/products.json?ts=" + Date.now(), { cache: "no-store" })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      var products = (data && data.products) || [];
      products.forEach(function (p) {
        if (p && p.name) grid.appendChild(buildCard(p));
      });
      /* the "coming soon" note is visible by default (works with JS off);
         hide it only once real items are on the page */
      if (grid.children.length && empty) empty.hidden = true;
      if (grid.children.length) { setupSearch(); setupDescToggles(); }
    })
    .catch(function () { /* note stays visible */ });

  /* Client-side search: all cards are already in the DOM, so just show/hide them.
     NOTE: hiding needs the CSS rule `.shop-card[hidden]{display:none}` because the
     card's own `display:flex` otherwise beats the plain [hidden] attribute. */
  function setupSearch() {
    var box = document.getElementById("shopSearch");
    var input = document.getElementById("shopSearchInput");
    var noResults = document.getElementById("shopNoResults");
    if (!box || !input) return;
    box.hidden = false;
    input.addEventListener("input", function () {
      var q = norm(input.value.trim());
      var visible = 0;
      Array.prototype.forEach.call(grid.children, function (card) {
        var match = !q || (card.dataset.search || "").indexOf(q) !== -1;
        card.hidden = !match;
        if (match) visible++;
      });
      if (noResults) noResults.hidden = !(q && visible === 0);
    });
  }

  /* Descriptions are clamped to a few lines so cards stay tidy regardless of length.
     Runs after cards are in the DOM (needs layout): if a description is taller than its
     clamp, add a "read more" toggle so the full text is still reachable. */
  function setupDescToggles() {
    Array.prototype.forEach.call(grid.querySelectorAll(".shop-desc"), function (desc) {
      if (desc.scrollHeight <= desc.clientHeight + 2) return;   // fits, no toggle needed
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "shop-desc-toggle";
      btn.textContent = t.more;
      btn.addEventListener("click", function () {
        var open = desc.classList.toggle("expanded");
        btn.textContent = open ? t.less : t.more;
      });
      desc.parentNode.insertBefore(btn, desc.nextSibling);
    });
  }

  function buildCard(p) {
    var card = document.createElement("article");
    card.className = "card shop-card";
    /* what the search box matches against */
    card.dataset.search = norm(p.name + " " + (p.description || "") + " " + (p.price || ""));

    var media = document.createElement("div");
    media.className = "card-media";
    var img = document.createElement("img");
    /* stored paths are repo-relative ("assets/img/shop/…"); make them absolute so cards
       also work from the /en/ (and future /it/) subpages */
    var src = p.image || FALLBACK_IMG;
    if (src.charAt(0) !== "/" && src.indexOf("http") !== 0) src = "/" + src;
    img.src = src;
    img.alt = p.name;
    img.loading = "lazy";
    /* a just-published photo may not be deployed yet -> fall back instead of a broken icon */
    img.onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };
    media.appendChild(img);

    var body = document.createElement("div");
    body.className = "card-body";

    var name = document.createElement("h3");
    name.textContent = p.name;                 // textContent = no HTML injection

    var price = document.createElement("p");
    price.className = "shop-price";
    price.textContent = p.price || "";

    body.appendChild(name);
    body.appendChild(price);
    if (p.description) {
      var desc = document.createElement("p");
      desc.className = "shop-desc";
      desc.textContent = p.description;
      body.appendChild(desc);
    }

    var btn = document.createElement("a");
    btn.className = "btn btn-accent btn-sm shop-order";
    btn.href = WA_BASE + "?text=" + encodeURIComponent(t.message(p));
    btn.target = "_blank";
    btn.rel = "noopener";
    btn.textContent = t.order;

    body.appendChild(btn);
    card.appendChild(media);
    card.appendChild(body);
    return card;
  }
})();
