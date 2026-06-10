import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import {
  chmod,
  copyFile,
  mkdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

import { Database } from "bun:sqlite";

import pkg from "../package.json" with { type: "json" };

const NAME = pkg.name;
const VERSION = pkg.version;
const REPO = pkg.repository;

// macOS Default-profile "History" paths for supported Chromium browsers.
// Custom profiles / unlisted browsers fall back to `--path`.
const BROWSERS: Record<string, string> = {
  chrome: "~/Library/Application Support/Google/Chrome/Default/History",
  chromium: "~/Library/Application Support/Chromium/Default/History",
  arc: "~/Library/Application Support/Arc/User Data/Default/History",
  dia: "~/Library/Application Support/Dia/User Data/Default/History",
  atlas: "~/Library/Application Support/com.openai.atlas/Default/History",
  comet: "~/Library/Application Support/Comet/Default/History",
  helium: "~/Library/Application Support/net.imput.helium/Default/History",
};

const USAGE = `Usage: ${NAME} <browser>            # quick: macOS Default profile
       ${NAME} --path <History>   # custom path / non-default profile

Reads a Chromium-based browser's "History" SQLite file and writes
Safari-importable JSON into ./output_YYYYMMDD_HHMMSS/. Exports all records.

Browsers (Default profile):
  ${Object.keys(BROWSERS).join(" | ")}

Options:
  --path <file>           Path to the browser's "History" SQLite file

Commands:
  help, --help, -h        Show this help
  version, --version, -v  Show version
  update, upgrade         Self-update from latest GitHub release
  uninstall               Remove this binary from disk`;

const TRANSITION_MAP: Record<number, string> = {
  0: "LINK",
  1: "TYPED",
  2: "AUTO_BOOKMARK",
  3: "AUTO_SUBFRAME",
  4: "MANUAL_SUBFRAME",
  5: "GENERATED",
  6: "AUTO_TOPLEVEL",
  7: "FORM_SUBMIT",
  8: "RELOAD",
  9: "KEYWORD",
  10: "KEYWORD_GENERATED",
};

const MAX_PER_FILE = 1000;
// Chromium epoch (1601-01-01 UTC) → Unix epoch (1970-01-01 UTC), in microseconds.
const CHROMIUM_EPOCH_OFFSET_USEC = 11644473600 * 1_000_000;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function stampDir(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

interface ExportArgs {
  path: string;
}

// README 路径表用 `~/Library/...`, macOS 路径含空格强制用户加引号,
// 但 `~` 在单/双引号下均不展开 (仅 unquoted-leading 才展开) → 程序内 fallback.
function expandHome(p: string): string {
  if (p === "~") return homedir();
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  return p;
}

function parseExportArgs(args: readonly string[]): ExportArgs {
  let path = "";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--path") {
      const v = args[++i];
      if (!v) throw new Error("--path requires a value");
      path = v;
    } else {
      throw new Error(`unknown option: ${a}`);
    }
  }
  if (!path) throw new Error("--path is required");
  return { path: expandHome(path) };
}

async function exportHistory({ path }: ExportArgs): Promise<number> {
  if (!existsSync(path)) throw new Error(`History database not found: ${path}`);
  if (statSync(path).isDirectory()) {
    throw new Error(`expected a file, got a directory: ${path}`);
  }

  const outDir = join(process.cwd(), `output_${stampDir(new Date())}`);

  // Chromium locks the live `History` DB; copy to tmp before opening.
  const tempDb = join(tmpdir(), `chromium_history_export_${process.pid}.db`);
  await copyFile(path, tempDb);

  try {
    const db = new Database(tempDb, { readonly: true });
    try {
      const rows = db
        .query<
          { url: string; title: string; time_usec: number; transition: number },
          []
        >(
          `SELECT u.url AS url,
                  COALESCE(u.title, '') AS title,
                  v.visit_time - ${CHROMIUM_EPOCH_OFFSET_USEC} AS time_usec,
                  v.transition & 0xFF AS transition
           FROM visits v LEFT JOIN urls u ON v.url = u.id
           ORDER BY v.visit_time DESC`,
        )
        .all();

      const total = rows.length;
      const numFiles = total > 0 ? Math.ceil(total / MAX_PER_FILE) : 1;
      console.log(`Exporting ${total} records into ${numFiles} file(s)...`);

      await mkdir(outDir, { recursive: true });
      for (let i = 0; i < numFiles; i++) {
        const start = i * MAX_PER_FILE;
        const chunk = rows.slice(start, start + MAX_PER_FILE).map((r) => ({
          url: r.url,
          title: r.title,
          time_usec: r.time_usec,
          page_transition: TRANSITION_MAP[r.transition] ?? "LINK",
          favicon_url: "",
          client_id: "",
          ptoken: {},
        }));
        const filename = `BrowserHistory_${String(i + 1).padStart(3, "0")}.json`;
        await writeFile(
          join(outDir, filename),
          JSON.stringify({ "Browser History": chunk }),
        );
      }

      console.log(outDir);
    } finally {
      db.close();
    }
  } finally {
    await unlink(tempDb).catch(() => {});
  }

  return 0;
}

