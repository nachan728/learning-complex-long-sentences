import {copyFileSync,mkdirSync} from 'node:fs';
mkdirSync('desktop-runtime',{recursive:true});
copyFileSync(process.execPath,'desktop-runtime/node.exe');
