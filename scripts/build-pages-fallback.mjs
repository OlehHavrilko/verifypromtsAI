// Generates the GitHub Pages fallbacks after `vite build`:
//   dist/404.html  — forwards client-side routes back to the SPA entry
//   dist/.nojekyll — stops Jekyll from stripping files
// Uses the same base path the app was built with (VITE_BASE_PATH).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const trimmed = (process.env.VITE_BASE_PATH || "/").replace(/^\/+|\/+$/g, "");
const entry = trimmed ? `/${trimmed}/` : "/";

const indexHtml = await readFile(join(dist, "index.html"), "utf8");

const fallback = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>PromptForge</title>
    <script>
      // Preserve the requested route and bounce to the SPA entry point.
      var target = ${JSON.stringify(entry)} + "?redirect=" + encodeURIComponent(
        location.pathname + location.search + location.hash
      );
      location.replace(target);
    </script>
  </head>
  <body></body>
</html>
`;

await writeFile(join(dist, "404.html"), fallback, "utf8");
await writeFile(join(dist, ".nojekyll"), "", "utf8");
console.log(`Pages fallback written for base "${entry}" (index.html ${indexHtml.length} bytes)`);
