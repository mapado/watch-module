# watch-module

A Javascript module watcher to work locally with package.

Replace the "not-really-functionnal" npm | yarn link.

## Usage

```sh
npx watch-module /path/to/my/module
```

watch-module will detect code changes in your module, run the `build` script and copy the code into your `node_modules` folder.

### Multiple packages

watch-modules does support multiple modules:

```sh
npx watch-module /path/to/my/module ../my-other-module
```

## Alternatives

[npm link | yarn link] : it does work fine until you have dependencies, etc. in your package.

[yalc](https://github.com/whitecolor/yalc) : nice alternative, but too complex for our purpose (it does use a local repository, that you need to push on change, etc.)
