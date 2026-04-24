const fs = require("fs");
const html = fs.readFileSync("public/index.html","utf8");
const moduleTag = '<script type="module">';
const moduleStart = html.indexOf(moduleTag);
const moduleEnd = html.indexOf("</script>", moduleStart);
const js = html.slice(html.indexOf(">", moduleStart) + 1, moduleEnd);
console.log("Module JS size:", js.length, "chars");
try {
  new Function(js.replace(/import .* from .*/g, "// import removed").replace(/export /g, "// export "));
  console.log("SYNTAX: No obvious errors detected");
} catch(e) {
  console.log("SYNTAX ERROR:", e.message);
  const st = e.stack.split("\n").slice(0,3).join("\n");
  console.log("At:", st);
}
const lines = js.split("\n");
console.log("Total lines:", lines.length);
const addEventRe = /getElementById\(["']([^"']+)["']\)\.addEventListener/g;
let m2;
const ids = [];
while ((m2 = addEventRe.exec(js)) !== null) ids.push(m2[1]);
console.log("Button listener IDs:", ids.length);
ids.forEach(id => {
  if (!html.includes('id="' + id + '"')) { console.log("MISSING ELEMENT:", id); }
});
const lastLines = lines.slice(-10).join("\n");
console.log("Last 10 lines:", lastLines);