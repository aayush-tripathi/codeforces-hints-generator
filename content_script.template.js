// Gemini API key 
const GEMINI_API_KEY = "__GEMINI_API_KEY__";

(async function () {
  let contestId, problemIndex;
  const path = window.location.pathname;

  // Attempt “/contest/<id>/problem/<index>”
  let m = /\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/.exec(path);
  if (m) {
    contestId = m[1];
    problemIndex = m[2];
  } else {
    // Attempt “/problemset/problem/<id>/<index>”
    m = /\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/.exec(path);
    if (m) {
      contestId = m[1];
      problemIndex = m[2];
    }
  }
  if (!contestId || !problemIndex) {
    return;
  }

  const problemStmtElem = document.querySelector(".problem-statement");
  if (!problemStmtElem) {
    return;
  }
  const problemText = problemStmtElem.innerText.trim();

  let editorialText = "";
  try {
    const tutorialUrl1 = `https://codeforces.com/contest/${contestId}/tutorial`;
    const resp1 = await fetch(tutorialUrl1);
    if (resp1.ok) {
      const html1 = await resp1.text();
      const parser1 = new DOMParser();
      const doc1 = parser1.parseFromString(html1, "text/html");
      const probDiv = doc1.querySelector(`#problem-${problemIndex} .tutorial`);
      if (probDiv) {
        editorialText = probDiv.innerText.trim();
      }
    }
  } catch (e) {
    console.warn("CF‐Hints: Error fetching /tutorial:", e);
  }

  if (!editorialText) {
    const tutorialAnchor = Array.from(document.querySelectorAll("a")).find(a =>
      a.textContent.trim().toLowerCase().startsWith("tutorial")
    );

    if (tutorialAnchor && tutorialAnchor.href) {
      try {
        const blogUrl = tutorialAnchor.href;
        const blogResp = await fetch(blogUrl);
        if (blogResp.ok) {
          const blogHtml = await blogResp.text();
          const parser2 = new DOMParser();
          const doc2 = parser2.parseFromString(blogHtml, "text/html");
          const problemLinkSelector = `a[href="/contest/${contestId}/problem/${problemIndex}"]`;
          const problemLink = doc2.querySelector(problemLinkSelector);
          let foundHeading = null;

          if (problemLink) {
            foundHeading = problemLink.parentElement;
          }
          if (foundHeading) {
            let parts = [];
            let cursor = foundHeading.nextElementSibling;

            while (cursor) {
              const tag = cursor.tagName.toLowerCase();
              if (
                tag.startsWith("h") &&
                cursor.querySelector(`a[href^="/contest/${contestId}/problem/"]`)
              ) {
                break;
              }
              parts.push(cursor.innerText.trim());
              cursor = cursor.nextElementSibling;
            }

            editorialText = parts.join("\n\n").trim();
          }
          if ((!foundHeading || editorialText.length === 0) && !editorialText) {
            const fullBody = doc2.querySelector(".ttypography");
            if (fullBody) {
              editorialText = fullBody.innerText.trim();
            }
          }
        }
      } catch (e2) {
        console.warn("CF‐Hints: Error fetching/parsing blog entry:", e2);
      }
    }
  }
  if (!editorialText) {
    return;
  }

  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
    const warningDiv = document.createElement("div");
    warningDiv.textContent =
      "Gemini API key not found or invalid. Please update or create api_key.txt containing your key.";
    problemStmtElem.parentNode.insertBefore(warningDiv, problemStmtElem);
    return;
  }

  const PROMPT = `
You are a Codeforces‐savvy and highly logical assistant. Given the following Codeforces problem statement and its official editorial, produce:
1. Five incremental HINTS (labeled "Hint 1" through "Hint 5"), where Hint 1 is very vague and Hint 5 almost fully guides towards the solution.
2. A brief "Observations" section that outlines key observations or insights needed to solve the problem.
3. A "Full Editorial Logic" section summarizing the editorial's reasoning step by step.

Output result as valid JSON with keys:
{
  "hints": ["Hint 1 text", "Hint 2 text", ..., "Hint 5 text"],
  "observations": "Some bullet‐style or paragraph observations.",
  "editorial": "Full editorial reasoning in prose."
}

Problem Statement:
\"\"\"  
${problemText}
\"\"\"  

Editorial:
\"\"\"  
${editorialText}
\"\"\"
`.trim();

  let jsonResponse = null;
  try {
    // v1beta endpoint for gemini-1.5-flash:
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const requestBody = {
      contents: [{ parts: [{ text: PROMPT }] }]
    };
    const geminiResp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      console.error("CF‐Hints: Gemini API error:", errText);
      const warningDiv = document.createElement("div");
      warningDiv.textContent = "Gemini API returned an error. Check console for details.";
      problemStmtElem.parentNode.insertBefore(warningDiv, problemStmtElem);
      return;
    }

    const geminiData = await geminiResp.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json") && cleaned.endsWith("```")) {
      const lines = cleaned.split("\n");
      cleaned = lines.slice(1, lines.length - 1).join("\n").trim();
    }

    if (!cleaned.startsWith("{")) {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1).trim();
      }
    }

    try {
      const jsonResponse = JSON.parse(cleaned);
      injectUI(jsonResponse);
    } catch (parseErr) {
      console.error(
        "CF-Hints: JSON.parse failed after cleaning:",
        parseErr,
        "\nRaw Gemini response was:",
        rawText
      );
      const warningDiv = document.createElement("div");
      warningDiv.textContent = "Failed to parse Gemini response.";
      problemStmtElem.parentNode.insertBefore(warningDiv, problemStmtElem);
      return;
    }
  } catch (err) {
    console.error("CF-Hints: Failed to reach Gemini API:", err);
    const warningDiv = document.createElement("div");
    warningDiv.textContent = "Failed to reach Gemini API. Check network or API key.";
    problemStmtElem.parentNode.insertBefore(warningDiv, problemStmtElem);
    return;
  }

  function injectUI({ hints, observations, editorial }) {
    try {
      const container = document.createElement("div");
      container.id = "cf-hints-container";

      const title = document.createElement("h3");
      title.textContent = "💡 Generated Hints & Editorial";
      container.appendChild(title);

      const buttonRow = document.createElement("div");
      buttonRow.id = "cf-hints-button-row";

      hints.forEach((hintText, idx) => {
        const btn = document.createElement("button");
        btn.className = "cf-hint-button";
        btn.textContent = `Hint ${idx + 1}`;
        btn.dataset.target = `cf-hint-content-${idx + 1}`;
        btn.addEventListener("click", () => toggleContent(btn.dataset.target));
        buttonRow.appendChild(btn);

        const contentDiv = document.createElement("div");
        contentDiv.id = `cf-hint-content-${idx + 1}`;
        contentDiv.className = "cf-hint-content";
        contentDiv.textContent = hintText;
        container.appendChild(contentDiv);
      });

      const obsBtn = document.createElement("button");
      obsBtn.className = "cf-hint-button";
      obsBtn.textContent = "Observations";
      obsBtn.dataset.target = "cf-hint-content-observations";
      obsBtn.addEventListener("click", () => toggleContent(obsBtn.dataset.target));
      buttonRow.appendChild(obsBtn);

      const obsDiv = document.createElement("div");
      obsDiv.id = "cf-hint-content-observations";
      obsDiv.className = "cf-hint-content";
      obsDiv.textContent = observations;
      container.appendChild(obsDiv);

      const edBtn = document.createElement("button");
      edBtn.className = "cf-hint-button";
      edBtn.textContent = "Full Editorial";
      edBtn.dataset.target = "cf-hint-content-editorial";
      edBtn.addEventListener("click", () => toggleContent(edBtn.dataset.target));
      buttonRow.appendChild(edBtn);

      const edDiv = document.createElement("div");
      edDiv.id = "cf-hint-content-editorial";
      edDiv.className = "cf-hint-content";
      edDiv.textContent = editorial;
      container.appendChild(edDiv);

      const stmtDiv = document.querySelector(".problem-statement");
      if (stmtDiv) {
        stmtDiv.appendChild(buttonRow);
        stmtDiv.appendChild(container);
      } else {
        document.body.appendChild(buttonRow);
        document.body.appendChild(container);
      }
      console.log("CF-Hints: appended UI under .problem-statement");
    } catch (err) {
      console.error("CF-Hints: injectUI() error:", err);
    }
  }

  function toggleContent(targetId) {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.style.display = el.style.display === "block" ? "none" : "block";
  }
})();
