"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {readFileSync} = require("node:fs");
const {join} = require("node:path");

function readPage(name) {
  return readFileSync(join(__dirname, "..", name), "utf8");
}

test("Readers can report an article correction to the publisher", () => {
  const contact = readPage("contact.html");
  assert.match(contact, /href="mailto:support@printerresolve\.com"/i);
  assert.match(contact, /href="mailto:support@printerresolve\.com\?subject=[^"]*correction"/i);
});

test("The home and contact pages do not reintroduce the retired support request form", () => {
  for (const filename of ["index.html", "contact.html"]) {
    const page = readPage(filename);
    assert.doesNotMatch(page, /id=["']supportForm["']|<form\b[^>]*\baction=["'][^"']*formspree\.io/i);
  }
});
