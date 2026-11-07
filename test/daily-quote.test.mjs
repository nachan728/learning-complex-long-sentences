import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('daily quote follows local calendar day and changes at midnight',()=>{
 const source=readFileSync(new URL('../public/daily-quote.js',import.meta.url),'utf8');
 let clock=new Date(2026,10,7,23,59,59),callback;
 const en={},zh={};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[clock.getTime()]));}}
 const ctx={Date:Clock,document:{querySelector:()=>({querySelector:s=>s==='.quote-en'?en:zh}),addEventListener(){}},window:{addEventListener(){}},setTimeout(fn){callback=fn;return 1;},clearTimeout(){}};
 vm.runInNewContext(source,ctx);const first=en.textContent;assert.ok(first&&zh.textContent);
 callback();assert.equal(en.textContent,first);
 clock=new Date(2026,10,8,0,0,0);callback();assert.notEqual(en.textContent,first);const next=en.textContent;
 clock=new Date(2026,10,8,18,0,0);callback();assert.equal(en.textContent,next);
});
