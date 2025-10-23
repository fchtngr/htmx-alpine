describe("alpine-interop extension", function () {
  beforeEach(function () {
    this.server = makeServer();
    clearWorkArea();

    // Ensure work area exists
    if (!getWorkArea()) {
      makeWorkArea();
    }

    // Mock Alpine.js
    window.Alpine = {
      $data: function (element) {
        return element._alpineData || {};
      },
    };
  });

  afterEach(function () {
    this.server.restore();
    clearWorkArea();
    delete window.Alpine;
  });

  it("loads the extension", function () {
    chai.assert.isDefined(htmx.defineExtension);
  });

  it("handles JSON responses with htmx:jsonResponse event", function () {
    const mockPosts = [
      { id: 1, title: "Test Post 1", body: "Test body 1" },
      { id: 2, title: "Test Post 2", body: "Test body 2" },
    ];

    this.server.respondWith("GET", "/posts", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockPosts),
    ]);

    let eventFired = false;
    let receivedData = null;

    const div = make(`<div hx-ext="alpine-interop" hx-get="/posts">
      <button type="button">Load Posts</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Listen for htmx:jsonResponse event
    div.addEventListener("htmx:jsonResponse", function (event) {
      eventFired = true;
      receivedData = event.detail.data;
    });

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.isTrue(eventFired, "htmx:jsonResponse event should be fired");
    chai.assert.deepEqual(
      receivedData,
      mockPosts,
      "Event should contain parsed JSON data"
    );
  });

  it("provides xhr object in event detail", function () {
    const mockComments = [
      { id: 1, name: "User 1", body: "Comment 1" },
      { id: 2, name: "User 2", body: "Comment 2" },
    ];

    this.server.respondWith("GET", "/posts/1/comments", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockComments),
    ]);

    let eventFired = false;
    let receivedData = null;
    let receivedXhr = null;

    const div = make(`<div hx-ext="alpine-interop" hx-get="/posts/1/comments">
      <button type="button">Load Comments</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Listen for htmx:jsonResponse event
    div.addEventListener("htmx:jsonResponse", function (event) {
      eventFired = true;
      receivedData = event.detail.data;
      receivedXhr = event.detail.xhr;
    });

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.isTrue(eventFired, "htmx:jsonResponse event should be fired");
    chai.assert.deepEqual(
      receivedData,
      mockComments,
      "Event should contain parsed JSON data"
    );
    chai.assert.isDefined(receivedXhr, "Event should contain xhr object");
  });

  it("ignores non-JSON responses", function () {
    this.server.respondWith("GET", "/html-content", [
      200,
      { "Content-Type": "text/html" },
      "<div>HTML Content</div>",
    ]);

    let eventFired = false;

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/html-content" hx-target="this">
      <button type="button">Load HTML</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Listen for htmx:jsonResponse event
    div.addEventListener("htmx:jsonResponse", function (event) {
      eventFired = true;
    });

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.isFalse(
      eventFired,
      "htmx:jsonResponse event should not be fired for non-JSON responses"
    );
  });

  it("prevents HTMX swap for JSON responses by setting hx-swap='none'", function () {
    const mockData = { message: "test" };

    this.server.respondWith("GET", "/test", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockData),
    ]);

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/test" hx-target="this">
      <button type="button">Test</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    const originalContent = div.innerHTML;
    div.querySelector("button").click();
    this.server.respond();

    // Content should remain unchanged since swap was prevented
    chai.assert.equal(
      div.innerHTML,
      originalContent,
      "Content should not change for JSON responses"
    );

    // Check that hx-swap was set to none
    chai.assert.equal(
      div.getAttribute("hx-swap"),
      "none",
      "hx-swap should be set to 'none' for JSON responses"
    );
  });

  it("allows normal HTMX behavior for non-JSON responses", function () {
    this.server.respondWith("GET", "/test", [
      200,
      { "Content-Type": "text/html" },
      "<div>New Content</div>",
    ]);

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/test" hx-target="this">
      <button type="button">Test</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.include(
      div.innerHTML,
      "New Content",
      "Normal HTMX swap should occur for non-JSON responses"
    );
  });

  it("fires event that bubbles up the DOM", function () {
    const mockData = { result: "success" };

    this.server.respondWith("GET", "/scoped-test", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockData),
    ]);

    let eventFiredOnParent = false;
    let eventFiredOnChild = false;

    // Create nested structure
    const container = make(`<div>
      <div hx-ext="alpine-interop" hx-get="/scoped-test">
        <button type="button">Test</button>
      </div>
    </div>`);

    chai.assert.isDefined(container, "make() should return a defined element");

    const child = container.querySelector("[hx-ext]");

    // Listen on both parent and child
    container.addEventListener("htmx:jsonResponse", function (event) {
      eventFiredOnParent = true;
    });

    child.addEventListener("htmx:jsonResponse", function (event) {
      eventFiredOnChild = true;
    });

    container.querySelector("button").click();
    this.server.respond();

    chai.assert.isTrue(
      eventFiredOnChild,
      "Event should fire on the element with hx-get"
    );
    chai.assert.isTrue(
      eventFiredOnParent,
      "Event should bubble up to parent elements"
    );
  });

  it("processes dynamically added HTMX elements", function (done) {
    this.server.respondWith("GET", "/dynamic-test", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify({ message: "dynamic success" }),
    ]);

    let eventFired = false;

    // Create container with extension
    const container = make(`<div hx-ext="alpine-interop"></div>`);
    chai.assert.isDefined(container, "Container should be created");

    // Dynamically create and add button with HTMX attributes
    const button = document.createElement("button");
    button.setAttribute("hx-get", "/dynamic-test");
    button.textContent = "Dynamic Button";

    // Listen for event on the button
    button.addEventListener("htmx:jsonResponse", function (event) {
      eventFired = true;
    });

    // Append to container (this should trigger MutationObserver)
    container.appendChild(button);

    // Small delay to allow MutationObserver to process
    setTimeout(() => {
      button.click();
      this.server.respond();

      chai.assert.isTrue(
        eventFired,
        "Event should fire for dynamically added HTMX element"
      );
      done();
    }, 50);
  });

  it("does not fire htmx:jsonResponse event when extension is not loaded", function (done) {
    this.server.respondWith("GET", "/dynamic-test-no-ext", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify({ message: "no extension" }),
    ]);

    let eventFired = false;

    // Create container WITHOUT extension
    const container = make(`<div></div>`);
    chai.assert.isDefined(container, "Container should be created");

    // Dynamically create and add button with HTMX attributes
    const button = document.createElement("button");
    button.setAttribute("hx-get", "/dynamic-test-no-ext");
    button.textContent = "Dynamic Button";

    // Listen for event
    button.addEventListener("htmx:jsonResponse", function (event) {
      eventFired = true;
    });

    // Append to container
    container.appendChild(button);

    // Small delay
    setTimeout(() => {
      button.click();
      this.server.respond();

      chai.assert.isFalse(
        eventFired,
        "htmx:jsonResponse event should not fire when extension is not loaded"
      );
      done();
    }, 50);
  });
});
