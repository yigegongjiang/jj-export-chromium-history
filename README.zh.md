# jj-export-chromium-history

Bun 单文件可执行 CLI (仅 macOS). **以 Safari 为中转枢纽**实现跨浏览器历史迁移 — 把 Chromium 系浏览器的 `History` SQLite 导出为 Safari 可导入的 JSON; 任何支持 "Import from Safari" 的浏览器再从 Safari 接力拉取.

```text
Chromium 浏览器 ──[本工具]──► JSON ──► Safari ──[Import from Safari]──► 其他浏览器
```

## 安装

```bash
curl -fsSL https://raw.githubusercontent.com/yigegongjiang/jj-export-chromium-history/main/install.sh | bash
```

默认装到 `$HOME/.local/bin`.

## 用法

```bash
jj-export-chromium-history chrome             # 快捷: macOS Default profile
jj-export-chromium-history --path <History>   # 自定义路径 / 非 Default profile
```

浏览器快捷子命令 (各浏览器 macOS `Default` profile):

<!-- prettier-ignore -->
| 子命令 | 浏览器 | 解析路径 |
|---|---|---|
| `chrome` | Chrome | `~/Library/Application Support/Google/Chrome/Default/History` |
| `chromium` | Chromium | `~/Library/Application Support/Chromium/Default/History` |
| `arc` | Arc | `~/Library/Application Support/Arc/User Data/Default/History` |
| `dia` | Dia | `~/Library/Application Support/Dia/User Data/Default/History` |
| `atlas` | Atlas | `~/Library/Application Support/com.openai.atlas/Default/History` |
| `comet` | Comet | `~/Library/Application Support/Comet/Default/History` |
| `helium` | Helium | `~/Library/Application Support/net.imput.helium/Default/History` |

<!-- prettier-ignore -->
| 选项 | 说明 |
|---|---|
| `--path` | 浏览器 `History` SQLite 文件路径 (覆盖快捷子命令; 用于非 Default profile / 表内未列出的浏览器) |

<!-- prettier-ignore -->
| 命令 | 别名 | 说明 |
|---|---|---|
| `help` | `-h` / `--help` | 用法 |
| `version` | `-v` / `--version` | 版本 |
| `update` | `upgrade` | 自更新 (仅编译后二进制) |
| `uninstall` | — | 卸载 (仅编译后二进制) |

输出: `./output_YYYYMMDD_HHMMSS/BrowserHistory_NNN.json` (每文件 ≤ 1000 条). 执行完毕末尾打印输出目录 path.

## 定位 `History` 文件 (自定义 profile)

浏览器地址栏输入 `chrome://version` → 看 **Profile Path** → `History` 在该目录下. 非 Default profile 时用 `--path` 传入.

## Step 1 — JSON 导入 Safari

1. Safari → **文件** → **从文件或文件夹导入浏览数据...**
2. 选 `output_*/` 整个文件夹 (而非单个 JSON)
3. 等待导入完成

## Step 2 — 从 Safari 接力到其他浏览器 (可选)

终点是 Safari 则跳过. 否则在目标浏览器里从 Safari 接力导入:

<!-- prettier-ignore -->
| 目标浏览器 | 路径 |
|---|---|
| Chromium 系 (Chrome / Arc / Dia / Edge / Brave / Opera / Comet / Atlas / Helium 等) | 书签 → 导入书签和设置 → Safari |
| Firefox | 资料库 → 从其他浏览器导入数据 → Safari |

> 多数浏览器 "Import from Safari" 带 history; 个别浏览器无 history 选项时, 加一跳 Firefox 中转 — Safari → Firefox → 目标浏览器, history 全程保留.

> History 属敏感数据 — 各浏览器对 import 均有 数量 / 时间窗口 限制, 各家卡口不一致. 例如 Safari import 时只接收**最近 90 天**的历史, Firefox 从 Safari import 时只接收**最近 180 天**. 日常使用够用; 要保留**全量**历史须直接重写数据库, 不在本项目能力范围.
