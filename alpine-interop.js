// ================================================================
// HTMX Extension: alpine-interop
// Dispatches custom events for JSON responses to be handled by Alpine.js
// Prevents content swapping for JSON responses by setting hx-swap="none"
// Watches for dynamically added HTMX elements to automatically call htmx.process on them
// ===================================================================
(function () {
  // Debug mode - set to true for verbose logging
  const DEBUG = false;

  function debugLog(...args) {
    if (DEBUG) {
      console.debug("[alpine-interop]", ...args);
    }
  }

  debugLog("Extension loading");

  htmx.defineExtension("alpine-interop", {
    transformResponse: function (text, xhr, elt) {
      debugLog("transformResponse called", {
        contentType: xhr.getResponseHeader("content-type"),
        elementTag: elt.tagName,
        elementId: elt.id,
        textLength: text ? text.length : 0
      });

      // Only proceed for JSON responses
      const contentType = xhr.getResponseHeader("content-type") || "";
      if (!contentType.includes("application/json")) {
        debugLog("Not a JSON response, skipping");
        return text;
      }

      try {
        // Parse JSON data
        debugLog("Parsing JSON response");
        const jsonData = text ? JSON.parse(text) : null;

        debugLog("Creating and dispatching htmx:jsonResponse event", jsonData);
        htmx.trigger(elt, 'htmx:jsonResponse', { data: jsonData, xhr: xhr });

        // Set hx-swap="none" to prevent content swapping
        debugLog("Setting hx-swap='none' to prevent content swapping");
        elt.setAttribute("hx-swap", "none");

        return text;
      } catch (error) {
        console.error("[alpine-interop] Error handling JSON response:", error);
        return text; // Fallback to original on error
      }
    },
    init: function (api) {
      debugLog("Initializing extension");

      // Auto-process HTMX for dynamically added DOM elements (e.g., via Alpine x-for/transitions)
      document.addEventListener("DOMContentLoaded", () => {
        debugLog("Setting up MutationObserver for dynamic elements");

        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              debugLog(`Processing ${mutation.addedNodes.length} added nodes`);

              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  const isHtmxElement = node.matches(
                    "[hx-get], [hx-post], [hx-put], [hx-delete], [hx-patch]"
                  );

                  if (isHtmxElement) {
                    debugLog("Processing HTMX element:", node.tagName, node.id);
                    htmx.process(node);
                  }

                  const nestedElements = node.querySelectorAll(
                    "[hx-get], [hx-post], [hx-put], [hx-delete], [hx-patch]"
                  );

                  if (nestedElements.length > 0) {
                    debugLog(`Processing ${nestedElements.length} nested HTMX elements`);
                    nestedElements.forEach((el) => {
                      htmx.process(el);
                    });
                  }
                }
              });
            }
          });
        });

        debugLog("Starting MutationObserver");
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      });

      debugLog("Extension initialization complete");
    },
  });

  debugLog("Extension loaded successfully");
})();