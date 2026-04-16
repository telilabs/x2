"use strict";
const fs   = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");
const { transformJSX } = require("./jsx");

// Allow .jsx component files — transform JSX to h() calls before Node evaluates them.
require.extensions[".jsx"] = function (mod, filename) {
  mod._compile(transformJSX(fs.readFileSync(filename, "utf8")), filename);
};

const uid = () => "_x2" + randomBytes(8).toString("hex");

function loadDir(dir) {
  const out = {};
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) Object.assign(out, loadDir(fp));
    else if (/\.jsx?$/.test(f)) {
      delete require.cache[require.resolve(fp)];
      out[f] = require(fp);
    }
  }
  return out;
}

function load(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

function fixRepo(s, pn) {
  return s
    .replace(/repo\.getters\./g, `${pn}_getters.`)
    .replace(/repo\.setters\./g, `${pn}_setters.`)
    .replace(/\brepo\b/g, pn);
}

function rename(s, map) {
  for (const [k, v] of Object.entries(map))
    s = s.replace(new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s*\\()`, "g"), v);
  return s;
}

function wrap(s, pn) {
  if (!s.includes(`${pn}_setters.`) && !s.includes("setRoute")) return s;
  return /^\s*async[\s(]/.test(s)
    ? `(async function(...__a){try{return await(${s})(...__a)}finally{x2()}})`
    : `(function(...__a){try{return(${s})(...__a)}finally{x2()}})`;
}

function bundle(projectDir, outputDir) {
  projectDir = path.resolve(projectDir || ".");
  outputDir  = path.resolve(outputDir  || path.join(projectDir, "x2Target"));

  const pn  = uid();
  const rn  = uid();
  const app = path.join(projectDir, "app");

  const repo   = load(path.join(app, "repo.js"));
  const router = load(path.join(app, "router.js"));
  const comps  = loadDir(path.join(app, "components"));

  // Reserved names must not be renamed — they are framework globals in the browser bundle.
  const RESERVED = new Set(["render", "html", "h", "esc", "SafeHtml"]);
  const ns = {};
  for (const [file, exp] of Object.entries(comps)) {
    const cn = path.basename(file).replace(/\.jsx?$/, "");
    for (const k of Object.keys(exp)) if (!RESERVED.has(k)) ns[k] = `${cn}_${k}`;
  }

  const fix = (s) => wrap(rename(fixRepo(s, pn), ns), pn);
  const methods = (map) => Object.entries(map)
    .filter(([, f]) => typeof f === "function")
    .map(([n, f]) => `${n}:${f.toString().replace(/\bthis\b/g, pn)}`)
    .join(",");

  let out =
    `function esc(v){var s=v==null?"":String(v);return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}\n` +
    `function SafeHtml(s){this.s=s}SafeHtml.prototype.toString=function(){return this.s}\n` +
    `function html(t){var r=t[0];for(var i=1;i<arguments.length;i++){var v=arguments[i];r+=Array.isArray(v)?v.map(function(x){return x instanceof SafeHtml?x.s:esc(x)}).join(""):v instanceof SafeHtml?v.s:esc(v);r+=t[i]}return new SafeHtml(r)}\n` +
    `function h(tag,attrs){var a="",VOID={area:1,base:1,br:1,col:1,embed:1,hr:1,img:1,input:1,link:1,meta:1,param:1,source:1,track:1,wbr:1},BOOL={checked:1,disabled:1,selected:1,readonly:1,multiple:1,required:1,autofocus:1,hidden:1,open:1};if(attrs)for(var k in attrs){var v=attrs[k];if(v==null)continue;if(BOOL[k]){if(v)a+=" "+k;}else{a+=" "+k+'="'+esc(String(v))+'"';}}var inner="";function ch(c){if(c==null||c===false||c===true)return;if(Array.isArray(c)){c.forEach(ch);return;}inner+=c instanceof SafeHtml?c.s:esc(String(c));}Array.prototype.slice.call(arguments,2).forEach(ch);if(VOID[tag])return new SafeHtml("<"+tag+a+">");if(!tag)return new SafeHtml(inner);return new SafeHtml("<"+tag+a+">"+inner+"</"+tag+">")}\n` +
    `let ${rn}=${JSON.stringify(repo.data)}\n` +
    `function setRoute(p){history.pushState({},"",p)}\n` +
    `function getRoute(){return location.pathname}\n` +
    `let _s;window.__x2_startRender=()=>{_s=JSON.parse(JSON.stringify(${rn}))};window.__x2_endRender=()=>{_s=null}\n` +
    `let ${pn}=new Proxy(${rn},{get:(_,p)=>(_s||${rn})[p],set:(_,p,v)=>{${rn}[p]=v;return true}})\n` +
    `const ${pn}_getters={${methods(repo.getters)}}\n` +
    `const ${pn}_setters={${methods(repo.setters)}}\n` +
    `window.renderers={}\n`;

  for (const [file, exp] of Object.entries(comps)) {
    const cn = path.basename(file).replace(/\.jsx?$/, "");
    for (const [k, v] of Object.entries(exp)) {
      if (k === "render") {
        out += `window.renderers["${cn}"]=${rename(fixRepo(v.toString(), pn), ns)}\n`;
      } else if (typeof v === "function") {
        out += `const ${ns[k]}=${fix(v.toString())}\n`;
      } else if (v != null) {
        try { out += `let ${ns[k]}=${JSON.stringify(v)}\n`; } catch {}
      }
    }
  }

  out += `window.router={}\n`;
  for (const [n, f] of Object.entries(router))
    if (typeof f === "function") out += `window.router["${n}"]=${fixRepo(f.toString(), pn)}\n`;

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "app.js"), out);
  fs.writeFileSync(path.join(outputDir, "x2.js"), fs.readFileSync(path.join(__dirname, "../runtime/init.js"), "utf8"));
  fs.copyFileSync(
    fs.existsSync(path.join(app, "index.html")) ? path.join(app, "index.html") : path.join(__dirname, "../template/index.html"),
    path.join(outputDir, "index.html")
  );
  if (fs.existsSync(path.join(app, "styles.css")))
    fs.copyFileSync(path.join(app, "styles.css"), path.join(outputDir, "styles.css"));

  console.log(`x2: built → ${outputDir}`);
  return outputDir;
}

if (require.main === module) bundle(process.argv[2]);
module.exports = bundle;
