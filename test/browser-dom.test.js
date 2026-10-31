import test from 'node:test';
import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {pageCards,pageNote} from '../src/extract.js';
import {pageSession} from '../src/sites.js';

const executablePath=process.env.CHROMIUM_PATH || '/Applications/Chromium.app/Contents/MacOS/Chromium';
const available=await access(executablePath).then(()=>true).catch(()=>false);
test('Chromium DOM: 海外 Me、隐藏登录框、折叠发布页与 profile 笔记路径',{skip:!available},async()=>{
 const user='000000000000000000000000',note='111111111111111111111111';
 const browser=await chromium.launch({executablePath,headless:true});
 try{
  const p=await browser.newPage();
  await p.route('**/*',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><a href="/user/profile/${user}">Me</a><div class="login-container" style="display:none">Sign in</div><div class="tab-content-item" style="height:0;overflow:hidden;padding-top:1px"><section class="note-item" data-note-id="222222222222222222222222"><a class="cover" href="/user/profile/${user}/222222222222222222222222"><img src="data:image/png;base64,"/></a><span class="title">这是发布页，不是收藏</span></section></div><div class="tab-content-item"><section class="note-item" data-note-id="${note}"><a class="cover" href="/user/profile/${user}/${note}"><img src="data:image/png;base64,"/></a><span class="title">真实收藏</span><span class="author"><span class="name">收藏作者</span></span></section></div>`}));
  await p.goto(`https://www.rednote.com/user/profile/${user}/${note}`);
  let session=await p.evaluate(pageSession);
  assert.equal(session.loggedIn,true);assert.equal(session.login,false);
  const cards=await p.evaluate(pageCards);
  assert.equal(cards.length,1);assert.equal(cards[0].id,note);assert.equal(cards[0].title,'真实收藏');
  await p.evaluate(({user,note})=>{window.__INITIAL_STATE__={note:{noteDetailMap:{__v_isRef:true,value:{[user]:{note:{noteId:user,desc:'错误的主页'}},[note]:{note:{noteId:note,desc:'正确的收藏正文'}}}}}};},{user,note});
  assert.equal((await p.evaluate(pageNote)).desc,'正确的收藏正文');
  await p.locator('.login-container').evaluate(e=>{e.style.display='block';});
  session=await p.evaluate(pageSession);assert.equal(session.loggedIn,false);assert.equal(session.login,true);
 }finally{await browser.close();}
});
