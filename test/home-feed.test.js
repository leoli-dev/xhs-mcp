import test from 'node:test';
import assert from 'node:assert/strict';
import {XhsBrowser} from '../src/browser.js';
import {pageCards} from '../src/extract.js';

function fixture(site,{fail=false,login=false}={}){
 const origin=`https://www.${site==='rednote'?'rednote':'xiaohongshu'}.com`;
 const id='abcdef1234567890abcdef12', card={id,url:`${origin}/explore/${id}?xsec_token=signed`,title:'test'};
 let closed=false,front=false,scrolls=0,url='';
 const p={setDefaultTimeout(){},url:()=>url,goto:async u=>{url=u;return {status:()=>200};},bringToFront:async()=>{front=true;},close:async()=>{closed=true;},locator:()=>({first:()=>({waitFor:async()=>{if(fail)throw Error('missing');}})}),waitForTimeout:async()=>{},evaluate:async fn=>{if(fn===pageCards)return [card,card,{...card,url:'https://evil.example/explore/'+id}];if(fn.name==='pageSession')return {login,text:''};scrolls++;}};
 const browser=new XhsBrowser();browser.run=fn=>fn({newPage:async()=>p});
 return {browser,p,card,state:()=>({closed,front,scrolls})};
}
for(const site of ['rednote','xiaohongshu']){
 test(`home feed ${site}: links, deduplication, bound and cleanup`,async()=>{
  const f=fixture(site);const result=await f.browser.homeFeed(2,site);
  assert.equal(result.site,site);assert.equal(result.returned,1);assert.equal(result.complete,false);assert.equal(result.items[0].url,f.card.url);assert.equal(result.items[0].site,site);assert.ok(f.state().scrolls<=19);assert.equal(f.state().closed,true);
 });
 test(`open ${site} leaves only new tab open`,async()=>{
  const f=fixture(site);const result=await f.browser.openHome(site);
  assert.equal(result.site,site);assert.equal(result.tab,'left_open');assert.deepEqual(f.state(),{closed:false,front:true,scrolls:0});
 });
}
test('home feed errors clean up and limits are validated',async()=>{
 const f=fixture('rednote',{fail:true});await assert.rejects(f.browser.homeFeed(1,'rednote'),/HOME_UNAVAILABLE/);assert.equal(f.state().closed,true);
 const login=fixture('rednote',{login:true});await assert.rejects(login.browser.homeFeed(1,'rednote'),/AUTH_REQUIRED/);assert.equal(login.state().closed,true);
 await assert.rejects(f.browser.homeFeed(51,'rednote'),/INVALID_ARGUMENT/);
});
