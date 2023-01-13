# CHANGELOG

## Unreleased

- Better log when a build is failing [#36](https://github.com/mapado/watch-module/pull/36)
- Do not build if file content did not change on save (prevent the "mad savers" 😉) [#38](https://github.com/mapado/watch-module/pull/38)
- Kill previous build if another change happen before the end [#39](https://github.com/mapado/watch-module/pull/39)

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
