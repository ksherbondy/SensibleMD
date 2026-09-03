# Third-Party Software Licenses

SensibleMD uses third-party open-source software.

This file is an **inventory generated from the project's `package-lock.json`** on
2026-09-03. It records the package versions and license identifiers declared in
the lockfile so contributors and distributors can see what software SensibleMD
depends on.

> **Important:** This inventory is not a substitute for the complete license
> texts and copyright notices required by individual packages. Before
> distributing packaged SensibleMD binaries, the release process should also
> collect and preserve any required `LICENSE`, `COPYING`, `NOTICE`, attribution,
> or similar files from the third-party software actually included in the
> distributed application.

SensibleMD's own source code is intended to be licensed separately under
**GPL-3.0-or-later**. Third-party software remains under its respective license;
including a dependency in SensibleMD does not change that dependency's license.

## Inventory summary

- Unique third-party package/version combinations: **512**
- Direct runtime dependencies: **15**
- Direct development/build dependencies: **12**
- Transitive runtime dependencies: **115**
- Transitive development/build dependencies: **370**

### Declared licenses

| License expression | Package/version entries |
| --- | ---: |
| `MIT` | 414 |
| `ISC` | 39 |
| `BSD-3-Clause` | 17 |
| `MPL-2.0` | 12 |
| `Apache-2.0` | 10 |
| `BlueOak-1.0.0` | 8 |
| `BSD-2-Clause` | 6 |
| `(MIT OR CC0-1.0)` | 1 |
| `(WTFPL OR MIT)` | 1 |
| `0BSD` | 1 |
| `Python-2.0` | 1 |
| `WTFPL` | 1 |
| `WTFPL OR ISC` | 1 |

## Direct runtime dependencies

These packages are declared directly in SensibleMD's `dependencies`.

| Package | Version | Declared license | Notes |
| --- | --- | --- | --- |
| `@codemirror/commands` | `6.11.0` | `MIT` |  |
| `@codemirror/lang-markdown` | `6.5.2` | `MIT` |  |
| `@codemirror/state` | `6.7.2` | `MIT` |  |
| `@codemirror/theme-one-dark` | `6.1.3` | `MIT` |  |
| `@codemirror/view` | `6.43.11` | `MIT` |  |
| `lucide-react` | `1.40.0` | `ISC` |  |
| `mdast-util-to-string` | `4.0.0` | `MIT` |  |
| `react` | `19.2.8` | `MIT` |  |
| `react-dom` | `19.2.8` | `MIT` |  |
| `react-markdown` | `10.1.0` | `MIT` |  |
| `rehype-sanitize` | `6.0.0` | `MIT` |  |
| `remark-gfm` | `4.0.1` | `MIT` |  |
| `remark-parse` | `11.0.0` | `MIT` |  |
| `unified` | `11.0.5` | `MIT` |  |
| `zod` | `4.5.4` | `MIT` |  |

## Direct development and build dependencies

These packages are declared directly in SensibleMD's `devDependencies`.
Development-only packages normally are not part of the shipped application,
but their licenses still matter when redistributing the tools themselves or
when a build process copies their code or assets into a release.

| Package | Version | Declared license | Notes |
| --- | --- | --- | --- |
| `@types/node` | `24.13.3` | `MIT` |  |
| `@types/react` | `19.2.18` | `MIT` |  |
| `@types/react-dom` | `19.2.7` | `MIT` |  |
| `@vitejs/plugin-react` | `6.1.1` | `MIT` |  |
| `concurrently` | `10.0.5` | `MIT` |  |
| `electron` | `44.1.1` | `MIT` |  |
| `electron-builder` | `26.15.3` | `MIT` |  |
| `oxlint` | `1.81.0` | `MIT` |  |
| `typescript` | `6.0.3` | `Apache-2.0` |  |
| `vite` | `8.2.2` | `MIT` |  |
| `vitest` | `4.1.11` | `MIT` |  |
| `wait-on` | `9.1.0` | `MIT` |  |

<details>
<summary><strong>Transitive runtime dependencies (115)</strong></summary>

These dependencies are pulled in by runtime packages. Whether every entry below
is actually present in the final Electron bundle should be verified against the
packaged artifact during the release process.

