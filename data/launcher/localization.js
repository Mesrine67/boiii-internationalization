(function () {
  "use strict";



  var currentLanguage = "en-US";
  var ignoredClasses = [
    "friend-name",
    "mod-card-name",
    "mod-card-description",
    "workshop-item-title",
    "workshop-item-description",
    "workshop-modal-title",
    "workshop-modal-description",
    "library-modal-title",
    "library-modal-description",
    "maintainer-name"
  ];
  var translatableAttributes = ["title", "placeholder", "aria-label", "alt"];

  var englishCatalog = null;
  var activeCatalog = null;
  var localeManifest = null;
  var supportedCatalogLocales = ["en-US"];
  var legacySourceKeys = Object.create(null);

  function getBridge() {
    try {
      if (window.getExternal) return window.getExternal();
      return window.external || null;
    } catch (e) {
      return null;
    }
  }

  function loadManifest() {
    if (localeManifest) return localeManifest;
    try {
      var bridge = getBridge();
      var raw = bridge && bridge.loadLauncherLocaleManifest && bridge.loadLauncherLocaleManifest();
      var manifest = typeof raw === "string" && raw ? JSON.parse(raw) : null;
      if (!manifest || manifest.schemaVersion !== 1 || manifest.sourceLocale !== "en-US" ||
          !manifest.locales || typeof manifest.locales !== "object") return null;
      var locales = [];
      for (var locale in manifest.locales) {
        if (!Object.prototype.hasOwnProperty.call(manifest.locales, locale)) continue;
        if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(locale)) continue;
        if (manifest.locales[locale].file !== locale + ".json") continue;
        locales.push(locale);
      }
      if (locales.indexOf("en-US") === -1) return null;
      localeManifest = manifest;
      supportedCatalogLocales = locales;
      return localeManifest;
    } catch (e) {
      return null;
    }
  }

  function loadCatalog(locale) {
    if (supportedCatalogLocales.indexOf(locale) === -1) return null;
    try {
      var bridge = getBridge();
      if (!bridge || !bridge.loadLauncherLocale) return null;
      var raw = bridge.loadLauncherLocale(locale);
      if (typeof raw !== "string" || !raw) return null;
      var catalog = JSON.parse(raw);
      if (!catalog || typeof catalog !== "object" || !catalog._meta ||
          catalog._meta.schemaVersion !== 1 || catalog._meta.locale !== locale ||
          catalog._meta.sourceLocale !== "en-US" ||
          !catalog.launcher || typeof catalog.launcher !== "object") return null;
      return catalog;
    } catch (e) {
      return null;
    }
  }

  function normalizeLocale(value) {
    loadManifest();
    var requested = String(value || "").replace(/_/g, "-").toLowerCase();
    if (requested === "french" || requested === "fr") requested = "fr-fr";
    if (requested === "english" || requested === "en") requested = "en-us";
    for (var i = 0; i < supportedCatalogLocales.length; i++) {
      if (supportedCatalogLocales[i].toLowerCase() === requested) return supportedCatalogLocales[i];
    }
    var language = requested.split("-")[0];
    for (var j = 0; j < supportedCatalogLocales.length; j++) {
      if (supportedCatalogLocales[j].split("-")[0].toLowerCase() === language) return supportedCatalogLocales[j];
    }
    return "en-US";
  }

  function getSystemLocale() {
    try {
      var bridge = getBridge();
      if (bridge && bridge.getSystemLocale) return bridge.getSystemLocale() || "en-US";
    } catch (e) {}
    return "en-US";
  }

  function getPath(root, path) {
    var parts = String(path || "").split(".");
    var value = root;
    for (var i = 0; i < parts.length; i++) {
      if (!value || typeof value !== "object" ||
          !Object.prototype.hasOwnProperty.call(value, parts[i])) return undefined;
      value = value[parts[i]];
    }
    return value;
  }

  function indexLegacyStrings(value, path) {
    if (!value || typeof value !== "object") return;
    for (var key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      var nextPath = path + "." + key;
      if (typeof value[key] === "string") legacySourceKeys[value[key]] = nextPath;
      else indexLegacyStrings(value[key], nextPath);
    }
  }

  function rebuildLegacyIndex() {
    legacySourceKeys = Object.create(null);
    var legacy = englishCatalog && englishCatalog.launcher && englishCatalog.launcher.legacy;
    if (legacy) indexLegacyStrings(legacy, "launcher.legacy");
  }

  function interpolate(value, params) {
    if (value && typeof value === "object") {
      var count = params && Number(params.count);
      value = count === 1 && value.one !== undefined ? value.one : value.other;
    }
    if (typeof value !== "string") return value;
    return value.replace(/\{([A-Za-z0-9_.-]+)\}/g, function (token, name) {
      if (params && Object.prototype.hasOwnProperty.call(params, name)) return String(params[name]);
      return token;
    });
  }

  function warnMissingKey(key) {
    var enabled = window.BOIII_I18N_DEBUG === true;
    try { enabled = enabled || localStorage.getItem("boiii_i18n_debug") === "1"; } catch (e) {}
    if (enabled && window.console && window.console.warn) window.console.warn("Missing launcher translation: " + key);
  }

  function translateKey(key, params, fallback) {
    var value = getPath(activeCatalog, key);
    if (value === undefined && activeCatalog !== englishCatalog) value = getPath(englishCatalog, key);
    if (value === undefined) {
      warnMissingKey(key);
      return fallback === undefined ? key : fallback;
    }
    return interpolate(value, params);
  }

  function availableLocales() {
    loadManifest();
    return supportedCatalogLocales.slice(0);
  }

  function localeDisplayName(locale) {
    loadManifest();
    var entry = localeManifest && localeManifest.locales && localeManifest.locales[locale];
    return entry && entry.displayName ? entry.displayName : locale;
  }
  function translateDynamic(source) {
    var installedWorkshopItem = source.match(
      /^This workshop item is already installed at:\n([^\n]+)\n\nRemove it first if you want to reinstall\.$/
    );
    if (installedWorkshopItem) {
      return translateKey(
        "launcher.workshop.alreadyInstalled",
        { path: installedWorkshopItem[1] },
        source
      );
    }

    if (source.indexOf("\n") !== -1) {
      var lines = source.split("\n");
      for (var li = 0; li < lines.length; li++) {
        lines[li] = translate(lines[li]);
      }
      return lines.join("\n");
    }

    var match = source.match(/^Page (\d+) \/ (\d+)$/);
    if (match) return "Page " + match[1] + " sur " + match[2];

    match = source.match(/^(\d+) friends?$/);
    if (match) return match[1] + (match[1] === "1" ? " ami" : " amis");

    match = source.match(/^(\d+) items?$/);
    if (match) return match[1] + (match[1] === "1" ? " élément" : " éléments");

    match = source.match(/^(\d+) file(?:s)?$/);
    if (match) return match[1] + (match[1] === "1" ? " fichier" : " fichiers");

    match = source.match(/^ID: (.+)$/);
    if (match) return "ID : " + match[1];

    match = source.match(/^Workshop ID: (.+)$/);
    if (match) return "ID de l’Atelier : " + match[1];

    match = source.match(/^Page (\d+)$/);
    if (match) return "Page " + match[1];

    match = source.match(/^Starting download for (.+)\.\.\.$/);
    if (match) return "Téléchargement de " + match[1] + "…";

    match = source.match(/^Mode: (.+)$/);
    if (match) return "Mode : " + translate(match[1]);

    match = source.match(/^Verifying \((.+)\)\.\.\.$/);
    if (match) return "Vérification (" + translate(match[1]) + ")…";

    match = source.match(/^verification\.json not found in (.+)$/);
    if (match) return "verification.json est introuvable dans " + match[1];

    match = source.match(/^(\d+(?:[.,]\d+)?\s*(?:B|KB|MB|GB|TB)) available$/i);
    if (match) return match[1] + " disponible(s)";

    match = source.match(/^(.+): Verified (\d+) files: (\d+) OK(.*)$/);
    if (match) {
      var modeNames = {
        All: "Tous",
        Campaign: "Campagne",
        Multiplayer: "Multijoueur",
        Zombies: "Zombies"
      };
      var result = (modeNames[match[1]] || match[1]) + " : " + match[2] + " fichiers vérifiés : " + match[3] + " OK";
      var tail = match[4]
        .replace(/ \| ERRORS:/g, " | ERREURS :")
        .replace(/ \| Optional \(DLC\):/g, " | Contenu facultatif (DLC) :")
        .replace(/ - all good!/g, " - tout est correct !")
        .replace(/(\d+) missing/g, "$1 fichier(s) manquant(s)")
        .replace(/(\d+) wrong size/g, "$1 fichier(s) de taille incorrecte")
        .replace(/(\d+) corrupt/g, "$1 fichier(s) corrompu(s)")
        .replace(/Base Game/g, "Jeu de base")
        .replace(/Zombie Chronicles/g, "Zombie Chronicles")
        .replace(/MP DLC/g, "DLC multijoueur")
        .replace(/ZM DLC/g, "DLC Zombies")
        .replace(/Campaign/g, "Campagne")
        .replace(/Multiplayer/g, "Multijoueur")
        .replace(/Zombies/g, "Zombies");
      return result + tail;
    }

    match = source.match(/^(\d+) items removed$/);
    if (match) return match[1] + (match[1] === "1" ? " élément supprimé" : " éléments supprimés");

    match = source.match(/^Game: (.+) \| Data: (.+)$/);
    if (match) return "Jeu : " + match[1] + " | Données : " + match[2];

    match = source.match(/^Game: (.+)$/);
    if (match) return "Jeu : " + match[1];

    match = source.match(/^Game path set to:\s*(.+)$/);
    if (match) return "Chemin du jeu défini sur :\n" + match[1];

    match = source.match(/^Failed to start verification: (.+)$/);
    if (match) return "Impossible de démarrer la vérification : " + match[1];

    match = source.match(/^Failed to apply preset: (.+)$/);
    if (match) return "Impossible d’appliquer le préréglage : " + match[1];

    match = source.match(/^Failed to remove (\d+) files?$/);
    if (match) return "Impossible de supprimer " + match[1] + " fichier(s)";

    match = source.match(/^(.+) \((\d+) files?\)$/);
    if (match) {
      return (
        match[1] +
        " (" +
        match[2] +
        (match[2] === "1" ? " fichier)" : " fichiers)")
      );
    }

    match = source.match(/^Removed (\d+) files? \((.+)\)$/);
    if (match) return match[1] + " fichier(s) supprimé(s) (" + match[2] + ")";

    match = source.match(/^Error parsing releases: (.+)$/);
    if (match) return "Erreur lors de l’analyse des versions : " + match[1];

    match = source.match(/^Error fetching releases: (.+)$/);
    if (match) return "Erreur lors du chargement des versions : " + match[1];

    match = source.match(/^(\d+) files? with issues:$/);
    if (match) {
      return (
        match[1] +
        (match[1] === "1" ? " fichier" : " fichiers") +
        " avec des problèmes :"
      );
    }

    match = source.match(/^(.*) \(Latest\)$/);
    if (match) return match[1] + " (dernière version)";

    return source;
  }

  function translate(source) {
    var key = legacySourceKeys[source];
    if (key) return translateKey(key, null, source);
    if (currentLanguage !== "en-US") return translateDynamic(source);
    return source;
  }

  function isIgnored(element) {
    while (element && element.nodeType === 1) {
      var tag = (element.tagName || "").toLowerCase();
      if (tag === "script" || tag === "style" || tag === "textarea" ||
          tag === "pre" || tag === "code") return true;
      if (element.id === "playerName") return true;
      var classes = " " + (element.className || "") + " ";
      for (var i = 0; i < ignoredClasses.length; i++) {
        if (classes.indexOf(" " + ignoredClasses[i] + " ") !== -1) return true;
      }
      element = element.parentElement;
    }
    return false;
  }

  function localizeTextNode(node) {
    if (!node || !node.parentElement || isIgnored(node.parentElement)) return;
    if (typeof node.__boiiiI18nSource === "undefined") {
      node.__boiiiI18nSource = node.nodeValue;
    } else if (node.nodeValue !== node.__boiiiI18nRendered) {
      node.__boiiiI18nSource = node.nodeValue;
    }
    var original = node.__boiiiI18nSource;
    if (!original.replace(/\s/g, "")) return;
    var leading = (original.match(/^\s*/) || [""])[0];
    var trailing = (original.match(/\s*$/) || [""])[0];
    var end = original.length - trailing.length;
    var body = original.substring(leading.length, end);
    if (!body) return;
    var lookupBody = body.replace(/\s+/g, " ");
    var key = node.parentElement.getAttribute && node.parentElement.getAttribute("data-i18n");
    var translated = key ? translateKey(key, null, body) : translate(body);
    if (!key && translated === body && lookupBody !== body) {
      translated = translate(lookupBody);
    }
    var rendered = leading + translated + trailing;
    node.__boiiiI18nRendered = rendered;
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
  }

  function localizeAttributes(element) {
    if (!element || element.nodeType !== 1 || isIgnored(element)) return;
    var state = element.__boiiiI18nAttributes || (element.__boiiiI18nAttributes = {});
    for (var i = 0; i < translatableAttributes.length; i++) {
      var name = translatableAttributes[i];
      if (!element.hasAttribute(name)) continue;
      var current = element.getAttribute(name);
      var item = state[name];
      if (!item) {
        item = state[name] = { source: current, rendered: current };
      } else if (current !== item.rendered) {
        item.source = current;
      }
      var key = element.getAttribute("data-i18n-" + name);
      var rendered = key ? translateKey(key, null, item.source) : translate(item.source);
      if (current !== rendered) element.setAttribute(name, rendered);
      item.rendered = rendered;
    }
  }

  function localizeTree(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      localizeTextNode(root);
      return;
    }
    if (root.nodeType === 1) localizeAttributes(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var elements = document.createTreeWalker(root, 1, null, false);
    var element;
    while ((element = elements.nextNode())) localizeAttributes(element);
    var walker = document.createTreeWalker(root, 4, null, false);
    var node;
    while ((node = walker.nextNode())) localizeTextNode(node);
  }
  function setLanguage(language) {
    var preference = String(language || "system");
    var requested = preference === "system" || preference === "" ? getSystemLocale() : preference;
    var locale = normalizeLocale(requested);
    englishCatalog = loadCatalog("en-US");
    if (!englishCatalog) englishCatalog = { _meta: { locale: "en-US" }, launcher: { legacy: {}, language: {
      label: "Launcher & game language", system: "System default",
      english: "English (United States)", french: "French (partial translation)",
      help: "System default follows your Windows language when a translation is available."
    } } };
    activeCatalog = locale === "en-US" ? englishCatalog : loadCatalog(locale);
    if (!activeCatalog) locale = "en-US";
    if (locale === "en-US") activeCatalog = englishCatalog;
    currentLanguage = locale;
    rebuildLegacyIndex();
    if (document.documentElement) document.documentElement.lang = currentLanguage;
    localizeTree(document.body);
    return currentLanguage;
  }

  window.BOIIILauncherI18n = {
    setLanguage: setLanguage,
    translate: translate,
    translateKey: translateKey,
    getCurrentLocale: function () { return currentLanguage; },
    getAvailableLocales: availableLocales,
    getLocaleDisplayName: localeDisplayName,
    normalizeLocale: normalizeLocale
  };

  localizeTree(document.body);
  if (window.MutationObserver && document.body) {
    var observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var record = records[i];
        if (record.type === "characterData") {
          localizeTextNode(record.target);
        } else if (record.type === "attributes") {
          localizeAttributes(record.target);
        } else if (record.type === "childList") {
          for (var j = 0; j < record.addedNodes.length; j++) {
            localizeTree(record.addedNodes[j]);
          }
        }
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes
    });
  }
})();
