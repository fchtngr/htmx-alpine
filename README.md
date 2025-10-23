# HTMX Alpine Interop Extension

This extension provides quality-of-life utilities for integrating Alpine.js and HTMX, including automatic HTMX initialization on dynamically inserted elements (e.g., via Alpine's `x-for` or `x-show` with transitions) and a custom JSON response event to make handling JSON Apis smoother.

## Features

- **Dynamic HTMX Reprocessing**: Seamlessly initialize HTMX on dynamically inserted DOM elements.
  - Normally, when rendering parts of the DOM using Alpine templates, HTMX is already initialized, leaving newly added elements with `hx-` attributes unprocessed (e.g., `hx-get` won't trigger). This extension fixes that.
  - Uses a `MutationObserver` to automatically process newly added HTMX elements created by Alpine.js directives like `x-for` and `x-show`, ensuring HTMX functionality works seamlessly with dynamic Alpine-rendered content.
- **JSON API Handling**: Dispatches custom events for JSON responses, allowing easy integration with Alpine.js and other frameworks.
  - Automatically detects JSON responses and emits a custom `htmx:jsonResponse` event with the parsed data.
  - Prevents content swapping for JSON responses by setting `hx-swap="none"` on the target element.
  - Use Alpine for client-side logic while retaining HTMX's AJAX request capabilities and features like response triggers.
  - No need to use `fetch()` or other APIs from within Alpine.js; allows you to handle all requests using a single mechanism: **HTMX**.

## Install

```html
<script src="https://unpkg.com/htmx-ext-alpine-interop@1.0.0/alpine-interop.js"></script>
```

## Usage

Add the `hx-ext="alpine-interop"` attribute to your HTMX elements. When HTMX receives a JSON response, it will emit an `htmx:jsonResponse` event that you can listen for in your Alpine.js component.

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/htmx.org@2.x.x/dist/htmx.min.js"></script>
    <script src="https://unpkg.com/htmx-ext-alpine-interop@1.x.x/alpine-interop.js"></script>

    <meta name="htmx-config" content='{"selfRequestsOnly": false}' />
</head>

<body>

    <div hx-ext="alpine-interop" x-data="{
            posts: [],
            postComments: {},
            handlePostsResponse(data) { 
                console.log('handlePostsResponse called with response data:', event.detail.data); 
                this.posts = data;
            },
            handleCommentsResponse(data, postId) {
                console.log('Comments for post:', postId, data);
                if (data.length > 0 && postId) {
                    this.postComments = { ...this.postComments, [postId]: data };
                }
            }
        }" x-init="console.log('Alpine scope initialized')">
        <button hx-get="https://jsonplaceholder.typicode.com/posts" hx-trigger="click"
            @htmx:json-response="handlePostsResponse($event.detail.data)">Click to Load Posts (Check Console)</button>
        <div x-text="'Loaded Posts: ' + posts.length"></div>
        <template x-for="post in posts" :key="post.id">
            <div class="post" :id="'post-' + post.id" style="border: 1px solid #ccc; margin: 10px; padding: 10px;">
                <h3 x-text="post.title"></h3>
                <p x-text="post.body"></p>
                <button :hx-get="`https://jsonplaceholder.typicode.com/posts/${post.id}/comments`" hx-trigger="click"
                    @htmx:json-response="handleCommentsResponse($event.detail.data, post.id)">Load Comments</button>
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

</html>
```

In this example:

- HTMX makes requests to the JSONPlaceholder API
- On JSON responses, the extension emits the htmx:jsonResponse event which Alpine.js methods handle
- The event handlers have access to the Alpine scope via this
- The parsed JSON data is available in event.detail.data
- Alpine's reactivity updates the UI automatically when data changes

## Examples

### Using htmx:jsonResponse event

Here's a minimal example showing both approaches to handling JSON responses:

```html
<div hx-ext="alpine-interop" x-data="{ 
    count: 0
}">
    <!-- Using htmx:jsonResponse event -->
    <button hx-get="/api/count" 
            @htmx:jsonResponse="count = $event.detail.data.count">
        Update Count (Using Event)
    </button>
    
    <!-- Using Alpine's @htmx:after-request.stop -->
    <button hx-get="/api/count" hx-swap="none"
            @htmx:after-request.stop="handleCount(JSON.parse($event.detail.xhr.response))">
        Update Count (Event Handler)
    </button>

    <p x-text="'Count: ' + count"></p>
</div>
```

**Key benefits**:

- The extension automatically:
  - Detects JSON responses based on Content-Type header
  - Prevents content swapping for JSON responses by setting hx-swap="none"
  - Parses JSON and provides it in the event detail
  - Works with dynamically created HTMX elements

## Event Details

- `htmx:jsonResponse`: Fired when a JSON response is received
  - `event.detail.data`: The parsed JSON data
  - `event.detail.xhr`: The XMLHttpRequest object

## Motivation

This extension addresses the practical challenges of integrating existing or thrid-party JSON APIs into HTMX+Alpine.js applications.

### Existing JSON APIs / 3rd Party APIs

Many real-world applications must integrate with third-party services, legacy systems, or modern APIs that return JSON rather than HTML. This extension provides a pragmatic bridge, allowing HTMX to work with JSON APIs by routing responses to Alpine.js methods for client-side processing.

### Pragmatism

As discussed in HTMX's essay on [Hypermedia-Friendly Scripting](https://htmx.org/essays/hypermedia-friendly-scripting/), maintaining conceptual purity shouldn't come at the expense of practical functionality. When faced with existing JSON APIs that can't be easily changed, this extension offers a clean way to integrate them without abandoning HTMX's benefits. It isolates JSON handling to specific Alpine.js methods while keeping the rest of the application hypermedia-driven.
