import test from 'node:test';import assert from 'node:assert/strict';
import {shareUrl,noteId,normalizeNote} from '../src/extract.js';
import {isMediaUrl,siteFromUrl} from '../src/sites.js';
test('分享文本与主机验证',()=>{
 assert.equal(shareUrl('这是分享 http://xhslink.com/o/abc，打开查看'),'https://xhslink.com/o/abc');
 for(const url of ['https://xiaohongshu.com.evil.com/a','https://user@xhslink.com/a','https://localhost/a','https://xhslink.com:123/a'])assert.throws(()=>shareUrl(url));
 assert.equal(noteId('https://www.xiaohongshu.com/explore/aaaaaaaaaaaaaaaaaaaaaaaa?xsec_token=x'),'aaaaaaaaaaaaaaaaaaaaaaaa');
});
test('海外链接、个人主页笔记路径及域名边界',()=>{
 const user='000000000000000000000000',note='111111111111111111111111';
 assert.equal(shareUrl(`这是海外分享 https://www.rednote.com/user/profile/${user}/${note}?xsec_token=example`),`https://www.rednote.com/user/profile/${user}/${note}?xsec_token=example`);
 assert.equal(noteId(`https://www.rednote.com/user/profile/${user}/${note}`),note);
 assert.equal(noteId(`https://www.rednote.com/user/profile/${user}`),undefined);
 assert.equal(noteId(`https://www.rednote.com/explore/${note}`),note);
 assert.equal(siteFromUrl('https://rednote.com/'),'rednote');
 for(const url of ['https://www.rednote.com.evil.com/explore/a','https://evil@www.rednote.com/a','https://www.rednote.com:9443/a'])assert.throws(()=>shareUrl(url));
 assert.equal(noteId('https://www.rednote.com/user/profile/'+user+'/not-a-note'),undefined);
 assert.equal(isMediaUrl('https://sns-webpic-qc.xhscdn.com/test.webp'),true);
 assert.equal(isMediaUrl('https://media.xhscdn.net/test.mp4'),true);
 assert.equal(isMediaUrl('https://sns-web-i10.rednotecdn.com/test.webp'),true);
 assert.equal(isMediaUrl('https://rednotecdn.com.evil.com/test.webp'),false);
 assert.equal(isMediaUrl('https://xhscdn.com.evil.com/image'),false);
 assert.equal(isMediaUrl('https://user@media.xhscdn.com/image'),false);
 assert.equal(isMediaUrl('file:///tmp/image'),false);
});
test('全文与视频字幕及图像覆盖诚实标注',()=>{
 const note=normalizeNote({noteId:'a',type:'video',desc:'完整正文\n下一行',imageList:[{urlDefault:'https://image',width:100}],video:{mediaV2:JSON.stringify({video:{subtitles:{source:[{url:'https://sub',language:'zh-CN'}]}},stream:{EF4:[{master_url:'https://video',height:720}]}})}},'https://www.xiaohongshu.com/');
 assert.equal(note.text,'完整正文\n下一行');assert.equal(note.video.streams[0].url,'https://video');assert.equal(note.video.subtitles[0].language,'zh-CN');assert.equal(note.coverage.transcribed,false);assert.equal(note.images.length,1);
});
