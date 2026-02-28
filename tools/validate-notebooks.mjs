#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const NOTEBOOK_ROOT = resolve(process.cwd(), "notebooks");
const FORBIDDEN_PATTERNS = [
  /fin_sk_[A-Za-z0-9_-]{16,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];

async function listNotebookFiles(baseDir) {
  const out = [];
  const entries = await readdir(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(baseDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listNotebookFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".ipynb")) out.push(fullPath);
  }
  return out;
}

function extractNotebookText(nb) {
  const cells = Array.isArray(nb.cells) ? nb.cells : [];
  return cells
    .map((cell) => {
      if (Array.isArray(cell.source)) return cell.source.join("");
      if (typeof cell.source === "string") return cell.source;
      return "";
    })
    .join("\n");
}

function validateNotebookStructure(nb, relPath) {
  const cells = Array.isArray(nb.cells) ? nb.cells : [];
  if (cells.length < 6) {
    throw new Error(`${relPath}: expected at least 6 cells for the standard learning flow`);
  }

  const markdownCount = cells.filter((c) => c.cell_type === "markdown" || c.cell_type === "raw").length;
  const codeCount = cells.filter((c) => c.cell_type === "code").length;
  if (markdownCount < 1 || codeCount < 3) {
    throw new Error(
      `${relPath}: expected at least 1 markdown cell and 3 code cells for readability and depth`,
    );
  }
}

const notebooks = await listNotebookFiles(NOTEBOOK_ROOT);
if (!notebooks.length) throw new Error("No notebooks found under notebooks/");

for (const filePath of notebooks) {
  const relPath = filePath.replace(`${process.cwd()}/`, "");
  const text = await readFile(filePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`${relPath}: invalid JSON (${String(err)})`);
  }

  validateNotebookStructure(parsed, relPath);

  const mergedText = extractNotebookText(parsed);
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(mergedText)) {
      throw new Error(`${relPath}: contains forbidden secret-like content (${pattern})`);
    }
  }
}

const envExample = await readFile(resolve(NOTEBOOK_ROOT, ".env.example"), "utf8");
if (!envExample.includes("FINUTIES_API_KEY=") || !envExample.includes("FINUTIES_API_ORIGIN=")) {
  throw new Error("notebooks/.env.example must include FINUTIES_API_KEY and FINUTIES_API_ORIGIN");
}

const requirements = await readFile(resolve(NOTEBOOK_ROOT, "requirements.txt"), "utf8");
for (const dep of ["requests", "pandas", "matplotlib", "python-dotenv"]) {
  if (!requirements.includes(dep)) {
    throw new Error(`notebooks/requirements.txt missing dependency: ${dep}`);
  }
}

console.log(`Notebook validation passed for ${notebooks.length} notebooks.`);
