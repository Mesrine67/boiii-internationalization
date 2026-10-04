(function () {
  "use strict";

  var currentLanguage = "en-US";
  var ignoredClasses = ["friend-name", "mod-card-name", "mod-card-description", "workshop-item-title", "workshop-item-description", "workshop-modal-title", "workshop-modal-description", "library-modal-title", "library-modal-description", "maintainer-name"];
  var translatableAttributes = ["title", "placeholder", "aria-label", "alt"];
  var englishCatalog = null;
  var activeCatalog = null;
  var localeManifest = null;
  var supportedCatalogLocales = ["en-US"];
  var legacySourceKeys = Object.create(null);
  var sourceMessagePatterns = [];

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
      if (!manifest || manifest.schemaVersion !== 1 || manifest.sourceLocale !== "en-US" || !manifest.locales || typeof manifest.locales !== "object") return null;
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
      if (!catalog || typeof catalog !== "object" || !catalog._meta || catalog._meta.schemaVersion !== 1 || catalog._meta.locale !== locale || catalog._meta.sourceLocale !== "en-US" || !catalog.launcher || typeof catalog.launcher !== "object") return null;
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
      if (!value || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, parts[i])) return undefined;
      value = value[parts[i]];
    }
    return value;
  }

  function addSourcePattern(template, key) {
    var names = [];
    var expression = "";
    var literalWeight = 0;
    var cursor = 0;
    var source = String(template);
    var placeholder = /\{([A-Za-z0-9_.-]+)\}/g;
    var match;
    while ((match = placeholder.exec(source))) {
      var literal = source.substring(cursor, match.index);
      expression += literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (/[A-Za-z]{3}/.test(literal)) literalWeight += 3;
      else literalWeight += (literal.match(/[A-Za-z]/g) || []).length;
      expression += "([\\s\\S]+?)";
      names.push(match[1]);
      cursor = placeholder.lastIndex;
    }
    var suffix = source.substring(cursor);
    expression += suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (/[A-Za-z]{3}/.test(suffix)) literalWeight += 3;
    else literalWeight += (suffix.match(/[A-Za-z]/g) || []).length;
    if (names.length && literalWeight > 0) sourceMessagePatterns.push({
      key: key,
      names: names,
      specificity: literalWeight,
      expression: new RegExp("^" + expression + "$")
    });
  }

  function indexSourceStrings(value, path) {
    if (!value || typeof value !== "object") return;
    var isPlural = typeof value.one === "string" && typeof value.other === "string";
    if (isPlural) {
      legacySourceKeys[value.one] = path;
      legacySourceKeys[value.other] = path;
      addSourcePattern(value.one, path);
      addSourcePattern(value.other, path);
      return;
    }
    for (var key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      var nextPath = path + "." + key;
      if (typeof value[key] === "string") {
        legacySourceKeys[value[key]] = nextPath;
        addSourcePattern(value[key], nextPath);
      } else {
        indexSourceStrings(value[key], nextPath);
      }
    }
  }

  function rebuildLegacyIndex() {
    legacySourceKeys = Object.create(null);
    sourceMessagePatterns = [];
    var source = englishCatalog && englishCatalog.launcher;
    if (source) indexSourceStrings(source, "launcher");
    sourceMessagePatterns.sort(function (left, right) {
      return right.specificity - left.specificity;
    });
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
    var summary = source.match(/^(.+): Verified (\d+) files: (\d+) OK(.*)$/);
    if (summary) return translateVerificationSummary(summary);
    for (var i = 0; i < sourceMessagePatterns.length; i++) {
      var pattern = sourceMessagePatterns[i];
      var match = pattern.expression.exec(source);
      if (!match) continue;
      var params = {};
      for (var j = 0; j < pattern.names.length; j++) {
        params[pattern.names[j]] = pattern.names[j] === "mode"
          ? translateVerificationMode(match[j + 1])
          : match[j + 1];
      }
      if (params.count !== undefined && /^\d+$/.test(params.count)) {
        params.count = Number(params.count);
      }
      return translateKey(pattern.key, params, source);
    }
    if (source.indexOf("\n") !== -1) {
      var lines = source.split("\n");
      for (var line = 0; line < lines.length; line++) lines[line] = translate(lines[line]);
      return lines.join("\n");
    }
    return source;
  }

  function translateVerificationSummary(summary) {
    var mode = translateVerificationMode(summary[1]);
    var result = translateKey("launcher.dynamic.verify.result", {
      mode: mode,
      total: summary[2],
      ok: summary[3]
    }, summary[0].substring(0, summary[0].length - summary[4].length));
    var tail = summary[4];
    var sections = tail.split(" | ");
    for (var sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
      var section = sections[sectionIndex];
      if (!section) continue;
      if (section.indexOf("ERRORS:") === 0) {
        result += translateKey("launcher.dynamic.verify.errors", {
          issues: translateVerificationIssues(section.substring("ERRORS:".length))
        }, " | ERRORS: " + section.substring("ERRORS:".length));
      } else if (section.indexOf("Optional (DLC):") === 0) {
        result += translateKey("launcher.dynamic.verify.optional", {
          issues: translateVerificationIssues(section.substring("Optional (DLC):".length))
        }, " | Optional (DLC): " + section.substring("Optional (DLC):".length));
      } else if (section.trim().indexOf("- all good!") === 0) {
        result += translateKey("launcher.dynamic.verify.allGood", null, " - all good!");
      } else {
        var components = section.split(" ; ");
        result += translateKey("launcher.dynamic.verify.componentPrefix", null, " | ");
        for (var componentIndex = 0; componentIndex < components.length; componentIndex++) {
          var component = components[componentIndex].match(/^(.+?):\s*(.*)$/);
          if (!component) {
            result += components[componentIndex];
            continue;
          }
          if (componentIndex > 0) {
            result += translateKey("launcher.dynamic.verify.componentSeparator", null, " ; ");
          }
          result += translateKey("launcher.dynamic.verify.componentIssue", {
            component: translate(component[1]),
            issues: translateVerificationIssues(component[2])
          }, components[componentIndex]);
        }
      }
    }
    return result;
  }

  function translateVerificationMode(mode) {
    mode = String(mode || "");
    var modeNames = ["Zombie Chronicles", "Base Game", "MP DLC", "ZM DLC", "Campaign", "Multiplayer", "Zombies", "All"];
    for (var i = 0; i < modeNames.length; i++) {
      var modeName = modeNames[i];
      var modePattern = new RegExp("\\b" + modeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
      mode = mode.replace(modePattern, translate(modeName));
    }
    return mode;
  }

  function translateVerificationIssues(source) {
    var labels = [
      { source: "wrong size", key: "wrongSize" },
      { source: "missing", key: "missing" },
      { source: "corrupt", key: "corrupt" }
    ];
    var remaining = source;
    var formatted = [];
    for (var i = 0; i < labels.length; i++) {
      var expression = new RegExp("(\\d+) " + labels[i].source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      var match;
      while ((match = expression.exec(source))) {
        formatted.push({ index: match.index, value: translateKey(
          "launcher.dynamic.verify." + labels[i].key,
          { count: Number(match[1]) }, match[0]) });
      }
    }
    formatted.sort(function (left, right) { return left.index - right.index; });
    if (!formatted.length) return remaining.trim();
    remaining = "";
    for (var part = 0; part < formatted.length; part++) {
      if (part > 0) remaining += translateKey("launcher.dynamic.verify.issueSeparator", null, ", ");
      remaining += formatted[part].value;
    }
    return remaining;
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
      if (tag === "script" || tag === "style" || tag === "textarea" || tag === "pre" || tag === "code") return true;
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
    observer.observe(document.body, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatableAttributes});
  }
})();
