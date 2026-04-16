function x2() {
  const root = document.createElement("x2");
  const queue = [{ componentName: "x2", props: {}, element: root }];
  window.__x2_startRender();
  while (queue.length) {
    const cur = queue.shift();
    if (renderComponent(cur)) enqueueChildren(cur.element, queue);
  }
  window.__x2_endRender();
  patchDOM(document.body, root);
}

function renderComponent({ componentName: name, props, element: el }) {
  if (name === "route") {
    const active = !!window.router[props.route]();
    el.style.display = active ? "" : "none";
    return active;
  }
  try {
    el.innerHTML = window.renderers[name](props);
  } catch (e) {
    el.innerHTML = `<x2-error style="outline:2px solid red;padding:4px;font-size:.8em">[x2 &lt;${name}&gt;: ${String(e.message || e).replace(/</g, "&lt;")}]</x2-error>`;
    console.error("x2 render error:", name, e);
  }
  return true;
}

function enqueueChildren(el, q) {
  for (const c of el.children) {
    if (c.localName.startsWith("x2-")) {
      const props = { inner: c.textContent };
      for (const { name, value } of c.attributes)
        if (name.startsWith("x2-")) props[name.slice(3)] = value;
      q.push({
        componentName: c.localName.slice(3).replace(/-([a-z])/g, (_, l) => l.toUpperCase()),
        props,
        element: c,
      });
    } else {
      enqueueChildren(c, q);
    }
  }
}

function patchDOM(o, n) {
  const oc = [...o.childNodes], nc = [...n.childNodes];
  nc.forEach((nk, i) => {
    const ok = oc[i];
    if (!ok) { o.appendChild(nk.cloneNode(true)); return; }
    if (ok.nodeType !== nk.nodeType || ok.nodeName !== nk.nodeName) {
      o.replaceChild(nk.cloneNode(true), ok); return;
    }
    if (nk.nodeType === 3) {
      if (ok.textContent !== nk.textContent) ok.textContent = nk.textContent;
      return;
    }
    for (const { name: k, value: v } of nk.attributes)
      /^(checked|disabled|selected)$/.test(k) ? (ok[k] = true) : ok.getAttribute(k) !== v && ok.setAttribute(k, v);
    for (const { name: k } of [...ok.attributes])
      if (!nk.hasAttribute(k)) /^(checked|disabled|selected)$/.test(k) ? (ok[k] = false) : ok.removeAttribute(k);
    patchDOM(ok, nk);
  });
  oc.slice(nc.length).forEach(k => k.parentNode === o && o.removeChild(k));
}

x2();
window.addEventListener("popstate", x2);
