import test from 'node:test';import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';import {createServer} from '../src/server.js';
test('MCP discovery, validation, selected ranks and errors',async()=>{
 const calls=[],siteCalls=[];const server=createServer({status:async site=>({session:'logged_in',site:site || 'auto'}),openHome:async site=>({site,tab:'left_open'}),homeFeed:async(limit,site)=>({site,requested:limit,items:[]}),search:async(query,limit,site)=>{siteCalls.push({query,limit,site});return {items:[]};},listSaved:async(limit,site)=>({site,requested:limit,items:[]}),readResults:async(id,ranks)=>{calls.push(ranks);return {items:[]};}});
 const client=new Client({name:'test',version:'1'});const [a,b]=InMemoryTransport.createLinkedPair();await server.connect(a);await client.connect(b);
 try{
 assert.equal((await client.listTools()).tools.length,9);
 for(const site of ['rednote','xiaohongshu']){
  assert.equal((await client.callTool({name:'xhs_open_home',arguments:{site}})).structuredContent.tab,'left_open');
  const feed=await client.callTool({name:'xhs_home_feed',arguments:{site}});assert.equal(feed.structuredContent.site,site);assert.equal(feed.structuredContent.requested,10);
 }
 assert.equal((await client.callTool({name:'xhs_home_feed',arguments:{limit:51}})).isError,true);
 assert.equal((await client.callTool({name:'xhs_open_home',arguments:{site:'invalid'}})).isError,true);
 const saved=await client.callTool({name:'xhs_list_saved',arguments:{limit:10,site:'rednote'}});
 assert.equal(saved.structuredContent.site,'rednote');assert.equal(saved.structuredContent.requested,10);
 assert.equal((await client.callTool({name:'xhs_session_status',arguments:{site:'rednote'}})).structuredContent.site,'rednote');
 await client.callTool({name:'xhs_search',arguments:{query:'滑雪',limit:3,site:'rednote'}});
 assert.deepEqual(siteCalls,[{query:'滑雪',limit:3,site:'rednote'}]);
 assert.equal((await client.callTool({name:'xhs_search',arguments:{query:'a',site:'evil'}})).isError,true);
 assert.equal((await client.callTool({name:'xhs_list_saved',arguments:{limit:3001,site:'rednote'}})).isError,true);
 const search_id='ca8e17d8-2074-404c-b3aa-970bf1a710fd';
 assert.equal((await client.callTool({name:'xhs_read_search_results',arguments:{search_id,first_n:2}})).isError,undefined);assert.deepEqual(calls,[[1,2]]);
 assert.equal((await client.callTool({name:'xhs_read_search_results',arguments:{search_id,first_n:2,ranks:[1]}})).isError,true);
 assert.equal((await client.callTool({name:'xhs_search',arguments:{query:'a',limit:100}})).isError,true);
 }finally{await client.close();await server.close();}
});
