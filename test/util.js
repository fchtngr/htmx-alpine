/* Test Utilities */

function byId(id) {
  return document.getElementById(id);
}

function make(htmlStr) {
  htmlStr = htmlStr.trim();
  var makeFn = function () {
    var range = document.createRange();
    var fragment = range.createContextualFragment(htmlStr);
    var wa = getWorkArea();
    var child = null;
    var children = fragment.children || fragment.childNodes; // IE
    var appendedChildren = [];
    while (children.length > 0) {
      child = children[0];
      wa.appendChild(child);
      appendedChildren.push(child);
    }
    for (var i = 0; i < appendedChildren.length; i++) {
      htmx.process(appendedChildren[i]);
    }
    return child; // return last added element
  };
  if (getWorkArea()) {
    return makeFn();
  } else {
    ready(makeFn);
  }
}

function ready(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

function getWorkArea() {
  return byId("work-area");
}

function clearWorkArea() {
  var wa = getWorkArea();
  if (wa) wa.innerHTML = "";
}

function makeServer() {
  var server = sinon.fakeServer.create({
    respondImmediately: true,
  });
  server.respondWith("GET", "/test", "response text");
  return server;
}

function makeWorkArea() {
  var wa = document.createElement("div");
  wa.id = "work-area";
  wa.style.display = "none";
  document.body.appendChild(wa);
  return wa;
}

ready(function () {
  makeWorkArea();
});
