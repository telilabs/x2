# x2

A minimal, zero-dependency component framework for the browser. Write components as JSX functions, define your state in a repo, and the CLI bundles everything into a ready-to-serve SPA — no Webpack, no Babel, no config files.

```sh
npm install -g @telilabs/x2
x2 create my-app
cd my-app
x2 serve
```

---

## Quick start

```sh
x2 create my-app   # scaffold a new project
x2 serve  my-app   # build + watch + serve at http://127.0.0.1:3000
x2 build  my-app   # production bundle → my-app/x2Target/
```

Set `PORT=8080` to use a different port.

`x2 create` produces this structure:

```
my-app/
  app/
    repo.js          ← state (data, getters, setters)
    router.js        ← route guards
    components/      ← one .jsx file per component
      x2.jsx         ← root component (required)
    styles.css       ← optional global styles
    index.html       ← optional HTML template override
```

---

## Components

Each file in `app/components/` is a component. The filename (camelCase) maps to a custom HTML tag (kebab-case with an `x2-` prefix):

| File | Tag |
|---|---|
| `x2.jsx` | `<x2>` (root, rendered automatically) |
| `appHeader.jsx` | `<x2-app-header>` |
| `noteItem.jsx` | `<x2-note-item>` |

A component exports a `render(props)` function that returns JSX:

```jsx
// components/greeting.jsx
exports.render = function (props) {
  return <h2>Hello, {props.name}!</h2>;
};
```

Use it in another component:

```jsx
<x2-greeting x2-name="Alice" />
```

Props are passed as `x2-*` HTML attributes. All prop values arrive as **strings**. The special `inner` prop holds the element's text content.

### JSX rules

- **Expression children** `{expr}` are auto-escaped. User content is safe by default.
- **Text content** is treated as raw HTML — HTML entities like `&#x2715;` work as expected.
- **Multiple root elements** require a fragment `<>...</>`.
- **Self-closing** works for any tag: `<x2-header />`.
- **Boolean HTML attributes** (`checked`, `disabled`, `selected`, etc.) are emitted correctly from boolean values. All other attributes are stringified, so `x2-done={false}` emits `x2-done="false"`.

```jsx
exports.render = function (props) {
  var done = props.done === "true";
  return (
    <li class={"item" + (done ? " done" : "")}>
      <input type="checkbox" checked={done} />
      <span>{props.text}</span>
    </li>
  );
};
```

### The `html` template tag

For quick one-liners or cases where you need to embed raw HTML, the `html` tagged template is also available. All `${interpolations}` are auto-escaped:

```js
exports.render = function (props) {
  return html`<p>Hello, ${props.name}!</p>`;
};
```

---

## State (repo)

`app/repo.js` exports `data`, `getters`, and `setters`. Use `this` inside getters and setters to access the store — the bundler wires it up automatically.

```js
module.exports = {
  data: { count: 0 },
  getters: {
    getCount: function () { return this.count; },
  },
  setters: {
    increment: function () { this.count++; },
    reset:     function () { this.count = 0; },
  },
};
```

**In render functions** — access via `repo.getters.*`. During a render, the state is a read-only snapshot so mutations can't sneak in:

```jsx
exports.render = function (props) {
  return <p>Count: {repo.getters.getCount()}</p>;
};
```

**In event handlers** — call `repo.setters.*`. Any exported function that calls a setter (or `setRoute`) is automatically wrapped to trigger a full re-render after it runs. This works with regular, arrow, and `async` functions:

```js
exports.increment = function () {
  repo.setters.increment();
};

// async — re-render fires after the await settles
exports.loadData = async function () {
  var data = await fetch("/api").then(r => r.json());
  repo.setters.setItems(data);
};
```

Reference event handlers by their **bare name** in JSX — the bundler namespaces them automatically to avoid globals collisions:

```jsx
exports.render = function (props) {
  return <button onclick="increment()">+1</button>;
  //                      ↑ becomes "counter_increment" in the bundle
};
```

---

## Routing

`app/router.js` exports named route guards — functions that return `true` when the route should be active. `getRoute()` and `setRoute(path)` are globals provided by the runtime.

```js
module.exports = {
  home:  function () { return getRoute() === "/"; },
  about: function () { return getRoute() === "/about"; },
};
```

Wrap content in `<x2-route x2-route="name">` to show or hide it based on the current path. Hidden routes skip rendering their children entirely:

```jsx
exports.render = function (props) {
  return (
    <>
      <x2-route x2-route="home"><x2-home-page /></x2-route>
      <x2-route x2-route="about"><x2-about-page /></x2-route>
    </>
  );
};
```

Navigate with `setRoute` — the re-render is triggered automatically. The back/forward browser buttons also trigger a re-render via `popstate`:

```js
exports.goAbout = function (event) {
  event.preventDefault();
  setRoute("/about");
};
```

---

## Example app

A working note-taking app is included in `example/`. It demonstrates components, state, routing, props, and event handlers.

```sh
node bin/x2.js serve example
# → http://127.0.0.1:3000  (auto-reloads on save)
```

**Features shown:**
- Root component with fragment and child components
- Two routes (Notes / About) with lazy rendering of inactive pages
- Repo with getters (`all`, `count`, `doneCount`) and setters (`add`, `toggle`, `remove`)
- Props via `x2-*` attributes — `noteItem` receives `id`, `text`, `done`
- Auto-escaped expression children `{n.text}` — user content is XSS-safe
- Conditional JSX: `count > 0 ? <span>...</span> : null`
- Stats badge in the header driven by live getter values

---

## How the build works

`x2 build` produces three files in `x2Target/`:

| File | Contents |
|---|---|
| `app.js` | State, getters, setters, and component functions — namespaced with UUID-based names to avoid global collisions |
| `x2.js` | The runtime: BFS renderer, in-place DOM reconciler, snapshot isolation, router |
| `index.html` | Your `app/index.html` or the default template |

The bundler runs a minimal JSX transform (no Babel, no external dependencies) that converts JSX to `h()` calls before writing the bundle. Component `.jsx` files are loaded with a custom `require` extension handler — you write JSX, the bundler outputs plain JavaScript.

The runtime uses an in-place DOM reconciler (`patchDOM`) rather than wholesale `innerHTML` replacement, so input focus, scroll position, and checkbox state are preserved across re-renders.

---

## Running the tests

```sh
npm test
```

---

## Known limitations

- **No SSR.** The framework is browser-only.
- **No route parameters.** Routes are matched by exact guard functions in `router.js`, not a pattern like `/post/:id`.
- **`applyRenames` only matches function calls.** Cross-component references must be called with `()` — passing a function reference (e.g. `arr.map(myFn)`) will not be renamed in the bundle.
- **One app per page.** The state proxy and renderer registry are globals; multiple independent x2 apps on the same page are not supported.
- **JSX heuristic detection.** The JSX transformer uses contextual heuristics rather than a full parser. Unusual patterns (e.g. a tagged template immediately after `<`) could confuse it. Use `.jsx` file extension to make intent clear.

---

## License

MIT
