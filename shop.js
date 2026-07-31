/* Victoria Boutique - public shop page: renders the items for sale from
   data/products.json (managed from admin.html). Includes a client-side search box and
   a "read more" toggle so long descriptions can never blow up a card.

   >>> CHANGE: the WhatsApp number below (and the strings if you want other wording). */
(function () {
  "use strict";

  var WA_BASE      = "https://wa.me/355695557373";   // Victoria Boutique WhatsApp
  var FALLBACK_IMG = "/media/window-dress-478.jpg";   // shown if a product photo is missing

  /* Per-language UI text. The page's <html lang="..."> picks the set; falls back to sq. */
  var STRINGS = {
    sq: {
      order: "Porosit në WhatsApp", more: "Lexo më shumë", less: "Lexo më pak", all: "Të gjitha",
      message: function (p) { return "Përshëndetje Victoria Boutique, jam i/e interesuar për \"" + p.name + "\" (" + p.price + ")."; }
    },
    it: {
      order: "Ordina su WhatsApp", more: "Leggi di più", less: "Leggi meno", all: "Tutti",
      message: function (p) { return "Salve Victoria Boutique, sono interessato/a a \"" + p.name + "\" (" + p.price + ")."; }
    },
    en: {
      order: "Order on WhatsApp", more: "Read more", less: "Read less", all: "All",
      message: function (p) { return "Hello Victoria Boutique, I'm interested in \"" + p.name + "\" (" + p.price + ")."; }
    }
  };

  /* Canonical category order (Albanian = the value stored in products.json) + per-language
     display labels. Only the pill LABEL is translated; filtering keys on the Albanian value. */
  var CATEGORIES = ["Fustane", "Bluze", "Funde", "Pantallona", "Të brendshme", "Pantofla", "Çanta", "Bizhu", "Syze"];
  var CAT_LABELS = {
    sq: null,
    en: { "Fustane": "Dresses", "Bluze": "Tops", "Funde": "Skirts", "Pantallona": "Trousers", "Të brendshme": "Underwear", "Pantofla": "Slippers", "Çanta": "Bags", "Bizhu": "Jewellery", "Syze": "Sunglasses" },
    it: { "Fustane": "Vestiti", "Bluze": "Top", "Funde": "Gonne", "Pantallona": "Pantaloni", "Të brendshme": "Intimo", "Pantofla": "Pantofole", "Çanta": "Borse", "Bizhu": "Bigiotteria", "Syze": "Occhiali" }
  };

  var activeCat = "all";
  var searchQ = "";

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
      if (grid.children.length) { buildFilters(products); setupSearch(); setupDescToggles(); }
    })
    .catch(function () { /* note stays visible */ });

  /* Combined filter: a card is shown when it matches BOTH the active category and the search.
     Hiding needs `.shop-card[hidden]{display:none}` because the card's display:flex otherwise
     beats the plain [hidden] attribute. */
  function applyFilters() {
    var visible = 0;
    Array.prototype.forEach.call(grid.children, function (card) {
      var catOk = activeCat === "all" || card.dataset.category === activeCat;
      var qOk = !searchQ || (card.dataset.search || "").indexOf(searchQ) !== -1;
      var show = catOk && qOk;
      card.hidden = !show;
      if (show) visible++;
    });
    var noResults = document.getElementById("shopNoResults");
    if (noResults) noResults.hidden = visible !== 0;
  }

  function setupSearch() {
    var box = document.getElementById("shopSearch");
    var input = document.getElementById("shopSearchInput");
    if (!box || !input) return;
    box.hidden = false;
    input.addEventListener("input", function () {
      searchQ = norm(input.value.trim());
      applyFilters();
    });
  }

  /* Build the category filter pills from the categories actually present in the products
     (kept in canonical order), with "All" first. Labels are localised; the value stays Albanian. */
  function buildFilters(products) {
    var bar = document.getElementById("shopFilters");
    if (!bar) return;
    var present = {};
    products.forEach(function (p) { if (p && p.category) present[p.category] = true; });
    var cats = CATEGORIES.filter(function (c) { return present[c]; });
    if (!cats.length) return;
    var labels = CAT_LABELS[document.documentElement.lang] || CAT_LABELS.sq;
    var pills = [{ v: "all", label: t.all }].concat(cats.map(function (c) {
      return { v: c, label: (labels && labels[c]) || c };
    }));
    pills.forEach(function (item, i) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "shop-filter-pill" + (i === 0 ? " active" : "");
      pill.textContent = item.label;
      pill.setAttribute("data-cat", item.v);
      pill.addEventListener("click", function () {
        activeCat = item.v;
        Array.prototype.forEach.call(bar.children, function (b) { b.classList.remove("active"); });
        pill.classList.add("active");
        applyFilters();
      });
      bar.appendChild(pill);
    });
    bar.hidden = false;
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
    card.dataset.category = p.category || "";
    /* what the search box matches against (includes the category name) */
    card.dataset.search = norm(p.name + " " + (p.description || "") + " " + (p.price || "") + " " + (p.category || ""));

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
