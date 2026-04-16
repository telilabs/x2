"use strict";
const fs   = require("fs");
const path = require("path");

const FILES = {
  "app/repo.js":
`module.exports = {
  data: { count: 0 },
  getters: {
    getCount: function () { return this.count; },
  },
  setters: {
    increment: function () { this.count++; },
    reset:     function () { this.count = 0; },
  },
};
`,

  "app/router.js":
`module.exports = {};
`,

  "app/components/x2.jsx":
`exports.render = function (props) {
  return (
    <div class="app">
      <h1>Hello from x2!</h1>
      <p class="count">{repo.getters.getCount()}</p>
      <button onclick="increment()">+1</button>
      <button onclick="reset()">Reset</button>
    </div>
  );
};

exports.increment = function () {
  repo.setters.increment();
};

exports.reset = function () {
  repo.setters.reset();
};
`,

  "app/styles.css":
`* { box-sizing: border-box; }

body {
  font-family: sans-serif;
  max-width: 420px;
  margin: 80px auto;
  padding: 0 24px;
}

h1 { margin: 0 0 16px; }

.count {
  font-size: 3rem;
  font-weight: bold;
  margin: 0 0 20px;
}

button {
  padding: 10px 24px;
  font-size: 1rem;
  margin-right: 8px;
  cursor: pointer;
}
`,
};

function create(name) {
  if (!name) {
    console.error("Usage: x2 create <project-name>");
    process.exit(1);
  }

  const dir = path.resolve(name);

  if (fs.existsSync(dir)) {
    console.error("x2: directory already exists: " + dir);
    process.exit(1);
  }

  for (const [rel, content] of Object.entries(FILES)) {
    const fp = path.join(dir, rel);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, content);
  }

  console.log("x2: created " + name + "/\n");
  console.log("  cd " + name);
  console.log("  x2 serve\n");
}

module.exports = create;
