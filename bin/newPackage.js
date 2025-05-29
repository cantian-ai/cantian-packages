const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');

let [, , name] = process.argv;

if (!name) {
  console.log(`Usage: node bin/newPakcage.js <package>`);
  return;
}

const package = `packages/${name}`;

// Create the package folder.
mkdirSync(package);
mkdirSync(`${package}/src`);

// Write the package.json file.
writeFileSync(
  `${package}/package.json`,
  JSON.stringify(
    {
      name: `cantian-${name}`,
      version: '0.0.1',
      type: 'module',
      exports: {
        '.': './dist/index.js',
      },
      files: ['dist'],
      scripts: {
        prepublishOnly: 'rm -rf dist && tsc',
      },
    },
    undefined,
    2,
  ) + '\n',
  'utf8',
);

// Write the tsconfig.json file.
writeFileSync(
  `${package}/tsconfig.json`,
  JSON.stringify(
    {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: 'dist',
        rootDir: 'src',
      },
    },
    undefined,
    2,
  ) + '\n',
  'utf8',
);

// Write the README.md file.
writeFileSync(`${package}/README.md`, `# ${name}\n\n## Usage\n`, 'utf8');

// Update the root tsconfig.json file.
const rootTsconfigContent = JSON.parse(readFileSync('tsconfig.json', 'utf8'));
rootTsconfigContent.references.push({ path: package });
writeFileSync(`tsconfig.json`, JSON.stringify(rootTsconfigContent, undefined, 2), 'utf8');

console.log('Done!');
