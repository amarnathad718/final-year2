import fs from "fs";
import { spawnSync } from "child_process";
import path from "path";
import process from "process";

const projectRoot = path.resolve(process.cwd());
const lockfilePath = path.join(projectRoot, "package-lock.json");

function isValidJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

if (isValidJsonFile(lockfilePath)) {
  process.exit(0);
}

console.log("[FoodBridge] package-lock.json is missing or corrupted. Rebuilding lockfile...");

if (fs.existsSync(lockfilePath)) {
  fs.unlinkSync(lockfilePath);
}

const result = spawnSync("npm", ["install"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
