import { execSync } from "node:child_process";
import process from "node:process";

const platform = process.platform;
const arch = process.arch;

let command;

if (platform === "darwin") {
  if (arch === "arm64") {
    command = "npm run package:mac:arm64";
  } else if (arch === "x64") {
    command = "npm run package:mac:x64";
  }
}

if (platform === "win32") {
  if (arch === "arm64") {
    command = "npm run package:win:arm64";
  } else if (arch === "x64") {
    command = "npm run package:win:x64";
  }
}

if (platform === "linux") {
  if (arch === "arm64") {
    command = "npm run package:linux:arm64";
  } else if (arch === "x64") {
    command = "npm run package:linux:x64";
  }
}

if (!command) {
  console.error(
    `Unsupported platform/architecture combination: ${platform} ${arch}`,
  );
  process.exit(1);
}

console.log(`Detected ${platform} ${arch}`);
console.log(`Running: ${command}`);

execSync(command, {
  stdio: "inherit",
});