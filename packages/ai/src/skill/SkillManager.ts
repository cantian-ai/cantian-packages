import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { Tool } from '../type.js';
import { createReadTool, createRunScriptTool } from './tools.js';

export class SkillManager {
  skillFrontmatterMap: Record<string, { name: string; description: string }> = {};
  readTool: Tool;
  runScriptTool: Tool;
  prompt: string | undefined;
  dir: string;

  constructor(options: { dir: string; include?: string[] }) {
    const { dir, include } = options;
    this.dir = dir;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (include && !include.includes(entry.name)) {
        continue;
      }
      if (entry.isDirectory()) {
        const skillMdPath = path.join(dir, entry.name, 'SKILL.md');
        if (!existsSync(skillMdPath)) {
          continue;
        }
        const content = readFileSync(skillMdPath, 'utf-8');
        const { name, description } = SkillManager.extractFrontmatter(content);
        if (name !== entry.name) {
          throw new Error(`Skill name is not matched with folder name.`);
        }
        this.skillFrontmatterMap[name] = { name, description };
      }
    }
  }

  getReadTool() {
    if (!this.readTool) {
      this.readTool = createReadTool(this.dir, Object.keys(this.skillFrontmatterMap));
    }
    return this.readTool;
  }

  getRunScriptTool() {
    if (!this.runScriptTool) {
      this.runScriptTool = createRunScriptTool(this.dir, Object.keys(this.skillFrontmatterMap));
    }
    return this.runScriptTool;
  }

  getPrompt() {
    if (!this.prompt) {
      const lines = [
        '\n\nThe following skills provide specialized instructions for specific tasks.',
        "Use the read tool to load a skill's `SKILL.md` file when the task matches its description.",
        '',
        '<available_skills>',
      ];

      for (const frontmatter of Object.values(this.skillFrontmatterMap)) {
        lines.push('  <skill>');
        lines.push(`    <name>${escapeXml(frontmatter.name)}</name>`);
        lines.push(`    <description>${escapeXml(frontmatter.description)}</description>`);
        lines.push('  </skill>');
      }

      lines.push('</available_skills>');
      this.prompt = lines.join('\n');
    }
    return this.prompt;
  }

  static extractFrontmatter(content: string) {
    if (!content.startsWith('---')) {
      throw new Error(`No frontmatter.`);
    }

    const endIndex = content.indexOf('\n---', 3);
    if (endIndex === -1) {
      throw new Error(`Invalid frontmatter format.`);
    }

    const yamlString = content.slice(4, endIndex);
    const frontmatter = parse(yamlString) as { name: string; description: string };
    if (!frontmatter.name || !frontmatter.description) {
      throw new Error('Missing name or description.');
    }
    return { name: frontmatter.name, description: frontmatter.description };
  }
}

const escapeXml = (input: string) =>
  input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
