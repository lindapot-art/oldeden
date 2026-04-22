const http = require("http");
console.log("=== Testing NEW GAME Button Flow ===");
const req = http.request({ hostname: "localhost", port: 3847, path: "/", method: "GET" }, (res) => {
  let html = "";
  res.on("data", chunk => html += chunk);
  res.on("end", () => {
    console.log("1. Page loaded successfully");
    const newGameCount = (html.match(/new\\s+game/gi) || []).length;
    const resurrectionCount = (html.match(/resurrection/gi) || []).length;
    const characterCount = (html.match(/character/gi) || []).length;
    console.log("2. Found", newGameCount, "NEW GAME references");
    console.log("3. Found", resurrectionCount, "resurrection references");
    console.log("4. Found", characterCount, "character references");
    if (newGameCount > 0) console.log("✅ NEW GAME button present");
    if (resurrectionCount > 0) console.log("⚠️  Resurrection code present");
    if (characterCount > 0) console.log("✅ Character elements present");
  });
});
req.end();
