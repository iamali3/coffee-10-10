/* Shared public-menu content and authenticated draft preview. */
(() => {
  const preview = new URLSearchParams(location.search).has('preview');
  const root = new URL('./', location.href);
  const storageKey = 'coffee-1010-published-v1';
  let appliedContent='',refreshing=false;
  const groupLabels={hookah:{ar:'الأراكيل',en:'Hookah'},cold:{ar:'بارد',en:'Cold'},hot:{ar:'حار',en:'Hot'},milkshake:{ar:'ميلك شيك',en:'Milkshake'}};
  function apply(content){
    if(!Array.isArray(content?.items)||!Array.isArray(content?.categories)||!content.settings)return;
    const fingerprint=JSON.stringify(content);if(fingerprint===appliedContent)return;
    appliedContent=fingerprint;
    const previousGroup=mainKey();
    window.menuCategories=content.categories;
    menu.splice(0,menu.length,...content.items.filter(p=>!p.hidden));
    for(const c of content.categories)cats[c.id]={ar:c.ar,en:c.en};
    // Main sections retain their familiar names; categories are shown beneath them.
    for(const [key,value]of Object.entries(groupLabels))cats[`group:${key}`]=value;
    for(const language of ['ar','en'])Object.assign(text[language],content.settings.content?.[language]||{});
    const validGroup=content.categories.some(c=>c.group===previousGroup)?previousGroup:content.categories[0]?.group;
    if(!content.categories.some(c=>c.id===active))active=`group:${validGroup||'cold'}`;
    if(['hookah','cold','hot','milkshake'].includes(active))active=`group:${active}`;
    const phone=String(content.settings.whatsapp||'').replace(/\D/g,'');
    const links={...content.settings.socialLinks,WhatsApp:phone?`https://wa.me/${phone}`:''};
    document.querySelectorAll('.social').forEach(link=>{const url=links[link.textContent.trim()];link.hidden=!url;if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.removeAttribute('aria-disabled');link.classList.remove('disabled');link.onclick=null;}});
    const heroLink=document.querySelector('.hero-actions [data-i18n="whatsapp"]');heroLink.hidden=!phone;if(phone)heroLink.href=links.WhatsApp;
    setLanguage(lang);
    document.querySelectorAll('[data-filter-link]').forEach(a=>a.onclick=()=>{active=`group:${a.dataset.filterLink}`;query='';document.querySelector('#search').value='';renderAll();});
    if(!preview){try{localStorage.setItem(storageKey,JSON.stringify(content));}catch{}if('serviceWorker'in navigator)navigator.serviceWorker.getRegistration().then(registration=>{if(registration)cacheCompleteMenu(registration);});}
  }
  const originalTabs=renderTabs;
  renderTabs=function(){
    if(!window.menuCategories)return originalTabs();
    const groups=[...new Set(window.menuCategories.map(c=>c.group))],selected=mainKey();
    document.querySelector('#mainTabs').innerHTML=groups.map((k,i)=>`<button class="mode-card ${selected===k?'active':''}" style="--tab-i:${i}" data-cat="group:${k}" aria-pressed="${selected===k}"><span class="mode-card-icon">${catIcon(k)}</span><span class="mode-card-copy"><strong>${escapeMenu(groupLabels[k][lang])}</strong><small>${escapeMenu(groupLabels[k][lang==='ar'?'en':'ar'])}</small></span></button>`).join('');
    document.querySelector('#compactTabs').innerHTML=groups.map(k=>`<button class="compact-tab ${selected===k?'active':''}" data-cat="group:${k}" aria-pressed="${selected===k}">${escapeMenu(groupLabels[k][lang])}</button>`).join('');
    const children=window.menuCategories.filter(c=>c.group===selected),show=selected==='cold'||children.length>1;
    document.querySelector('#subTabs').innerHTML=show?children.map((c,i)=>`<button class="tab ${active===c.id?'active':''}" style="--tab-i:${i}" data-cat="${escapeMenu(c.id)}">${escapeMenu(c[lang])}</button>`).join(''):'';
    document.querySelector('#subcategoryShell').classList.toggle('open',show);
    document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>chooseCategory(b.dataset.cat,b));
  };
  if(preview){
    const banner=document.createElement('div');banner.className='owner-preview-banner';banner.textContent='PRIVATE DRAFT PREVIEW · معاينة المسودة';document.body.append(banner);
  }else{try{const cached=JSON.parse(localStorage.getItem(storageKey));if(cached)apply(cached);}catch{}}
  async function refresh(){
    if(refreshing)return;refreshing=true;
    try{
      // A fresh URL also bypasses older installed service-worker cache entries.
      const endpoint=preview?'api/owner?action=preview':`api/menu?sync=${Date.now()}`;
      const response=await fetch(endpoint,{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw new Error(String(response.status));
      const result=await response.json();apply(result.content);
    }catch(error){
      if(preview){document.querySelector('.owner-preview-banner').textContent='Preview unavailable. Sign in and save your draft, then reopen Preview.';return;}
      // Static hosting (including GitHub Pages) keeps the shipped menu as its fallback.
      if(error.message==='404'||location.protocol==='file:')try{const response=await fetch('data/menu.json');if(response.ok)apply(await response.json());}catch{}
    }finally{refreshing=false;}
  }
  refresh();if(!preview){
    const visibleRefresh=()=>{if(document.visibilityState==='visible')refresh();};
    window.addEventListener('online',visibleRefresh);
    window.addEventListener('pageshow',visibleRefresh);
    window.addEventListener('focus',visibleRefresh);
    document.addEventListener('visibilitychange',visibleRefresh);
    setInterval(visibleRefresh,15000);
    if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('controllerchange',visibleRefresh);
  }
})();
