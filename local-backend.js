(function () {
  "use strict";

  var STORAGE_KEY = "mapgenie:valley-of-mines:local-state:v1";
  var LOCAL_USER_ID = -1;
  var DEFAULT_TRACKED_CATEGORY_ID = 15870;
  var MAX_MARKED_LOCATIONS = 999999;

  function defaultState() {
    return {
      locations: {},
      trackedCategoryIds: [DEFAULT_TRACKED_CATEGORY_ID],
      notes: [],
      presets: [],
      routes: [],
      nextIds: {
        note: -1,
        preset: -1,
        route: -1
      }
    };
  }

  function normalizeState(raw) {
    var state = Object.assign(defaultState(), raw || {});
    state.locations = state.locations && typeof state.locations === "object" ? state.locations : {};
    state.trackedCategoryIds = Array.isArray(state.trackedCategoryIds) && state.trackedCategoryIds.length
      ? state.trackedCategoryIds.map(Number)
      : [DEFAULT_TRACKED_CATEGORY_ID];
    state.notes = Array.isArray(state.notes) ? state.notes : [];
    state.presets = Array.isArray(state.presets) ? state.presets : [];
    state.routes = Array.isArray(state.routes) ? state.routes : [];
    state.nextIds = Object.assign(defaultState().nextIds, state.nextIds || {});
    return state;
  }

  function loadState() {
    try {
      return normalizeState(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
    } catch (error) {
      console.warn("Failed to load local map state; starting fresh.", error);
      return defaultState();
    }
  }

  var state = loadState();

  function saveState() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function nextId(type) {
    if (!state.nextIds[type] || state.nextIds[type] > -1) {
      state.nextIds[type] = -1;
    }
    var id = state.nextIds[type];
    state.nextIds[type] -= 1;
    return id;
  }

  function response(config, data, status) {
    return Promise.resolve({
      data: data,
      status: status || 200,
      statusText: "OK",
      headers: {},
      config: config,
      request: null
    });
  }

  function parseData(data) {
    if (!data) return {};
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (error) {
        return Object.fromEntries(new URLSearchParams(data));
      }
    }
    return data;
  }

  function cleanPath(url) {
    var base = window.location.origin || "http://localhost";
    var parsed = new URL(url, base);
    return parsed.pathname.replace(/\/+$/, "");
  }

  function staticApiUrl(url) {
    var appBasePath = window.appBasePath || "";
    if (!appBasePath || typeof url !== "string" || url.indexOf("/api/v1/maps/") !== 0) {
      return url;
    }
    return appBasePath + url;
  }

  function idFromPath(path) {
    var value = path.split("/").pop();
    return Number(value);
  }

  function noteFromPayload(payload, existing) {
    return Object.assign({}, existing || {}, {
      id: existing && existing.id ? existing.id : nextId("note"),
      map_id: Number(payload.map_id || window.mapData.map.id),
      user_id: LOCAL_USER_ID,
      title: payload.title || "New Note",
      description: payload.description || "",
      color: payload.color || null,
      latitude: String(payload.latitude),
      longitude: String(payload.longitude)
    });
  }

  function presetFromPayload(payload, existing) {
    return Object.assign({}, existing || {}, {
      id: existing && existing.id ? existing.id : nextId("preset"),
      game_id: Number(payload.game_id || window.game.id),
      title: payload.title || "New Preset",
      categories: Array.isArray(payload.categories) ? payload.categories.map(Number) : [],
      tags: payload.tags || {}
    });
  }

  function routeFromPayload(payload, existing) {
    return Object.assign({}, existing || {}, {
      id: existing && existing.id ? existing.id : nextId("route"),
      map_id: Number(payload.map_id || window.mapData.map.id),
      title: payload.title || "New Route",
      description: payload.description || "",
      color: payload.color || "#fbb03b",
      waypoints: Array.isArray(payload.waypoints)
        ? payload.waypoints.map(function (point) {
          if (typeof point === "number") {
            var location = (window.mapData.locations || []).find(function (item) {
              return Number(item.id) === point;
            });
            return location
              ? { location_id: location.id, x: location.longitude, y: location.latitude }
              : { location_id: point, x: 0, y: 0 };
          }
          return Array.isArray(point)
            ? { location_id: null, x: point[0], y: point[1] }
            : point;
        })
        : []
    });
  }

  function userMapData() {
    return {
      locations: Object.assign({}, state.locations),
      gameLocationsCount: Object.keys(state.locations).length,
      hasPro: true,
      trackedCategoryIds: state.trackedCategoryIds.slice(),
      suggestions: [],
      notes: state.notes.slice(),
      presets: state.presets.slice(),
      routes: state.routes.slice(),
      maxMarkedLocations: MAX_MARKED_LOCATIONS
    };
  }

  function locationMatches(location, query) {
    var haystack = [
      location.title,
      location.description,
      window.mapData.categories[location.category_id] && window.mapData.categories[location.category_id].title
    ].join(" ").toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function noteMatches(note, query) {
    return [note.title, note.description].join(" ").toLowerCase().indexOf(query) !== -1;
  }

  function handleLocalRequest(config) {
    var path = cleanPath(config.url || "");
    var method = (config.method || "get").toLowerCase();
    var payload = parseData(config.data);

    if (method === "get" && path === "/api/v1/user/map-data/945") {
      return response(config, userMapData());
    }

    if (method === "get" && path === "/api/v1/search") {
      var query = String((config.params && config.params.query) || "").trim().toLowerCase();
      var locations = query
        ? (window.mapData.locations || []).filter(function (location) {
          return locationMatches(location, query);
        }).slice(0, 50).map(function (location) {
          return location.id;
        })
        : [];
      var notes = query
        ? state.notes.filter(function (note) {
          return noteMatches(note, query);
        }).slice(0, 50).map(function (note) {
          return note.id;
        })
        : [];
      return response(config, { locations: locations, notes: notes, categories: [] });
    }

    if (path.indexOf("/api/v1/user/locations/") === 0) {
      var locationId = idFromPath(path);
      if (method === "put") {
        state.locations[locationId] = true;
      } else if (method === "delete") {
        delete state.locations[locationId];
      }
      saveState();
      return response(config, {});
    }

    if (path === "/api/v1/user/notes" && method === "post") {
      var newNote = noteFromPayload(payload);
      state.notes.push(newNote);
      saveState();
      return response(config, newNote, 201);
    }

    if (path.indexOf("/api/v1/user/notes/") === 0) {
      var noteId = idFromPath(path);
      var noteIndex = state.notes.findIndex(function (note) {
        return Number(note.id) === noteId;
      });
      if (method === "put" && noteIndex !== -1) {
        state.notes[noteIndex] = noteFromPayload(payload, state.notes[noteIndex]);
        saveState();
        return response(config, state.notes[noteIndex]);
      }
      if (method === "delete") {
        state.notes = state.notes.filter(function (note) {
          return Number(note.id) !== noteId;
        });
        saveState();
        return response(config, {});
      }
    }

    if (path === "/api/v1/user/categories" && method === "post") {
      var categoryId = Number(payload.category);
      if (categoryId && state.trackedCategoryIds.indexOf(categoryId) === -1) {
        state.trackedCategoryIds.push(categoryId);
        saveState();
      }
      return response(config, {});
    }

    if (path.indexOf("/api/v1/user/categories/") === 0 && method === "delete") {
      var removedCategoryId = idFromPath(path);
      state.trackedCategoryIds = state.trackedCategoryIds.filter(function (categoryId) {
        return Number(categoryId) !== removedCategoryId;
      });
      saveState();
      return response(config, {});
    }

    if (path === "/api/v1/user/presets" && method === "post") {
      var newPreset = presetFromPayload(payload);
      state.presets.push(newPreset);
      if (Array.isArray(payload.ordering)) {
        reorderPresets(payload.ordering.concat(newPreset.id));
      }
      saveState();
      return response(config, newPreset, 201);
    }

    if (path.indexOf("/api/v1/user/presets/") === 0 && method === "delete") {
      var presetId = idFromPath(path);
      state.presets = state.presets.filter(function (preset) {
        return Number(preset.id) !== presetId;
      });
      saveState();
      return response(config, {});
    }

    if (path === "/api/v1/user/presets/reorder" && method === "post") {
      reorderPresets(payload.ordering || []);
      saveState();
      return response(config, {});
    }

    if (path === "/api/v1/user/routes" && method === "post") {
      var newRoute = routeFromPayload(payload);
      state.routes.push(newRoute);
      saveState();
      return response(config, { route: newRoute }, 201);
    }

    if (path.indexOf("/api/v1/user/routes/") === 0 && method === "put") {
      var routeId = idFromPath(path);
      var routeIndex = state.routes.findIndex(function (route) {
        return Number(route.id) === routeId;
      });
      if (routeIndex !== -1) {
        state.routes[routeIndex] = routeFromPayload(payload, state.routes[routeIndex]);
        saveState();
        return response(config, { route: state.routes[routeIndex] });
      }
    }

    return null;
  }

  function reorderPresets(ordering) {
    var byId = {};
    state.presets.forEach(function (preset) {
      byId[preset.id] = preset;
    });
    var ordered = ordering.map(function (id) {
      return byId[id];
    }).filter(Boolean);
    state.presets.forEach(function (preset) {
      if (ordered.indexOf(preset) === -1) ordered.push(preset);
    });
    state.presets = ordered;
  }

  function isLocalRequest(config) {
    var path = cleanPath(config.url || "");
    return path.indexOf("/api/v1/user/") === 0 || path === "/api/v1/search";
  }

  function installAxiosShim(axios) {
    if (!axios || axios.__localBackendInstalled) return axios;
    axios.__localBackendInstalled = true;
    axios.interceptors.request.use(function (config) {
      if (isLocalRequest(config)) {
        config.adapter = function (adapterConfig) {
          return handleLocalRequest(adapterConfig);
        };
      } else {
        config.url = staticApiUrl(config.url);
      }
      return config;
    });
    return axios;
  }

  function installFetchShim() {
    if (!window.fetch || window.fetch.__localBackendInstalled) return;

    var nativeFetch = window.fetch.bind(window);
    var fetchShim = function (input, init) {
      if (typeof input === "string") {
        return nativeFetch(staticApiUrl(input), init);
      }
      if (input && typeof input.url === "string" && input.url.indexOf("/api/v1/maps/") === 0) {
        input = new Request(staticApiUrl(input.url), input);
      }
      return nativeFetch(input, init);
    };
    fetchShim.__localBackendInstalled = true;
    window.fetch = fetchShim;
  }

  function installAxiosSetter() {
    var currentAxios = window.axios;
    Object.defineProperty(window, "axios", {
      configurable: true,
      enumerable: true,
      get: function () {
        return currentAxios;
      },
      set: function (value) {
        currentAxios = installAxiosShim(value);
      }
    });
    if (currentAxios) {
      window.axios = currentAxios;
    }
  }

  function installUiCleanup() {
    var style = document.createElement("style");
    style.textContent = [
      "#blobby-left,",
      ".auth-overlay,",
      ".upgrade-section,",
      ".btn-upgrade,",
      ".pro-upgrade-element,",
      ".pro-link-text,",
      ".free-user-locations-info,",
      ".logout,",
      ".social,",
      ".social-item,",
      ".map-genie-logo,",
      "#embed-button,",
      "#embed-dialog,",
      "a[href*='mapgenie.io'],",
      "a[href*='facebook.com'],",
      "a[href*='twitter.com'],",
      "a[href*='x.com'],",
      "a[href*='reddit.com'],",
      "a[href*='whatsapp:'],",
      "a[href*='vk.com'],",
      "#user-panel sup { display: none !important; }"
    ].join("\n");
    document.head.appendChild(style);

    var removeGeneratedAuthUi = function () {
      document.querySelectorAll([
        ".logout",
        ".auth-overlay",
        ".upgrade-section",
        ".btn-upgrade",
        ".pro-upgrade-element",
        ".pro-link-text",
        ".free-user-locations-info",
        ".social",
        ".social-item",
        ".map-genie-logo",
        "#embed-button",
        "#embed-dialog",
        "#user-panel sup",
        "a[href*='mapgenie.io']",
        "a[href*='facebook.com']",
        "a[href*='twitter.com']",
        "a[href*='x.com']",
        "a[href*='reddit.com']",
        "a[href*='whatsapp:']",
        "a[href*='vk.com']",
        "a[href*='/login']",
        "a[href*='/logout']",
        "a[href*='/account']",
        "a[href*='/upgrade']"
      ].join(",")).forEach(function (element) {
        element.remove();
      });
    };

    var cleanGeneratedUi = function () {
      document.querySelectorAll("a, button, span, div").forEach(function (element) {
        if (element.childNodes.length === 1 && element.textContent === "Save To My Account") {
          element.textContent = "Save Route";
        }
      });
      removeGeneratedAuthUi();
    };

    new MutationObserver(cleanGeneratedUi).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
    document.addEventListener("DOMContentLoaded", cleanGeneratedUi);
  }

  window.localMapState = {
    storageKey: STORAGE_KEY,
    reset: function () {
      window.localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  window.user = {
    id: LOCAL_USER_ID,
    hasPro: true,
    locations: Object.assign({}, state.locations),
    gameLocationsCount: Object.keys(state.locations).length,
    trackedCategoryIds: state.trackedCategoryIds.slice(),
    suggestions: []
  };

  if (window.mapData) {
    window.mapData.notes = state.notes.slice();
    window.mapData.presets = state.presets.slice();
    window.mapData.routes = state.routes.slice();
    window.mapData.maxMarkedLocations = MAX_MARKED_LOCATIONS;
  }

  installFetchShim();
  installAxiosSetter();
  installUiCleanup();
})();
