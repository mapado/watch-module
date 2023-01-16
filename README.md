# watch-module

A Javascript module watcher to work locally with packages.

Replace the "not-really-functionnal" npm | yarn link.

## Demo

![Demo](demo.svg)

## Usage

Place yourself at the root of your main package and call:

```sh
npx watch-module /path/to/my/module
```

watch-module will detect code changes in your module, run the `build` script (if available) and copy the code into your `node_modules` folder.
watch-module will not copy the node_modules folder contained inside your module

### Multiple packages

watch-modules does support multiple modules:

```sh
npx watch-module /path/to/my/module ../my-other-module
```

### Configuration

On first launch, watch-module creates an empty configuration file to `{HOME_FOLDER}/.config/watch-module/watch-module.json`
In order to force a different configuration for a specific module, you can add "per module" entries to this file :

```jsonc
{
  // watch the files in the "lib" directory
  // and call "npm run build:prepare" script when there is a change
  "my-awesome-module": {
    "includes": ["lib"],
    "command": "npm run build:prepare"
  },
  // watch all the files in the root directory
  // do not watch the files in the "dist" directory
  // do not call any command before copying the files
  "my-other-module": {
    "command": null,
    "includes": [""], // use "" or "." to watch all files
    "excludes": ["dist"]
  }
}
```

You can override this global configuration by configuring the targeted module's `package.json` file direclty:

```jsonc
{
  "name": "my package",
  "scripts": {
    "build:prod": "touch build.js"
  },
  "watch-module": {
    "command": "yarn run build:prod",
    "includes": ["src"]
  }
}
```

If no configuration is found for a module, watch-module falls back to the default configuration:

```jsonc
{
  "command": "yarn|npm run build", // default configs tries to detect yarn or npm
  "includes": ["src"],
  "excludes": []
}
```

#### Partial configuration

If you overrides only some parts of the configuration, then the keys that are not overiden will use the default configuration.

## Alternatives

[npm link | yarn link] : it does work fine until you have dependencies, etc. in your package.

[yalc](https://github.com/whitecolor/yalc) : nice alternative, but too complex for our purpose (it does use a local repository, that you need to push on change, etc.)

## Troubleshooting

### Command not found

If you have the error `Command not found`, you can force npx to use the latest version of the package:

```sh
npx watch-module@latest
```

It should resolve the issue.
