import {randomInt} from 'node:crypto';
const directions=['科学研究如何修正原有解释','数字技术与个人选择','教育方法及其局限','经济激励产生的意外结果','语言、记忆与认知','城市生活与公共空间','环境变化中的利益权衡','文化作品及传播方式','工作制度与职业变化','历史发现与证据解释','消费决策与信息差异','健康习惯与社会环境'];
const structures=['从一个待解释的问题展开，比较两种解释','开篇提出有限度的判断，再说明依据与反例','先描述一项变化，解释其原因及影响','对比两种看似相似的现象，揭示关键差别','从一个常见误解切入，逐步澄清适用条件','围绕一项有争议的选择，比较不同立场'];
const recent=[];
export function varietyPrompt(){
 const options=directions.filter(d=>!recent.includes(d));const direction=options[randomInt(options.length)];recent.push(direction);if(recent.length>5)recent.shift();
 return `内容多样性要求：输入单词的语义关联优先决定选题，不得只是把词填入固定故事。此次可探索“${direction}”，若与词义不自然，必须换成更贴合词义的具体主题。可采用“${structures[randomInt(structures.length)]}”的组织方式，不强制套用。避免社区维修咖啡馆、志愿者修理物品、工坊互助等反复出现的背景，除非输入词明确指向维修或志愿服务。不要重复“现象—机制很简单—批评者—善意不够—因此检验标准不是…而是…”这套段落框架；不要惯用价格标签、信任通货、延长物品寿命等比喻。每次重新选择具体议题、人物/对象、论证角度和结尾方式。不虚构真实研究或数据。少量单词模式下，三个句子分别采用不同场景。`;
}
