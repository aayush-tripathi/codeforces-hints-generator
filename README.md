<div align="center">

  <img src="https://github.com/user-attachments/assets/55595cc6-c67e-4e21-ae3f-857a05b5bce0" alt="tundra_base_logo" width="300"/>

</div>




# Codeforces Hints Generator

A browser extension that enhances any Codeforces problem page by injecting:

* **Hint 1–5** (incremental hints from vague to nearly complete guidance)
* **Observations** (key insights needed to solve the problem)
* **Full Editorial Logic** (summarized editorial reasoning)

All generated content is produced via Google Gemini (Gemini 1.5 Flash) using the official problem statement and editorial. This README explains the idea, project structure, setup, and usage in detail.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Concepts](#key-concepts)
3. [Project Structure](#project-structure)
4. [Installation and Setup](#installation-and-setup)

   * [Prerequisites](#prerequisites)
   * [Cloning the Repository](#cloning-the-repository)
   * [API Key Management](#api-key-management)
   * [Building the Extension](#building-the-extension)
5. [Manifest and Permissions](#manifest-and-permissions)
6. [Content Script Workflow](#content-script-workflow)

   * [Problem Detection](#problem-detection)
   * [Editorial Fetching](#editorial-fetching)
   * [Gemini Prompting](#gemini-prompting)
   * [UI Injection](#ui-injection)
7. [Styling](#styling)
8. [Loading the Extension](#loading-the-extension)
9. [Troubleshooting](#troubleshooting)
10. [Extending or Customizing](#extending-or-customizing)
11. [License](#license)

---

## Overview

Codeforces problems often come with official editorials, but navigating back and forth between problem statements and editorial pages can interrupt coding flow. The editorial pages in Codeforces also do not follow a standard template , leading to some editorials being rich in hints while the others may just provide the solution without necessary insights.

The **Codeforces Hints Generator** aims to solve this by automatically fetching the editorial, using Google Gemini to generate a structured set of hints and observations, and embedding them directly under the problem statement. Users can click “Hint 1” through “Hint 5,” “Observations,” or “Full Editorial” to reveal progressively more detailed guidance without leaving the page.

This extension works on any Codeforces problem—whether from a contest or the problemset—by hooking into the page’s DOM, fetching the editorial (either from `/contest/<id>/tutorial` or from a linked blog post), and sending both the statement and editorial to Gemini. The resulting JSON payload is parsed and rendered as interactive buttons and content blocks.

---

## Run Pipeline

1. **Content Script Injection**
   A content script (`content_script.js`) runs on Codeforces problem URLs and manipulates the DOM to insert UI elements.
2. **Editorial Retrieval**

   * Attempts to fetch `/contest/<contestId>/tutorial` first.
   * If not available, finds a “Tutorial” link in the sidebar, follows it to the blog post, and extracts the editorial section.
3. **Google Gemini API**

   * Uses Gemini 1.5 Flash (`generateContent` endpoint) to produce a JSON containing:
     • An array of 5 hints
     • A block of observations
     • A block of full editorial logic
   * The prompt template ensures hints go from vague to nearly complete, observations capture bullet‐style insights, and the editorial summarizes the reasoning.
4. **UI Injection**

   * Once the JSON is parsed, the extension creates a container under the problem statement with:
     • Five buttons labeled “Hint 1”…“Hint 5”
     • A button “Observations”
     • A button “Full Editorial”
   * Clicking each button toggles the corresponding content’s visibility.
5. **Separation of Secrets via Build Process**

   * The Gemini API key is kept out of Git by storing it in `api_key.txt` (ignored by Git).
   * A simple Node.js build script (`build-key.js`) replaces a placeholder `__GEMINI_API_KEY__` in `content_script.template.js` with the actual key, generating `content_script.js` which is not committed.
6. **Styling**

   * All CSS lives in `styles.css`.

---

## Project Structure

```text
/codeforces-hints-generator
├── .gitignore
├── api_key.txt                 ← (Gemini key)
├── build-key.js                ← Build script: generates content_script.js
├── content_script.template.js  ← Template JS
├── content_script.js           ← Generated JS 
├── styles.css                  ← All UI styling 
├── icon48.png                  ← 48×48 toolbar icon
├── icon128.png                 ← 128×128 store icon
├── manifest.json               ← Chrome extension manifest (MV3)
└── README.md                   ← Detailed instructions & documentation
```

* **`api_key.txt`**
  Contains **only** your Gemini API key on a single line.

* **`build-key.js`**
  Node.js script that reads `api_key.txt`, replaces the `__GEMINI_API_KEY__` placeholder in `content_script.template.js`, and writes out `content_script.js`.

* **`content_script.template.js`**
  The core logic without real key. Contains the placeholder `const GEMINI_API_KEY = "__GEMINI_API_KEY__";` that `build-key.js` replaces.

* **`content_script.js`**
  The actual content file, generated by running `node build-key.js`. Contains your real key inlined.

* **`styles.css`**
  All CSS rules for `#cf-hints-container`, `.cf-hint-button`, `.cf-hint-content`, `.cf-warning`, etc.

* **`icon48.png` and `icon128.png`**
  Required for a polished extension icon in the toolbar and store.

* **`manifest.json`**
  Configures permissions, host patterns, and which scripts/css to inject.

---

## Installation and Setup

### Prerequisites

* **Node.js** (v14 or newer) installed on your system.
* A valid **Gemini API key** with access to Gemini 1.5 Flash (`gemini-1.5-flash`).
* A modern Chromium‐based browser (Chrome, Edge, Brave, etc.)

### 1. Clone the Repository

```bash
git clone https://github.com/aayush-tripathi/codeforces-hints-generator.git
cd codeforces-hints-generator
```

### 2. Create Your API Key File

1. In the project root, create a file named `api_key.txt`.
2. Paste your Gemini API key into that file (no extra spaces or newlines).

   ```bash
   echo "YOUR_REAL_GEMINI_KEY_HERE" > api_key.txt
   ```

### 3. Generate `content_script.js`

Run:

```bash
node build-key.js
```

* You should see:

  ```
  ✅ content_script.js generated (Gemini key inlined).
  ```

### 4. Load the Extension into Your Browser

1. Open your browser’s Extensions page:

   * **Chrome/Edge**: navigate to `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode** (Chrome/Edge) or **Enable add-on debugging** (Firefox).
3. Click **“Load unpacked”** (Chrome/Edge) or **“Load Temporary Add-on”** (Firefox).
4. Select this folder’s root (the directory containing `manifest.json`).
5. The extension should now appear in your toolbar and be active on Codeforces pages.

---

## Manifest and Permissions

* **`permissions`**:
  * `activeTab` & `scripting`: allow dynamic injection on the active Codeforces tab.
* **`host_permissions`**: restricts content script to Codeforces URLs only.
* **`content_scripts`**:

  * `matches`: the URL patterns where the script runs.
  * `js`: the generated `content_script.js` (needs to exist after `build-key.js`).
  * `css`: injects `styles.css` to style the generated UI.
* **`icons`**:

  * `48×48` for toolbar.
  * `128×128` for the store or high‐res contexts.

---

## Content Script Workflow

The core of this extension is `content_script.template.js` (transformed at build time). Here’s what happens at runtime:

1. **Problem Detection**

   * The script reads `window.location.pathname` and uses a regex to detect if the URL matches `/contest/<id>/problem/<index>` or `/problemset/problem/<id>/<index>`.

2. **Editorial Fetching**

   1. **Try direct tutorial URL**: `https://codeforces.com/contest/<contestId>/tutorial`.

      * If the request is OK, parse HTML with `DOMParser`.
      * Look for `#problem-<Index> .tutorial` and extract its inner text.
        
   2. **Fallback to blog post**:

      * Find any `<a>` on the page whose text starts with “Tutorial” (e.g. “Tutorial #1”).
      * Fetch that blog URL, parse HTML, and locate the `<a href="/contest/<contestId>/problem/<problemIndex>">`.
      * Once found, gather sibling nodes until the next problem‐heading link, concatenating their `.innerText`.
      * If that fails, as a final fallback, grab the entire `.ttypography` block.

   * If `editorialText` is still empty, exit.

3. **Gemini Prompting**

   * Build a markdown‐style prompt that includes:

     1. Instruction to generate 5 hints, observations, and full editorial logic.
     2. The problem statement (from `.problem-statement`).
     3. The fetched editorial text.
   * Use the `fetch` API to POST to:

     ```
     https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=<API_KEY>
     ```
   * If Gemini returns an error (non‐2xx), insert a red‐background warning and exit.

4. **Cleaning and Parsing the Gemini Response**

   * Extract `rawText = geminiData.candidates[0].content.parts[0].text` (fallback to empty string).
   * Trim and remove any triple‐backtick fences (`json … `).
   * If the cleaned text doesn’t start with `{`, find the first `{` and last `}` and slice the substring.
   * Attempt `JSON.parse(cleaned)`. If parsing fails, insert a warning and exit.

5. **UI Injection**

   * Call `injectUI(jsonResponse)` with the parsed object:

   * The CSS rules in `styles.css` define the visual appearance for all IDs/classes used above.

---

## Styling (`styles.css`)

All style rules are centralized in `styles.css`. The content script references these IDs and class names

---

## Troubleshooting

* **No UI appears**:

  1. Confirm you ran `node build-key.js` successfully and that `content_script.js` is present (in the same folder as `manifest.json`).
  2. Check DevTools → Console for any `CF-Hints:` logs or errors.
  3. Ensure you’re on a matching URL pattern (contest or problemset problem).
  4. Verify that `styles.css` and `content_script.js` are both referenced correctly in `manifest.json`.

* **Gemini API errors**:

  * If `api_key.txt` is missing or blank, you’ll see a `.cf-warning` under the problem statement prompting you to update the key.
  * If the key is invalid or expired, Gemini will return an error. That error text is logged to console and a warning banner (styled by `.cf-warning`) appears.

* **Parsing failures**:

  * If Gemini returns non‐JSON (e.g., with unexpected formatting), the script attempts to strip backticks and extract `{…}`. If parsing still fails, a warning appears.
  * Check DevTools → Console to view the raw response.

* **Permission issues**:

  * Ensure `manifest.json` includes:

    ```json
    "permissions": ["activeTab", "scripting"],
    "host_permissions": ["https://codeforces.com/*"]
    ```
  * Without those, the content script cannot run or fetch external resources.

---

## Extending or Customizing

1. **Modify Hint Content**

   * Edit `content_script.template.js` to tweak the Gemini prompt (e.g., change hint granularity or phrasing).
   * Run `node build-key.js` and reload the extension.

2. **Change Styling**

   * Update `styles.css` for new colors, fonts, or layout changes.
   * Save and reload the extension—no need to rebuild JS unless you change class or ID names.

3. **Enable Caching**

   * Add the `storage` permission to `manifest.json`:

     ```json
     "permissions": ["activeTab", "scripting", "storage"]
     ```
   * Modify `content_script.template.js` to store fetched editorials/hints in `chrome.storage.local` to avoid repeated Gemini calls on the same problem.

4. **Support Additional Sites**

   * Change the `matches` patterns in `manifest.json` to include other competitive programming domains (e.g., AtCoder, CodeChef).
   * Add site‐specific editorial‐scraping logic in `content_script.template.js`.

---

## License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Feel free to fork, modify, and redistribute under the same license.

---

Thanks and Happy Problem Solving!
