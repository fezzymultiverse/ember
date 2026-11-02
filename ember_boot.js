/* Ember boot scene: logo grows from a tiny spark, then the whole scene shrinks away to reveal the app. Tap to skip. */
(function(){
 if(document.getElementById('emberBoot'))return;
 var b=document.createElement('div');b.id='emberBoot';b.setAttribute('aria-hidden','true');
 b.innerHTML='<div class="eb-glow"></div><svg class="eb-flame" viewBox="0 0 130 170"><defs><linearGradient id="ebg1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e8470c"/><stop offset=".6" stop-color="#ff8a1f"/><stop offset="1" stop-color="#ffc15a"/></linearGradient><linearGradient id="ebg2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b8300a"/><stop offset="1" stop-color="#ff7a18"/></linearGradient></defs><path d="M68 4C74 40 112 62 112 108c0 36-22 60-48 60S18 146 18 112c0-24 12-38 22-52 2 14 8 22 16 26C52 56 58 30 68 4Z" fill="url(#ebg1)"/><path d="M70 70c4 22 28 34 28 62 0 20-14 34-32 34-20 0-34-14-34-34 0-14 8-24 16-32 2 8 6 12 10 14 0-16 6-30 12-44Z" fill="url(#ebg2)" opacity=".85"/><path d="M64 108c3 12 16 18 16 34 0 12-8 20-18 20s-18-8-18-20c0-8 4-14 8-18 1 4 4 6 6 7 0-8 3-15 6-23Z" fill="#ffd27a" opacity=".7"/></svg><div class="eb-dot"></div><div class="eb-word"><span style="--i:0">E</span><span style="--i:1">M</span><span style="--i:2">B</span><span style="--i:3">E</span><span style="--i:4">R</span></div><div class="eb-tag">Chat. Create. Command.</div><div class="eb-ring"></div><div class="eb-ring eb-r2"></div><div class="eb-status" id="ebStat">Waking the flame</div><div class="eb-bar"><i></i></div><div class="eb-foot"><span>S.O.I &middot; 999</span><span>tap to skip</span></div>';
 var P=document.createElement('div');P.className='eb-parts';for(var n=0;n<22;n++){var s=document.createElement('s');s.style.cssText='--x:'+(Math.random()*100).toFixed(1)+'%;--d:'+(2.4+Math.random()*3).toFixed(2)+'s;--w:'+(Math.random()*2.4).toFixed(2)+'s;--z:'+(2+Math.random()*4).toFixed(1)+'px;--s:'+((Math.random()*40-20)|0)+'px';P.appendChild(s)}b.appendChild(P);
 (document.body||document.documentElement).appendChild(b);
 requestAnimationFrame(function(){requestAnimationFrame(function(){b.classList.add('go')})});
 var gone=false;function end(){if(gone)return;gone=true;b.classList.add('out');
  setTimeout(function(){b.remove()},800)}
  var t0=Date.now(),loaded=document.readyState==='complete',st=document.getElementById('ebStat'),k=0;
 function keys(){try{var o=JSON.parse(localStorage.getItem('ember_keys')||'{}'),c=0;for(var p in o)if(Array.isArray(o[p]))c+=o[p].length;return c}catch(e){return 0}}
 var steps=['Waking the flame','Loading engines','Counting keys'+(keys()?': '+keys():''),'Warming the free models','Ready'];
 var tick=setInterval(function(){if(gone){clearInterval(tick);return}var el=Date.now()-t0;
  if(k<steps.length-1&&el>(k+1)*650)k++;
  if(st)st.textContent=steps[k]+(k<steps.length-1?'\u2026':'');
  if(loaded&&el>2800){if(st)st.textContent='Ready';clearInterval(tick);setTimeout(end,350)}
  if(el>6000){clearInterval(tick);end()}},120);
 window.addEventListener('load',function(){loaded=true});
 b.addEventListener('click',end); /* tap to skip */
})();
