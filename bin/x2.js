#!/usr/bin/env node
"use strict";

const [,, command, arg] = process.argv;

switch (command) {
  case "create":
    require("../lib/create")(arg);
    break;
  case "build":
    require("../lib/bundle")(arg);
    break;
  case "serve":
    require("../lib/serve")(arg);
    break;
  default:
    console.log(
      "Usage:\n" +
      "  x2 create <project-name>  Scaffold a new project\n" +
      "  x2 build  [project-dir]   Bundle the app into x2Target/\n" +
      "  x2 serve  [project-dir]   Build, watch, and serve the app\n"
    );
    process.exit(command ? 1 : 0);
}