| Package | Version | Declared license | Notes |
| --- | --- | --- | --- |
| `@codemirror/autocomplete` | `6.20.3` | `MIT` |  |
| `@codemirror/lang-css` | `6.3.1` | `MIT` |  |
| `@codemirror/lang-html` | `6.4.12` | `MIT` |  |
| `@codemirror/lang-javascript` | `6.2.5` | `MIT` |  |
| `@codemirror/language` | `6.12.4` | `MIT` |  |
| `@codemirror/lint` | `6.9.7` | `MIT` |  |
| `@lezer/common` | `1.5.2` | `MIT` |  |
| `@lezer/css` | `1.3.6` | `MIT` |  |
| `@lezer/highlight` | `1.2.3` | `MIT` |  |
| `@lezer/html` | `1.3.13` | `MIT` |  |
| `@lezer/javascript` | `1.5.4` | `MIT` |  |
| `@lezer/lr` | `1.4.10` | `MIT` |  |
| `@lezer/markdown` | `1.7.2` | `MIT` |  |
| `@marijn/find-cluster-break` | `1.0.4` | `MIT` |  |
| `@types/debug` | `4.1.13` | `MIT` |  |
| `@types/estree` | `1.0.9` | `MIT` |  |
| `@types/estree-jsx` | `1.0.5` | `MIT` |  |
| `@types/hast` | `3.0.5` | `MIT` |  |
| `@types/mdast` | `4.0.4` | `MIT` |  |
| `@types/ms` | `2.1.0` | `MIT` |  |
| `@types/unist` | `2.0.11` | `MIT` |  |
| `@types/unist` | `3.0.3` | `MIT` |  |
| `@ungap/structured-clone` | `1.4.0` | `ISC` |  |
| `bail` | `2.0.2` | `MIT` |  |
| `ccount` | `2.0.1` | `MIT` |  |
| `character-entities` | `2.0.2` | `MIT` |  |
| `character-entities-html4` | `2.1.0` | `MIT` |  |
| `character-entities-legacy` | `3.0.0` | `MIT` |  |
| `character-reference-invalid` | `2.0.1` | `MIT` |  |
| `comma-separated-tokens` | `2.0.3` | `MIT` |  |
| `crelt` | `1.0.7` | `MIT` |  |
| `csstype` | `3.2.3` | `MIT` |  |
| `debug` | `4.4.3` | `MIT` |  |
| `decode-named-character-reference` | `1.3.0` | `MIT` |  |
| `dequal` | `2.0.3` | `MIT` |  |
| `devlop` | `1.1.0` | `MIT` |  |
| `escape-string-regexp` | `5.0.0` | `MIT` |  |
| `estree-util-is-identifier-name` | `3.0.0` | `MIT` |  |
| `extend` | `3.0.2` | `MIT` |  |
| `hast-util-sanitize` | `5.0.2` | `MIT` |  |
| `hast-util-to-jsx-runtime` | `2.3.6` | `MIT` |  |
| `hast-util-whitespace` | `3.0.0` | `MIT` |  |
| `html-url-attributes` | `3.0.1` | `MIT` |  |
| `inline-style-parser` | `0.2.7` | `MIT` |  |
| `is-alphabetical` | `2.0.1` | `MIT` |  |
| `is-alphanumerical` | `2.0.1` | `MIT` |  |
| `is-decimal` | `2.0.1` | `MIT` |  |
| `is-hexadecimal` | `2.0.1` | `MIT` |  |
| `is-plain-obj` | `4.1.0` | `MIT` |  |
| `longest-streak` | `3.1.0` | `MIT` |  |
| `markdown-table` | `3.0.4` | `MIT` |  |
| `mdast-util-find-and-replace` | `3.0.2` | `MIT` |  |
| `mdast-util-from-markdown` | `2.0.3` | `MIT` |  |
| `mdast-util-gfm` | `3.1.0` | `MIT` |  |
| `mdast-util-gfm-autolink-literal` | `2.0.1` | `MIT` |  |
| `mdast-util-gfm-footnote` | `2.1.0` | `MIT` |  |
| `mdast-util-gfm-strikethrough` | `2.0.0` | `MIT` |  |
| `mdast-util-gfm-table` | `2.0.0` | `MIT` |  |
| `mdast-util-gfm-task-list-item` | `2.0.0` | `MIT` |  |
| `mdast-util-mdx-expression` | `2.0.1` | `MIT` |  |
| `mdast-util-mdx-jsx` | `3.2.0` | `MIT` |  |
| `mdast-util-mdxjs-esm` | `2.0.1` | `MIT` |  |
| `mdast-util-phrasing` | `4.1.0` | `MIT` |  |
| `mdast-util-to-hast` | `13.2.1` | `MIT` |  |
| `mdast-util-to-markdown` | `2.1.2` | `MIT` |  |
| `micromark` | `4.0.2` | `MIT` |  |
| `micromark-core-commonmark` | `2.0.3` | `MIT` |  |
| `micromark-extension-gfm` | `3.0.0` | `MIT` |  |
| `micromark-extension-gfm-autolink-literal` | `2.1.0` | `MIT` |  |
| `micromark-extension-gfm-footnote` | `2.1.0` | `MIT` |  |
| `micromark-extension-gfm-strikethrough` | `2.1.0` | `MIT` |  |
| `micromark-extension-gfm-table` | `2.1.1` | `MIT` |  |
| `micromark-extension-gfm-tagfilter` | `2.0.0` | `MIT` |  |
| `micromark-extension-gfm-task-list-item` | `2.1.0` | `MIT` |  |
| `micromark-factory-destination` | `2.0.1` | `MIT` |  |
| `micromark-factory-label` | `2.0.1` | `MIT` |  |
| `micromark-factory-space` | `2.0.1` | `MIT` |  |
| `micromark-factory-title` | `2.0.1` | `MIT` |  |
| `micromark-factory-whitespace` | `2.0.1` | `MIT` |  |
| `micromark-util-character` | `2.1.1` | `MIT` |  |
| `micromark-util-chunked` | `2.0.1` | `MIT` |  |
| `micromark-util-classify-character` | `2.0.1` | `MIT` |  |
| `micromark-util-combine-extensions` | `2.0.1` | `MIT` |  |
| `micromark-util-decode-numeric-character-reference` | `2.0.2` | `MIT` |  |
| `micromark-util-decode-string` | `2.0.1` | `MIT` |  |
| `micromark-util-encode` | `2.0.1` | `MIT` |  |
| `micromark-util-html-tag-name` | `2.0.1` | `MIT` |  |
| `micromark-util-normalize-identifier` | `2.0.1` | `MIT` |  |
| `micromark-util-resolve-all` | `2.0.1` | `MIT` |  |
| `micromark-util-sanitize-uri` | `2.0.1` | `MIT` |  |
| `micromark-util-subtokenize` | `2.1.0` | `MIT` |  |
| `micromark-util-symbol` | `2.0.1` | `MIT` |  |
| `micromark-util-types` | `2.0.2` | `MIT` |  |
| `ms` | `2.1.3` | `MIT` |  |
| `parse-entities` | `4.0.2` | `MIT` |  |
| `property-information` | `7.2.0` | `MIT` |  |
| `remark-rehype` | `11.1.2` | `MIT` |  |
| `remark-stringify` | `11.0.0` | `MIT` |  |
| `scheduler` | `0.27.0` | `MIT` |  |
| `space-separated-tokens` | `2.0.2` | `MIT` |  |
| `stringify-entities` | `4.0.4` | `MIT` |  |
| `style-mod` | `4.1.3` | `MIT` |  |
| `style-to-js` | `1.1.21` | `MIT` |  |
| `style-to-object` | `1.0.14` | `MIT` |  |
| `trim-lines` | `3.0.1` | `MIT` |  |
| `trough` | `2.2.0` | `MIT` |  |
| `unist-util-is` | `6.0.1` | `MIT` |  |
| `unist-util-position` | `5.0.0` | `MIT` |  |
| `unist-util-stringify-position` | `4.0.0` | `MIT` |  |
| `unist-util-visit` | `5.1.0` | `MIT` |  |
| `unist-util-visit-parents` | `6.0.2` | `MIT` |  |
| `vfile` | `6.0.3` | `MIT` |  |
| `vfile-message` | `4.0.3` | `MIT` |  |
| `w3c-keyname` | `2.2.8` | `MIT` |  |
| `zwitch` | `2.0.4` | `MIT` |  |

