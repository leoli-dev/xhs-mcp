// Live read-only validation. Print counts and IDs only; signed links and image
// base64 remain in memory, not in repository fixtures or terminal output.
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
const client=new Client({name:'rednote-live-validation',version:'1.0.0'});
await client.connect(new StdioClientTransport({command:process.execPath,args:[new URL('../src/cli.js',import.meta.url).pathname,'serve'],stderr:'pipe'}));
const call=async(name,args)=>{
 const r=await client.callTool({name,arguments:args},undefined,{timeout:120000});
 if(r.isError)throw new Error(r.content.find(c=>c.type==='text')?.text || 'MCP_ERROR');
 return r;
};
try {
 const status=(await call('xhs_session_status',{site:'rednote'})).structuredContent;
 assert.equal(status.site,'rednote');assert.equal(status.session,'logged_in');
 const saved=(await call('xhs_list_saved',{site:'rednote',limit:5})).structuredContent;
 assert.equal(saved.site,'rednote');assert.ok(saved.returned>0);
 console.log({site:status.site,session:status.session,returned:saved.returned,reportedTotal:saved.reported_total});
 const chosen=[saved.items[0],saved.items.find(n=>n.type==='normal')].filter(Boolean);
 for(const item of chosen) {
  const note=(await call('xhs_read_note',{url:item.url})).structuredContent;
  assert.equal(note.site,'rednote');assert.equal(note.id,item.id);
  console.log({id:note.id,title:note.title,textLength:note.text.length,images:note.images.length,videoStreams:note.video?.streams.length || 0});
 }
 const imageNote=chosen[chosen.length-1];
 const image=await call('xhs_read_note_image',{url:imageNote.url,index:1});
 assert.ok(image.content.some(c=>c.type==='image' && c.data.length>0));
 console.log({actualImage:true,mimeType:image.content.find(c=>c.type==='image').mimeType});
 const search=(await call('xhs_search',{query:'滑雪',limit:2,site:'rednote'})).structuredContent;
 assert.equal(search.site,'rednote');assert.ok(search.returned>0);
 assert.ok(search.items.every(n=>new URL(n.url).hostname==='www.rednote.com'));
 console.log({searchSite:search.site,searchReturned:search.returned});
} finally {await client.close();}
