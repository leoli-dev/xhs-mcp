import {SITES,siteFromUrl} from './sites.js';
export function shareUrl(text) {
  const match = text.match(/https?:\/\/[^\s<>"“”，。；！）]+/);
  if (!match) throw new Error('INVALID_ARGUMENT: 请提供分享链接或包含链接的分享文本');
  const url = new URL(match[0].replace(/[，。；！）)]+$/, ''));
  if (!['xhslink.com',...Object.values(SITES).flatMap(site=>site.hosts)].includes(url.hostname) || url.username || url.password || url.port) throw new Error('INVALID_ARGUMENT: 只支持小红书或 rednote 笔记链接');
  url.protocol = 'https:';
  return url.href;
}
export function noteId(url) {
  const pathname=new URL(url).pathname;
  return pathname.match(/^\/(?:explore|discovery\/item|search_result)\/([a-f\d]{24})\/?$/i)?.[1] || pathname.match(/^\/user\/profile\/[a-f\d]{24}\/([a-f\d]{24})\/?$/i)?.[1];
}
export function normalizeNote(n, url) {
  let v2 = {}; try { v2 = JSON.parse(n.video?.mediaV2 || '{}'); } catch {}
  const streams = Object.values(n.video?.media?.stream || v2.stream || {}).flat();
  return {
    id:n.noteId || n.id || noteId(url), url, site:siteFromUrl(url), title:n.title || '', text:n.desc || '', type:n.type,
    author:{id:n.user?.userId,name:n.user?.nickname}, published_at:n.time, updated_at:n.lastUpdateTime,
    tags:(n.tagList || []).map(t=>t.name), stats:n.interactInfo,
    images:(n.imageList || []).map((im,i)=>({index:i+1,url:im.urlDefault || im.url || im.infoList?.find(x=>x.imageScene==='WB_DFT')?.url || im.infoList?.[0]?.url,width:im.width,height:im.height})),
    video:n.type==='video'?{duration_seconds:n.video?.capa?.duration || v2.video?.duration,streams:streams.map(s=>({url:s.masterUrl || s.master_url,width:s.width,height:s.height,format:s.format})),subtitles:Object.values(v2.video?.subtitles || {}).flat().map(s=>({url:s.url,language:s.language}))}:null,
    extracted_at:new Date().toISOString(),coverage:{text:'note_body',images:'urls_only',video:n.type==='video'?'media_urls_and_available_subtitles':'not_applicable',ocr:false,transcribed:false}
  };
}
// Runs inside the page; Vue refs are unwrapped without serializing reactive stores.
export function pageNote(id) {
  const unref = v=>v?.__v_isRef ? v.value : v;
  const store=window.__INITIAL_STATE__?.note;
  const map=unref(store?.noteDetailMap);
  const pathId=location.pathname.match(/^\/(?:explore|discovery\/item|search_result)\/([a-f\d]{24})\/?$/i)?.[1] || location.pathname.match(/^\/user\/profile\/[a-f\d]{24}\/([a-f\d]{24})\/?$/i)?.[1];
  const current=id || unref(store?.currentNoteId) || pathId;
  const n=unref(map?.[current])?.note;
  return n ? JSON.parse(JSON.stringify(n)) : null;
}
export function pageCards() {
  return [...document.querySelectorAll('section.note-item')].filter(el=>{
    const tab=el.closest('.tab-content-item');
    return el.getClientRects().length && getComputedStyle(el).visibility!=='hidden' && (!tab || (tab.style.height!=='0px' && tab.getBoundingClientRect().height>0));
  }).map(el=>{
    const a=el.querySelector('a.cover');
    return {id:el.getAttribute('data-note-id') || a?.pathname.split('/').pop(),url:a?.href,title:el.querySelector('.title')?.textContent || '',author:el.querySelector('.author .name')?.textContent || '',cover:el.querySelector('a.cover img')?.src,type:el.querySelector('.play-icon')?'video':'normal'};
  }).filter(x=>x.url && /^[a-f\d]{24}$/i.test(x.id));
}
