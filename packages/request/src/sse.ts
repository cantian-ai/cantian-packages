import { createParser, EventSourceMessage } from 'eventsource-parser';
import { createThrowHttpErrorFetch } from './basic.js';

const basicSse = createThrowHttpErrorFetch();
export const sse = async function* (input: string | URL | globalThis.Request, init?: RequestInit) {
  const response = await basicSse(input, init);
  if (!response.body) {
    console.error(`FETCH_ERROR_NO_BODY`);
    throw new Error('No body');
  }
  const reader = response.body.getReader();
  const pending: EventSourceMessage[] = [];
  let parserError: any;
  const decoder = new TextDecoder();
  const parser = createParser({
    onEvent(event) {
      pending.push(event);
    },
    onError(error) {
      parserError = error;
    },
  });

  let error: any;
  try {
    while (true) {
      while (pending.length) {
        yield pending.shift();
      }

      let chunk;
      chunk = await reader.read();
      const { value, done } = chunk;
      if (done) {
        break;
      }

      parser.feed(decoder.decode(value, { stream: true }));
      if (parserError) {
        throw parserError;
      }
    }
  } catch (e) {
    error = e;
    try {
      await reader.cancel();
    } catch {}
    throw error;
  } finally {
    if (!error) {
      reader.releaseLock();
    }
  }
};
