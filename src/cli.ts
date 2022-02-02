const execa = require('execa');

const jscodeshiftExecutable = require.resolve('.bin/jscodeshift');

// const cli = meow(
//   {
//     description: 'Codemods for updating React APIs.',
//     help: `
//   Usage
//     $ npx react-codemod <transform> <path> <...options>
//       transform    One of the choices from https://github.com/reactjs/react-codemod
//       path         Files or directory to transform. Can be a glob like src/**.test.js
//   Options
//     --force            Bypass Git safety checks and forcibly run codemods
//     --dry              Dry run (no changes are made to files)
//     --print            Print transformed files to your terminal
//     --explicit-require Transform only if React is imported in the file (default: true)
//     --jscodeshift  (Advanced) Pass options directly to jscodeshift
//   `
//   },
//   {
//     boolean: ['force', 'dry', 'print', 'explicit-require', 'help'],
//     string: ['_'],
//     alias: {
//       h: 'help'
//     }
//   }
// );

// function runTransform({ files, flags, parser, transformer, answers }) {}

// runTransform({
//     files: filesExpanded,
//     flags: cli.flags,
//     parser: selectedParser,
//     transformer: selectedTransformer,
//     answers: answers,
// });

// const transformerDirectory = path.join(__dirname, '../', 'transforms');
// const transformerPath = path.join(transformerDirectory, `${transformer}.js`);
// const args = [];

// const { dry, print, explicitRequire } = flags || {};

// if (dry) {
//     args.push('--dry');
// }
// if (print) {
//     args.push('--print');
// }

// if (explicitRequire === 'false') {
//     args.push('--explicit-require=false');
// }

// args.push('--verbose=2');

// args.push('--ignore-pattern=**/node_modules/**');

// args.push('--parser', parser);

// if (parser === 'tsx') {
//     args.push('--extensions=tsx,ts,jsx,js');
// } else {
//     args.push('--extensions=jsx,js');
// }

// args = args.concat(['--transform', transformerPath]);

// if (transformer === 'class') {
//     args.push('--flow=' + answers.classFlow);
//     args.push('--remove-runtime-props=' + answers.classRemoveRuntimePropTypes);
//     args.push('--pure-component=' + answers.classPureComponent);
//     args.push('--mixin-module-name=' + answers.classMixinModuleName);
// }
// if (transformer === 'pure-render-mixin') {
//     args.push('--mixin-name=' + answers.pureRenderMixinMixinName);
// }
// if (transformer === 'pure-component') {
//     if (answers.pureComponentUseArrows) {
//         args.push('--useArrows=true');
//     }
//     if (answers.pureComponentDestructuring) {
//         args.push('--destructuring=true');
//     }
// }

// if (transformer === 'update-react-imports') {
//     if (answers.destructureNamespaceImports) {
//         args.push('--destructureNamespaceImports=true');
//     }
// }

// if (flags.jscodeshift) {
//     args = args.concat(flags.jscodeshift);
// }

// args = args.concat(files);

// console.log(`Executing command: jscodeshift ${args.join(' ')}`);

// const result = execa.sync(jscodeshiftExecutable, args, {
//     stdio: 'inherit',
//     stripEof: false,
// });

// if (result.error) {
//     throw result.error;
// }
