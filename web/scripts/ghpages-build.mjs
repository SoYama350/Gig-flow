// Static-export build helper for GitHub Pages.
//
// Next.js `output: 'export'` cannot include Route Handlers (app/api/*) that use
// dynamic server features. For the Pages static demo we temporarily move the
// API directory out of the app tree, build the static UI, then restore it.
import { existsSync, renameSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const API_DIR = "app/api";
const STASH = "app/__api_stash";

const apiMoved = existsSync(API_DIR);
if (apiMoved) {
  rmSync(STASH, { recursive: true, force: true });
  renameSync(API_DIR, STASH);
  console.log("[ghpages] moved app/api -> app/__api_stash for static export");
}

try {
  execSync("next build", { stdio: "inherit", env: { ...process.env } });
} finally {
  if (apiMoved && existsSync(STASH)) {
    rmSync(API_DIR, { recursive: true, force: true });
    renameSync(STASH, API_DIR);
    console.log("[ghpages] restored app/__api_stash -> app/api");
  }
}
