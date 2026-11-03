/* Keyless audio/video transport. No invented provider or hidden paid fallback.
   Contract: POST JSON {prompt, kind, duration, aspect}; return audio/* or video/*,
   or JSON {url: HTTPS_MEDIA_URL, model?: STRING}. Endpoints must permit browser CORS.
   No default is shipped: no reliable anonymous music+video endpoint was verified. */
'use strict';
(() => {
 const W=window, KEY='ember_keyless_media';
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}};
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function validate(value) {
  const u=new URL(String(value||'').trim());
  if(u.username||u.password||/[?&](?:key|api[_-]?key|token|secret|authorization)=/i.test(u.href))throw new Error('Use a keyless URL, without credentials or tokens.');
  const local=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
  if(u.protocol!=='https:'&&!(u.protocol==='http:'&&local))throw new Error('Use HTTPS, or a localhost HTTP service.');
  return u.href;
 }
 function panel(){const c=read();return '<h4 class="epl-h">Keyless music &amp; video APIs</h4><div class="epl-grp"><p class="hint">No dependable anonymous provider has been verified for this release. Not connected by default. Add a compatible keyless endpoint; no API key is collected and there is no paid fallback. This is an external connection, not a built-in generation model.</p>'+['audio','video'].map(k=>'<label class="epl-row epl-static"><span class="epl-tx"><b>'+ (k==='audio'?'Music/audio endpoint':'Video endpoint')+'</b><small>'+esc(c[k]?'Configured — generation not yet verified':'Not configured')+'</small><input class="epl-in" type="url" data-keyless-endpoint="'+k+'" value="'+esc(c[k])+'" placeholder="https://your-keyless-service/generate"></span></label>').join('')+'<p class="hint">Compatible API: POST prompt, kind, duration, aspect as JSON. Returns an audio/video file or JSON with a media URL. Browser CORS must be allowed. Never paste a key here.</p><button type="button" class="epl-btn" data-keyless-save>Save connections</button><p class="hint" data-keyless-status role="status"></p></div>';}
 async function generate(kind,prompt,options,job){
  const endpoint=read()[kind];
  if(!endpoint)throw new Error('No keyless '+kind+' API is configured. Add a compatible endpoint in + > Media & Music. No generation was submitted; no built-in '+kind+' model exists yet.');
  const url=validate(endpoint),ctl=new AbortController();job.controller=ctl;
  const timer=setTimeout(()=>ctl.abort(),240000);
  try{
   const r=await fetch(url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json','Accept':kind+'/*, application/json'},body:JSON.stringify({prompt,kind,duration:Number(options.duration)||20,aspect:options.aspect||'16:9'}),signal:ctl.signal});
   if(!r.ok)throw new Error('Keyless '+kind+' API returned HTTP '+r.status+'. No automatic resubmission.');
   let blob,model='Configured keyless API';
   if((r.headers.get('content-type')||'').includes('application/json')){
    const j=await r.json();if(!j.url)throw new Error('Keyless API did not return a media URL. Async job APIs require a matching adapter.');
    const media=validate(new URL(j.url,url).href);
    const file=await fetch(media,{credentials:'omit',signal:ctl.signal});if(!file.ok)throw new Error('Generated media download returned HTTP '+file.status);
    blob=await file.blob();model=String(j.model||model).slice(0,100);
   }else blob=await r.blob();
   if(!blob.size||!blob.type.startsWith(kind+'/'))throw new Error('Keyless API returned no valid '+kind+' file.');
   return {blob,model};
  }catch(e){if(ctl.signal.aborted)throw new Error('Keyless generation stopped or timed out. No duplicate request was submitted.');throw e;}
  finally{clearTimeout(timer);job.controller=null;}
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-keyless-save]');if(!b)return;
  const host=b.closest('.epl-grp'),status=host.querySelector('[data-keyless-status]'),c={};
  try{host.querySelectorAll('[data-keyless-endpoint]').forEach(i=>{if(i.value.trim())c[i.dataset.keylessEndpoint]=validate(i.value);});localStorage.setItem(KEY,JSON.stringify(c));status.textContent='Connections saved. Configuration is not a successful generation test.';}
  catch(err){status.textContent=String(err.message||err);}
 });
 W.EmberKeylessMedia={panel,generate,config:read,validate};
})();
