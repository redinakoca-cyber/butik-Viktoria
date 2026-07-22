/* Victoria Boutique - admin panel: login, product list, add/edit/remove, publish.
   The site is static (GitHub Pages behind Cloudflare), so "publishing" means committing
   data/products.json and the product photos to the repo through the GitHub Contents API.
   The publish key (a fine-grained GitHub token) lives only in this browser's
   localStorage and is never part of the site itself.

   ============================================================================
   >>> STEP 1: CHANGE THESE FIVE THINGS AND THE ADMIN IS YOURS. <<<
   ============================================================================ */
(function () {
  "use strict";

  /* (1) Your GitHub repo that hosts the site. */
  var OWNER  = "redinakoca-cyber";
  var REPO   = "butik-Viktoria";
  var BRANCH = "main";

  /* (2) Where the data and photos live inside that repo. Create data/products.json
         containing exactly: {"products":[]}   and an empty folder assets/img/shop/ */
  var JSON_PATH    = "data/products.json";
  var PHOTO_DIR    = "assets/img/shop/";
  var FALLBACK_IMG = "vik.jpeg";              // shown if a product photo is missing

  /* (3) Login. Generate these two lines with tools/password-hash.html (open it in a
         browser, type the username + password, copy the output over these lines).
         NEVER put the plain password here.

         Why this is safe to publish: this file is served to every visitor, so repo
         visibility is irrelevant. We store only a SALTED, slow PBKDF2 hash of
         "<username lowercased>:<password>". With a strong password it cannot be
         reversed, even by someone reading this source.

         Honest limitation: the login is client-side, so a technical visitor could skip
         the prompt and see the (empty) dashboard. They still cannot publish anything
         without the GitHub token, which exists only in the owner's browser. The token
         is the real security; the password is for privacy of the screen. */
  var SALT       = "PASTE-SALT-FROM-THE-TOOL";
  var ITERS      = 250000;
  var LOGIN_HASH = "PASTE-HASH-FROM-THE-TOOL";

  /* (4) Storage keys - just make them unique per site so two sites on the same
         browser don't share a session/token. */
  var SESSION_KEY = "vb_admin_session";
  var TOKEN_KEY   = "vb_publish_key";

  /* (5) Nothing else needs changing. UI text lives in admin.html. */

  function $(id) { return document.getElementById(id); }

  var products = [];

  /* ---------- login ---------- */

  if (sessionStorage.getItem(SESSION_KEY) === "1") showAdmin();

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!window.crypto || !crypto.subtle) {
      msg($("loginMsg"), "Hapeni faqen përmes https (ose localhost) që hyrja të punojë.", "err");
      return;
    }
    var user = $("loginUser").value.trim().toLowerCase();
    var pass = $("loginPass").value;
    pbkdf2Hex(user + ":" + pass).then(function (hex) {
      if (hex === LOGIN_HASH) {
        sessionStorage.setItem(SESSION_KEY, "1");
        showAdmin();
      } else {
        msg($("loginMsg"), "Emri ose fjalëkalimi është gabim.", "err");
      }
    });
  });

  $("logoutBtn").addEventListener("click", function () {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  function showAdmin() {
    $("loginView").hidden = true;
    $("adminView").hidden = false;
    $("logoutBtn").hidden = false;
    if (getToken()) {
      $("tokenInput").placeholder = "•••••• (i ruajtur në këtë pajisje)";
      msg($("tokenMsg"), "Çelësi është i ruajtur në këtë pajisje.", "ok");
    }
    loadProducts();
  }

  /* PBKDF2-HMAC-SHA256(str, SALT, ITERS) -> 32 bytes as hex. Deliberately slow so the
     published LOGIN_HASH can't be brute-forced back into the password. */
  function pbkdf2Hex(str) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(str), { name: "PBKDF2" }, false, ["deriveBits"])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: "PBKDF2", salt: enc.encode(SALT), iterations: ITERS, hash: "SHA-256" }, key, 256);
      })
      .then(function (bits) {
        return Array.prototype.map.call(new Uint8Array(bits), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
  }

  /* Change the login later without revealing it to anyone: open this page and run in
     the browser console (F12):   vbHash("username", "new-password").then(console.log)
     Paste the printed value over LOGIN_HASH above (keep the same SALT) and commit. */
  window.vbHash = function (user, pass) { return pbkdf2Hex(String(user).trim().toLowerCase() + ":" + pass); };

  /* ---------- product list ---------- */

  function loadProducts() {
    /* With a publish key stored we read the list straight from GitHub (always current);
       otherwise fall back to the copy the site serves, which can lag a deploy by ~1 min.
       no-store: never let a cached copy make the admin show stale data. */
    function fromSite() {
      return fetch(JSON_PATH + "?ts=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : { products: [] }; });
    }
    var load = getToken()
      ? getFile(JSON_PATH).then(function (f) {
          return f && f.content ? JSON.parse(b64DecodeUtf8(f.content)) : { products: [] };
        }).catch(fromSite)
      : fromSite();
    load
      .then(function (d) { products = (d && d.products) || []; renderList(); })
      .catch(function () { products = []; renderList(); });
  }

  function renderList() {
    var list = $("itemList");
    list.textContent = "";           // textContent everywhere = no HTML injection
    $("itemsEmpty").hidden = products.length > 0;

    products.forEach(function (p) {
      var li = document.createElement("li");
      li.className = "admin-item";

      var img = document.createElement("img");
      img.src = p.image || FALLBACK_IMG;
      img.alt = "";
      img.loading = "lazy";
      /* a freshly uploaded photo is not on the site until Pages redeploys (~1 min) */
      img.onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };

      var info = document.createElement("div");
      info.className = "admin-item-info";
      var name = document.createElement("div");
      name.className = "admin-item-name";
      name.textContent = p.name;
      var price = document.createElement("div");
      price.className = "admin-item-price";
      price.textContent = p.price || "";
      info.appendChild(name);
      info.appendChild(price);
      if (p.description) {
        var desc = document.createElement("div");
        desc.className = "admin-item-desc";
        desc.textContent = p.description;
        info.appendChild(desc);
      }

      var editBtn = document.createElement("button");
      editBtn.className = "btn btn-sm btn-edit";
      editBtn.type = "button";
      editBtn.textContent = "Ndrysho";
      editBtn.addEventListener("click", function () { startEdit(p); });

      var removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm btn-remove";
      removeBtn.type = "button";
      removeBtn.textContent = "Hiq";
      removeBtn.addEventListener("click", function () { onRemove(p); });

      var actions = document.createElement("div");
      actions.className = "admin-item-actions";
      actions.appendChild(editBtn);
      actions.appendChild(removeBtn);

      li.appendChild(img);
      li.appendChild(info);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  /* ---------- add / edit (one form does both) ---------- */

  var previewUrl = null;
  var editingId = null;        // set while editing an existing item

  $("addPhoto").addEventListener("change", function () {
    var file = this.files[0];
    clearPreview();
    if (file) {
      var preview = $("photoPreview");
      previewUrl = URL.createObjectURL(file);
      preview.src = previewUrl;
      preview.classList.add("show");
    }
  });

  function clearPreview() {
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    var preview = $("photoPreview");
    preview.onerror = null;
    preview.classList.remove("show");
    preview.removeAttribute("src");
  }

  /* Load an existing item into the form for editing. */
  function startEdit(p) {
    editingId = p.id;
    $("addName").value = p.name || "";
    $("addPrice").value = p.price || "";
    $("addDesc").value = p.description || "";
    clearPreview();
    if (p.image) {
      var preview = $("photoPreview");
      preview.onerror = function () { this.onerror = null; this.src = FALLBACK_IMG; };
      preview.src = p.image;      // shown as-is; picking a new file replaces it
      preview.classList.add("show");
    }
    $("editPhotoHint").hidden = false;
    $("addCardTitle").textContent = "Ndrysho artikullin";
    $("addBtn").textContent = "Ruaj ndryshimet";
    $("cancelEditBtn").hidden = false;
    msg($("addMsg"), "", "");
    $("addMsg").className = "admin-msg";
    $("addName").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* Reset the form back to "add" mode. */
  function resetForm() {
    $("addForm").reset();
    clearPreview();
    editingId = null;
    $("editPhotoHint").hidden = true;
    $("addCardTitle").textContent = "Shto artikull të ri";
    $("addBtn").textContent = "Shto dhe publiko";
    $("cancelEditBtn").hidden = true;
  }

  $("cancelEditBtn").addEventListener("click", function () {
    resetForm();
    msg($("addMsg"), "", "");
    $("addMsg").className = "admin-msg";
  });

  $("addForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("addName").value.trim();
    var price = $("addPrice").value.trim();
    var description = $("addDesc").value.trim();
    if (!name || !price) return;
    if (!requireToken($("addMsg"))) return;

    var editing = editingId;                       // capture for this submit
    var id = editing || ("p-" + Date.now());
    var btn = $("addBtn");
    btn.disabled = true;
    msg($("addMsg"), "Duke publikuar…", "");

    var file = $("addPhoto").files[0];
    /* A fresh unique filename each upload => the URL changes, so a replaced photo is
       never shadowed by a cached old one, and the path is always new (plain create,
       no sha juggling). */
    var photoStep = file
      ? compressPhoto(file).then(function (b64) {
          var path = PHOTO_DIR + id + "-" + Date.now() + ".jpg";
          return putFile(path, b64, "Shop: photo for \"" + name + "\"").then(function () { return path; });
        })
      : Promise.resolve("");

    photoStep.then(function (newImage) {
      return publishProducts(function (list) {
        if (editing) {
          return list.map(function (x) {
            if (x.id !== editing) return x;
            /* keep the old photo when no new one was chosen */
            var u = { id: x.id, name: name, price: price, image: newImage || x.image || "" };
            if (description) u.description = description;   // omit when empty = tidy JSON
            return u;
          });
        }
        var prod = { id: id, name: name, price: price, image: newImage };
        if (description) prod.description = description;
        list.push(prod);
        return list;
      }, (editing ? "Shop: edit \"" : "Shop: add \"") + name + "\"");
      /* IMPORTANT: old photos are deliberately NOT deleted. Caches and the ~1-2 min
         deploy lag mean other devices may still hold a product list that references
         them; deleting made images break on those devices (logo fallback / blank).
         Orphaned photos are a few hundred KB and harmless. */
    }).then(function () {
      var wasEditing = editing;
      resetForm();
      msg($("addMsg"), wasEditing
        ? "U ruajt! Ndryshimi duket në faqe për 1–2 minuta."
        : "U publikua! Artikulli duket në faqe për 1–2 minuta.", "ok");
    }).catch(function (err) {
      msg($("addMsg"), friendlyError(err), "err");
    }).then(function () {
      btn.disabled = false;
    });
  });

  /* ---------- remove ---------- */

  function onRemove(p) {
    if (!requireToken($("listMsg"))) return;
    if (!confirm("Ta heqim \"" + p.name + "\" nga dyqani?")) return;
    msg($("listMsg"), "Duke publikuar…", "");

    publishProducts(function (list) {
      return list.filter(function (x) { return x.id !== p.id; });
    }, "Shop: remove \"" + p.name + "\"").then(function () {
      /* the photo file stays in the repo on purpose; see the note in the submit handler */
      msg($("listMsg"), "U hoq! Ndryshimi duket në faqe për 1–2 minuta.", "ok");
    }).catch(function (err) {
      msg($("listMsg"), friendlyError(err), "err");
    });
  }

  /* ---------- publish key (GitHub token) ---------- */

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }

  function requireToken(msgEl) {
    if (getToken()) return true;
    msg(msgEl, "Së pari vendosni çelësin e publikimit (shihni më poshtë).", "err");
    $("tokenCard").scrollIntoView({ behavior: "smooth" });
    return false;
  }

  $("saveTokenBtn").addEventListener("click", function () {
    var t = $("tokenInput").value.trim();
    if (!t) {
      msg($("tokenMsg"), "Ngjitni çelësin në fushën më sipër.", "err");
      return;
    }
    msg($("tokenMsg"), "Duke e provuar çelësin…", "");
    fetch("https://api.github.com/repos/" + OWNER + "/" + REPO, { headers: authHeaders(t) })
      .then(function (r) {
        if (!r.ok) throw new Error("token " + r.status);
        return r.json();
      })
      .then(function (repo) {
        /* THE CLASSIC TRAP: a token with only the default "Metadata: Read" passes this
           repo GET, so a naive check reports "key works" - and then the first publish
           fails with 403. repo.permissions.push reflects Contents write access, so we
           check it and warn clearly instead of lying. */
        localStorage.setItem(TOKEN_KEY, t);
        $("tokenInput").value = "";
        $("tokenInput").placeholder = "•••••• (i ruajtur në këtë pajisje)";
        if (repo && repo.permissions && repo.permissions.push === true) {
          msg($("tokenMsg"), "Çelësi punon dhe u ruajt në këtë pajisje.", "ok");
        } else {
          msg($("tokenMsg"), "Çelësi u ruajt, por duket se s'ka leje shkrimi. Krijojeni sërish me lejen \"Contents: Read and write\", përndryshe publikimi do të japë gabim.", "err");
        }
      })
      .catch(function () {
        msg($("tokenMsg"), "Çelësi nuk pranohet nga GitHub. Kontrolloni hapat më sipër dhe provoni sërish.", "err");
      });
  });

  /* ---------- GitHub Contents API ---------- */

  function authHeaders(token) {
    return {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function contentsUrl(path) {
    return "https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + path;
  }

  function getFile(path) {
    return fetch(contentsUrl(path) + "?ref=" + BRANCH, { headers: authHeaders(getToken()) })
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("GET " + r.status);
        return r.json();
      });
  }

  function putFile(path, base64, message, sha) {
    var body = { message: message, content: base64, branch: BRANCH };
    if (sha) body.sha = sha;                 // sha required only when overwriting
    return fetch(contentsUrl(path), {
      method: "PUT",
      headers: authHeaders(getToken()),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error("PUT " + r.status);
      return r.json();
    });
  }

  /* Always re-read the JSON from the repo right before writing, so two edits in a row
     (or from two devices) never overwrite each other with stale data. */
  function publishProducts(mutate, message) {
    return getFile(JSON_PATH).then(function (file) {
      var list = [];
      if (file && file.content) {
        /* If the stored JSON is unreadable, STOP: writing anyway would replace the
           whole list and silently lose every product. */
        try { list = JSON.parse(b64DecodeUtf8(file.content)).products || []; }
        catch (e) { throw new Error("badjson"); }
      }
      var next = mutate(list);
      var json = JSON.stringify({ products: next }, null, 2) + "\n";
      return putFile(JSON_PATH, b64EncodeUtf8(json), message, file && file.sha).then(function () {
        products = next;
        renderList();
      });
    });
  }

  /* Error messages that name the actual fix instead of guessing "expired". */
  function friendlyError(err) {
    var text = (err && err.message) || "";
    if (text === "photo") {
      return "Fotoja nuk mund të lexohet. Provoni një foto tjetër (JPG ose PNG).";
    }
    if (text === "badjson") {
      return "Lista e artikujve në GitHub nuk lexohet dot (skedar i dëmtuar). Asgjë nuk u ndryshua. Duhet rregulluar data/products.json në GitHub.";
    }
    var m = /(\d+)/.exec(text);
    var code = m ? m[1] : "";
    if (code === "403") {
      return "Çelësit i mungon leja për të shkruar (gabim 403). Krijojeni sërish me lejen \"Contents: Read and write\" te GitHub.";
    }
    if (code === "401") {
      return "Çelësi nuk u pranua (gabim 401), mund të jetë shkruar gabim ose ka skaduar. Krijoni një të ri.";
    }
    if (code === "409") {
      return "Dikush tjetër sapo bëri një ndryshim. Provoni edhe një herë.";
    }
    return "Publikimi dështoi (" + (err && err.message || "gabim rrjeti") + "). Kontrolloni internetin dhe provoni sërish.";
  }

  /* ---------- helpers ---------- */

  /* UTF-8 safe base64 (plain btoa breaks on accented characters like ë, ç, à). */
  function b64EncodeUtf8(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64DecodeUtf8(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* Shrink the photo in the browser (max 1200 px, JPEG) so uploads are quick, the repo
     stays small, and a 5 MB phone photo doesn't have to be prepared by hand. */
  function compressPhoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var max = 1200;
          var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          var w = Math.max(1, Math.round(img.naturalWidth * scale));
          var h = Math.max(1, Math.round(img.naturalHeight * scale));
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(new Error("photo"));
        }
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("photo"));
      };
      img.src = url;
    });
  }

  function msg(el, text, kind) {
    el.textContent = text;
    el.className = "admin-msg show" + (kind ? " " + kind : "");
  }
})();
