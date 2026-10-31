export const SITES = Object.freeze({
  rednote: {origin:'https://www.rednote.com',hosts:['rednote.com','www.rednote.com']},
  xiaohongshu: {origin:'https://www.xiaohongshu.com',hosts:['xiaohongshu.com','www.xiaohongshu.com']}
});
export function validateSite(site) {
  if(!['auto',...Object.keys(SITES)].includes(site))throw new Error('INVALID_ARGUMENT: site 只支持 auto、rednote、xiaohongshu');
  return site;
}
export function siteFromUrl(url) {
  const host=new URL(url).hostname;
  return Object.keys(SITES).find(site=>SITES[site].hosts.includes(host));
}
export function isMediaUrl(url) {
  try{const u=new URL(url);return ['http:','https:'].includes(u.protocol) && !u.username && !u.password && !u.port && ['xhscdn.com','xhscdn.net','rednotecdn.com'].some(domain=>u.hostname===domain || u.hostname.endsWith('.'+domain));}catch{return false;}
}
// Evaluated inside Chromium. Check the visible login UI, not hidden modal shells.
export function pageSession() {
  const visible=e=>!!e && !!e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
  const profile=[...document.querySelectorAll('a')].find(a=>visible(a) && /^(我|Me)$/i.test(a.textContent.trim()) && /^\/user\/profile\/[a-f\d]{24}\/?$/i.test(a.pathname) && a.origin===location.origin);
  const login=[...document.querySelectorAll('.login-container, .login-modal, .overseas-login-container')].some(visible);
  return {loggedIn:!!profile && !login,profileUrl:profile?.href,login,text:document.body.innerText};
}