</details>

<details>
<summary><strong>Transitive development/build dependencies (370)</strong></summary>

These dependencies are primarily part of the development, testing, packaging,
or build toolchain.

| Package | Version | Declared license | Notes |
| --- | --- | --- | --- |
| `@electron-internal/extract-zip` | `1.0.5` | `BSD-2-Clause` |  |
| `@electron/asar` | `3.4.1` | `MIT` |  |
| `@electron/fuses` | `1.8.0` | `MIT` |  |
| `@electron/get` | `3.1.0` | `MIT` |  |
| `@electron/get` | `5.1.0` | `MIT` |  |
| `@electron/notarize` | `2.5.0` | `MIT` |  |
| `@electron/osx-sign` | `1.3.3` | `BSD-2-Clause` |  |
| `@electron/rebuild` | `4.2.0` | `MIT` |  |
| `@electron/universal` | `2.0.3` | `MIT` |  |
| `@electron/windows-sign` | `1.2.2` | `BSD-2-Clause` | optional, peer |
| `@hapi/address` | `5.1.1` | `BSD-3-Clause` |  |
| `@hapi/formula` | `3.0.2` | `BSD-3-Clause` |  |
| `@hapi/hoek` | `11.0.7` | `BSD-3-Clause` |  |
| `@hapi/pinpoint` | `2.0.1` | `BSD-3-Clause` |  |
| `@hapi/tlds` | `1.1.7` | `BSD-3-Clause` |  |
| `@hapi/topo` | `6.0.2` | `BSD-3-Clause` |  |
| `@isaacs/fs-minipass` | `4.0.1` | `ISC` |  |
| `@jridgewell/sourcemap-codec` | `1.6.0` | `MIT` |  |
| `@malept/cross-spawn-promise` | `2.0.0` | `Apache-2.0` |  |
| `@malept/flatpak-bundler` | `0.4.0` | `MIT` |  |
| `@noble/hashes` | `1.4.0` | `MIT` |  |
| `@noble/hashes` | `2.4.0` | `MIT` |  |
| `@oxc-project/types` | `0.148.0` | `MIT` |  |
| `@oxlint/binding-android-arm-eabi` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-android-arm64` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-darwin-arm64` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-darwin-x64` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-freebsd-x64` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-arm-gnueabihf` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-arm-musleabihf` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-arm64-gnu` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-arm64-musl` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-ppc64-gnu` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-riscv64-gnu` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-riscv64-musl` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-s390x-gnu` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-x64-gnu` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-linux-x64-musl` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-openharmony-arm64` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-win32-arm64-msvc` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-win32-ia32-msvc` | `1.81.0` | `MIT` | optional |
| `@oxlint/binding-win32-x64-msvc` | `1.81.0` | `MIT` | optional |
| `@peculiar/asn1-schema` | `2.9.4` | `MIT` |  |
| `@peculiar/json-schema` | `1.1.12` | `MIT` |  |
| `@peculiar/utils` | `2.0.3` | `MIT` |  |
| `@peculiar/webcrypto` | `1.7.1` | `MIT` |  |
| `@rolldown/binding-android-arm-eabi` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-android-arm64` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-darwin-arm64` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-darwin-x64` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-freebsd-x64` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-arm-gnueabihf` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-arm64-gnu` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-arm64-musl` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-ppc64-gnu` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-s390x-gnu` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-x64-gnu` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-linux-x64-musl` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-openharmony-arm64` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-win32-arm64-msvc` | `1.2.7` | `MIT` | optional |
| `@rolldown/binding-win32-x64-msvc` | `1.2.7` | `MIT` | optional |
| `@rolldown/pluginutils` | `1.0.1` | `MIT` |  |
| `@sindresorhus/is` | `4.6.0` | `MIT` |  |
| `@standard-schema/spec` | `1.1.0` | `MIT` |  |
| `@szmarczak/http-timer` | `4.0.6` | `MIT` |  |
| `@types/cacheable-request` | `6.0.3` | `MIT` |  |
| `@types/chai` | `5.2.3` | `MIT` |  |
| `@types/deep-eql` | `4.0.2` | `MIT` |  |
| `@types/fs-extra` | `9.0.13` | `MIT` |  |
| `@types/http-cache-semantics` | `4.2.0` | `MIT` |  |
| `@types/keyv` | `3.1.4` | `MIT` |  |
| `@types/responselike` | `1.0.3` | `MIT` |  |
| `@vitest/expect` | `4.1.11` | `MIT` |  |
| `@vitest/mocker` | `4.1.11` | `MIT` |  |
| `@vitest/pretty-format` | `4.1.11` | `MIT` |  |
| `@vitest/runner` | `4.1.11` | `MIT` |  |
| `@vitest/snapshot` | `4.1.11` | `MIT` |  |
| `@vitest/spy` | `4.1.11` | `MIT` |  |
| `@vitest/utils` | `4.1.11` | `MIT` |  |
| `@xmldom/xmldom` | `0.8.15` | `MIT` |  |
| `abbrev` | `4.0.0` | `ISC` |  |
| `agent-base` | `6.0.2` | `MIT` |  |
| `agent-base` | `7.1.4` | `MIT` |  |
| `ajv` | `8.20.0` | `MIT` |  |
| `ansi-regex` | `5.0.1` | `MIT` |  |
| `ansi-regex` | `6.3.0` | `MIT` |  |
| `ansi-styles` | `4.3.0` | `MIT` |  |
| `ansi-styles` | `6.2.3` | `MIT` |  |
| `app-builder-lib` | `26.15.3` | `MIT` |  |
| `argparse` | `2.0.1` | `Python-2.0` |  |
| `asn1js` | `3.0.10` | `BSD-3-Clause` |  |
| `assertion-error` | `2.0.1` | `MIT` |  |
| `async` | `3.2.6` | `MIT` |  |
| `async-exit-hook` | `2.0.1` | `MIT` |  |
| `asynckit` | `0.4.0` | `MIT` |  |
| `at-least-node` | `1.0.0` | `ISC` |  |
| `aws4` | `1.13.2` | `MIT` |  |
| `axios` | `1.20.0` | `MIT` |  |
| `balanced-match` | `1.0.2` | `MIT` |  |
| `balanced-match` | `4.0.4` | `MIT` |  |
| `base64-js` | `1.5.1` | `MIT` |  |
| `bluebird` | `3.7.2` | `MIT` |  |
| `boolean` | `3.2.0` | `MIT` | optional |
| `brace-expansion` | `1.1.18` | `MIT` |  |
| `brace-expansion` | `2.1.4` | `MIT` |  |
| `brace-expansion` | `5.0.9` | `MIT` |  |
| `buffer-from` | `1.1.2` | `MIT` |  |
| `builder-util` | `26.15.3` | `MIT` |  |
| `builder-util-runtime` | `9.7.0` | `MIT` |  |
| `bytestreamjs` | `2.0.1` | `BSD-3-Clause` |  |
| `cacheable-lookup` | `5.0.4` | `MIT` |  |
| `cacheable-request` | `7.0.4` | `MIT` |  |
| `call-bind-apply-helpers` | `1.0.2` | `MIT` |  |
| `chai` | `6.2.2` | `MIT` |  |
| `chalk` | `4.1.2` | `MIT` |  |
| `chalk` | `5.6.2` | `MIT` |  |
| `chownr` | `3.0.0` | `BlueOak-1.0.0` |  |
| `chromium-pickle-js` | `0.2.0` | `MIT` |  |
| `ci-info` | `4.3.1` | `MIT` |  |
| `ci-info` | `4.4.0` | `MIT` |  |
| `cliui` | `8.0.1` | `ISC` |  |
| `cliui` | `9.0.1` | `ISC` |  |
| `clone-response` | `1.0.3` | `MIT` |  |
| `color-convert` | `2.0.1` | `MIT` |  |
| `color-name` | `1.1.4` | `MIT` |  |
| `combined-stream` | `1.0.8` | `MIT` |  |
| `commander` | `5.1.0` | `MIT` |  |
| `commander` | `9.5.0` | `MIT` | optional, peer |
| `compare-version` | `0.1.2` | `MIT` |  |
| `concat-map` | `0.0.1` | `MIT` |  |
| `convert-source-map` | `2.0.0` | `MIT` |  |
| `core-util-is` | `1.0.3` | `MIT` |  |
| `cross-dirname` | `0.1.0` | `MIT` | optional, peer |
| `cross-spawn` | `7.0.6` | `MIT` |  |
| `decompress-response` | `6.0.0` | `MIT` |  |
| `defer-to-connect` | `2.0.1` | `MIT` |  |
| `define-data-property` | `1.1.4` | `MIT` | optional |
| `define-properties` | `1.2.1` | `MIT` | optional |
| `delayed-stream` | `1.0.0` | `MIT` |  |
| `detect-libc` | `2.1.2` | `Apache-2.0` |  |
| `detect-node` | `2.1.0` | `MIT` | optional |
| `dir-compare` | `4.2.0` | `MIT` |  |
| `dmg-builder` | `26.15.3` | `MIT` |  |
| `dotenv` | `16.6.1` | `BSD-2-Clause` |  |
| `dotenv-expand` | `11.0.7` | `BSD-2-Clause` |  |
| `dunder-proto` | `1.0.1` | `MIT` |  |
| `duplexer2` | `0.1.4` | `BSD-3-Clause` |  |
| `ejs` | `3.1.10` | `Apache-2.0` |  |
| `electron-builder-squirrel-windows` | `26.15.3` | `MIT` | peer |
| `electron-publish` | `26.15.3` | `MIT` |  |
| `electron-winstaller` | `5.4.0` | `MIT` | peer |
| `emoji-regex` | `10.6.0` | `MIT` |  |
| `emoji-regex` | `8.0.0` | `MIT` |  |
| `end-of-stream` | `1.4.5` | `MIT` |  |
| `env-paths` | `2.2.1` | `MIT` |  |
| `env-paths` | `3.0.0` | `MIT` |  |
| `err-code` | `2.0.3` | `MIT` |  |
| `es-define-property` | `1.0.1` | `MIT` |  |
| `es-errors` | `1.3.0` | `MIT` |  |
| `es-module-lexer` | `2.3.2` | `MIT` |  |
| `es-object-atoms` | `1.1.2` | `MIT` |  |
| `es-set-tostringtag` | `2.1.0` | `MIT` |  |
| `es6-error` | `4.1.1` | `MIT` | optional |
| `escalade` | `3.2.0` | `MIT` |  |
| `escape-string-regexp` | `4.0.0` | `MIT` | optional |
| `estree-walker` | `3.0.3` | `MIT` |  |
| `expect-type` | `1.4.0` | `Apache-2.0` |  |
| `exponential-backoff` | `3.1.3` | `Apache-2.0` |  |
| `fast-deep-equal` | `3.1.3` | `MIT` |  |
| `fast-uri` | `3.1.7` | `BSD-3-Clause` |  |
| `fdir` | `6.5.0` | `MIT` |  |
| `filelist` | `1.0.6` | `Apache-2.0` |  |
| `follow-redirects` | `1.16.0` | `MIT` |  |
| `form-data` | `4.0.6` | `MIT` |  |
| `fs-extra` | `10.1.0` | `MIT` |  |
| `fs-extra` | `11.3.1` | `MIT` |  |
| `fs-extra` | `11.4.0` | `MIT` | optional, peer |
| `fs-extra` | `7.0.1` | `MIT` | peer |
| `fs-extra` | `8.1.0` | `MIT` |  |
| `fs-extra` | `9.1.0` | `MIT` |  |
| `fs.realpath` | `1.0.0` | `ISC` |  |
| `fsevents` | `2.3.3` | `MIT` | optional |
| `function-bind` | `1.1.2` | `MIT` |  |
| `get-caller-file` | `2.0.5` | `ISC` |  |
| `get-east-asian-width` | `1.6.0` | `MIT` |  |
| `get-intrinsic` | `1.3.0` | `MIT` |  |
| `get-proto` | `1.0.1` | `MIT` |  |
| `get-stream` | `5.2.0` | `MIT` |  |
| `glob` | `7.2.3` | `ISC` |  |
| `global-agent` | `3.0.0` | `BSD-3-Clause` | optional |
| `globalthis` | `1.0.4` | `MIT` | optional |
| `gopd` | `1.2.0` | `MIT` |  |
| `got` | `11.8.6` | `MIT` |  |
| `graceful-fs` | `4.2.11` | `ISC` |  |
| `has-flag` | `4.0.0` | `MIT` |  |
| `has-property-descriptors` | `1.0.2` | `MIT` | optional |
| `has-symbols` | `1.1.0` | `MIT` |  |
| `has-tostringtag` | `1.0.2` | `MIT` |  |
| `hasown` | `2.0.4` | `MIT` |  |
| `hosted-git-info` | `4.1.0` | `ISC` |  |
| `http-cache-semantics` | `4.2.0` | `BSD-2-Clause` |  |
| `http-proxy-agent` | `7.0.2` | `MIT` |  |
| `http2-wrapper` | `1.0.3` | `MIT` |  |
| `https-proxy-agent` | `5.0.1` | `MIT` |  |
| `https-proxy-agent` | `7.0.6` | `MIT` |  |
| `inflight` | `1.0.6` | `ISC` |  |
| `inherits` | `2.0.4` | `ISC` |  |
| `is-fullwidth-code-point` | `3.0.0` | `MIT` |  |
| `isarray` | `1.0.0` | `MIT` |  |
| `isbinaryfile` | `4.0.10` | `MIT` |  |
| `isbinaryfile` | `5.0.7` | `MIT` |  |
| `isexe` | `2.0.0` | `ISC` |  |
| `isexe` | `3.1.5` | `BlueOak-1.0.0` |  |
| `isexe` | `4.0.0` | `BlueOak-1.0.0` |  |
| `jake` | `10.9.4` | `Apache-2.0` |  |
| `jiti` | `2.7.0` | `MIT` |  |
| `joi` | `18.2.8` | `BSD-3-Clause` |  |
| `js-yaml` | `4.3.2` | `MIT` |  |
| `json-buffer` | `3.0.1` | `MIT` |  |
| `json-schema-traverse` | `1.0.0` | `MIT` |  |
| `json-stringify-safe` | `5.0.1` | `ISC` | optional |
| `json5` | `2.2.3` | `MIT` |  |
| `jsonfile` | `4.0.0` | `MIT` | peer |
| `jsonfile` | `6.2.1` | `MIT` |  |
| `keyv` | `4.5.4` | `MIT` |  |
| `lazy-val` | `1.0.5` | `MIT` |  |
| `lightningcss` | `1.33.0` | `MPL-2.0` |  |
| `lightningcss-android-arm64` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-darwin-arm64` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-darwin-x64` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-freebsd-x64` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-linux-arm-gnueabihf` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-linux-arm64-gnu` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-linux-arm64-musl` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-linux-x64-gnu` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-linux-x64-musl` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-win32-arm64-msvc` | `1.33.0` | `MPL-2.0` | optional |
| `lightningcss-win32-x64-msvc` | `1.33.0` | `MPL-2.0` | optional |
| `lodash` | `4.18.1` | `MIT` |  |
| `lowercase-keys` | `2.0.0` | `MIT` |  |
| `lru-cache` | `6.0.0` | `ISC` |  |
| `magic-string` | `0.30.21` | `MIT` |  |
| `matcher` | `3.0.0` | `MIT` | optional |
| `math-intrinsics` | `1.1.0` | `MIT` |  |
| `mime` | `2.6.0` | `MIT` |  |
| `mime-db` | `1.52.0` | `MIT` |  |
| `mime-types` | `2.1.35` | `MIT` |  |
| `mimic-response` | `1.0.1` | `MIT` |  |
| `mimic-response` | `3.1.0` | `MIT` |  |
| `minimatch` | `10.2.6` | `BlueOak-1.0.0` |  |
| `minimatch` | `3.1.5` | `ISC` |  |
| `minimatch` | `5.1.9` | `ISC` |  |
| `minimatch` | `9.0.9` | `ISC` |  |
| `minimist` | `1.2.8` | `MIT` |  |
| `minipass` | `7.1.3` | `BlueOak-1.0.0` |  |
| `minizlib` | `3.1.0` | `MIT` |  |
| `mkdirp` | `0.5.6` | `MIT` | peer |
| `nanoid` | `3.3.18` | `MIT` |  |
| `node-abi` | `4.35.0` | `MIT` |  |
| `node-api-version` | `0.2.1` | `MIT` |  |
| `node-gyp` | `12.4.0` | `MIT` |  |
| `node-int64` | `0.4.0` | `MIT` |  |
| `nopt` | `9.0.0` | `ISC` |  |
| `normalize-url` | `6.1.0` | `MIT` |  |
| `object-keys` | `1.1.1` | `MIT` | optional |
| `obug` | `2.1.4` | `MIT` |  |
| `once` | `1.4.0` | `ISC` |  |
| `p-cancelable` | `2.1.1` | `MIT` |  |
| `p-limit` | `3.1.0` | `MIT` |  |
| `path-is-absolute` | `1.0.1` | `MIT` |  |
| `path-key` | `3.1.1` | `MIT` |  |
| `pathe` | `2.0.3` | `MIT` |  |
| `pe-library` | `0.4.1` | `MIT` |  |
| `picocolors` | `1.1.1` | `ISC` |  |
| `picomatch` | `4.0.7` | `MIT` |  |
| `pkijs` | `3.4.0` | `BSD-3-Clause` |  |
| `plist` | `3.1.0` | `MIT` |  |
| `postcss` | `8.5.28` | `MIT` |  |
| `postject` | `1.0.0-alpha.6` | `MIT` | optional, peer |
| `proc-log` | `6.1.0` | `ISC` |  |
| `process-nextick-args` | `2.0.1` | `MIT` |  |
| `progress` | `2.0.3` | `MIT` |  |
| `promise-retry` | `2.0.1` | `MIT` |  |
| `proper-lockfile` | `4.1.2` | `MIT` |  |
| `proxy-from-env` | `2.1.0` | `MIT` |  |
| `pump` | `3.0.4` | `MIT` |  |
| `pvtsutils` | `1.3.6` | `MIT` |  |
| `pvutils` | `1.2.0` | `MIT` |  |
| `quick-lru` | `5.1.1` | `MIT` |  |
| `read-binary-file-arch` | `1.0.6` | `MIT` |  |
| `readable-stream` | `2.3.8` | `MIT` |  |
| `require-directory` | `2.1.1` | `MIT` |  |
| `require-from-string` | `2.0.2` | `MIT` |  |
| `resedit` | `1.7.2` | `MIT` |  |
| `resolve-alpn` | `1.2.1` | `MIT` |  |
| `responselike` | `2.0.1` | `MIT` |  |
| `retry` | `0.12.0` | `MIT` |  |
| `rimraf` | `2.6.3` | `ISC` | peer |
| `roarr` | `2.15.4` | `BSD-3-Clause` | optional |
| `rolldown` | `1.2.7` | `MIT` |  |
| `rxjs` | `7.8.2` | `Apache-2.0` |  |
| `safe-buffer` | `5.1.2` | `MIT` |  |
| `sanitize-filename` | `1.6.4` | `WTFPL OR ISC` |  |
| `sax` | `1.6.1` | `BlueOak-1.0.0` |  |
| `semver` | `5.7.2` | `ISC` |  |
| `semver` | `6.3.1` | `ISC` |  |
| `semver` | `7.7.4` | `ISC` |  |
| `semver` | `7.8.5` | `ISC` |  |
| `semver-compare` | `1.0.0` | `MIT` | optional |
| `serialize-error` | `7.0.1` | `MIT` | optional |
| `shebang-command` | `2.0.0` | `MIT` |  |
| `shebang-regex` | `3.0.0` | `MIT` |  |
| `shell-quote` | `1.9.0` | `MIT` |  |
| `siginfo` | `2.0.0` | `ISC` |  |
| `signal-exit` | `3.0.7` | `ISC` |  |
| `simple-update-notifier` | `2.0.0` | `MIT` |  |
| `source-map` | `0.6.1` | `BSD-3-Clause` |  |
| `source-map-js` | `1.2.1` | `BSD-3-Clause` |  |
| `source-map-support` | `0.5.21` | `MIT` |  |
| `sprintf-js` | `1.1.3` | `BSD-3-Clause` | optional |
| `stackback` | `0.0.2` | `MIT` |  |
| `stat-mode` | `1.0.0` | `MIT` |  |
| `std-env` | `4.2.0` | `MIT` |  |
| `string-width` | `4.2.3` | `MIT` |  |
| `string-width` | `7.2.0` | `MIT` |  |
| `string_decoder` | `1.1.1` | `MIT` |  |
| `strip-ansi` | `6.0.1` | `MIT` |  |
| `strip-ansi` | `7.2.0` | `MIT` |  |
| `sumchecker` | `3.0.1` | `Apache-2.0` |  |
| `supports-color` | `10.2.2` | `MIT` |  |
| `supports-color` | `7.2.0` | `MIT` |  |
| `tar` | `7.5.22` | `BlueOak-1.0.0` |  |
| `temp` | `0.9.4` | `MIT` | peer |
| `temp-file` | `3.4.0` | `MIT` |  |
| `tiny-async-pool` | `1.3.0` | `MIT` |  |
| `tinybench` | `2.9.0` | `MIT` |  |
| `tinyexec` | `1.3.1` | `MIT` |  |
| `tinyglobby` | `0.2.17` | `MIT` |  |
| `tinyrainbow` | `3.1.1` | `MIT` |  |
| `tmp` | `0.2.7` | `MIT` |  |
| `tmp-promise` | `3.0.3` | `MIT` |  |
| `tree-kill` | `1.2.2` | `MIT` |  |
| `truncate-utf8-bytes` | `1.0.2` | `WTFPL` |  |
| `tslib` | `2.8.1` | `0BSD` |  |
| `type-fest` | `0.13.1` | `(MIT OR CC0-1.0)` | optional |
| `undici` | `6.28.0` | `MIT` |  |
| `undici` | `7.29.0` | `MIT` | optional |
| `undici-types` | `7.18.2` | `MIT` |  |
| `universalify` | `0.1.2` | `MIT` | peer |
| `universalify` | `2.0.1` | `MIT` |  |
| `unzipper` | `0.12.5` | `MIT` |  |
| `utf8-byte-length` | `1.0.5` | `(WTFPL OR MIT)` |  |
| `util-deprecate` | `1.0.2` | `MIT` |  |
| `webcrypto-core` | `1.9.2` | `MIT` |  |
| `which` | `2.0.2` | `ISC` |  |
| `which` | `5.0.0` | `ISC` |  |
| `which` | `6.0.1` | `ISC` |  |
| `why-is-node-running` | `2.3.0` | `MIT` |  |
| `wrap-ansi` | `7.0.0` | `MIT` |  |
| `wrap-ansi` | `9.0.2` | `MIT` |  |
| `wrappy` | `1.0.2` | `ISC` |  |
| `xmlbuilder` | `15.1.1` | `MIT` |  |
| `y18n` | `5.0.8` | `ISC` |  |
| `yallist` | `4.0.0` | `ISC` |  |
| `yallist` | `5.0.0` | `BlueOak-1.0.0` |  |
| `yargs` | `17.7.3` | `MIT` |  |
| `yargs` | `18.0.0` | `MIT` |  |
| `yargs-parser` | `21.1.1` | `ISC` |  |
| `yargs-parser` | `22.0.0` | `ISC` |  |
| `yocto-queue` | `0.1.0` | `MIT` |  |

</details>

## Release checklist

Before publishing a `.dmg`, `.exe`, AppImage, package, or other binary release:

1. Generate the production package from a clean lockfile.
2. Determine which third-party packages and assets are actually present in the
   distributed artifact.
3. Preserve all license and attribution notices required by those packages.
4. Preserve any package-specific `NOTICE` files.
5. Review packages whose license is missing, unusual, dual-licensed, or
   expressed as a compound SPDX expression.
6. Regenerate this inventory whenever `package-lock.json` changes.
7. Include the applicable third-party notices with the distributed application.

## Notes for contributors

Do not remove or alter third-party copyright or license notices.

Before introducing a new dependency, confirm that its license is compatible
with SensibleMD's project license and document any unusual attribution,
distribution, patent, source-availability, or copyleft obligations.

---

Generated from `package-lock.json`. This document is informational and should
be reviewed as part of the release process rather than treated as legal advice.
