export const providers = [
 {id:'deepseek',name:'DeepSeek',baseUrl:'https://api.deepseek.com',model:'deepseek-flash'},
 {id:'doubao',name:'豆包 · 火山方舟',baseUrl:'https://ark.cn-beijing.volces.com/api/v3',model:''},
 {id:'qwen',name:'通义千问 · 百炼（北京）',baseUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1',model:''},
 {id:'glm',name:'智谱 GLM',baseUrl:'https://open.bigmodel.cn/api/paas/v4',model:''},
 {id:'openai',name:'OpenAI',baseUrl:'https://api.openai.com/v1',model:''},
 {id:'custom',name:'自定义兼容接口',baseUrl:'',model:''}
];
export function normalizeConfig(input={}) {
 const provider=providers.find(p=>p.id===(input.provider||'deepseek'));
 if(!provider)throw new Error('请选择支持的服务商。');
 const model=String(input.model??provider.model).trim();
 if(!/^[\w./:-]{1,160}$/.test(model))throw new Error('请输入服务商控制台提供的模型名称或接入点 ID。');
 let baseUrl=provider.baseUrl;
 if(provider.id==='custom'){
  let url;try{url=new URL(input.baseUrl);}catch{throw new Error('请输入有效的 HTTPS 接口地址。');}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw new Error('自定义地址须为不含用户名、查询参数的 HTTPS 地址。');
  baseUrl=url.href.replace(/\/$/,'');
  const allowed=(process.env.CUSTOM_API_BASE_URLS||'').split(',').map(s=>s.trim().replace(/\/$/,'')).filter(Boolean);
  if(!allowed.includes(baseUrl))throw new Error('此自定义接口尚未开放，请让部署管理员将完整基础地址加入 CUSTOM_API_BASE_URLS。');
 }
 return {provider:provider.id,baseUrl,model};
}
