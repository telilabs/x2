"use strict";

// Minimal JSX → h() transformer.
// Text content is emitted as SafeHtml (HTML entities pass through).
// Expression children {expr} are passed as plain values and escaped by h().

function transformJSX(src) {
  let pos = 0;
  const len = src.length;

  function skipStr() {
    const q = src[pos++];
    while (pos < len) {
      if (src[pos] === "\\") { pos += 2; continue; }
      if (q === "`" && src[pos] === "$" && src[pos + 1] === "{") {
        pos += 2;
        let d = 1;
        while (pos < len && d > 0) {
          if (src[pos] === "{") d++;
          else if (src[pos] === "}") d--;
          pos++;
        }
        continue;
      }
      if (src[pos++] === q) return;
    }
  }

  function parseName() {
    const s = pos;
    while (pos < len && /[\w\-\.\:]/.test(src[pos])) pos++;
    return src.slice(s, pos);
  }

  function skipWs() {
    while (pos < len && /\s/.test(src[pos])) pos++;
  }

  // Extract the raw source inside {…}, advancing past the closing }
  function parseExpr() {
    pos++; // eat '{'
    let d = 1, s = pos;
    while (pos < len && d > 0) {
      const c = src[pos];
      if (c === '"' || c === "'" || c === "`") { skipStr(); continue; }
      if (c === "{") d++;
      else if (c === "}") { if (!--d) break; }
      pos++;
    }
    const r = src.slice(s, pos++); // pos++ eats '}'
    return r;
  }

  function parseAttrs() {
    const attrs = [];
    for (;;) {
      skipWs();
      if (pos >= len || src[pos] === ">" || (src[pos] === "/" && src[pos + 1] === ">")) break;
      const name = parseName();
      if (!name) { pos++; continue; }
      skipWs();
      if (src[pos] === "=") {
        pos++; skipWs();
        if (src[pos] === "{") {
          attrs.push([name, parseExpr(), "expr"]);
        } else {
          const q = src[pos++];
          const s = pos;
          while (pos < len && src[pos] !== q) pos++;
          attrs.push([name, src.slice(s, pos++), "str"]);
        }
      } else {
        attrs.push([name, null, "bool"]);
      }
    }
    return attrs;
  }

  function attrsToObj(attrs) {
    if (!attrs.length) return "null";
    return (
      "{" +
      attrs
        .map(([k, v, t]) => {
          const key = JSON.stringify(k);
          if (t === "bool") return `${key}: true`;
          if (t === "expr") return `${key}: (${v})`;
          return `${key}: ${JSON.stringify(v)}`;
        })
        .join(", ") +
      "}"
    );
  }

  function parseElem() {
    pos++; // eat '<'
    const isFragment = src[pos] === ">";
    const tag = isFragment ? (pos++, "") : parseName();
    const attrs = isFragment ? [] : parseAttrs();
    skipWs();

    if (!isFragment && src[pos] === "/" && src[pos + 1] === ">") {
      pos += 2;
      return `h(${JSON.stringify(tag)}, ${attrsToObj(attrs)})`;
    }

    if (!isFragment) pos++; // eat '>'
    const children = [];

    while (pos < len) {
      if (src[pos] === "<" && src[pos + 1] === "/") {
        pos += 2; parseName(); skipWs(); pos++; // consume </tag>
        break;
      }
      if (src[pos] === "<" && pos + 1 < len && (src[pos + 1] === ">" || /[a-zA-Z]/.test(src[pos + 1]))) {
        children.push(parseElem());
      } else if (src[pos] === "{") {
        const raw = parseExpr();
        children.push(transformJSX(raw)); // recurse: expression may contain JSX
      } else {
        const s = pos;
        while (pos < len && src[pos] !== "<" && src[pos] !== "{") pos++;
        // Strip leading/trailing newline-indentation, collapse middle newlines to a space.
        // Plain inline spaces (e.g. "Count: ") are preserved — only newline-adjacent
        // whitespace is affected.
        let text = src.slice(s, pos)
          .replace(/^\s*\n\s*/, "")
          .replace(/\s*\n\s*$/, "")
          .replace(/\s*\n\s*/g, " ");
        if (text) children.push(`new SafeHtml(${JSON.stringify(text)})`);
      }
    }

    const childStr = children.length ? ", " + children.join(", ") : "";
    return `h(${JSON.stringify(tag)}, ${attrsToObj(attrs)}${childStr})`;
  }

  // Main scan: copy source verbatim except where JSX starts
  let result = "";

  while (pos < len) {
    if (src[pos] === '"' || src[pos] === "'" || src[pos] === "`") {
      const s = pos; skipStr(); result += src.slice(s, pos); continue;
    }
    if (src[pos] === "/" && src[pos + 1] === "/") {
      const s = pos; while (pos < len && src[pos] !== "\n") pos++;
      result += src.slice(s, pos); continue;
    }
    if (src[pos] === "/" && src[pos + 1] === "*") {
      const s = pos; pos += 2;
      while (pos < len && !(src[pos - 1] === "*" && src[pos] === "/")) pos++;
      pos++; result += src.slice(s, pos); continue;
    }
    if (
      src[pos] === "<" && pos + 1 < len &&
      (src[pos + 1] === ">" || /[a-zA-Z]/.test(src[pos + 1])) &&
      isJSXContext(result)
    ) {
      result += parseElem();
      continue;
    }
    result += src[pos++];
  }

  return result;
}

// Determine whether the character(s) at the end of `result` allow a JSX expression.
function isJSXContext(result) {
  let i = result.length - 1;
  while (i >= 0 && /\s/.test(result[i])) i--;
  if (i < 0) return true;
  for (const kw of ["return", "default", "yield"]) {
    const s = i - kw.length + 1;
    if (s >= 0 && result.slice(s, i + 1) === kw && (s === 0 || /\W/.test(result[s - 1]))) return true;
  }
  return "(,=?:[!&|{;>".includes(result[i]);
}

module.exports = { transformJSX };
