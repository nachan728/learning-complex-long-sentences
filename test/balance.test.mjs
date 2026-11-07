import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getBalance} from '../lib/balance.mjs';
test('balance uses only account key and returns sanitized amounts',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.deepseek.com/user/balance');assert.equal(options.headers.Authorization,'Bearer account-test-key');return new Response(JSON.stringify({is_available:true,balance_infos:[{currency:'CNY',total_balance:'12.34',extra:'private'}]}));};
 try{const result=await getBalance('account-test-key',{provider:'deepseek'});assert.deepEqual(result.balances,[{currency:'CNY',total:'12.34'}]);assert.equal(result.available,true);}finally{globalThis.fetch=original;}
 await assert.rejects(getBalance(null,{provider:'deepseek'}));
 assert.equal((await getBalance('key',{provider:'qwen'})).supported,false);
});
