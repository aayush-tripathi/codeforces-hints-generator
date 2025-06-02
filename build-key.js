// Run this to produce content_script.js from content_script.template.js by injecting your Gemini API key.
const fs = require("fs");
const path = require("path");
const keyPath = path.join(__dirname, "api_key.txt");
let GEMINI_API_KEY = "";
try {
  GEMINI_API_KEY = fs.readFileSync(keyPath, "utf-8").trim();
  if (!GEMINI_API_KEY) {
    throw new Error("api_key.txt is empty");
  }
} catch (readErr) {
  console.error(" build-key.js: could not read api_key.txt. Did you create it with your Gemini key?\n", readErr.message);
  process.exit(1);
}

const templatePath = path.join(__dirname, "content_script.template.js");
let template;

try {
  template = fs.readFileSync(templatePath, "utf-8");
} catch (err) {
  console.error(" build-key.js: could not read content_script.template.js\n", err.message);
  process.exit(1);
}

const output = template.replace(/__GEMINI_API_KEY__/g, GEMINI_API_KEY);
const outputPath = path.join(__dirname, "content_script.js");
try {
  fs.writeFileSync(outputPath, output);
  console.log("content_script.js generated (Gemini key inlined).");
} catch (writeErr) {
  console.error("build-key.js: failed to write content_script.js\n", writeErr.message);
  process.exit(1);
}
