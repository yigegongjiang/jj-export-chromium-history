# jj-export-chromium-history

Bun single-file executable CLI (macOS only). Uses **Safari as the relay** to migrate browsing history across browsers — exports a Chromium-based browser's `History` SQLite to Safari-importable JSON; any browser with "Import from Safari" then picks it up downstream.

```text
Chromium browser ──[this tool]──► JSON ──► Safari ──[Import from Safari]──► other browsers
```

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/yigegongjiang/jj-export-chromium-history/main/install.sh | bash
```

Installs to `$HOME/.local/bin`.

## Usage

```bash
jj-export-chromium-history chrome             # quick: macOS Default profile
jj-export-chromium-history --path <History>   # custom path / non-default profile
```

Browser shortcuts (macOS `Default` profile of each):

<!-- prettier-ignore -->
| Subcommand | Browser | Resolved path |
|---|---|---|
| `chrome` | Chrome | `~/Library/Application Support/Google/Chrome/Default/History` |
| `chromium` | Chromium | `~/Library/Application Support/Chromium/Default/History` |
| `arc` | Arc | `~/Library/Application Support/Arc/User Data/Default/History` |
| `dia` | Dia | `~/Library/Application Support/Dia/User Data/Default/History` |
| `atlas` | Atlas | `~/Library/Application Support/com.openai.atlas/Default/History` |
| `comet` | Comet | `~/Library/Application Support/Comet/Default/History` |
| `helium` | Helium | `~/Library/Application Support/net.imput.helium/Default/History` |

<!-- prettier-ignore -->
| Option | Description |
|---|---|
| `--path` | Path to the browser's `History` SQLite file (overrides the shortcut; use for non-Default profile / unlisted browser) |

<!-- prettier-ignore -->
| Command | Alias | Description |
|---|---|---|
| `help` | `-h` / `--help` | Usage |
| `version` | `-v` / `--version` | Version |
| `update` | `upgrade` | Self-update (compiled binary only) |
| `uninstall` | — | Uninstall (compiled binary only) |

Output: `./output_YYYYMMDD_HHMMSS/BrowserHistory_NNN.json` (≤ 1000 records per file). The output directory path is printed at the end.

## Locate the `History` file (custom profile)

Type `chrome://version` in the browser → **Profile Path** → `History` lives there. Pass it via `--path` when not using the `Default` profile.

## Step 1 — Import JSON into Safari

1. Safari → **File** → **Import Browsing Data from File or Folder...**
2. Select the whole `output_*/` folder (not a single JSON file)
3. Wait for the import to complete

## Step 2 — Forward to another browser (optional)

Skip if Safari is the destination. Otherwise pull from Safari in the target browser:

<!-- prettier-ignore -->
| Target | Path |
|---|---|
| Chromium-based (Chrome / Arc / Dia / Edge / Brave / Opera / Comet / Atlas / Helium / etc.) | Bookmarks → Import Bookmarks and Settings → Safari |
| Firefox | Library → Import Data from Another Browser → Safari |

> Most browsers' "Import from Safari" includes history; if a target omits the history option, add a Firefox hop — Safari → Firefox → target browser, history preserved end-to-end.

> History is sensitive data — every browser caps imports by count / time window, and the limits differ across browsers. e.g. Safari only ingests the **last 90 days** of history on import; Firefox importing from Safari only accepts the **last 180 days**. Fine for everyday use; preserving the **full** history needs direct DB rewrites, out of scope for this project.
