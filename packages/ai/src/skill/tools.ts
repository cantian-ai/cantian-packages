import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Tool } from '../type.js';

const readToolArgSchema = {
  type: 'object',
  properties: {
    skillName: { type: 'string', description: 'Skill name.' },
    path: {
      type: 'string',
      description: 'File path relative to the skill directory.',
    },
  },
  additionalProperties: false,
  required: ['skillName', 'path'],
} as const satisfies JSONSchema;
type ReadToolArg = FromSchema<typeof readToolArgSchema>;

const runScriptToolArgSchema = {
  type: 'object',
  properties: {
    skillName: { type: 'string', description: 'Skill name.' },
    script: {
      type: 'string',
      description: 'Script path. If scripts/ prefix is missing, it will be added automatically.',
    },
    args: {
      type: 'array',
      items: { type: 'string' },
      description: 'Script arguments.',
    },
  },
  additionalProperties: false,
  required: ['skillName', 'script'],
} as const satisfies JSONSchema;
type RunScriptToolArg = FromSchema<typeof runScriptToolArgSchema>;

export const createReadTool = (baseSkillDir: string, includeSkillNames: string[]) => {
  return {
    name: 'read',
    description:
      'Read a UTF-8 file from an allowed skill directory. Path is relative to the selected skill and must stay inside it.',
    parameters: readToolArgSchema,
    handler: (args: ReadToolArg) => {
      if (!includeSkillNames.includes(args.skillName)) {
        throw new Error(`Skill not found: ${args.skillName}`);
      }

      const skillDir = path.resolve(baseSkillDir, args.skillName);
      if (path.isAbsolute(args.path)) {
        throw new Error(`Path must be a relative path inside skill directory: ${args.path}`);
      }

      const resolved = path.resolve(skillDir, args.path);
      if (!isPathInsideOrEqual(resolved, skillDir)) {
        throw new Error(`Path must be inside skill directory: ${args.path}`);
      }
      if (!existsSync(resolved)) {
        throw new Error(`File not found: ${args.path}`);
      }
      assertNoSymlinkByRealpath(skillDir, resolved, args.path);
      return readFileSync(resolved, 'utf-8');
    },
  } satisfies Tool;
};

export const createRunScriptTool = (baseSkillDir: string, includeSkillNames: string[]) => {
  return {
    name: 'runScript',
    description:
      'Execute one bash script in the selected skill directory. Script must be under scripts/.',
    parameters: runScriptToolArgSchema,
    handler: (args: RunScriptToolArg) => {
      if (!includeSkillNames.includes(args.skillName)) {
        throw new Error(`Skill not found: ${args.skillName}`);
      }

      const skillDir = path.resolve(baseSkillDir, args.skillName);
      const resolvedScript = resolveAndValidateScript(skillDir, args.script);
      const scriptArgs = args.args ?? [];

      const result = spawnSync('bash', [resolvedScript, ...scriptArgs], {
        cwd: skillDir,
        encoding: 'utf-8',
      });
      if (result.error) {
        throw result.error;
      }
      if (result.status !== 0) {
        const errOut = (result.stderr || result.stdout || '').trim();
        throw new Error(errOut ? `Script failed: ${errOut}` : `Script failed with exit code ${result.status}`);
      }
      return (result.stdout || '').trim();
    },
  } satisfies Tool;
};

const isPathInsideOrEqual = (targetPath: string, basePath: string) => {
  const relativePath = path.relative(basePath, targetPath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const resolveAndValidateScript = (pwd: string, inputScript: string) => {
  const scriptToken =
    inputScript.startsWith('scripts/') || inputScript.startsWith(`scripts${path.sep}`)
      ? inputScript
      : path.join('scripts', inputScript);
  const scriptsDir = path.resolve(pwd, 'scripts');
  const resolvedScript = path.resolve(pwd, scriptToken);
  if (!isPathInsideOrEqual(resolvedScript, scriptsDir)) {
    throw new Error(`Script must be inside scripts directory: ${inputScript}`);
  }
  if (!existsSync(resolvedScript)) {
    throw new Error(`Script not found: ${inputScript}`);
  }
  assertNoSymlinkByRealpath(scriptsDir, resolvedScript, inputScript);
  return resolvedScript;
};

const assertNoSymlinkByRealpath = (basePath: string, targetPath: string, inputPath: string) => {
  const resolvedBasePath = path.resolve(basePath);
  const resolvedTargetPath = path.resolve(targetPath);
  const realBasePath = realpathSync.native(resolvedBasePath);
  const realTargetPath = realpathSync.native(resolvedTargetPath);

  if (realBasePath !== resolvedBasePath || realTargetPath !== resolvedTargetPath) {
    throw new Error(`Symlink is not allowed: ${inputPath}`);
  }

  if (!isPathInsideOrEqual(realTargetPath, realBasePath)) {
    throw new Error(`Path must be inside skill directory: ${inputPath}`);
  }
};
