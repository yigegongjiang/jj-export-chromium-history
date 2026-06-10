# Changelog

[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [SemVer](https://semver.org/).

## [0.1.1] - 2026-06-10

### Changed

- `update` / `upgrade` 完成后打印更新前后的版本号

## [0.1.0] - 2026-06-10

### Added

- 子命令 `help` / `version` / `update` / `uninstall`, 支持 macOS x64 / arm64
- 浏览器快捷子命令 `chrome` / `chromium` / `arc` / `dia` / `atlas` / `comet` / `helium` 自动定位 macOS Default profile, 免输 `--path`
- `--path <History>` 选浏览器, 导全部记录到 `./output_*/`, 末尾打印输出目录 (每文件 ≤ 1000 条)
- `install.sh` 一键安装, 产物附 SHA256 校验和

### Changed

- 由 Python `uv` 脚本迁移为 Bun 单文件可执行 CLI; 移除 `--days` 限制 (默认全量)

[0.1.1]: https://github.com/yigegongjiang/jj-export-chromium-history/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yigegongjiang/jj-export-chromium-history/releases/tag/v0.1.0
