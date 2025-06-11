import Client from '@alicloud/log';
import { inspect } from 'node:util';

const sls = new Client({
  accessKeyId: process.env.ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  endpoint: process.env.ALI_LOG_ENDPOINT || 'cn-shanghai.log.aliyuncs.com',
});

const projectName = process.env.ALI_LOG_PROJECT_NAME;
const logstoreName = process.env.ALI_LOG_PROJECT_NAME;
const source = process.env.ALI_LOG_SOURCE;

const origin = {
  log: console.log,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

let getTags: undefined | ((level: string, args: any[]) => Record<string, string> | undefined);
export const initLog = (options: { addTags?: typeof getTags }) => {
  if (options.addTags) {
    getTags = options.addTags;
  }
};

const logQueue: { level: string; args: any[] }[] = [];
let sending = false;

async function processQueue() {
  if (sending || logQueue.length === 0) return;
  sending = true;
  const { level, args } = logQueue.shift()!;
  const tags: Record<string, string>[] = [];
  try {
    if (getTags) {
      const t = getTags(level, args);
      if (t) {
        tags.push(t);
      }
    }
    await sls.postLogStoreLogs(projectName, logstoreName, {
      logs: [{ timestamp: Math.floor(Date.now() / 1000), content: args.map((arg) => inspect(arg, { depth: null })) }],
      source: source,
      topic: level,
      tags,
    });
  } catch (e) {
    origin.error(e);
  }
  sending = false;
  processQueue();
}

function logToSls(level, args: any[]) {
  logQueue.push({ level, args });
  processQueue();
}

for (const method of Object.keys(origin)) {
  console[method] = (...args) => {
    origin[method](...args);
    logToSls(method, args);
  };
}
