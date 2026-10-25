import assert from 'node:assert/strict';
import {test} from 'node:test';
if(process.env.MODEL_MONITOR_TEST_ENV!=='test')throw new Error('Run only in the test environment.');
const {createHttpModelMonitor,startModelCall}=await import('../dist/monitor/index.js');
const config={service:'test-service',environment:'test',scenarios:['test.scene'],targets:[{provider:'test-provider',endpoint:'https://provider.example.invalid/api',models:['test-model']}],reportUrl:'https://monitor.example.invalid/events',apiKey:'PRIVATE_KEY_SENTINEL'};
const start=(runtime)=>startModelCall(runtime.monitor,{endpoint:config.targets[0].endpoint,model:'test-model',context:{scenario:'test.scene'}});
test('shared HTTP adapter passes internal Bearer, blocks redirects and validates ACK without changing event',async()=>{
 let seen;
 const runtime=createHttpModelMonitor(config,async(url,init)=>{
  seen={url,init};const event=JSON.parse(init.body);
  return new Response(JSON.stringify({data:{eventId:event.eventId,alertId:'alert-test',disposition:'aggregated'}}));
 });
 start(runtime).fail(undefined,{category:'http',httpStatus:503});assert.equal(await runtime.flush(),true);
 assert.equal(seen.init.redirect,'error');assert.equal(seen.init.headers.Authorization,'Bearer PRIVATE_KEY_SENTINEL');
 assert.ok(seen.init.signal instanceof AbortSignal);assert.ok(!seen.init.body.includes('PRIVATE_'));
 await runtime.close();
});
test('shared HTTP adapter rejects insecure URL and embedded credentials without requests',()=>{
 for(const reportUrl of ['http://monitor.example.invalid','https://key@monitor.example.invalid','https://monitor.example.invalid/?key=private'])
  assert.throws(()=>createHttpModelMonitor({...config,reportUrl},async()=>{throw new Error('must not fetch');}));
});
test('shared HTTP adapter bounds ACK stream and never logs response or credential data',async()=>{
 const diagnostics=[];
 const runtime=createHttpModelMonitor({...config,onDiagnostic:d=>diagnostics.push(d)},async()=>new Response('PRIVATE_RESPONSE_SENTINEL'.repeat(1000)));
 start(runtime).fail();await runtime.close(50);
 assert.ok(!JSON.stringify(diagnostics).includes('PRIVATE_'));
});
test('safe observation wrapper swallows observer exceptions and emits a final outcome at most once',()=>{
 let failed=0;
 const call=startModelCall({startCall(){return {callId:'test-call',response(){throw new Error();},content(){throw new Error();},fail(){failed++;throw new Error();},succeed(){throw new Error();},cancel(){throw new Error();}};}},{endpoint:'https://provider.example.invalid',model:'test-model',context:{scenario:'test.scene'}});
 call.response({httpStatus:503});call.content();call.fail();call.fail();call.succeed();call.cancel();assert.equal(failed,1);
});
