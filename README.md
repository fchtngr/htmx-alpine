# HTMX Alpine Interop Extension

This extension enables seamless interoperability between HTMX and Alpine.js by allowing HTMX to invoke Alpine.js methods when receiving JSON responses.

## Features

- **JSON API Handling**: Automatically intercepts JSON responses from HTMX requests and routes them to Alpine.js methods for processing, enabling complex client-side data manipulation without page refreshes
- **Dynamic HTMX Reprocessing**: Uses a MutationObserver to automatically process newly added HTMX elements created by Alpine.js directives like `x-for` and `x-show`, ensuring HTMX functionality works seamlessly with dynamic Alpine content

## Install

```html
<script src="https://unpkg.com/htmx-ext-alpine-interop@1.0.0/alpine-interop.js"></script>
```

## Usage

Add the `hx-ext="alpine-interop"` attribute to your HTMX elements. When HTMX receives a JSON response, it will look for an `hx-handle-json` attribute specifying the Alpine.js method to call.

```html
<header>
  <script src="https://unpkg.com/htmx.org@latest"></script>
  <script src="https://unpkg.com/htmx-ext-alpine-interop@1.0.0/alpine-interop.js"></script>
  <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
</header>

<body>
  <div hx-ext="alpine-interop" x-data="{
              posts: [],
              postComments: {},
              handlePosts(data, elt) {
                  console.log('handlePosts called with response data:', data);
                  this.posts = data;
              },
              handleComments(data, elt, postId) {
                  console.log('Comments for post:', postId, data);
                  if (data.length > 0 && postId) {
                      this.postComments = { ...this.postComments, [postId]: data };
                  }
              }
          }" x-init="console.log('Alpine scope initialized')">
      <button hx-get="https://jsonplaceholder.typicode.com/posts" hx-trigger="click"
          hx-handle-json="handlePosts">Click to Load Posts (Check Console)</button>
      <div x-text="'Loaded Posts: ' + posts.length"></div>
      <template x-for="post in posts" :key="post.id">
          <div class="post" :id="'post-' + post.id" style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
              <h3 x-text="post.title"></h3>
              <p x-text="post.body"></p>
              <button :hx-get="`https://jsonplaceholder.typicode.com/posts/${post.id}/comments`" hx-trigger="click"
                  hx-handle-json="handleComments" :hx-handle-json-params="post.id">Load Comments</button>
              <div x-show="postComments[post.id]" style="margin-top: 10px;">
                  <h4>Comments:</h4>
                  <template x-for="comment in postComments[post.id]" :key="comment.id">
                      <div style="border-left: 2px solid #ddd; margin: 5px 0; padding-left: 10px;">
                          <strong x-text="comment.name"></strong>
                          <p x-text="comment.body"></p>
                      </div>
                  </template>
              </div>
          </div>
      </template>
  </div>
</body>
```

In this example:
- HTMX makes requests to the JSONPlaceholder API
- On JSON responses, Alpine.js methods (`handlePosts`, `handleComments`) are called with the parsed data
- The methods have access to the Alpine scope via `this`
- Additional parameters can be passed via `hx-handle-json-params` (like the post ID for comments)
- Alpine's reactivity updates the UI automatically when data changes

## Attributes

- `hx-handle-json`: Specifies the name of the Alpine.js method to call
- `hx-handle-json-params`: Comma-separated list of additional parameters to pass to the method

## Notes

- The extension only processes JSON responses (content-type includes 'application/json')
- The Alpine.js method must be defined in the scope of the element or its ancestors
- If no handler is found, HTMX proceeds with normal swapping
- The extension prevents HTMX's default swap when a handler is present

## Motivation

This extension addresses the practical challenges of building modern web applications that need to integrate with existing JSON APIs while maintaining HTMX's hypermedia-driven philosophy.

### Existing JSON APIs / 3rd Party APIs

Many real-world applications must integrate with third-party services, legacy systems, or modern APIs that return JSON rather than HTML. This extension provides a pragmatic bridge, allowing HTMX to work with JSON APIs by routing responses to Alpine.js methods for client-side processing.

### Pragmatism

As discussed in HTMX's essay on [Hypermedia-Friendly Scripting](https://htmx.org/essays/hypermedia-friendly-scripting/), maintaining conceptual purity shouldn't come at the expense of practical functionality. When faced with existing JSON APIs that can't be easily changed, this extension offers a clean way to integrate them without abandoning HTMX's benefits. It isolates JSON handling to specific Alpine.js methods while keeping the rest of the application hypermedia-driven.