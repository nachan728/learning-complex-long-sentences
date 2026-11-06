import {server} from '../server.mjs';
server.listen(0,'127.0.0.1',()=>{process.send?.({type:'ready',port:server.address().port});});
process.on('disconnect',()=>server.close(()=>process.exit(0)));
