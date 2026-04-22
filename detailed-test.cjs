const http = require("http");
console.log("=== Detailed NEW GAME Analysis ===");
const req = http.request({ hostname: "localhost", port: 3847, path: "/", method: "GET" }, (res) => {
  let html = "";
  res.on("data", chunk => html += chunk);
  res.on("end", () => {
    console.log("1. Response status:", res.statusCode);
    console.log("2. Content length:", html.length);
    
    // Look for various button patterns
    const patterns = {
      "new game (case insensitive)": /new.{0,10}game/gi,
      "button elements": /<button[^>]*>[^<]*<\\/button>/gi,
      "input buttons": /<input[^>]*type=["\'](button|submit)[^>]*>/gi,
      "clickable elements with new/game": /onclick[^>]*new|onclick[^>]*game/gi,
      "resurrection patterns": /resurrection/gi,
      "modal patterns": /modal/gi
    };
    
    Object.entries(patterns).forEach(([name, pattern]) => {
      const matches = html.match(pattern) || [];
      console.log(`3. ${name}:`, matches.length);
      if (matches.length > 0 && matches.length < 5) {
        matches.forEach((match, i) => console.log(`   ${i+1}: ${match.substring(0, 80)}...`));
      }
    });
    
    // Check for specific UI elements
    console.log("4. UI Element Analysis:");
    console.log("   - Title tag:", (html.match(/<title[^>]*>([^<]*)<\\/title>/i) || [null, "Not found"])[1]);
    console.log("   - Contains script tags:", (html.match(/<script/gi) || []).length);
    console.log("   - Contains style/css:", (html.match(/<style|<link.*css/gi) || []).length);
    console.log("   - Body content preview:", html.match(/<body[^>]*>([\\s\\S]{0,200})/i)?.[1]?.replace(/\\s+/g, " ").trim() || "No body found");
  });
});
req.on("error", err => console.error("Request error:", err));
req.end();
