# CHANGELOG

## 4.0.0

- [BREAKING] Remove support for node < 16
- outDir: allow to use a specific out directory [#60](https://github.com/mapado/watch-module/pull/60) by [@jdeniau](https://github.com/jdeniau)
- [Internal] Upgrade to yarn 4

## 3.1.0

- Better rendering of "what is currently happening" [#51](https://github.com/mapado/watch-module/pull/51)

## 3.0.2

- handle abort in multi-command [#50](https://github.com/mapado/watch-module/pull/50)

## 3.0.1

- Add `--version` or `-V` helper

## 3.0.0

- [BREAKING CHANGE] Drop support for node < 16
- [EXPERIMENTAL] allow package to be multi-command [#45](https://github.com/mapado/watch-module/pull/45)

## 2.2.2

- allow react 17 as ink uses an old reconcilier that thoes not support react 18 for now

## 2.2.1

- Try to fix build issue with peerDeps
- better tab color

## 2.2.0

### Configuration

- [Minor BC] If configuration is overriden, keep the default config values for un-setted keys [#37](https://github.com/mapado/watch-module/pull/37). If you did rely on the fact that `command` is unsetted, then you need to explicitly set it now : `"command": null`
- Possibility to add a package on the fly [#42](https://github.com/mapado/watch-module/pull/42)

### Performance

- Do not build if file content did not change on save (prevent the "mad savers" 😉) [#38](https://github.com/mapado/watch-module/pull/38)
- Kill previous build if another change happen before the end [#39](https://github.com/mapado/watch-module/pull/39)

### Rendering

Globally better rendering:

- Render with [ink](https://github.com/vadimdemedes/ink) and split renderer by tab [#41](https://github.com/mapado/watch-module/pull/41)
- Better log when a build is failing (log stdin & stdout) [#36](https://github.com/mapado/watch-module/pull/36)

## 2.1.1

- Fix excludes paths by removing trailing slash [#27](https://github.com/mapado/watch-module/pull/27)

## 2.1.0

### Added

- Display the path of the changes files in verbose mode.

## 2.0.0

[BREAKING] Built for modern node :

- Use ES Module, dynamic import, etc.
- node version should be `^12.20.0 || ^14.13.1 || >=16.0.0`

## 1.3.0

### Added

- watch-module can use a global config file (see README.md)

## 1.2.1

### Fixed

- Only backup on the first execution. Fixes #7

## 1.2.0

### Added

- Saves the watched node_modules directory on start and restore its content when the program exit
- Add a `IS_UNDER_WATCH_MODULE` file to help debugging

### Changed

- Internal change : split code in multiple files

## 1.1.1

### Added

Fix copying before end of build

## 1.1.0

### Added

Allow configuration for command
