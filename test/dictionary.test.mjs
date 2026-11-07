import {test} from 'node:test';
import assert from 'node:assert/strict';
import {lookupInput,validateEntry,lookupWord} from '../lib/dictionary.mjs';
test('word lookup validates input and strips unexpected response fields',()=>{
 assert.deepEqual(lookupInput({word:'Sustain',context:'We sustain growth.'}),{word:'sustain',context:'We sustain growth.'});
 assert.throws(()=>lookupInput({word:'<script>',context:'bad'}));assert.throws(()=>lookupInput({word:'absent',context:'Some text.'}));
 assert.throws(()=>validateEntry({meaning:'意思',collocations:[]}));
 const value=validateEntry({meaning:'维持',secret:'ignored',collocations:[{phrase:'sustain growth',meaning:'维持增长'}]});assert.equal(value.secret,undefined);
});
test('lookup uses supplied account configuration and rejects missing credentials',async()=>{
 await assert.rejects(lookupWord({word:'sustain',context:'sustain growth'},null,{}));
 const original=globalThis.fetch;globalThis.fetch=async(url,options)=>{assert.equal(url,'https://model.example/v1/chat/completions');assert.equal(options.headers.Authorization,'Bearer test-account-key');assert.equal(JSON.parse(options.body).model,'test-model');return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({meaning:'维持',collocations:[{phrase:'sustain growth',meaning:'维持增长'}]})}}]}));};
 try{assert.equal((await lookupWord({word:'sustain',context:'sustain growth'},'test-account-key',{baseUrl:'https://model.example/v1',model:'test-model'})).meaning,'维持');}finally{globalThis.fetch=original;}
});
