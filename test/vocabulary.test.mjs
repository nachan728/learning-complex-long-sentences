import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateLesson} from '../lib/lesson.mjs';
test('valid common collocations need not occur verbatim in reading',()=>{
 const lesson=JSON.parse(readFileSync(new URL('../public/demo.json',import.meta.url)));
 lesson.vocabulary=[{word:'Innovation',meaning:'n. 创新',collocation:'encourage innovation（鼓励创新）'}];
 assert.equal(validateLesson(lesson,['innovation'],'daily'),lesson);
 assert.equal(lesson.vocabulary[0].word,'innovation');
});
