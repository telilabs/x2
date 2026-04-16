exports.render = function (props) {
  return (
    <div class="about">
      <h2>About x2</h2>
      <p>
        x2 is a minimal, zero-dependency component framework for the browser.
        Write components as JSX functions, define your state in a repo, and the CLI
        bundles everything into a single-page app with no toolchain required.
      </p>
      <p>
        Components are custom elements prefixed with <code>x2-</code>.
        Props are passed as <code>x2-*</code> HTML attributes.
        Any function that calls a setter or <code>setRoute</code>
        automatically triggers a re-render.
      </p>
      <p><a href="/" onclick="backHome(event)">← Back to notes</a></p>
    </div>
  );
};

exports.backHome = function (event) {
  event.preventDefault();
  setRoute("/");
};
