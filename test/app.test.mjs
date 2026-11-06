import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {parseWords,validateLesson} from '../lib/lesson.mjs';
test('input normalization and invalid input',()=>{assert.deepEqual(parseWords('Adapt, adapt，sustain\nmaintain'),['adapt','sustain','maintain']);assert.throws(()=>parseWords('ignore <script> this'));assert.throws(()=>parseWords('one two'));});
const demo=JSON.parse(readFileSync(new URL('../public/demo.json',import.meta.url)));
test('lesson coverage and source checks',()=>{const words=demo.vocabulary.map(v=>v.word);assert.equal(validateLesson(demo,words,'daily'),demo);assert.throws(()=>validateLesson(demo,[...words,'uncovered'],'daily'));const changed=structuredClone(demo);changed.sentences[0].text='An invented sentence.';assert.throws(()=>validateLesson(changed,words,'daily'));assert.throws(()=>validateLesson(demo,words,'full'));});
mkdirSync('test-results',{recursive:true});process.env.DATABASE_PATH=`test-results/test-${process.pid}.sqlite`;
const {server}=await import('../server.mjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
after(()=>new Promise(resolve=>server.close(resolve)));
const base=`http://127.0.0.1:${server.address().port}`;
async function call(path,method='GET',body,cookie){return fetch(base+path,{method,headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});}
test('accounts isolate favorites; duplicate, note, export data, logout',async()=>{
 const a=await call('/api/register','POST',{email:'a@example.com',password:'test-only-password-a'});assert.equal(a.status,200);const ca=a.headers.get('set-cookie').split(';')[0];
 const b=await call('/api/register','POST',{email:'b@example.com',password:'test-only-password-b'});const cb=b.headers.get('set-cookie').split(';')[0];
 const payload={sentence:demo.sentences[0],lesson:demo};assert.equal((await call('/api/favorites','POST',{payload},ca)).status,200);await call('/api/favorites','POST',{payload},ca);
 let list=await(await call('/api/favorites','GET',null,ca)).json();assert.equal(list.items.length,1);const id=list.items[0].id;
 await call(`/api/favorites/${id}`,'PATCH',{note:'用户 B 无法修改'},cb);list=await(await call('/api/favorites','GET',null,ca)).json();assert.equal(list.items[0].note,'');
 await call(`/api/favorites/${id}`,'DELETE',{},cb);assert.equal((await(await call('/api/favorites','GET',null,cb)).json()).items.length,0);
 await call(`/api/favorites/${id}`,'PATCH',{note:'先找谓语'},ca);assert.equal((await(await call('/api/favorites','GET',null,ca)).json()).items[0].note,'先找谓语');
 assert.equal((await call('/api/login','POST',{email:'a@example.com',password:'wrong-password'})).status,401);
 const second=await call('/api/login','POST',{email:'a@example.com',password:'test-only-password-a'});assert.equal(second.status,200);assert.equal((await(await call('/api/favorites','GET',null,second.headers.get('set-cookie').split(';')[0])).json()).items.length,1);
 const denied=await fetch(base+'/api/logout',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json',Cookie:ca},body:'{}'});assert.equal(denied.status,403);
 await call('/api/logout','POST',{},ca);assert.equal((await call('/api/favorites','GET',null,ca)).status,401);
});
test('private APIs and static files',async()=>{assert.equal((await call('/api/generate','POST',{words:'adapt sustain maintain'})).status,401);assert.equal((await call('/.env.local')).status,404);const page=await call('/');assert.equal(page.status,200);assert.match(await page.text(),/句间/);});
test('API keys are private, exclusive, encrypted and never fall back to shared environment key',async()=>{
 process.env.AI_API_KEY='sk-this-shared-key-must-never-be-used';
 const login=async(email,password)=>(await call('/api/login','POST',{email,password})).headers.get('set-cookie').split(';')[0];
 const ca=await login('a@example.com','test-only-password-a'),cb=await login('b@example.com','test-only-password-b');
 const key='sk-account-a-private-test-key-123456';
 assert.equal((await call('/api/key','PUT',{apiKey:key})).status,401);
 assert.equal((await call('/api/key','PUT',{apiKey:key},ca)).status,200);
 const state=await(await call('/api/key','GET',null,ca)).json();assert.equal(state.configured,true);assert.equal(state.suffix,'3456');assert.ok(!JSON.stringify(state).includes(key));
 assert.equal((await(await call('/api/key','GET',null,cb)).json()).configured,false);
 assert.equal((await call('/api/key','PUT',{apiKey:key},cb)).status,409);
 const unbound=await call('/api/generate','POST',{words:'adapt sustain maintain'},cb);assert.equal(unbound.status,503);
 const {DatabaseSync}=await import('node:sqlite');const inspect=new DatabaseSync(process.env.DATABASE_PATH);const saved=inspect.prepare('SELECT encrypted FROM api_credentials WHERE user_id=(SELECT id FROM users WHERE email=?)').get('a@example.com');assert.ok(!saved.encrypted.includes(key));inspect.close();
 const originalFetch=globalThis.fetch;let actualKey;
 globalThis.fetch=async(url,opts)=>{if(String(url).includes('api.deepseek.com')){actualKey=opts.headers.Authorization;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(demo)}}]}),{status:200});}return originalFetch(url,opts);};
 try{assert.equal((await call('/api/generate','POST',{words:demo.vocabulary.map(v=>v.word).join(' ')},ca)).status,200);assert.equal(actualKey,`Bearer ${key}`);}finally{globalThis.fetch=originalFetch;}
 await call('/api/key','DELETE',{},ca);assert.equal((await(await call('/api/key','GET',null,ca)).json()).configured,false);
 assert.equal((await call('/api/key','PUT',{apiKey:key},cb)).status,409);
 assert.equal((await call('/api/key','PUT',{apiKey:key},ca)).status,200);
 await call('/api/key','PUT',{apiKey:'sk-replacement-private-test-key-7890'},ca);assert.equal((await call('/api/key','PUT',{apiKey:key},cb)).status,409);
 const qwenKey='qwen-account-test-key-not-sk-prefixed';
 assert.equal((await call('/api/key','PUT',{apiKey:qwenKey,provider:'qwen',model:'test-qwen-model'},ca)).status,200);
 const config=await(await call('/api/key','GET',null,ca)).json();assert.equal(config.provider,'qwen');assert.equal(config.model,'test-qwen-model');assert.equal(config.baseUrl,'https://dashscope.aliyuncs.com/compatible-mode/v1');
 let called=false;
 globalThis.fetch=async(url,opts)=>{if(String(url).includes('dashscope.aliyuncs.com')){called=true;assert.equal(opts.headers.Authorization,`Bearer ${qwenKey}`);assert.equal(opts.redirect,'error');assert.equal(JSON.parse(opts.body).model,'test-qwen-model');return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(demo)}}]}));}return originalFetch(url,opts);};
 try{assert.equal((await call('/api/generate','POST',{words:demo.vocabulary.map(v=>v.word).join(' ')},ca)).status,200);assert.equal(called,true);}finally{globalThis.fetch=originalFetch;}
 assert.equal((await call('/api/key','PUT',{apiKey:qwenKey,provider:'openai',model:'test-model'},cb)).status,409);
 assert.equal((await call('/api/key','PUT',{apiKey:'custom-account-test-key-1234',provider:'custom',model:'test',baseUrl:'http://127.0.0.1'},ca)).status,400);
 assert.equal((await call('/api/key','PUT',{apiKey:'custom-account-test-key-1234',provider:'custom',model:'test',baseUrl:'https://untrusted.example/v1'},ca)).status,400);
 assert.equal((await(await call('/api/key','GET',null,ca)).json()).provider,'qwen');
 delete process.env.AI_API_KEY;
});
test('provider defaults, custom allowlist and invalid configuration',async()=>{
 const {normalizeConfig,providers}=await import('../lib/providers.mjs');assert.equal(providers.length,6);
 assert.throws(()=>normalizeConfig({provider:'unknown'}));assert.throws(()=>normalizeConfig({provider:'qwen',model:''}));
 process.env.CUSTOM_API_BASE_URLS='https://trusted.example/v1';
 assert.equal(normalizeConfig({provider:'custom',baseUrl:'https://trusted.example/v1/',model:'my-model'}).baseUrl,'https://trusted.example/v1');
 assert.throws(()=>normalizeConfig({provider:'custom',baseUrl:'https://trusted.example/v1?key=secret',model:'my-model'}));
 delete process.env.CUSTOM_API_BASE_URLS;
});
