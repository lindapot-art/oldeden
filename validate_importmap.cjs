const fs = require("fs");
const html = fs.readFileSync("public/index.html","utf8");
const imTag = '<script type="importmap">';
const imStart = html.indexOf(imTag) + imTag.length;
const imEnd = html.indexOf("</script>", imStart);
const importmap = html.slice(imStart, imEnd).trim();
try {
  const parsed = JSON.parse(importmap);
  console.log("Import map valid:", JSON.stringify(parsed.imports, null, 2));
} catch(e) {
  console.log("IMPORT MAP PARSE ERROR:", e.message);
}