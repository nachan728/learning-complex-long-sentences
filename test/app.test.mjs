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
