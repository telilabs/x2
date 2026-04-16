"use strict";
const assert = require("assert");
const { transformJSX } = require("../lib/jsx");

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log("  ✓ " + name);
    passed++;
  } catch (e) {
    console.error("  ✗ " + name);
    console.error("    " + e.message);
    failed++;
  }
}

function eq(input, expected) {
  const actual = transformJSX(input);
  assert.strictEqual(actual, expected);
}

console.log("\nJSX transformer\n");

test("simple element with string attribute", () => {
  eq(
    'return <div class="foo">Hello</div>',
    'return h("div", {"class": "foo"}, new SafeHtml("Hello"))'
  );
});

test("self-closing element", () => {
  eq(
    'return <input type="text" />',
    'return h("input", {"type": "text"})'
  );
});

test("element with no attributes", () => {
  eq(
    'return <p>text</p>',
    'return h("p", null, new SafeHtml("text"))'
  );
});

test("fragment with children", () => {
  eq(
    'return (<>\n  <div />\n  <span />\n</>)',
    'return (h("", null, h("div", null), h("span", null)))'
  );
});

test("expression attribute", () => {
  eq(
    'return <div class={myClass}>text</div>',
    'return h("div", {"class": (myClass)}, new SafeHtml("text"))'
  );
});

test("boolean attribute", () => {
  eq(
    'return <input disabled />',
    'return h("input", {"disabled": true})'
  );
});

test("expression child", () => {
  eq(
    'return <p>{message}</p>',
    'return h("p", null, message)'
  );
});

test("mixed text and expression children", () => {
  eq(
    'return <p>Count: {n}</p>',
    'return h("p", null, new SafeHtml("Count: "), n)'
  );
});

test("nested elements", () => {
  eq(
    'return <ul><li>one</li><li>two</li></ul>',
    'return h("ul", null, h("li", null, new SafeHtml("one")), h("li", null, new SafeHtml("two")))'
  );
});

test("JSX inside expression child (nested transform)", () => {
  eq(
    'return <ul>{items.map(i => <li>{i}</li>)}</ul>',
    'return h("ul", null, items.map(i => h("li", null, i)))'
  );
});

test("HTML entity in text passes through as SafeHtml", () => {
  eq(
    'return <button>&#x2715;</button>',
    'return h("button", null, new SafeHtml("&#x2715;"))'
  );
});

test("ternary with JSX on both branches", () => {
  eq(
    'return ok ? <p>yes</p> : <p>no</p>',
    'return ok ? h("p", null, new SafeHtml("yes")) : h("p", null, new SafeHtml("no"))'
  );
});

test("logical && with JSX", () => {
  eq(
    'return show && <span>hi</span>',
    'return show && h("span", null, new SafeHtml("hi"))'
  );
});

test("JSX after =", () => {
  eq(
    'var x = <em>note</em>',
    'var x = h("em", null, new SafeHtml("note"))'
  );
});

test("strings are not transformed (no false positives)", () => {
  eq(
    'var s = "<div class=\\"foo\\">bar</div>"',
    'var s = "<div class=\\"foo\\">bar</div>"'
  );
});

test("comparison operator is not JSX", () => {
  eq(
    'var ok = a < b',
    'var ok = a < b'
  );
});

test("line comments are preserved", () => {
  eq(
    '// <div>not jsx</div>\nreturn <p>yes</p>',
    '// <div>not jsx</div>\nreturn h("p", null, new SafeHtml("yes"))'
  );
});

test("block comments are preserved", () => {
  eq(
    '/* <div>not jsx</div> */\nreturn <p>yes</p>',
    '/* <div>not jsx</div> */\nreturn h("p", null, new SafeHtml("yes"))'
  );
});

test("hyphenated tag and attribute names", () => {
  eq(
    'return <x2-note-item x2-id={n.id} />',
    'return h("x2-note-item", {"x2-id": (n.id)})'
  );
});

test("multiline JSX collapses whitespace in text", () => {
  eq(
    'return <p>\n  Hello\n  World\n</p>',
    'return h("p", null, new SafeHtml("Hello World"))'
  );
});

test("multiple attributes", () => {
  eq(
    'return <input type="checkbox" checked={done} />',
    'return h("input", {"type": "checkbox", "checked": (done)})'
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
