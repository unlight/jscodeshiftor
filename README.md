# jscodeshiftor

Suggests code modifications and enhancements

- bottom-exports - Move exports to the end of the file
- export-default-name - Give default export name based on filename
- duplicate-object-keys - Remove duplicated keys in object
- noop - Do nothing

## Test Run

```sh
jscodeshift -t src/transforms/noop.ts fixtures
```

## Tools

- https://astexplorer.net/
- https://rajasegar.github.io/jarvis/
- https://rajasegar.github.io/ast-finder/
- https://rajasegar.github.io/ast-builder/
- https://ast-tooling.vercel.app/
- https://sebastianrosik.github.io/ast-types-dict/
- https://ast.sxzz.moe/
- https://codemod.dev/
- https://source-viz.netlify.app/

## Resources

- https://github.com/topics/jscodeshift
- https://github.com/topics/codemod
- https://www.codeshiftcommunity.com/docs/your-first-codemod
- https://github.com/seokju-na/jscodeshift-utils
- https://github.com/skovhus/jest-codemods/tree/master/src/transformers - with unit tests
- https://github.com/prisma/codemods/tree/main/transforms
- https://github.com/cpojer/js-codemod/tree/master/transforms - with tests [here](https://github.com/cpojer/js-codemod/tree/master/transforms/__tests__)
- https://github.com/jhgg/js-transforms - Some documented codemod experiments to help you learn
- https://github.com/powens/jscodeshift-examples
- https://github.com/chimurai/jscodeshift-typescript-example/
- https://github.com/sejoker/awesome-jscodeshift
- https://github.com/JamieMason/codemods
- https://github.com/JamieMason/codemods/blob/master/transforms/lib/helpers.js
- https://github.com/reergymerej/jscodeshift-helper
- https://github.com/hypermod-io/hypermod-community
- https://github.com/rajasegar/jscodeshift-collections
- https://github.com/rajasegar/jscodeshift-docs
- https://github.com/obweger/modster
- https://github.com/RIP21/import-move-codemod
- https://github.com/knilink/ez-jscodeshift
- https://crguezl.github.io/jscodeshift-api-docs/index.html
- https://github.com/jhgg/js-transforms
- https://github.com/pionxzh/wakaru/tree/main/packages/unminify/src/transformations

## Articles

- https://dev.to/arnaudspanneut/how-i-gained-4-months-of-work-on-the-migration-of-a-code-base-with-codemod-2pbn
- https://www.toptal.com/javascript/write-code-to-rewrite-your-code
