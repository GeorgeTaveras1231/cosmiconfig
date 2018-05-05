# cosmiconfig

[![Build Status](https://img.shields.io/travis/davidtheclark/cosmiconfig/master.svg?label=unix%20build)](https://travis-ci.org/davidtheclark/cosmiconfig) [![Build status](https://img.shields.io/appveyor/ci/davidtheclark/cosmiconfig/master.svg?label=windows%20build)](https://ci.appveyor.com/project/davidtheclark/cosmiconfig/branch/master)

Cosmiconfig searches for and loads configuration for your program.

It features smart defaults based on conventional expectations in the JavaScript ecosystem.
But it's also flexible enough to search wherever you'd like to search, and load whatever you'd like to load.

By default, Cosmiconfig will start where you tell it to start and search up the directory tree for the following:

- a `package.json` property
- a JSON or YAML, extensionless "rc file"
- a `.config.js` CommonJS module

For example, if your module's name is "soursocks", cosmiconfig will search for configuration in the following places:

- a `soursocks` property in `package.json` (anywhere up the directory tree)
- a `.soursocksrc` file in JSON or YAML format (anywhere up the directory tree)
- a `soursocks.config.js` file exporting a JS object (anywhere up the directory tree)

Cosmiconfig continues to search up the directory tree, checking each of these places in each directory, until it finds some acceptable configuration (or hits the home directory).

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [Result](#result)
- [cosmiconfig()](#cosmiconfig-1)
  - [moduleName](#modulename)
- [explorer.search()](#explorersearch)
  - [searchFrom](#searchfrom)
- [explorer.searchSync()](#explorersearchsync)
- [explorer.load()](#explorerload)
- [explorer.loadSync()](#explorerloadsync)
- [explorer.clearLoadCache()](#explorerclearloadcache)
- [explorer.clearSearchCache()](#explorerclearsearchcache)
- [explorer.clearCaches()](#explorerclearcaches)
- [cosmiconfigOptions](#cosmiconfigoptions)
  - [searchPlaces](#searchplaces)
  - [loaders](#loaders)
  - [packageProp](#packageprop)
  - [stopDir](#stopdir)
  - [cache](#cache)
  - [transform](#transform)
  - [ignoreEmptySearchPlaces](#ignoreemptysearchplaces)
- [Caching](#caching)
- [Differences from rc](#differences-from-rc)
- [Contributing & Development](#contributing--development)

## Installation

```
npm install cosmiconfig
```

Tested in Node 4+.

## Usage

Create a Cosmiconfig explorer, then either `search` for or directly `load` a configuration file.

```js
const cosmiconfig = require('cosmiconfig');
// ...
const explorer = cosmiconfig(moduleName);

// Search for a configuration by walking up directories.
// See documentation for search, below.
explorer.search()
  .then((result) => {
    // result.config is the parsed configuration object.
    // result.filepath is the path to the config file that was found.
    // result.isEmpty is true if there was nothing to parse in the config file.
  })
  .catch((error) => {
    // Do something constructive.
  });

// Load a configuration directly when you know where it should be.
// The result object is the same as for search.
// See documentation for load, below.
explorer.load(pathToConfig).then(..);

// You can also search and load synchronously.
const searchedFor = explorer.searchSync();
const loaded = explorer.loadSync(pathToConfig);
```

## Result

The result object you get from `search` or `load` has the following properties:

- **config:** The parsed configuration object. `undefined` if the file is empty.
- **filepath:** The path to the configuration file that was found.
- **isEmpty:** `true` if the configuration file is empty. This property will not be present if the configuration file is not empty.

## cosmiconfig()

```js
const explorer = cosmiconfig(moduleName[, cosmiconfigOptions])
```

Creates a cosmiconfig instance ("explorer") configured according to the arguments, and initializes its caches.

### moduleName

Type: `string`. **Required.**

Your module name. This is used to create the default [`searchPlaces`] and [`packageProp`].

**[`cosmiconfigOptions`] are documented below.**
You may not need them, and should first read about the functions you'll use.

## explorer.search()

```js
explorer.search([searchFrom]).then(result => {..})
```

Searches for a configuration file. Returns a Promise that resolves with a [result] or with `null`, if no configuration file is found.

You can do the same thing synchronously with [`searchSync()`].

Let's say your module name is `goldengrahams` so you initialized with `const explorer = cosmiconfig('goldengrahams');`.
Here's how your default [`search()`] will work:

- Starting from `process.cwd()` (or some other directory defined by the `searchFrom` argument to [`search()`]), look for configuration objects in the following places:
  1. A `goldengrahams` property in a `package.json` file.
  2. A `.goldengrahamsrc` file with JSON or YAML syntax.
  3. A `goldengrahams.config.js` JS file exporting the object.
- If none of those searches reveal a configuration object, move up one directory level and try again.
  So the search continues in `./`, `../`, `../../`, `../../../`, etc., checking the same places in each directory.
- Continue searching until arriving at your home directory (or some other directory defined by the cosmiconfig option [`stopDir`]).
- If at any point a parseable configuration is found, the [`search()`] Promise resolves with its [result] \(or, with [`searchSync()`], the [result] is returned).
- If no configuration object is found, the [`search()`] Promise resolves with `null` (or, with [`searchSync()`], `null` is returned).
- If a configuration object is found *but is malformed* (causing a parsing error), the [`search()`] Promise rejects with that error (so you should `.catch()` it). (Or, with [`searchSync()`], the error is thrown.)

**If you know exactly where your configuration file should be, you can use [`load()`], instead.**

**The search process is highly customizable.**
Use the cosmiconfig options [`searchPlaces`] and [`loaders`] to precisely define where you want to look for configurations and how you want to load them.

### searchFrom

Type: `string`.
Default: `process.cwd()`.

A filename.
[`search()`] will start its search here.

If the value is a directory, that's where the search starts.
If it's a file, the search starts in that file's directory.

## explorer.searchSync()

```js
const result = explorer.search([searchFrom]);
```

Synchronous version of [`search()`].

Returns a [result] or `null`.

## explorer.load()

```js
explorer.load([loadPath]).then(result => {..})
```

Loads a configuration file. Returns a Promise that resolves with a [result] or rejects with an error (if the file does not exist or cannot be loaded).

Use `load` if you already know where the configuration file is and you just need to load it.

```js
explorer.load('load/this/file.json'); // Tries to load load/this/file.json.
```

If you load a `package.json` file, the result will be derived from whatever property is specified as your [`packageProp`].

## explorer.loadSync()

```js
const result = explorer.load([loadPath]);
```

Synchronous version of [`load()`].

Returns a [result].

## explorer.clearLoadCache()

Clears the cache used in [`load()`].

## explorer.clearSearchCache()

Clears the cache used in [`search()`].

## explorer.clearCaches()

Performs both [`clearLoadCache()`] and [`clearSearchCache()`].

## cosmiconfigOptions

### searchPlaces

Type: `Array<string>`.
Default: See below.

An array of places that [`search()`] will check in each directory as it moves up the directory tree.
Each place is relative to the directory being searched, and the places are checked in the specified order.

**Default `searchPlaces`:**

```js
[
  'package.json',
  `.${moduleName}rc`,
  `${moduleName}.config.js`
]
```

Create your own array to search more, fewer, or altogether different places.

Every item in `searchPlaces` needs to have a loader in [`loaders`] that corresponds to its extension.
(Common extensions are covered by default loaders.)
Read more about [`loaders`] below.

`package.json` is a special value: When it is included in `searchPlaces`, Cosmiconfig will always parse it as JSON and load a property within it, not the whole file.
That property is defined with the [`packageProp`] option, and defaults to your module name.

Other examples:

```js
// Allow optional extensions on rc files
// (and your module name is "porgy"):
[
  'package.json',
  '.porgyrc',
  '.porgyrc.json',
  '.porgyrc.yaml',
  '.porgyrc.yml'
]

// ESLint searches for configuration in these places:
[
  '.eslintrc.js',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  '.eslintrc.json',
  '.eslintrc',
  'package.json'
]

// Babel looks in fewer places:
[
  'package.json',
  '.babelrc'
]

// Maybe you want to look for a wide variety of JS flavors:
[
  'porgy.config.js',
  'porgy.config.mjs',
  'porgy.config.ts',
  'porgy.config.coffee'
]
// ^^ You will need to designate custom loaders to tell
// Cosmiconfig how to handle these special JS flavors.

// Look within a .config/ subdirectory of every searched directory:
[
  'package.json',
  '.porgyrc',
  '.config/.porgyrc',
  '.porgyrc.json',
  '.config/.porgyrc.json'
]
```

### loaders

Type: `Object`.
Default: See below.

An object that maps extensions to the loader functions responsible for loading and parsing those extensions.

Cosmiconfig exposes its default loaders for `.js`, `.json`, and `.yaml` as `cosmiconfig.loadJs`, `cosmiconfig.loadJson`, and `cosmiconfig.loadYaml`, respectively.

**Default `loaders`:**

```js
{
  '.json': cosmiconfig.loadJson,
  '.yaml': cosmiconfig.loadYaml,
  '.yml': cosmiconfig.loadYml,
  '.js': cosmiconfig.loadJs,
  noExt: cosmiconfig.loadYaml
}
```

(YAML is a superset of JSON; which means YAML parsers can parse JSON; which is how extensionless files can be either YAML *or* JSON with only one parser.)

**If you provide a value for `loaders`, your value will be *merged* with the defaults.**
So you can override one or two without having to override them all.

**Keys in `loaders`** are extensions (starting with a period), or `noExt` to specify the loader for files *without* extensions, like `.soursocksrc`.

**Values in `loaders`** are either a loader function (described below) or an object with `sync` and/or `async` properties, whose values are loader functions.

**The most common use case for custom loaders value is to load extensionless `rc` as strict JSON, instead of JSON *or* YAML.**
To accomplish that, provide the following `loaders`:

```js
{
  noExt: cosmiconfig.loadJson
}
```

If you want to load files that are not handled by the loader functions Cosmiconfig exposes, you can write a custom loader function.

**Use cases for custom loader function:**

- Allow configuration syntaxes that aren't handled by Cosmiconfig's defaults, like JSON5, INI, or XML.
- Allow ES2015 modules from `.mjs` configuration files.
- Parse JS files with Babel before deriving the configuration.

**Custom loader functions** have the following signature:

```js
// Sync
(filepath: string, content: string) => Object | null

// Async
(filepath: string, content: string) => Object | null | Promise<Object | null>
```

Cosmiconfig reads the file when it checks whether the file exists, so it will provide you with both the file's path and its content.
Do whatever you need to, and return either a configuration object or `null` (or, for async-only loaders, a Promise that resolves with one of those).
`null` indicates that no real configuration was found and the search should continue.

It's easiest if you make your custom loader function synchronous.
Then it can be used regardless of whether you end up calling [`search()`] or [`searchSync()`], [`load()`] or [`loadSync()`].
If you want or need to provide an async-only loader, you can do so by making the value on `loaders` an object with an `async` property whose value is the async loader.
You can also add a `sync` property to designate a sync loader, if you want to use both async and sync search and load functions.

If an extension has *only* an async loader but you try to use [`searchSync()`] or [`loadSync()`], an error will be thrown.

Examples:

```js
// Allow JSON5 syntax:
{
  '.json': json5Loader
}

// Allow XML, and treat sync and async separately:
{
  '.xml': { async: asyncXmlLoader, sync: syncXmlLoader }
}

// Allow many flavors of JS:
{
  '.mjs': esmLoader,
  '.ts': typeScriptLoader
  '.coffee': coffeeScriptLoader
}

// Allow a special configuration syntax of your own creation:
{
  '.special': specialLoader
}
```

Note that **special JS syntax can also be handled by using a `require` hook**, because `cosmiconfig.loadJs` just uses `require`.
Whether you use custom loaders or a `require` hook is up to you.

### packageProp

Type: `string`.
Default: `` `${moduleName}` ``.

Name of the property in `package.json` to look for.

### stopDir

Type: `string`.
Default: Absolute path to your home directory.

Directory where the search will stop.

### cache

Type: `boolean`.
Default: `true`.

If `false`, no caches will be used.
Read more about ["Caching"](#caching) below.

### transform

Type: `(Result) => Promise<Result> | Result`.

A function that transforms the parsed configuration. Receives the [result].

If using [`search()`] or [`load()`] \(which are async), the transform function can return the transformed result or return a Promise that resolves with the transformed result.
If using [`searchSync()`] or [`loadSync()`], the function must be synchronous and return the transformed result.

The reason you might use this option — instead of simply applying your transform function some other way — is that *the transformed result will be cached*. If your transformation involves additional filesystem I/O or other potentially slow processing, you can use this option to avoid repeating those steps every time a given configuration is searched or loaded.

### ignoreEmptySearchPlaces

Type: `boolean`.
Default: `true`.

By default, if [`search()`] encounters an empty file (containing nothing but whitespace) in one of the [`searchPlaces`], it will ignore the empty file and move on.
If you'd like to load empty configuration files, instead, set this option to `false`.

Why might you want to load empty configuration files?
If you want to throw an error, or if an empty configuration file means something to your program.

## Caching

As of v2, cosmiconfig uses caching to reduce the need for repetitious reading of the filesystem. Every new cosmiconfig instance (created with `cosmiconfig()`) has its own caches.

To avoid or work around caching, you can do the following:

- Set the `cosmiconfig` option [`cache`] to `false`.
- Use the cache clearing methods [`clearLoadCache()`], [`clearSearchCache()`], and [`clearCaches()`].
- Create separate instances of cosmiconfig (separate "explorers").

## Differences from [rc](https://github.com/dominictarr/rc)

[rc](https://github.com/dominictarr/rc) serves its focused purpose well. cosmiconfig differs in a few key ways — making it more useful for some projects, less useful for others:

- Looks for configuration in some different places: in a `package.json` property, an rc file, a `.config.js` file, and rc files with extensions.
- Built-in support for JSON, YAML, and CommonJS formats.
- Stops at the first configuration found, instead of finding all that can be found up the directory tree and merging them automatically.
- Options.
- Asynchronous by default (though can be run synchronously).

## Contributing & Development

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

And please do participate!

[result]: #result

[`load()`]: #explorerload

[`loadsync()`]: #explorerloadsync

[`search()`]: #explorersearch

[`searchsync()`]: #explorersearchsync

[`clearloadcache()`]: #explorerclearloadcache

[`clearsearchcache()`]: #explorerclearsearchcache

[`clearcaches()`]: #explorerclearcaches

[`packageprop`]: #packageprop

[`cache`]: #cache

[`stopdir`]: #stopdir

[`searchplaces`]: #searchplaces

[`loaders`]: #loaders

[`cosmiconfigoptions`]: #cosmiconfigoptions
