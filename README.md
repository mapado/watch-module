# watch-module

A Javascript module watcher to work locally with packages.

Replace the "not-really-functionnal" npm | yarn link.

## Demo

![Demo](demo.svg)

## Usage

```sh
npx watch-module /path/to/my/module
```

watch-module will detect code changes in your module, run the `build` script (if available) and copy the code into your `node_modules` folder.
wtach-module will first try to locate an `src/` directory at project root, if it is not found it will look for a `lib/` directory, if it fails too it will watch the whole rpoject from the root

### Multiple packages

watch-modules does support multiple modules:

```sh
npx watch-module /path/to/my/module ../my-other-module
```

### Configuration

watch-module do use `yarn|npm run build` by default (if it is available under the package.json's scripts key, otherwise it will not execute any command), but you can override this command by configuring your module's `package.json` file:

```json
{
  "name": "my package",
  "scripts": {
    "build:prod": "touch build.js"
  },
  "watch-module": {
    "command": "yarn run build:prod"
  }
}
```

## Alternatives

[npm link | yarn link] : it does work fine until you have dependencies, etc. in your package.

[yalc](https://github.com/whitecolor/yalc) : nice alternative, but too complex for our purpose (it does use a local repository, that you need to push on change, etc.)
