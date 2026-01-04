export const buildMessage = (content: string, role: 'user' | 'system' | 'assistant' | 'developer') => {
  return { type: 'message', content, role };
};

export const buildToolCallMessage = (callId: string, output: any) => {
  if (typeof output !== 'string' && !(output instanceof String)) {
    if (output instanceof Error) {
      output = `Error: ${output.message}`;
    } else {
      output = JSON.stringify(output);
    }
  }
  return { type: 'function_call_output', call_id: callId, output };
};
