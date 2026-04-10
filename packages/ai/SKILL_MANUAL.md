# Skill 开发手册

## 1. 快速开始

1. 新建一个目录，目录名就是 skill 名。
2. 在目录下创建 `SKILL.md`，并写 frontmatter：`name`、`description`。
3. 如果需要执行脚本，把脚本放到 `scripts/` 目录。
4. 在 `SKILL.md` 里写清：触发场景、执行步骤、失败兜底。

## 2. 目录模板

```text
<skills-root>/
  weather-check/
    SKILL.md
    scripts/
      query-weather.ts
    references/
      notes.md
```

要求：

- `SKILL.md` 必须存在。
- `scripts/` 按需创建；需要执行脚本时再添加。
- 资料文件可放 `references/`（可选）。

## 3. `SKILL.md` 必填格式

```md
---
name: weather-check
description: Use this skill when the user asks for weather or forecast.
---

# Weather Check Skill

## Use when

- 用户要实时天气
- 用户要未来预报

## Workflow

1. 识别城市和日期。
2. 调用脚本获取结果。
3. 返回简洁结论；失败时说明原因。

## Notes

- 基于工具或脚本返回的数据作答。
- 信息不足时先追问关键参数。
```

硬性规则：

- `SKILL.md` 必须以 `---` 开头（frontmatter 在最顶部）。
- frontmatter 必须包含 `name` 和 `description`。
- `name` 必须与目录名完全一致。

## 4. 脚本规范

把可执行脚本放在 `scripts/` 下，例如 `scripts/query-weather.ts`（仅支持 `.ts`）。

推荐模板：

```ts
type Output = {
  data?: unknown;
  error?: string;
  aiText: string;
};

// 参数校验
// 业务逻辑
// 输出结果

const output: Output = { data: {}, aiText: '操作完成' };
console.log(JSON.stringify(output));
```

建议：

- 成功输出优先 JSON。
- 失败时打印错误信息并退出非 0（例如 `process.exit(1)`）。
- 参数错误时给出明确提示，并以非 0 退出码结束。
- 如果需要模型/运行时上下文，可读取环境变量 `CONTEXT`（JSON 字符串）。
- 在 `SKILL.md` 里说明脚本调用时，优先给出 `runScript` tool 的调用示例，例如：`runScript({ "skillName": "<skill-name>", "script": "get-profile-detail", "args": ["<profileId>"] })`。
- 如需补充命令行等价写法，可放在括号里作为参考；主调用方式使用 `runScript`。

## 5. 返回规范（重点）

`runScript` 会执行脚本并读取 `stdout` 作为返回值来源：

- 进程退出码为 `0`：成功，读取并 `trim` 后的 `stdout`。
- 进程退出码非 `0`：失败，框架会抛错（错误文本优先取 `stderr`）。
- `stdout` 是合法 JSON：会被自动 `JSON.parse` 后再返回。
- 其他情况：按普通字符串返回。

推荐输出对象约定：

```json
{
  "data": {},
  "error": "失败原因（成功时可省略）",
  "aiText": "给模型看的简洁结论（成功/失败都建议提供）"
}
```

关于 `aiText`：

- 返回结构使用 `data`、`error`、`aiText` 三个字段；通过是否存在 `error` 判断失败。
- 成功时：返回 `data`，并提供 `aiText`（给 LLM 的可读结论）。
- 失败时：返回 `error`，并同样提供 `aiText`（给 LLM 的错误说明）。
- 如果返回对象里存在字符串类型的 `aiText`，模型侧会优先把它当作工具输出文本。
- 始终提供 `aiText`；未提供时会回退到整个返回值（对象会序列化为 JSON 字符串）。
- 建议把 `aiText` 控制为简洁、可直接回复用户的一句话；结构化明细放在 `data`，诊断细节放在 `error`。

## 6. 路径与文件限制

为保证运行稳定，请遵守：

- 只读写 skill 目录内文件。
- 使用 skill 目录内相对路径，并确保路径不越级（不包含 `..`）。
- 使用目录内真实文件路径（非软链接），确保访问范围在 skill 目录内。
- 需要执行的脚本只放在 `scripts/`。

## 7. 自检清单（提交前）

1. 目录名与 `SKILL.md` 的 `name` 完全一致。
2. `SKILL.md` frontmatter 完整且在文件顶部。
3. 触发条件写得具体，例如“日期时间查询可用”，并给出边界说明。
4. 脚本在 `scripts/` 下，可直接运行。
5. 成功/失败输出格式稳定，错误信息可读。
