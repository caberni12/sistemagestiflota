/* E-fleet Web 4.4.91 · NEXO IA Multimodal · R8.2.159 */
(() => {
  'use strict';
  const VERSION='4.4.91';
  const SESSION_KEY='sistema_gestion_flotas_sesion_v3';
  const CONNECTION_KEY='sistema_gestion_flotas_conexion_empresa_v1';
  const PHOTO_TYPES=[
    ['FRONTAL','Frontal','Fotografíe el vehículo de frente'],
    ['TRASERA','Trasera','Fotografíe completamente la parte trasera'],
    ['LATERAL_IZQUIERDO','Lateral izquierdo','Incluya puertas, ruedas y carrocería'],
    ['LATERAL_DERECHO','Lateral derecho','Incluya puertas, ruedas y carrocería'],
    ['TABLERO','Odómetro / tablero encendido','Capture el tablero completo. Si los dígitos del ODO/TOTAL se distinguen y el valor es coherente, NEXO acepta la lectura aunque la foto no sea perfecta']
  ];

  const safeJson=(value,fallback=null)=>{try{return JSON.parse(value);}catch(_){return fallback;}};
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function toast(title,message,type='success'){
    const stack=document.getElementById('toastStack');
    if(!stack){console[type==='error'?'error':'log'](`[${title}] ${message}`);return;}
    const node=document.createElement('div');node.className=`toast ${type}`;
    node.innerHTML=`<i>${type==='error'?'!':type==='warning'?'!':'✓'}</i><div><b>${escapeHtml(title)}</b><span>${escapeHtml(message)}</span></div>`;
    stack.appendChild(node);setTimeout(()=>node.remove(),6500);
  }
  function context(){
    const auth=safeJson(localStorage.getItem(SESSION_KEY)||'',{}),connection=safeJson(localStorage.getItem(CONNECTION_KEY)||'',{});
    if(!auth?.token)throw new Error('La sesión no está disponible. Ingrese nuevamente.');
    if(!/^https:\/\//i.test(String(connection?.url_real||connection?.url||'')))throw new Error('La conexión central de la empresa no está configurada.');
    if(!connection?.empresa_id)throw new Error('La conexión no contiene empresa_id. Revalide la empresa.');
    return{auth,connection,url:String(connection.url_real||connection.url).replace(/\/+$/,'')};
  }
  async function api(action,data){
    const {auth,connection,url}=context();
    const body={accion:action,action,ACCION:action,datos:data||{},fichaSesion:auth.token,token:auth.token,
      empresaId:connection.empresa_id,empresaRut:connection.empresa_rut||'',empresaNombre:connection.empresa_nombre||'',
      EMPRESA_ID:connection.empresa_id,EMPRESA_RUT:connection.empresa_rut||'',EMPRESA_NOMBRE:connection.empresa_nombre||'',
      origen:'WEB_CHECKLIST_IA',agenteNavegador:`E-fleet Web/${VERSION}`};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
    try{
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json;charset=utf-8','Accept':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),signal:controller.signal});
      const envelope=await response.json().catch(()=>({}));
      if(!response.ok||envelope?.ok!==true)throw new Error(envelope?.message||envelope?.mensaje||envelope?.error||`HTTP ${response.status}`);
      return envelope.data||{};
    }finally{clearTimeout(timer);}
  }
  function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('No fue posible leer la fotografía.'));reader.onload=()=>resolve(String(reader.result||''));reader.readAsDataURL(file);});}
  async function compressImage(file,type){
    if(!file||!/^image\//i.test(file.type))throw new Error('Seleccione una fotografía válida.');
    const source=await fileToDataUrl(file),image=new Image();
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('La fotografía no pudo abrirse.'));image.src=source;});
    if(image.naturalWidth<640||image.naturalHeight<480)throw new Error(`La fotografía ${type.toLowerCase()} tiene muy poca resolución.`);
    const max=type==='TABLERO'?3072:1600,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const quality=type==='TABLERO'?0.96:0.82,dataUrl=canvas.toDataURL('image/jpeg',quality),bytes=Math.round((dataUrl.length-dataUrl.indexOf(',')-1)*0.75);
    if(bytes<18000)throw new Error(`La fotografía ${type.toLowerCase()} parece vacía, oscura o demasiado comprimida.`);
    return{dataUrl,width:canvas.width,height:canvas.height,bytes};
  }
  function evidenceMarkup(){return `<section class="checklist-ia-card full" data-checklist-ia-card>
    <header><div><span class="eyebrow">CHECKLIST INTELIGENTE SIN GPS</span><h3>Inspección visual + revisión humana</h3><p>NEXO IA leerá el odómetro y prellenará únicamente los puntos que realmente pueda verificar en las fotos. Los 18 controles permanecen visibles y deben ser revisados por una persona antes de confirmar.</p></div><span class="checklist-ia-badge">IA + persona</span></header>
    <div class="checklist-ia-process full" data-ia-process><div><b data-ia-progress-title>Preparado para iniciar</b><span data-ia-progress-label>Fotos → odómetro → NEXO → revisión humana → guardado</span><strong data-ia-progress-percent>0%</strong></div><div class="checklist-ia-process-track"><i data-ia-progress-bar></i></div></div>
    <div class="checklist-ia-grid">${PHOTO_TYPES.map(([type,label,help])=>`<label class="checklist-ia-photo"><span>${escapeHtml(label)} *</span><input type="file" accept="image/*" capture="environment" data-ia-photo="${type}" required><small>${escapeHtml(help)}</small><b data-ia-file-name="${type}">Sin fotografía</b></label>`).join('')}</div>
    <label class="field full checklist-ia-note"><span>Nota del conductor por voz o texto</span><textarea name="NOTA_IA_CONDUCTOR" data-ia-note placeholder="Ej. El freno suena raro al pisarlo a fondo"></textarea><button class="btn soft" type="button" data-ia-dictate>🎙 Dictar observación</button><small>La IA clasifica la observación, pero no reemplaza el diagnóstico del taller.</small></label>
    <input type="hidden" name="SESION_IA_ID"><input type="hidden" name="FOTOS_VEHICULO"><input type="hidden" name="IA_RESULTADO_CODIFICADO"><input type="hidden" name="IA_TRANSCRIPCION">
    <div class="checklist-ia-status full" data-ia-status><i>○</i><div><b>Esperando evidencias</b><span>Se requieren cuatro vistas exteriores y una fotografía del tablero.</span></div></div>
  </section>`;}
  function enhance(form){
    if(!form||form.dataset.checklistIaEnhanced==='1')return;
    form.dataset.checklistIaEnhanced='1';
    if(!form.elements.SOLICITUD_CLIENTE_ID){const request=document.createElement('input');request.type='hidden';request.name='SOLICITUD_CLIENTE_ID';const uuid=(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')?globalThis.crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;request.value=`CHK-WEB-${uuid}`;form.appendChild(request);}
    const observation=form.querySelector('textarea[name="OBSERVACIONES"]')?.closest('label')||form.querySelector('.form-actions');
    const holder=document.createElement('div');holder.className='full';holder.innerHTML=evidenceMarkup();
    if(observation)observation.before(holder.firstElementChild);else form.appendChild(holder.firstElementChild);
    if(form.elements.KILOMETRAJE){const km=form.elements.KILOMETRAJE;km.required=false;km.readOnly=true;km.setAttribute('readonly','readonly');km.inputMode='none';km.tabIndex=-1;km.placeholder='Se carga automáticamente desde la foto del odómetro';km.title='Kilometraje validado por NEXO IA desde la fotografía del odómetro';}
    form.querySelectorAll('[data-checkin-control] input[type="radio"],[data-checkin-item],input[name="CONFIRMACION_CONDUCTOR"]').forEach(control=>{control.required=false;});
    form.querySelectorAll('[data-ia-photo]').forEach(input=>input.addEventListener('change',()=>{const file=input.files?.[0],name=form.querySelector(`[data-ia-file-name="${input.dataset.iaPhoto}"]`);if(name)name.textContent=file?file.name:'Sin fotografía';form.dataset.iaReady='';form.elements.SESION_IA_ID.value='';}));
    form.querySelector('[data-ia-dictate]')?.addEventListener('click',event=>dictate(form.querySelector('[data-ia-note]'),event.currentTarget));
    form.querySelector('[data-checkin-fill-pending-ok]')?.addEventListener('click',()=>{
      let marked=0;
      form.querySelectorAll('[data-checkin-control]').forEach(card=>{
        const radios=[...card.querySelectorAll('input[type="radio"]')];if(radios.some(input=>input.checked))return;
        const ok=radios.find(input=>String(input.value).toUpperCase()==='OK');if(ok){ok.checked=true;ok.dispatchEvent(new Event('change',{bubbles:true}));marked++;}
      });
      form.querySelectorAll('[data-checkin-item]').forEach(select=>{if(String(select.value||'').trim())return;select.value='OK';select.dispatchEvent(new Event('change',{bubbles:true}));marked++;});
      const pending=controlsPending(form).length;
      toast('Revisión rápida',marked?`${marked} punto(s) pendientes quedaron en Conforme. ${pending?`Aún faltan ${pending}.`: 'Ya están los 18/18 con respuesta.'} Revise cualquier falla prellenada por NEXO antes de confirmar.`:'No había puntos pendientes por marcar.','success');
    });
  }
  function dictate(field,button){
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){toast('Dictado no disponible','Este navegador no ofrece reconocimiento de voz. Escriba la observación.','warning');return;}
    const original=button.textContent,recognition=new Recognition();recognition.lang='es-CL';recognition.interimResults=false;recognition.maxAlternatives=1;
    button.disabled=true;button.textContent='Escuchando…';
    recognition.onresult=event=>{const text=event.results?.[0]?.[0]?.transcript||'';field.value=[field.value,text].filter(Boolean).join(' ').trim();field.dispatchEvent(new Event('input',{bubbles:true}));};
    recognition.onerror=()=>toast('No se pudo escuchar','Revise el permiso del micrófono o escriba la observación.','warning');
    recognition.onend=()=>{button.disabled=false;button.textContent=original;};recognition.start();
  }
  function setStatus(form,state,title,message){const node=form.querySelector('[data-ia-status]');if(!node)return;node.className=`checklist-ia-status full ${state}`;node.innerHTML=`<i>${state==='working'?'◌':state==='error'?'!':'✓'}</i><div><b>${escapeHtml(title)}</b><span>${escapeHtml(message)}</span></div>`;}
  function setProcessProgress(form,percent,title,label){
    const value=Math.max(0,Math.min(100,Math.round(Number(percent)||0))),node=form.querySelector('[data-ia-process]'),bar=form.querySelector('[data-ia-progress-bar]'),pct=form.querySelector('[data-ia-progress-percent]'),ttl=form.querySelector('[data-ia-progress-title]'),txt=form.querySelector('[data-ia-progress-label]');
    if(bar)bar.style.width=`${value}%`;if(pct)pct.textContent=`${value}%`;if(ttl)ttl.textContent=title||'Procesando Check-in';if(txt)txt.textContent=label||'';
    if(node){node.classList.toggle('complete',value===100);node.classList.toggle('working',value>0&&value<100);}
  }
  function controlsPending(form){return controls(form).filter(item=>!String(item.respuesta||'').trim());}
  function controls(form){
    const rows=[];
    form.querySelectorAll('[data-checkin-control]').forEach(card=>{const id=card.dataset.checkinControl,radio=card.querySelector(`input[name="checkin_${id}"]:checked`),note=card.querySelector('[data-checkin-note]');rows.push({id,respuesta:radio?.value||'',observacion:note?.value||'',critico:card.classList.contains('critical')||/crítico/i.test(card.textContent||'')});});
    form.querySelectorAll('[data-checkin-item]').forEach(select=>{rows.push({id:select.dataset.checkinItem,respuesta:select.value||'',observacion:form.querySelector(`[data-checkin-note="${select.dataset.checkinItem}"]`)?.value||'',critico:/crítico/i.test(select.closest('.checkin-item')?.textContent||'')});});
    return rows;
  }
  async function uploadEvidence(form,existing=[]){
    const previous=new Map((Array.isArray(existing)?existing:[]).map(item=>[String(item?.tipoEvidencia||item?.TIPO_EVIDENCIA||'').toUpperCase(),item]));
    let completed=0;const total=PHOTO_TYPES.length;
    const tasks=PHOTO_TYPES.map(async ([type,label],i)=>{
      const input=form.querySelector(`[data-ia-photo="${type}"]`),file=input?.files?.[0],reuse=previous.get(type);
      if(reuse&&!file){completed++;setProcessProgress(form,8+Math.round(completed/total*27),'Subiendo evidencias',`${completed} de ${total} · reutilizando evidencia ya subida`);return reuse;}
      if(!file)throw new Error(`Falta la fotografía: ${label}.`);
      const image=await compressImage(file,type),name=`${String(type).toLowerCase()}-${Date.now()}-${i+1}.jpg`;
      const uploaded=await api('subirArchivoDrive',{DESTINO:'CHECKIN_IA',NOMBRE_ARCHIVO:name,TIPO_MIME:'image/jpeg',ARCHIVO_BASE64:image.dataUrl,CONTEXTO:`Checklist IA · ${type}`});
      completed++;setProcessProgress(form,8+Math.round(completed/total*27),'Subiendo evidencias',`${completed} de ${total} evidencias listas`);
      return{url:uploaded.url||uploaded.direccionArchivo||'',bucket:uploaded.bucket||'flotas-checkin',archivoId:uploaded.path||'',path:uploaded.path||'',nombre:uploaded.nombre||name,tipoMime:'image/jpeg',tipoEvidencia:type,tamanoBytes:uploaded.tamanoBytes||image.bytes,calidadEstado:'ACEPTADA',calidadDetalle:`${image.width}x${image.height}`};
    });
    return await Promise.all(tasks);
  }

  function applyAutomaticControls(form,data){
    const list=Array.isArray(data?.LISTA_AUTOMATICA)?data.LISTA_AUTOMATICA:(Array.isArray(data?.resultado?.controles_checkin)?data.resultado.controles_checkin:[]);
    let prefilled=0;
    for(const item of list){
      const id=String(item?.id||item?.ID||'').trim();if(!id)continue;const response=String(item?.respuesta||item?.RESPUESTA||'PENDIENTE').toUpperCase();
      const visual=item?.visible_ia===true&&String(item?.origen||'').toUpperCase()==='NEXO_IA_VISUAL';
      if(!visual||!['OK','FALLA'].includes(response))continue;
      const radio=form.querySelector(`input[name="checkin_${CSS.escape(id)}"][value="${response}"]`);
      if(radio){radio.checked=true;radio.dataset.iaPrefill='1';radio.dispatchEvent(new Event('change',{bubbles:true}));}
      const select=form.querySelector(`[data-checkin-item="${CSS.escape(id)}"]`);if(select){select.value=response;select.dataset.iaPrefill='1';select.dispatchEvent(new Event('change',{bubbles:true}));}
      const card=form.querySelector(`[data-checkin-control="${CSS.escape(id)}"]`);if(card){card.classList.add('ia-prefilled');card.dataset.iaConfidence=String(item?.confianza_ia||item?.confianza||0);}
      const note=form.querySelector(`[data-checkin-note="${CSS.escape(id)}"]`);if(note&&String(item?.observacion||item?.OBSERVACION||'').trim()){note.value=String(item.observacion||item.OBSERVACION).trim();note.dispatchEvent(new Event('input',{bubbles:true}));}
      const state=form.querySelector(`[data-checkin-state="${CSS.escape(id)}"]`);if(state){state.textContent=`Prellenado IA · ${response==='FALLA'?'revisar falla':'revise y confirme'}`;state.className=`checkin-control-state ia ${response==='FALLA'?'failed':'done'}`;}
      prefilled++;
    }
    const bulk=form.querySelector('[data-checkin-fill-pending-ok]');if(bulk){bulk.disabled=false;bulk.title='Completa únicamente los controles todavía pendientes después del prellenado NEXO';}
    form.dataset.iaControlsFilled=String(prefilled);return{list,prefilled,pending:Math.max(0,18-prefilled)};
  }

  function resultSummary(form,data){
    const r=data.resultado||{},sev=String(r.severidad||'BAJA').toUpperCase(),prediction=data.PREDICCION_MANTENIMIENTO||{};
    const km=Number(data.KILOMETRAJE_SUGERIDO||0),confidence=Math.round(Number(r.kilometraje_confianza||0)*100),kmMethod=String(data.KILOMETRAJE_METODO_VALIDACION||r.metodo_validacion_odometro||'').trim(),days=prediction.DIAS_ESTIMADOS;
    const kmDia=Number(prediction.PROMEDIO_KM_DIA_USADO||0),predConfidence=Math.round(Number(prediction.CONFIANZA_PREDICCION||0)*100),trend=String(prediction.TENDENCIA_USO||'ESTABLE'),predLevel=String(prediction.NIVEL||'NORMAL'),predDate=String(prediction.FECHA_ESTIMADA||'');
    const testigos=Array.isArray(data.TESTIGOS_DETECTADOS)?data.TESTIGOS_DETECTADOS:(Array.isArray(r.testigos)?r.testigos:[]);
    const danos=Array.isArray(data.DANOS_DETECTADOS)?data.DANOS_DETECTADOS:(Array.isArray(r.danos)?r.danos:[]);
    const combustible=String(data.NIVEL_COMBUSTIBLE||r?.nivel_combustible?.estado||'').trim();
    const extras=`${combustible?` Combustible: ${combustible}.`:''}${testigos.length?` Testigos/anomalías: ${testigos.length}.`:''}${danos.length?` Daños visibles: ${danos.length}.`:''}`;
    const forecast=days!=null?` Predicción mantención: ${predLevel}, ${days} día(s)${predDate?` · ${predDate}`:''}${kmDia>0?` · ${kmDia.toFixed(1)} km/día`:''} · tendencia ${trend}${predConfidence?` · confianza ${predConfidence}%`:''}.`:'';
    setStatus(form,sev==='CRITICA'?'error':sev==='ALTA'?'warning':'ok',`Análisis ${sev.toLowerCase()} · ${data.MODO_ANALISIS||'IA'}`,`${r.resumen||'Análisis completado.'}${km?` Kilometraje validado: ${km.toLocaleString('es-CL')} km (${confidence}% confianza${kmMethod?` · ${kmMethod}`:''}).`:''}${extras}${forecast}`);
  }
  async function process(form,submitter){
    const defaultLabel='Guardar y evaluar check-in';
    const original=submitter?.textContent||defaultLabel;let analysedNow=false,handingOff=false;
    if(submitter){submitter.disabled=true;submitter.textContent=form.elements.SESION_IA_ID?.value?'Validando revisión humana…':'Analizando con NEXO IA…';}
    try{
      let sessionId=form.elements.SESION_IA_ID?.value||'',photos=safeJson(form.elements.FOTOS_VEHICULO?.value||'',[]),analysis=null;
      if(!sessionId){
        setProcessProgress(form,5,'Preparando Check-in','Optimizando las fotografías; el tablero se conserva en alta resolución.');
        photos=await uploadEvidence(form,photos);
        setProcessProgress(form,38,'Leyendo odómetro','NEXO busca el contador ODO/TOTAL y acepta una lectura visible y coherente sin exigir una foto perfecta.');
        setStatus(form,'working','NEXO IA está revisando','Leyendo odómetro, combustible, testigos y únicamente los controles realmente visibles…');
        analysis=await api('analizarChecklistIaBorrador',{VEHICULO_ID:form.elements.VEHICULO_ID?.value||'',CONDUCTOR_ID:form.elements.CONDUCTOR_ID?.value||'',NOTA_CONDUCTOR:form.querySelector('[data-ia-note]')?.value||'',LISTA_CODIFICADA:JSON.stringify(controls(form)),EVIDENCIAS:photos});
        setProcessProgress(form,70,'Análisis NEXO completado','Aplicando prellenado visual y preparando la revisión humana.');
        sessionId=analysis.SESION_IA_ID||'';if(!sessionId)throw new Error('El servidor no confirmó la sesión de análisis.');
        resultSummary(form,analysis);
        if(analysis.KILOMETRAJE_REQUIERE_NUEVA_FOTO===true||analysis.KILOMETRAJE_VALIDADO!==true){
          const conservadas=(analysis.FOTOS_VEHICULO||photos).filter(item=>String(item?.tipoEvidencia||item?.TIPO_EVIDENCIA||'').toUpperCase()!=='TABLERO');
          form.elements.FOTOS_VEHICULO.value=JSON.stringify(conservadas);form.elements.SESION_IA_ID.value='';form.dataset.iaReady='';
          const tablero=form.querySelector('[data-ia-photo="TABLERO"]');if(tablero){tablero.value='';const name=form.querySelector('[data-ia-file-name="TABLERO"]');if(name)name.textContent='Repita solo esta foto · odómetro/tablero';tablero.closest('.checklist-ia-photo')?.scrollIntoView({behavior:'smooth',block:'center'});}
          setProcessProgress(form,55,'Odómetro pendiente','Las otras cuatro fotografías ya quedaron subidas y se reutilizarán.');
          const intentos=Number(analysis.KILOMETRAJE_INTENTOS_IA||1);
          throw new Error(`NEXO realizó ${intentos} lectura(s) automáticas pero no pudo validar el odómetro (${analysis.KILOMETRAJE_MOTIVO||'lectura insuficiente'}). Repita únicamente tablero/odómetro; las otras cuatro evidencias no se volverán a subir.`);
        }
        form.elements.SESION_IA_ID.value=sessionId;form.elements.FOTOS_VEHICULO.value=JSON.stringify(analysis.FOTOS_VEHICULO||photos);form.elements.IA_RESULTADO_CODIFICADO.value=JSON.stringify(analysis.resultado||{});form.elements.IA_TRANSCRIPCION.value=analysis.TRANSCRIPCION||'';
        const km=Number(analysis.KILOMETRAJE_SUGERIDO||0);if(!(km>0))throw new Error('NEXO IA no obtuvo un kilometraje válido desde la foto del odómetro.');if(form.elements.KILOMETRAJE)form.elements.KILOMETRAJE.value=String(km);
        const combustible=String(analysis.NIVEL_COMBUSTIBLE||analysis?.resultado?.nivel_combustible?.estado||'No determinado por IA').trim();if(form.elements.NIVEL_COMBUSTIBLE)form.elements.NIVEL_COMBUSTIBLE.value=combustible;
        const auto=applyAutomaticControls(form,analysis);
        analysedNow=true;form.dataset.iaAnalizado='1';
        setProcessProgress(form,78,'Revisión humana obligatoria',`NEXO prellenó ${auto.prefilled} de 18 puntos visibles. Revise y complete los 18 antes de confirmar.`);
        toast('Prellenado NEXO listo',`NEXO verificó visualmente ${auto.prefilled} de 18 puntos. Revise los 18 controles; complete o corrija los pendientes y luego confirme.`,'success');
        const first=form.querySelector('[data-checkin-control],[data-checkin-item]');first?.scrollIntoView({behavior:'smooth',block:'center'});
        return;
      }
      const pending=controlsPending(form);if(pending.length){setProcessProgress(form,78,'Falta revisión humana',`${pending.length} de 18 punto(s) todavía no tienen una respuesta confirmada.`);throw new Error(`Revise los 18 puntos. Faltan ${pending.length} control(es) por confirmar.`);}
      const confirm=form.querySelector('input[name="CONFIRMACION_CONDUCTOR"]');if(confirm&&!confirm.checked)throw new Error('Confirme que realizó personalmente la revisión humana de los 18 puntos.');
      const kmValue=Number(form.elements.KILOMETRAJE?.value||0);if(!(kmValue>0))throw new Error('El kilometraje debe validarse automáticamente desde la fotografía del odómetro.');
      setProcessProgress(form,88,'Guardando Check-in','Revisión humana 18/18 completa. Confirmando en la base central…');
      form.dataset.iaReady='1';handingOff=true;form.requestSubmit(submitter||undefined);
    }catch(error){setStatus(form,'error','No se completó el proceso',String(error?.message||error));toast('Checklist IA',String(error?.message||error),'error');}
    finally{if(submitter&&!handingOff){submitter.disabled=false;submitter.textContent=analysedNow?'✓ Revisar 18 puntos y confirmar':(form.elements.SESION_IA_ID?.value?'✓ Confirmar Check-in':original);}}
  }

  document.addEventListener('submit',event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement)||!['checkinInlineForm','checkinForm'].includes(form.id))return;
    enhance(form);
    if(form.dataset.iaReady==='1'){form.dataset.iaReady='';return;}
    event.preventDefault();event.stopImmediatePropagation();process(form,event.submitter||form.querySelector('button[type="submit"]'));
  },true);
  const observer=new MutationObserver(()=>{enhance(document.getElementById('checkinInlineForm'));enhance(document.getElementById('checkinForm'));});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{enhance(document.getElementById('checkinInlineForm'));enhance(document.getElementById('checkinForm'));});
  window.EFleetChecklistIA={version:VERSION,enhance,api,setProgress:setProcessProgress,complete:(form,message='Check-in confirmado')=>{setStatus(form,'ok','✓ Check-in confirmado',message);setProcessProgress(form,100,'✓ Check-in confirmado','Registro guardado y confirmado correctamente.');}};
})();
