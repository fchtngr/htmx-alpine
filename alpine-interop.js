// ================================================================
// HTMX Extension: alpine-interop
// Enables HTMX to call Alpine.js component methods
// on JSON responses using hx-handle-json attribute
// Watches for dynamically added HTMX elements to automatically call htmx.process on them
// ===================================================================
(function () {
  htmx.defineExtension("alpine-interop", {
    transformResponse: function (text, xhr, elt) {
      // Only proceed for JSON responses
      const contentType = xhr.getResponseHeader("content-type") || "";
      if (!contentType.includes("application/json")) {
        return text;
      }

      // Get the handler name from the attribute
      const handlerName = elt.getAttribute("hx-handle-json");
      if (!handlerName) {
        return text;
      }

      try {
        // Traverse up the DOM to find the nearest Alpine scope with the handler
        let current = elt;
        let handler = null;
        let scope = null;
        while (current && current !== document.body) {
          const alpineData = Alpine.$data(current);
          if (alpineData && typeof alpineData[handlerName] === "function") {
            handler = alpineData[handlerName];
            scope = alpineData;
            break;
          }
          current = current.parentElement;
        }

        if (!handler || !scope) {
          return text;
        }

        // Parse params from hx-handle-json-params (comma-separated, trimmed strings)
        const paramsAttr = elt.getAttribute("hx-handle-json-params");
        const params = paramsAttr
          ? paramsAttr.split(",").map((p) => p.trim())
          : [];

        // Parse JSON and invoke the handler with proper 'this' binding
        const responseData = text ? JSON.parse(text) : null;
        handler.call(scope, responseData, elt, ...params);
        return text; // Return original: handleSwap will block the swap
      } catch (error) {
        console.error("Error handling JSON response:", error);
        return text; // Fallback to original on error
      }
    },
    handleSwap: function (swapStyle, target, fragment, settleInfo) {
      const handlerName = target.getAttribute("hx-handle-json");
      if (handlerName) {
        return true; // Prevent default swap
      }
      return false; // Allow normal swap
    },
    init: function (api) {
      // Auto-process HTMX for dynamically added DOM elements (e.g., via Alpine x-for/transitions)
      document.addEventListener("DOMContentLoaded", () => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  if (
                    node.matches(
                      "[hx-get], [hx-post], [hx-put], [hx-delete], [hx-patch]"
                    )
                  ) {
                    htmx.process(node);
                  }
                  node
                    .querySelectorAll(
                      "[hx-get], [hx-post], [hx-put], [hx-delete], [hx-patch]"
                    )
                    .forEach((el) => {
                      htmx.process(el);
                    });
                }
              });
            }
          });
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      });
    },
  });
})();
