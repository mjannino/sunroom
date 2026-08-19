// Polyfill HTMLElement.scrollBy for jsdom tests
if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.scrollBy) {
  HTMLElement.prototype.scrollBy = function (options: ScrollToOptions) {
    // no-op implementation for testing
  };
}
