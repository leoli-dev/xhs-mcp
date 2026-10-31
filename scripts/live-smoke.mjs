import {XhsBrowser} from '../src/browser.js';
const x=new XhsBrowser();console.log(await x.status());
const search=await x.search('macos 推荐app',2);console.log({search_id:search.search_id,items:search.items.map(x=>({rank:x.rank,title:x.title}))});
const result=await x.readResults(search.search_id,[1,2]);console.log(result.items.map(x=>x.ok?{ok:true,title:x.note.title,text_length:x.note.text.length,images:x.note.images.length,streams:x.note.video?.streams.length}:x));
if(result.items.length!==2 || result.items.some(x=>!x.ok))process.exitCode=1;
