(()=>{
  'use strict';
  if(window.__NEXO_FLOTANTE_4497__)return;window.__NEXO_FLOTANTE_4497__=true;
  if(window.self!==window.top)return; // evita doble botón cuando un módulo está embebido en main.html
  const pagina=(location.pathname.split('/').pop()||'').toLowerCase();
  if(['index.html','404.html','politica-privacidad.html','terminos-condiciones.html'].includes(pagina))return;
  const $=(s,r=document)=>r.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let api=null,abierto=false,escuchando=null;
  async function obtenerApi(){if(api)return api;const limite=Date.now()+12000;while(Date.now()<limite){if(window.ConexionFlotas){api=window.ConexionFlotas;return api;}await sleep(80);}throw new Error('NEXO_SIN_CONEXION');}
  function auth(){try{return api?.getAuth?.()||window.ConexionFlotas?.getAuth?.()||{};}catch(_){return{};}}
  function rolActual(){const u=auth().user||{};return String(u.ROL_ID||u.rol_id||u.ROL||u.rol||'').toUpperCase();}
  function puedeIntegral(){return ['ROL-ADMIN','ROL-GERENCIA','ADMIN','GERENCIA'].includes(rolActual());}
  function estilo(){
    if($('#nexoFabStyle'))return;const st=document.createElement('style');st.id='nexoFabStyle';st.textContent=`
      #nexoFab{position:fixed;right:18px;bottom:20px;width:76px;height:76px;border:0;border-radius:50%;padding:0;background:transparent;z-index:2147482000;cursor:pointer;filter:drop-shadow(0 10px 16px rgba(4,72,160,.38));transition:.18s transform,.18s filter;touch-action:manipulation}
      #nexoFab:hover{transform:translateY(-3px) scale(1.04);filter:drop-shadow(0 12px 22px rgba(4,102,220,.5))}#nexoFab img{width:100%;height:100%;border-radius:50%;display:block;object-fit:cover}
      #nexoFab .ia{position:absolute;right:-2px;bottom:2px;background:#071a3b;color:#fff;border:2px solid #68dcff;border-radius:999px;font:800 11px/1 system-ui;padding:5px 6px;box-shadow:0 4px 10px #0005}
      #nexoFabPanel{position:fixed;right:18px;bottom:108px;width:min(390px,calc(100vw - 24px));max-height:min(630px,calc(100vh - 130px));display:none;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #b8d7ee;border-radius:22px;box-shadow:0 24px 60px rgba(1,35,78,.28);z-index:2147481999;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#102a43}
      #nexoFabPanel.open{display:flex}.nexo-fab-head{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#062d63,#0b73d9);color:white}.nexo-fab-head img{width:44px;height:44px;border-radius:50%}.nexo-fab-head b{display:block;font-size:18px}.nexo-fab-head span{font-size:11px;opacity:.9}.nexo-fab-close{margin-left:auto;border:0;background:#ffffff25;color:#fff;border-radius:50%;width:34px;height:34px;font-size:20px;cursor:pointer}
      .nexo-fab-body{padding:12px;overflow:auto}.nexo-fab-status{padding:8px 10px;background:#eef7ff;border:1px solid #cce7ff;border-radius:12px;font-size:12px;margin-bottom:9px}.nexo-fab-chat{display:flex;flex-direction:column;gap:8px;max-height:250px;overflow:auto;padding:2px 0 9px}.nexo-msg{padding:9px 10px;border-radius:14px;font-size:13px;line-height:1.35;white-space:pre-wrap}.nexo-msg.nexo{background:#eef6ff;border:1px solid #cce3fb}.nexo-msg.user{background:#0b73d9;color:white;margin-left:32px}
      .nexo-fab-input{width:100%;min-height:72px;resize:vertical;border:1px solid #bfd4e5;border-radius:13px;padding:10px 11px;font:14px system-ui;box-sizing:border-box;outline:none}.nexo-fab-input:focus{border-color:#1d7fe0;box-shadow:0 0 0 3px #1d7fe022}.nexo-fab-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.nexo-fab-actions button{border:0;border-radius:12px;min-height:42px;padding:8px 10px;font-weight:750;cursor:pointer}.nexo-primary{background:#1878e5;color:#fff}.nexo-secondary{background:#eaf4ff;color:#0c5eb2}.nexo-integral{grid-column:1/-1;background:#062d63!important;color:#fff}.nexo-open{grid-column:1/-1;background:#f0f4f8!important;color:#102a43}
      @media(max-width:640px){#nexoFab{width:64px;height:64px;right:12px;bottom:14px}#nexoFabPanel{right:12px;bottom:88px;width:calc(100vw - 24px);max-height:calc(100vh - 104px)}}
      @media print{#nexoFab,#nexoFabPanel{display:none!important}}
    `;document.head.appendChild(st);
  }
  function mensaje(texto,tipo='nexo'){const chat=$('#nexoFabChat');if(!chat)return;const d=document.createElement('div');d.className=`nexo-msg ${tipo}`;d.textContent=texto;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;}
  function estado(texto){const n=$('#nexoFabStatus');if(n)n.textContent=texto;}
  async function preguntar(texto){const q=String(texto||'').trim();if(!q)return;mensaje(q,'user');const campo=$('#nexoFabInput');if(campo)campo.value='';estado('Nexo está analizando…');try{const a=await obtenerApi();const r=await a.request('officeAsk',{data:{MENSAJE:q,CONSULTA_PREDETERMINADA:'NO'}});mensaje(r?.respuesta||'Nexo completó la consulta.');estado('NEXO IA · conectado');}catch(e){mensaje(`No pude completar la consulta: ${String(e?.message||e||'error')}`);estado('Nexo disponible · revise conexión o permisos');}}
  function iniciarVoz(){const campo=$('#nexoFabInput');if(!campo)return;
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){mensaje('El navegador no expone reconocimiento de voz. Abra el centro Nexo o use la aplicación Android.');return;}
    try{escuchando?.abort?.();}catch(_){}const r=new Recognition();escuchando=r;r.lang='es-CL';r.interimResults=false;r.maxAlternatives=1;r.onstart=()=>estado('🎙 Nexo está escuchando…');r.onresult=e=>{const t=String(e.results?.[0]?.[0]?.transcript||'').trim();if(t){campo.value=t;preguntar(t);}};r.onerror=()=>estado('No se pudo reconocer la voz · puede escribir');r.onend=()=>{escuchando=null;};try{r.start();}catch(_){estado('Micrófono ocupado');}}
  function abrirCentro(){location.href='oficina-virtual.html';}
  function crear(){estilo();
    const b=document.createElement('button');b.id='nexoFab';b.type='button';b.setAttribute('aria-label','Abrir Nexo IA');b.title='Nexo IA';b.innerHTML='<img src="./nexo-ia-fab.png" alt="Nexo IA"><span class="ia">IA</span>';
    const p=document.createElement('section');p.id='nexoFabPanel';p.setAttribute('aria-label','Nexo IA');p.innerHTML=`<div class="nexo-fab-head"><img src="./nexo-ia-fab.png" alt=""><div><b>Nexo IA</b><span>Asistente inteligente de E-fleet</span></div><button class="nexo-fab-close" type="button" aria-label="Cerrar">×</button></div><div class="nexo-fab-body"><div id="nexoFabStatus" class="nexo-fab-status">Conectando con Nexo…</div><div id="nexoFabChat" class="nexo-fab-chat"><div class="nexo-msg nexo">Hola. Soy Nexo IA. Puedo analizar la operación, vehículos, combustible, gastos, fallas, documentos y mantenciones según tus permisos.</div></div><textarea id="nexoFabInput" class="nexo-fab-input" placeholder="Escribe una consulta para Nexo…"></textarea><div class="nexo-fab-actions"><button type="button" class="nexo-secondary" data-nexo-voz>🎙 Voz</button><button type="button" class="nexo-primary" data-nexo-enviar>Enviar</button><button type="button" class="nexo-integral" data-nexo-integral style="display:none">✦ Analizar todo e informar a Gerencia</button><button type="button" class="nexo-open" data-nexo-abrir>Abrir Centro Nexo IA</button></div></div>`;
    document.body.appendChild(p);document.body.appendChild(b);
    b.onclick=()=>{abierto=!abierto;p.classList.toggle('open',abierto);if(abierto){obtenerApi().then(()=>{estado('NEXO IA · conectado');const x=$('[data-nexo-integral]');if(x)x.style.display=puedeIntegral()?'block':'none';}).catch(()=>estado('Nexo esperando conexión…'));}};
    $('.nexo-fab-close',p).onclick=()=>{abierto=false;p.classList.remove('open');};
    $('[data-nexo-enviar]',p).onclick=()=>preguntar($('#nexoFabInput')?.value);
    $('[data-nexo-voz]',p).onclick=iniciarVoz;
    $('[data-nexo-integral]',p).onclick=()=>preguntar('NEXO, analiza todo el sistema e informa a Gerencia');
    $('[data-nexo-abrir]',p).onclick=abrirCentro;
    $('#nexoFabInput',p).addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();preguntar(e.currentTarget.value);}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',crear,{once:true});else crear();
})();
