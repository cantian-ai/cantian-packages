# cantian-packages

It manages multiple packages by [NPM workspace](https://docs.npmjs.com/cli/v11/using-npm/workspaces).

## How to publish a new version of an existing package?

- Update the version value from `packages/{packageFolder}/package.json`.

- Run `npm publish -w packages/{packageFolder}` in root project folder. Or run `npm publish` in the specified project folder.

- Push your changes.

## How to add a new package?

- Create a the package folder under `packages` like other existing packages.
- Create necessary files `package.json`, `tsconfig.json`, `README.md` in the new folder.
- Update the root `tsconfig.json` to add the package under `references` field.