function assertInstalled(action: string): void {
  if (basename(process.execPath) !== NAME) {
    throw new Error(`refusing to ${action}: not the installed binary`);
  }
}

function assetName(): string {
  if (process.platform !== "darwin") throw new Error(`unsupported OS: ${process.platform}`);
  const a = process.arch;
  if (a !== "x64" && a !== "arm64") throw new Error(`unsupported arch: ${a}`);
  return `${NAME}-darwin-${a}`;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function readVersion(bin: string): Promise<string | null> {
  try {
    const proc = Bun.spawn([bin, "version"], { stdout: "pipe", stderr: "ignore" });
    await proc.exited;
    if (proc.exitCode !== 0) return null;
    const out = (await new Response(proc.stdout).text()).trim();
    return out.split(/\s+/).pop() ?? null;
  } catch {
    return null;
  }
}

async function update(): Promise<number> {
  assertInstalled("self-update");

  const asset = assetName();
  const base = `https://github.com/${REPO}/releases/latest/download`;
  const dest = process.execPath;

  console.log(`==> Updating ${NAME} ${VERSION} -> latest`);
  const bytes = await fetchBytes(`${base}/${asset}`);

  // Best-effort checksum.
  try {
    const res = await fetch(`${base}/checksums.txt`, { redirect: "follow" });
    if (res.ok) {
      const line = (await res.text()).split(/\r?\n/).find((l) => l.trim().endsWith(` ${asset}`));
      if (line) {
        const expected = line.trim().split(/\s+/)[0]!.toLowerCase();
        const actual = createHash("sha256").update(bytes).digest("hex");
        if (expected !== actual) {
          console.error(`error: checksum mismatch`);
          return 1;
        }
      }
    }
  } catch {}

  // Atomic replace via tmp on the same filesystem.
  await mkdir(dirname(dest), { recursive: true });
  const tmp = join(dirname(dest), `.${NAME}.update.${process.pid}`);
  await writeFile(tmp, bytes);
  await chmod(tmp, 0o755);
  try {
    await rename(tmp, dest);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }

  const newVersion = (await readVersion(dest)) ?? "unknown";
  console.log(`==> Updated ${NAME} ${VERSION} -> ${newVersion}`);
  console.log(`    ${dest}`);
  return 0;
}

async function uninstall(): Promise<number> {
  assertInstalled("uninstall");
  await unlink(process.execPath);
  console.log(`==> Removed: ${process.execPath}`);
  return 0;
}

async function main(args: readonly string[]): Promise<number> {
  const cmd = args[0];
  switch (cmd) {
    case "help":
    case "--help":
    case "-h":
      console.log(USAGE);
      return 0;
    case "version":
    case "--version":
    case "-v":
      console.log(`${NAME} ${VERSION}`);
      return 0;
    case "update":
    case "upgrade":
      try {
        return await update();
      } catch (err) {
        console.error(`error: update failed: ${err instanceof Error ? err.message : String(err)}`);
        return 1;
      }
    case "uninstall":
      try {
        return await uninstall();
      } catch (err) {
        console.error(`error: uninstall failed: ${err instanceof Error ? err.message : String(err)}`);
        return 1;
      }
    default:
      try {
        const preset = cmd ? BROWSERS[cmd] : undefined;
        if (preset !== undefined) {
          if (args.length > 1) throw new Error(`${cmd}: unexpected extra arguments`);
          return await exportHistory({ path: expandHome(preset) });
        }
        return await exportHistory(parseExportArgs(args));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`error: ${msg}\n`);
        console.error(USAGE);
        return 1;
      }
  }
}

process.exit(await main(Bun.argv.slice(2)));
