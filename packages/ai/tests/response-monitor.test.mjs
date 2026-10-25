import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { registerHooks } from 'node:module';
if (process.env.MODEL_MONITOR_TEST_ENV !== 'test') throw new Error('Run only in the test environment.');
const originalFetch = globalThis.fetch;
let handleFetch;
globalThis.fetch = (...args) => handleFetch(...args);
const hook = registerHooks({ resolve(specifier, context, next) {
  if (specifier === '../tokenUsage.js' && /\/models\//.test(context.parentURL ?? ''))
    return { shortCircuit: true, url: 'data:text/javascript,export function saveModelUsage(){};export function saveAgentUsage(){}' };
  return next(specifier, context);
} });
const { ResponseLlm } = await import('../dist/models/ResponseLlm.js');
const { createModelMonitor } = await import('../dist/monitor/index.js');
hook.deregister();
after(() => { globalThis.fetch = originalFetch; });
beforeEach(() => { handleFetch = async () => { throw new Error('Unexpected test fetch'); }; });
const endpoint='https://provider.example.invalid/v1/responses';
const input=[{role:'user',content:'PRIVATE_INPUT_SENTINEL'}];
const frame=(event,data)=>`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const completed=frame('response.completed',{response:{usage:{total_tokens:1,input_tokens:1,output_tokens:0},output:[]}});
const sse=(text)=>new Response(text,{headers:{'content-type':'text/event-stream','x-request-id':'vendor-id'}});
function setup(){
 const events=[];
 const monitor=createModelMonitor({service:'test-service',environment:'test',scenarios:['demo.response'],
   targets:[{provider:'demo-provider',endpoint,models:['demo-model']},{provider:'demo-provider',endpoint,models:['other-model']}],report(e){events.push(e);}});
 const model=new ResponseLlm(endpoint,'PRIVATE_KEY_SENTINEL','demo-model');
 const options={monitor,monitorContext:{scenario:'demo.response',traceId:'test-trace'}};
 return {events,model,options};
}
async function silence(fn){const error=console.error,warn=console.warn;console.error=console.warn=()=>{};try{return await fn();}finally{console.error=error;console.warn=warn;}}
test('Responses success preserves output and does not emit failure or monitor options into provider body',async()=>{
 const {events,model,options}=setup();let body;
 handleFetch=async(_u,init)=>{body=JSON.parse(init.body);return sse(frame('response.output_item.done',{item:{type:'message',role:'assistant',content:[{text:'hello'}]}})+completed);};
 assert.equal((await model.invoke(input,options)).message,'hello');assert.equal(events.length,0);
 assert.ok(!('monitor' in body)&&!('monitorContext' in body));
});
test('Responses HTTP failure preserves provider diagnosis, request-id and actual final model with shared endpoint',async()=>{
 const {events,model,options}=setup();
 handleFetch=async()=>new Response(JSON.stringify({error:{code:'invalid_model',message:'The model does not exist or you do not have access to it.'}}),{status:401,headers:{'x-request-id':'vendor-id'}});
 await silence(()=>assert.rejects(model.invoke(input,{...options,extRequestParams:{model:'other-model'}})));
 assert.equal(events.length,1);assert.equal(events[0].model,'other-model');assert.equal(events[0].httpStatus,401);
 assert.equal(events[0].error.providerCode,'invalid_model');assert.equal(events[0].providerRequestId,'vendor-id');
 assert.ok(!JSON.stringify(events).includes('PRIVATE_'));
});
test('Responses stream failed event records safe protocol failure once',async()=>{
 const {events,model,options}=setup();
 handleFetch=async()=>sse(frame('response.failed',{response:{error:{code:'invalid_model',message:'Model "PRIVATE_INPUT_SENTINEL" is invalid.'}}})+completed);
 await model.invoke(input,options);assert.equal(events.length,1);assert.equal(events[0].error.category,'protocol');
 assert.equal(events[0].error.providerMessage,"Model '[REDACTED]' is invalid.");assert.ok(!JSON.stringify(events).includes('PRIVATE_'));
});
test('Responses incomplete, malformed JSON and premature EOF each produce one protocol failure',async()=>{
 for(const text of [frame('response.incomplete',{response:{}}),'data: {bad}\n\n',frame('response.output_text.delta',{delta:'partial'})]){
  const {events,model,options}=setup();handleFetch=async()=>sse(text);
  try{await model.invoke(input,options);}catch{}
  assert.equal(events.length,1);assert.equal(events[0].error.category,'protocol');
 }
});
test('Responses consumer cancellation and broken monitor do not break normal output',async()=>{
 const {events,model,options}=setup();handleFetch=async()=>sse(frame('response.output_text.delta',{delta:'hello'})+completed);
 for await(const chunk of model.stream(input,options)){if(chunk.type==='TOKEN')break;}
 assert.equal(events.length,0);
 await model.invoke(input,{monitor:{startCall(){throw new Error('observer failure');}},monitorContext:{scenario:'demo.response'}});
});
test('agentic Responses forwards fixed context per round with separate callIds; tool errors alone are not model failures',async()=>{
 const {events,model,options}=setup();let requests=0,starts=[];
 const monitor={startCall(input){const call=options.monitor.startCall(input);starts.push({callId:call.callId,context:input.context});return call;}};
 const toolFrames=frame('response.output_item.done',{item:{type:'function_call',call_id:'tool-1',name:'lookup',arguments:'{}'}})+completed;
 handleFetch=async()=>++requests===1 ? sse(toolFrames) : new Response(JSON.stringify({error:{code:'invalid_model',message:'Model does not exist.'}}),{status:401});
 await silence(()=>assert.rejects(async()=>{for await(const _ of model.agenticStream(input,{...options,monitor,tools:{lookup:{name:'lookup',description:'test',parameters:{type:'object',properties:{}},handler(){throw new Error('PRIVATE_TOOL_SENTINEL');}}}},{maxRounds:2})){};}));
 assert.equal(starts.length,2);assert.notEqual(starts[0].callId,starts[1].callId);assert.deepEqual(starts[0].context,starts[1].context);
 assert.equal(events.length,1);assert.equal(events[0].callId,starts[1].callId);assert.ok(!JSON.stringify(events).includes('PRIVATE_'));
});
