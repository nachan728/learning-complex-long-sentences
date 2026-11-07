export async function getBalance(apiKey,config){
 if(!apiKey)throw Object.assign(new Error('请先在模型设置中绑定自己的 API 密钥。'),{status:400});
 if(config.provider!=='deepseek')return {supported:false,message:'当前服务商暂未接入余额查询，请到其官方控制台查看。'};
 const response=await fetch('https://api.deepseek.com/user/balance',{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${apiKey}`}});
 if(!response.ok)throw new Error(response.status===401?'密钥无效，请检查模型设置。':'余额查询失败，请稍后重试。');
 const data=await response.json();
 if(typeof data.is_available!=='boolean'||!Array.isArray(data.balance_infos)||!data.balance_infos.length||!data.balance_infos.every(v=>typeof v.currency==='string'&&/^\d+(\.\d+)?$/.test(String(v.total_balance))))throw new Error('服务商返回的余额格式无法识别。');
 return {supported:true,available:data.is_available,balances:data.balance_infos.map(v=>({currency:v.currency,total:String(v.total_balance)})),checkedAt:new Date().toISOString()};
}
