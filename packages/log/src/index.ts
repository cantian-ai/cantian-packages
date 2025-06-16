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

type LogQueueItem = { level: string; args: any[]; timestamp: number; tags?: Record<string, string> };
const logQueue: LogQueueItem[] = [];
let sending = false;

async function processQueue() {
  if (sending || logQueue.length === 0) return;
  sending = true;
  const logs = logQueue.splice(0, 10);
  try {
    await sls.postLogStoreLogs(projectName, logstoreName, {
      logs: logs.map((log) => ({
        timestamp: log.timestamp,
        content: {
          ...log.tags,
          level: log.level,
          message: inspect(log.args, { depth: null }),
        } as Record<string, string>,
      })),
      source: source,
    });
  } catch (e) {
    origin.error(e);
  }
  sending = false;
  processQueue();
}

function logToSls(logQueueItem: LogQueueItem) {
  logQueue.push(logQueueItem);
  processQueue();
}

for (const method of Object.keys(origin)) {
  console[method] = (...args) => {
    origin[method](...args);
    let tags: undefined | Record<string, string> = undefined;
    if (getTags) {
      tags = getTags(method, args);
    }
    logToSls({ level: method.toUpperCase(), args, tags, timestamp: Math.floor(Date.now() / 1000) });
  };
}
