import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const goals = { dev: "spring-boot:run", build: "verify", test: "test" };
const action = process.argv[2];
const goal = Object.hasOwn(goals, action) ? goals[action] : undefined;
if (!goal) throw new Error("Use dev, build, or test.");
const windows = process.platform === "win32";
// Goals are selected above, never interpolated from arbitrary command-line text.
const child = spawn(windows ? (process.env.ComSpec ?? "cmd.exe") : "sh", windows ? ["/d", "/c", `.\\mvnw.cmd ${goal}`] : ["./mvnw", goal], {
  cwd: fileURLToPath(new URL("../apps/api/", import.meta.url)),
  stdio: "inherit",
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
