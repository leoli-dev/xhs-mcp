import test from 'node:test';
import assert from 'node:assert/strict';
import {XhsBrowser} from '../src/browser.js';

const page=(url,loggedIn,login=false)=>({url:()=>url,evaluate:async()=>({loggedIn,login})});
test('两个账号同时登录时 auto 优先海外，显式站点不发生账号回退',async()=>{
 const browser=new XhsBrowser({site:'auto'});
 const ctx={pages:()=>[page('https://www.xiaohongshu.com/explore',true),page('https://www.rednote.com/',true)]};
 const states=await browser.sessionsStatus(ctx);
 assert.equal(await browser.selectSite(ctx,'auto',states),'rednote');
 assert.equal(await browser.selectSite(ctx,'xiaohongshu',states),'xiaohongshu');
 browser.run=fn=>fn(ctx);
 assert.equal((await browser.status()).site,'rednote');
 assert.equal((await browser.status('xiaohongshu')).site,'xiaohongshu');
});
test('海外已退出时显式 rednote 不借用国内账号冒充已登录',async()=>{
 const browser=new XhsBrowser({site:'rednote'});
 const ctx={pages:()=>[page('https://www.xiaohongshu.com/explore',true),page('https://www.rednote.com/',false,true)]};
 browser.run=fn=>fn(ctx);
 const state=await browser.status();
 assert.equal(state.site,'rednote');assert.equal(state.session,'auth_required');
 assert.equal(state.sites.find(s=>s.site==='xiaohongshu').session,'logged_in');
 assert.throws(()=>new XhsBrowser({site:'other'}));
});
