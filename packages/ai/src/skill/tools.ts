import { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { Tool } from '../type.js';

const readToolArgSchema = {
  type: 'object',
  properties: {
    skillName: { type: 'string', description: 'Skill name.' },
    paths: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      description: 'Multiple file paths relative to the skill directory.',
    },
  },
  additionalProperties: false,
  required: ['skillName', 'paths'],
} as const satisfies JSONSchema;
type ReadToolArg = FromSchema<typeof readToolArgSchema>;

const runScriptToolArgSchema = {
  type: 'object',
  properties: {
    skillName: { type: 'string', description: 'Skill name.' },
    script: {
      type: 'string',
      description: 'TypeScript script path. If scripts/ prefix or .ts suffix is missing, it will be added automatically.',
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
      'Read UTF-8 files from an allowed skill directory. Paths are relative to the selected skill and must stay inside it.',
    parameters: readToolArgSchema,
    handler: (args: ReadToolArg) => {
      if (!includeSkillNames.includes(args.skillName)) {
        throw new Error(`Skill not found: ${args.skillName}`);
      }

      const skillDir = path.resolve(baseSkillDir, args.skillName);
      return args.paths.map((inputPath) => ({
        path: inputPath,
        content: readSkillFile(skillDir, inputPath),
      }));
    },
  } satisfies Tool;
};

export const createRunScriptTool = (baseSkillDir: string, includeSkillNames: string[]) => {
  return {
    name: 'runScript',
    description: 'Execute one TypeScript script in the selected skill directory. Script must be a .ts file under scripts/.',
    parameters: runScriptToolArgSchema,
    handler: (args: RunScriptToolArg, context: any) => {
      if (!includeSkillNames.includes(args.skillName)) {
        throw new Error(`Skill not found: ${args.skillName}`);
      }

      const skillDir = path.resolve(baseSkillDir, args.skillName);
      const resolvedScript = resolveAndValidateScript(skillDir, args.script);
      const scriptArgs = args.args ?? [];

      const result = spawnSync('node', ['--import', 'tsx', resolvedScript, ...scriptArgs], {
        cwd: skillDir,
        encoding: 'utf-8',
        env: buildScriptEnv(context),
      });
      if (result.error) {
        console.error('SKILL_SCRIPT_ERROR', {
          skillName: args.skillName,
          script: args.script,
          args: scriptArgs,
          error: result.error,
        });
        throw result.error;
      }
      if (result.status !== 0) {
        const errOut = (result.stderr || result.stdout || '').trim();
        console.error('SKILL_SCRIPT_FAILED', {
          skillName: args.skillName,
          script: args.script,
          args: scriptArgs,
          exitCode: result.status,
          stderr: (result.stderr || '').trim(),
          stdout: (result.stdout || '').trim(),
        });
        throw new Error(errOut ? `Script failed: ${errOut}` : `Script failed with exit code ${result.status}`);
      }
      const outputText = (result.stdout || '').trim();
      return parsePossiblyJsonOutput(outputText);
    },
  } satisfies Tool;
};

const parsePossiblyJsonOutput = (outputText: string) => {
  if (!outputText) {
    return outputText;
  }
  try {
    return JSON.parse(outputText);
  } catch {
    return outputText;
  }
};

const buildScriptEnv = (context: any) => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const serializedContext = safeStringify(context);
  if (serializedContext !== undefined) {
    env.CONTEXT = serializedContext;
  }
  return env;
};

const safeStringify = (value: any) => {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
};

const isPathInsideOrEqual = (targetPath: string, basePath: string) => {
  const relativePath = path.relative(basePath, targetPath);
  return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const resolveAndValidateScript = (pwd: string, inputScript: string) => {
  let scriptToken =
    inputScript.startsWith('scripts/') || inputScript.startsWith(`scripts${path.sep}`)
      ? inputScript
      : path.join('scripts', inputScript);
  if (!path.extname(scriptToken)) {
    scriptToken = `${scriptToken}.ts`;
  }
  const scriptsDir = path.resolve(pwd, 'scripts');
  const resolvedScript = path.resolve(pwd, scriptToken);
  if (!isPathInsideOrEqual(resolvedScript, scriptsDir)) {
    throw new Error(`Script must be inside scripts directory: ${inputScript}`);
  }
  if (!existsSync(resolvedScript)) {
    throw new Error(`Script not found: ${inputScript}`);
  }
  if (path.extname(resolvedScript) !== '.ts' || resolvedScript.endsWith('.d.ts')) {
    throw new Error(`Script must be a .ts file: ${inputScript}`);
  }
  assertNoSymlinkByRealpath(scriptsDir, resolvedScript, inputScript);
  return resolvedScript;
};

const readSkillFile = (skillDir: string, inputPath: string) => {
  if (path.isAbsolute(inputPath)) {
    throw new Error(`Path must be a relative path inside skill directory: ${inputPath}`);
  }

  const resolved = path.resolve(skillDir, inputPath);
  if (!isPathInsideOrEqual(resolved, skillDir)) {
    throw new Error(`Path must be inside skill directory: ${inputPath}`);
  }
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${inputPath}`);
  }

  assertNoSymlinkByRealpath(skillDir, resolved, inputPath);
  return readFileSync(resolved, 'utf-8');
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
