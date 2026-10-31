import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {XhsBrowser} from './browser.js';
export function createServer(browser=new XhsBrowser()){
  const server=new McpServer({name:'xhs-mcp',version:'0.1.0'});
  const count=z.number().int().min(1).max(50);
  const site=z.enum(['auto','rednote','xiaohongshu']).optional().describe('站点：rednote 海外版、xiaohongshu 国内版；auto 优先已登录的海外版，也可通过 XHS_MCP_SITE 固定默认站点。');
  const tool=(name,description,inputSchema,fn)=>server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}},async args=>{
    try{const data=await fn(args);return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data};}
    catch(e){const message=e.message || String(e);return {isError:true,content:[{type:'text',text:JSON.stringify({error:{code:message.match(/^([A-Z_]+):/)?.[1] || 'OPERATION_FAILED',message}})}]};}
  });
  tool('xhs_session_status','检查本机 Chromium 的 rednote 与小红书登录，明确返回当前选择的站点，不返回 Cookie。',{site},a=>browser.status(a.site));
  tool('xhs_open_home','在现有 Chromium 打开指定站点首页并保留新标签页供用户使用；不会关闭已有标签页。',{site},a=>browser.openHome(a.site));
  tool('xhs_home_feed','读取指定站点首页瀑布流卡片，有限滚动并保留原始笔记链接；完成后关闭本次临时标签页。',{site,limit:count.default(10)},a=>browser.homeFeed(a.limit,a.site));
  tool('xhs_read_note','读取分享链接或分享文本中的笔记全文、作者、图片地址、视频地址和可用字幕。图片未 OCR，视频无字幕时未转录。',{url:z.string().min(1).max(8192)},a=>browser.read(a.url));
  tool('xhs_search','在指定站点通过网页搜索栏搜索，按网页顺序列出前 N 条，保留签名链接；search_id 有效 1 小时。',{query:z.string().trim().min(1).max(200),limit:count.default(10),site},a=>browser.search(a.query,a.limit,a.site));
  tool('xhs_read_search_results','逐个读取已搜索结果，可选前 N 条或指定序号；返回逐篇原文和总结指引，由调用模型生成总结。',{search_id:z.string().uuid(),first_n:count.optional(),ranks:z.array(count).min(1).max(50).optional()},a=>{
    if(Boolean(a.first_n)===Boolean(a.ranks))throw new Error('INVALID_ARGUMENT: first_n 和 ranks 必须且只能选一个');
    return browser.readResults(a.search_id,a.ranks?[...new Set(a.ranks)]:Array.from({length:a.first_n},(_,i)=>i+1));
  });
  tool('xhs_search_and_read','在指定站点搜索并逐篇读取前 N 条，返回有来源的正文和媒体资料供调用模型总结。',{query:z.string().trim().min(1).max(200),limit:count.default(5),site},async a=>{
    const search=await browser.search(a.query,a.limit,a.site);return {...await browser.readResults(search.search_id,search.items.map(x=>x.rank)),search};
  });
  tool('xhs_list_saved','读取指定站点当前账号的收藏页并滚动取得笔记链接与封面；仅操作自己的标签页。较大数量可能耗时，收藏显示总数不保证全部可访问。',{limit:z.number().int().min(1).max(3000).default(50),site},a=>browser.listSaved(a.limit,a.site));
  server.registerTool('xhs_read_note_image',{
    description:'读取笔记指定序号的实际图片，返回 MCP image 内容供有视觉能力的模型阅读图中文字和画面；先读取笔记获得图片数量。',
    inputSchema:{url:z.string().min(1).max(8192),index:z.number().int().min(1).max(100)},
    annotations:{readOnlyHint:true,destructiveHint:false,openWorldHint:true}
  },async a=>{
    try{const im=await browser.readImage(a.url,a.index);return {content:[{type:'text',text:JSON.stringify({note_id:im.note_id,index:im.index})},{type:'image',data:im.data,mimeType:im.mimeType}]};}
    catch(e){return {isError:true,content:[{type:'text',text:e.message}]};}
  });
  return server;
}
