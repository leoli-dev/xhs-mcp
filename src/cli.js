#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {createServer} from './server.js';
import {XhsBrowser} from './browser.js';
const command=process.argv[2] || 'serve';
try{
  if(command==='serve')await createServer().connect(new StdioServerTransport());
  else if(command==='doctor')console.log(JSON.stringify(await new XhsBrowser().status(process.argv[3]),null,2));
  else if(command==='read')console.log(JSON.stringify(await new XhsBrowser().read(process.argv[3] || ''),null,2));
  else if(command==='search'){const query=process.argv[3];if(!query)throw new Error('请提供搜索词');console.log(JSON.stringify(await new XhsBrowser().search(query,10,process.argv[4]),null,2));}
  else if(command==='saved')console.log(JSON.stringify(await new XhsBrowser().listSaved(Number(process.argv[3] || 50),process.argv[4]),null,2));
  else if(command==='open-home')console.log(JSON.stringify(await new XhsBrowser().openHome(process.argv[3]),null,2));
  else if(command==='home')console.log(JSON.stringify(await new XhsBrowser().homeFeed(Number(process.argv[3] || 10),process.argv[4]),null,2));
  else throw new Error('用法: xhs-mcp serve | doctor [site] | read <分享链接> | search <关键词> [site] | saved [数量] [site] | open-home [site] | home [数量] [site]');
}catch(e){console.error(e.message);process.exitCode=1;}
