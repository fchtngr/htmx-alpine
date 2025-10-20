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

  it("handles JSON responses with hx-handle-json", function () {
    const mockPosts = [
      { id: 1, title: "Test Post 1", body: "Test body 1" },
      { id: 2, title: "Test Post 2", body: "Test body 2" },
    ];

    this.server.respondWith("GET", "/posts", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockPosts),
    ]);

    let handlerCalled = false;
    let receivedData = null;

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/posts" hx-handle-json="handlePosts">
      <button type="button">Load Posts</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Mock Alpine data with handler
    div._alpineData = {
      posts: [],
      handlePosts: function (data) {
        handlerCalled = true;
        receivedData = data;
        this.posts = data;
      },
    };

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.isTrue(handlerCalled, "Alpine handler should be called");
    chai.assert.deepEqual(
      receivedData,
      mockPosts,
      "Handler should receive parsed JSON data"
    );
  });

  it("passes parameters with hx-handle-json-params", function () {
    const mockComments = [
      { id: 1, name: "User 1", body: "Comment 1" },
      { id: 2, name: "User 2", body: "Comment 2" },
    ];

    this.server.respondWith("GET", "/posts/1/comments", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockComments),
    ]);

    let handlerCalled = false;
    let receivedData = null;
    let receivedPostId = null;

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/posts/1/comments" hx-handle-json="handleComments" hx-handle-json-params="1">
      <button type="button">Load Comments</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Mock Alpine data with handler
    div._alpineData = {
      handleComments: function (data, element, postId) {
        handlerCalled = true;
        receivedData = data;
        receivedPostId = postId;
      },
    };

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.isTrue(handlerCalled, "Alpine handler should be called");
    chai.assert.deepEqual(
      receivedData,
      mockComments,
      "Handler should receive parsed JSON data"
    );
    chai.assert.equal(
      receivedPostId,
      "1",
      "Handler should receive the postId parameter"
    );
  });

  it("ignores non-JSON responses", function () {
    this.server.respondWith("GET", "/html-content", [
      200,
      { "Content-Type": "text/html" },
      "<div>HTML Content</div>",
    ]);

    let handlerCalled = false;

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/html-content" hx-handle-json="handleResponse">
      <button type="button">Load HTML</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Mock Alpine data with handler
    div._alpineData = {
      handleResponse: function (data) {
        handlerCalled = true;
      },
    };

    div.querySelector("button").click();
    this.server.respond();

    chai.assert.isFalse(
      handlerCalled,
      "Handler should not be called for non-JSON responses"
    );
  });

  it("prevents HTMX swap when handler is present", function () {
    const mockData = { message: "test" };

    this.server.respondWith("GET", "/test", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockData),
    ]);

    const div =
      make(`<div hx-ext="alpine-interop" hx-get="/test" hx-handle-json="handleData" hx-target="this">
      <button type="button">Test</button>
    </div>`);

    chai.assert.isDefined(div, "make() should return a defined element");

    // Mock Alpine data with handler
    div._alpineData = {
      handleData: function (data) {
        // Handler does nothing, just prevents swap
      },
    };

    const originalContent = div.innerHTML;
    div.querySelector("button").click();
    this.server.respond();

    // Content should remain unchanged since swap was prevented
    chai.assert.equal(
      div.innerHTML,
      originalContent,
      "Content should not change when handler prevents swap"
    );
  });

  it("allows normal HTMX behavior when no handler is specified", function () {
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
      "Normal HTMX swap should occur when no JSON handler is specified"
    );
  });

  it("traverses DOM to find Alpine scope", function () {
    const mockData = { result: "success" };

    this.server.respondWith("GET", "/scoped-test", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify(mockData),
    ]);

    let handlerCalled = false;

    // Create nested structure where handler is in parent scope
    const container = make(`<div>
      <div hx-ext="alpine-interop" hx-get="/scoped-test" hx-handle-json="handleData">
        <button type="button">Test</button>
      </div>
    </div>`);

    chai.assert.isDefined(container, "make() should return a defined element");

    // Mock Alpine data on container (parent scope)
    container._alpineData = {
      handleData: function (data) {
        handlerCalled = true;
      },
    };

    container.querySelector("button").click();
    this.server.respond();

    chai.assert.isTrue(
      handlerCalled,
      "Handler should be found by traversing up the DOM"
    );
  });

  it("processes dynamically added HTMX elements when extension is loaded", function () {
    this.server.respondWith("GET", "/dynamic-test", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify({ message: "dynamic success" }),
    ]);

    let handlerCalled = false;

    // Create container with extension
    const container = make(`<div hx-ext="alpine-interop"></div>`);
    chai.assert.isDefined(container, "Container should be created");

    // Mock Alpine data
    container._alpineData = {
      handleDynamic: function (data) {
        handlerCalled = true;
      },
    };

    // Dynamically create and add button with HTMX attributes
    const button = document.createElement("button");
    button.setAttribute("hx-get", "/dynamic-test");
    button.setAttribute("hx-handle-json", "handleDynamic");
    button.textContent = "Dynamic Button";

    // Append to container (this should trigger MutationObserver)
    container.appendChild(button);

    // Small delay to allow MutationObserver to process
    setTimeout(() => {
      button.click();
      this.server.respond();

      chai.assert.isTrue(
        handlerCalled,
        "Handler should be called for dynamically added HTMX element when extension is loaded"
      );
    }, 10);
  });

  it("does not process dynamically added HTMX elements when extension is not loaded", function () {
    this.server.respondWith("GET", "/dynamic-test-no-ext", [
      200,
      { "Content-Type": "application/json" },
      JSON.stringify({ message: "no extension" }),
    ]);

    let handlerCalled = false;

    // Create container WITHOUT extension
    const container = make(`<div></div>`);
    chai.assert.isDefined(container, "Container should be created");

    // Mock Alpine data (but extension won't find it)
    container._alpineData = {
      handleDynamic: function (data) {
        handlerCalled = true;
      },
    };

    // Dynamically create and add button with HTMX attributes
    const button = document.createElement("button");
    button.setAttribute("hx-get", "/dynamic-test-no-ext");
    button.setAttribute("hx-handle-json", "handleDynamic");
    button.textContent = "Dynamic Button";

    // Append to container
    container.appendChild(button);

    // Small delay
    setTimeout(() => {
      button.click();
      this.server.respond();

      chai.assert.isFalse(
        handlerCalled,
        "Handler should not be called for dynamically added HTMX element when extension is not loaded"
      );
    }, 10);
  });
});
