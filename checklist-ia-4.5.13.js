/* E-fleet Web 4.5.13 · NEXO IA Multimodal · R8.2.193 */
(() => {
  'use strict';
  const VERSION='4.5.13';
  const SESSION_KEY='sistema_gestion_flotas_sesion_v3';
  const CONNECTION_KEY='sistema_gestion_flotas_conexion_empresa_v1';
  const PHOTO_TYPES=[
    ['EXTERIOR_1','Foto 1 · Exterior','Puede fotografiar frontal, trasera o lateral; el orden de las cuatro fotos exteriores no importa'],
    ['EXTERIOR_2','Foto 2 · Exterior','Puede fotografiar frontal, trasera o lateral; el orden de las cuatro fotos exteriores no importa'],
    ['EXTERIOR_3','Foto 3 · Exterior','Puede fotografiar frontal, trasera o lateral; el orden de las cuatro fotos exteriores no importa'],
    ['EXTERIOR_4','Foto 4 · Exterior','Puede fotografiar frontal, trasera o lateral; el orden de las cuatro fotos exteriores no importa'],
    ['TABLERO','Foto 5 · Odómetro / tablero','La quinta foto es siempre el tablero/odómetro. Capture ODO/TOTAL visible; si falla, se repite solo esta foto']
  ];
  const EXTERIOR_TYPES=PHOTO_TYPES.slice(0,4).map(row=>row[0]);

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
    <div class="checklist-ia-process full" data-ia-process><div><b data-ia-progress-title>Preparado para iniciar</b><span data-ia-progress-label>4 fotos exteriores (orden libre) → foto 5 odómetro → NEXO → revisión humana → guardado</span><strong data-ia-progress-percent>0%</strong></div><div class="checklist-ia-process-track"><i data-ia-progress-bar></i></div></div>
    <div class="checklist-ia-grid">${PHOTO_TYPES.map(([type,label,help])=>`<label class="checklist-ia-photo"><span>${escapeHtml(label)} *</span><input type="file" accept="image/*" capture="environment" data-ia-photo="${type}" ${type==='TABLERO'?'disabled':''} required><small>${escapeHtml(help)}</small><b data-ia-file-name="${type}">Sin fotografía</b></label>`).join('')}</div>
    <label class="field full checklist-ia-note"><span>Nota del conductor por voz o texto</span><textarea name="NOTA_IA_CONDUCTOR" data-ia-note placeholder="Ej. El freno suena raro al pisarlo a fondo"></textarea><button class="btn soft" type="button" data-ia-dictate>🎙 Dictar observación</button><small>La IA clasifica la observación, pero no reemplaza el diagnóstico del taller.</small></label>
    <input type="hidden" name="SESION_IA_ID"><input type="hidden" name="FOTOS_VEHICULO"><input type="hidden" name="IA_RESULTADO_CODIFICADO"><input type="hidden" name="IA_TRANSCRIPCION"><input type="hidden" name="KILOMETRAJE_CONFIRMADO_USUARIO" data-ia-km-confirm-value>
    <div class="checklist-ia-km-confirm full" data-ia-km-confirm-wrap hidden><label><input type="checkbox" name="CONFIRMACION_KILOMETRAJE" value="SI" data-ia-km-confirm disabled><span data-ia-km-confirm-text>NEXO aún no ha propuesto el kilometraje.</span></label><small>Compare el número con la fotografía del tablero. Si no coincide, no confirme: repita solamente la foto del odómetro.</small></div>
    <div class="checklist-ia-status full" data-ia-status><i>○</i><div><b>Esperando evidencias</b><span>Las fotos 1–4 son exteriores en cualquier orden. La foto 5 es obligatoriamente el tablero/odómetro.</span></div></div>
  </section>`;}
  function syncControlTile(card){
    if(!card)return;
    const id=card.dataset.checkinControl||'',selected=card.querySelector(`input[name="checkin_${CSS.escape(id)}"]:checked`),state=card.querySelector('[data-checkin-state]'),note=card.querySelector('[data-checkin-note]'),tile=card.querySelector('[data-checkin-open]');
    const value=String(selected?.value||'').toUpperCase();
    card.classList.toggle('answered',Boolean(value));card.classList.toggle('failed',value==='FALLA');card.classList.toggle('conforme',value==='OK');
    if(state){state.textContent=value==='OK'?'Conforme':value==='FALLA'?'Disconforme':'Pendiente';state.className=`checkin-control-state ${value==='FALLA'?'failed':value==='OK'?'done':''}`;}
    if(tile){tile.setAttribute('aria-label',`${card.dataset.checkinLabel||'Punto'} · ${value==='OK'?'Conforme':value==='FALLA'?'Disconforme':'Pendiente'}`);}
    card.classList.toggle('has-note',Boolean(String(note?.value||'').trim()));
  }
  function ensureControlModal(){
    let modal=document.querySelector('[data-checkin-point-modal]');
    if(modal)return modal;
    modal=document.createElement('div');modal.className='checkin-point-modal-backdrop';modal.dataset.checkinPointModal='';modal.hidden=true;
    modal.innerHTML=`<section class="checkin-point-modal" role="dialog" aria-modal="true" aria-labelledby="checkinPointModalTitle"><header><div><span class="eyebrow">REVISIÓN DEL PUNTO</span><h3 id="checkinPointModalTitle" data-checkin-point-title>Control</h3><small data-checkin-point-category></small></div><button type="button" class="checkin-point-close" data-checkin-point-close aria-label="Cerrar">×</button></header><div class="checkin-point-options" role="radiogroup"><label class="checkin-point-choice ok"><input type="radio" name="checkin_point_modal_result" value="OK"><span>✓ Conforme</span></label><label class="checkin-point-choice fail"><input type="radio" name="checkin_point_modal_result" value="FALLA"><span>! Disconforme</span></label></div><label class="field checkin-point-note"><span>Observaciones</span><textarea data-checkin-point-note rows="4" placeholder="Escriba daños, ruidos, condiciones u otra observación"></textarea><small>Si marca Disconforme, la observación es obligatoria.</small></label><div class="form-actions"><button type="button" class="btn soft" data-checkin-point-cancel>Cancelar</button><button type="button" class="btn primary" data-checkin-point-save>Guardar punto</button></div></section>`;
    document.body.appendChild(modal);return modal;
  }
  function bindControlModals(form){
    const modal=ensureControlModal();
    form.querySelectorAll('[data-checkin-control]').forEach(card=>{syncControlTile(card);const opener=card.querySelector('[data-checkin-open]');if(!opener||opener.dataset.bound==='1')return;opener.dataset.bound='1';opener.addEventListener('click',()=>{
      const id=card.dataset.checkinControl||'',selected=card.querySelector(`input[name="checkin_${CSS.escape(id)}"]:checked`),note=card.querySelector('[data-checkin-note]');
      modal._efleetCard=card;modal.querySelector('[data-checkin-point-title]').textContent=card.dataset.checkinLabel||'Control';modal.querySelector('[data-checkin-point-category]').textContent=`${card.dataset.checkinCategory||''}${card.dataset.checkinCritical==='SI'?' · Crítico':''}`;
      modal.querySelectorAll('input[name="checkin_point_modal_result"]').forEach(input=>input.checked=String(input.value)===String(selected?.value||''));modal.querySelector('[data-checkin-point-note]').value=note?.value||'';modal.hidden=false;document.body.classList.add('checkin-point-modal-open');setTimeout(()=>modal.querySelector('input[name="checkin_point_modal_result"]:checked')?.focus()||modal.querySelector('input[name="checkin_point_modal_result"]')?.focus(),0);
    });});
    if(modal.dataset.bound!=='1'){
      modal.dataset.bound='1';const close=()=>{modal.hidden=true;modal._efleetCard=null;document.body.classList.remove('checkin-point-modal-open');};
      modal.querySelector('[data-checkin-point-close]').addEventListener('click',close);modal.querySelector('[data-checkin-point-cancel]').addEventListener('click',close);modal.addEventListener('click',event=>{if(event.target===modal)close();});
      modal.querySelector('[data-checkin-point-save]').addEventListener('click',()=>{const card=modal._efleetCard;if(!card)return close();const result=modal.querySelector('input[name="checkin_point_modal_result"]:checked')?.value||'',text=String(modal.querySelector('[data-checkin-point-note]').value||'').trim();if(!result){toast('Seleccione un resultado','Marque Conforme o Disconforme antes de guardar este punto.','warning');return;}if(result==='FALLA'&&!text){toast('Observación requerida','Describa la condición encontrada para guardar un punto Disconforme.','warning');return;}const id=card.dataset.checkinControl||'',radio=card.querySelector(`input[name="checkin_${CSS.escape(id)}"][value="${result}"]`),note=card.querySelector('[data-checkin-note]');if(radio){radio.checked=true;radio.dataset.iaPrefill='';radio.dispatchEvent(new Event('change',{bubbles:true}));}if(note){note.value=text;note.dispatchEvent(new Event('input',{bubbles:true}));}syncControlTile(card);close();});
    }
  }
  function syncPhotoSequence(form){
    if(!form)return;
    const saved=safeJson(form.elements.FOTOS_VEHICULO?.value||'',[]),savedTypes=new Set((Array.isArray(saved)?saved:[]).map(item=>String(item?.tipoEvidencia||item?.TIPO_EVIDENCIA||'').toUpperCase()));
    const exteriorsReady=EXTERIOR_TYPES.every(type=>{const input=form.querySelector(`[data-ia-photo="${type}"]`);return Boolean(input?.files?.[0]||savedTypes.has(type));});
    const tablero=form.querySelector('[data-ia-photo="TABLERO"]'),name=form.querySelector('[data-ia-file-name="TABLERO"]');
    if(tablero&&!tablero.files?.[0])tablero.disabled=!exteriorsReady;
    if(name&&!tablero?.files?.[0])name.textContent=exteriorsReady?'Lista para tomar · esta es la foto 5':'Disponible al completar las 4 fotos exteriores';
  }
  function enhance(form){
    if(!form||form.dataset.checklistIaEnhanced==='1')return;
    form.dataset.checklistIaEnhanced='1';
    if(!form.elements.SOLICITUD_CLIENTE_ID){const request=document.createElement('input');request.type='hidden';request.name='SOLICITUD_CLIENTE_ID';const uuid=(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')?globalThis.crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;request.value=`CHK-WEB-${uuid}`;form.appendChild(request);}
    const observation=form.querySelector('textarea[name="OBSERVACIONES"]')?.closest('label')||form.querySelector('.form-actions');
    const holder=document.createElement('div');holder.className='full';holder.innerHTML=evidenceMarkup();
    if(observation)observation.before(holder.firstElementChild);else form.appendChild(holder.firstElementChild);
    if(form.elements.KILOMETRAJE){const km=form.elements.KILOMETRAJE;km.required=false;km.readOnly=true;km.setAttribute('readonly','readonly');km.inputMode='none';km.tabIndex=-1;km.placeholder='Se carga automáticamente desde la foto del odómetro';km.title='Kilometraje validado por NEXO IA desde la fotografía del odómetro';}
    form.querySelectorAll('[data-checkin-control] input[type="radio"],[data-checkin-item],input[name="CONFIRMACION_CONDUCTOR"]').forEach(control=>{control.required=false;});
    bindControlModals(form);
    form.querySelectorAll('[data-ia-photo]').forEach(input=>input.addEventListener('change',()=>{const file=input.files?.[0],name=form.querySelector(`[data-ia-file-name="${input.dataset.iaPhoto}"]`);if(name)name.textContent=file?file.name:'Sin fotografía';form.dataset.iaReady='';form.elements.SESION_IA_ID.value='';if(String(input.dataset.iaPhoto||'').toUpperCase()==='TABLERO'){const kmConfirm=form.querySelector('[data-ia-km-confirm]'),kmWrap=form.querySelector('[data-ia-km-confirm-wrap]'),kmValue=form.querySelector('[data-ia-km-confirm-value]');if(kmConfirm){kmConfirm.checked=false;kmConfirm.disabled=true;}if(kmValue)kmValue.value='';if(kmWrap)kmWrap.hidden=true;}syncPhotoSequence(form);}));
    syncPhotoSequence(form);
    form.querySelector('[data-ia-dictate]')?.addEventListener('click',event=>dictate(form.querySelector('[data-ia-note]'),event.currentTarget));
    const bulk=form.querySelector('[data-checkin-mark-all-ok]');
    const syncBulk=()=>{
      if(!bulk)return;
      const rows=controls(form);
      const allOk=rows.length>=18&&rows.every(item=>String(item.respuesta||'').toUpperCase()==='OK');
      bulk.checked=allOk;
    };
    bulk?.addEventListener('change',()=>{
      if(!bulk.checked)return;
      let marked=0;
      form.querySelectorAll('[data-checkin-control]').forEach(card=>{
        const radios=[...card.querySelectorAll('input[type="radio"]')];
        const ok=radios.find(input=>String(input.value).toUpperCase()==='OK');
        if(ok&&!ok.checked){ok.checked=true;ok.dispatchEvent(new Event('change',{bubbles:true}));marked++;}
      });
      form.querySelectorAll('[data-checkin-item]').forEach(select=>{
        if(String(select.value||'').toUpperCase()==='OK')return;
        select.value='OK';select.dispatchEvent(new Event('change',{bubbles:true}));marked++;
      });
      syncBulk();
      toast('Revisión rápida',`Los 18 puntos quedaron marcados como Conforme${marked?` · ${marked} cambio(s) aplicado(s)`:''}. Revise la evidencia y cambie individualmente cualquier excepción antes de confirmar.`,'success');
    });
    form.addEventListener('change',event=>{
      const target=event.target;
      if(target===bulk)return;
      if(target?.matches?.('[data-checkin-control] input[type="radio"],[data-checkin-item]')){syncBulk();syncControlTile(target.closest?.('[data-checkin-control]'));}
    });
    form.addEventListener('input',event=>{if(event.target?.matches?.('[data-checkin-note]'))syncControlTile(event.target.closest?.('[data-checkin-control]'));});
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
    const bulk=form.querySelector('[data-checkin-mark-all-ok]');if(bulk){bulk.disabled=false;bulk.title='Marca los 18 controles como Conforme de una vez; después puede cambiar cualquier excepción individual.';}
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
        setProcessProgress(form,5,'Preparando Check-in','Preparando 4 fotos exteriores en orden libre y reservando la foto 5 para el odómetro en alta resolución.');
        photos=await uploadEvidence(form,photos);
        setProcessProgress(form,38,'Leyendo odómetro','NEXO busca el contador ODO/TOTAL y acepta una lectura visible y coherente sin exigir una foto perfecta.');
        setStatus(form,'working','NEXO IA está revisando','Leyendo odómetro, combustible, testigos y únicamente los controles realmente visibles…');
        analysis=await api('analizarChecklistIaBorrador',{VEHICULO_ID:form.elements.VEHICULO_ID?.value||'',CONDUCTOR_ID:form.elements.CONDUCTOR_ID?.value||'',NOTA_CONDUCTOR:form.querySelector('[data-ia-note]')?.value||'',LISTA_CODIFICADA:JSON.stringify(controls(form)),EVIDENCIAS:photos});
        setProcessProgress(form,70,'Análisis NEXO completado','Aplicando prellenado visual y preparando la revisión humana.');
        sessionId=analysis.SESION_IA_ID||'';if(!sessionId)throw new Error('El servidor no confirmó la sesión de análisis.');
        resultSummary(form,analysis);
        if(analysis.KILOMETRAJE_REQUIERE_NUEVA_FOTO===true||analysis.KILOMETRAJE_VALIDADO!==true){
          const conservadas=(analysis.FOTOS_VEHICULO||photos).filter(item=>String(item?.tipoEvidencia||item?.TIPO_EVIDENCIA||'').toUpperCase()!=='TABLERO');
          form.elements.FOTOS_VEHICULO.value=JSON.stringify(conservadas);form.elements.SESION_IA_ID.value='';form.dataset.iaReady='';syncPhotoSequence(form);
          const tablero=form.querySelector('[data-ia-photo="TABLERO"]');if(tablero){tablero.value='';const name=form.querySelector('[data-ia-file-name="TABLERO"]');if(name)name.textContent='Repita solo esta foto · odómetro/tablero';tablero.closest('.checklist-ia-photo')?.scrollIntoView({behavior:'smooth',block:'center'});}
          setProcessProgress(form,55,'Odómetro pendiente','Las otras cuatro fotografías ya quedaron subidas y se reutilizarán.');
          const intentos=Number(analysis.KILOMETRAJE_INTENTOS_IA||1);
          throw new Error(`NEXO realizó ${intentos} lectura(s) automáticas pero no pudo validar el odómetro (${analysis.KILOMETRAJE_MOTIVO||'lectura insuficiente'}). Repita únicamente tablero/odómetro; las otras cuatro evidencias no se volverán a subir.`);
        }
        form.elements.SESION_IA_ID.value=sessionId;form.elements.FOTOS_VEHICULO.value=JSON.stringify(analysis.FOTOS_VEHICULO||photos);form.elements.IA_RESULTADO_CODIFICADO.value=JSON.stringify(analysis.resultado||{});form.elements.IA_TRANSCRIPCION.value=analysis.TRANSCRIPCION||'';
        const km=Number(analysis.KILOMETRAJE_SUGERIDO||0);if(!(km>0))throw new Error('NEXO IA no obtuvo un kilometraje válido desde la foto del odómetro.');if(form.elements.KILOMETRAJE)form.elements.KILOMETRAJE.value=String(km);const kmConfirm=form.querySelector('[data-ia-km-confirm]'),kmWrap=form.querySelector('[data-ia-km-confirm-wrap]'),kmText=form.querySelector('[data-ia-km-confirm-text]'),kmValue=form.querySelector('[data-ia-km-confirm-value]');if(kmValue)kmValue.value=String(km);if(kmText)kmText.textContent=`NEXO detectó ${Math.round(km).toLocaleString('es-CL')} km. Confirmo que este número coincide con la fotografía del odómetro.`;if(kmConfirm){kmConfirm.checked=false;kmConfirm.disabled=false;}if(kmWrap){kmWrap.hidden=false;kmWrap.scrollIntoView({behavior:'smooth',block:'center'});}
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
      const kmValue=Number(form.elements.KILOMETRAJE?.value||0);if(!(kmValue>0))throw new Error('El kilometraje debe validarse automáticamente desde la fotografía del odómetro.');const kmConfirm=form.querySelector('[data-ia-km-confirm]');if(!kmConfirm||!kmConfirm.checked)throw new Error(`Confirme el kilometraje detectado (${Math.round(kmValue).toLocaleString('es-CL')} km) comparándolo con la fotografía del odómetro antes de guardar.`);const kmConfirmedValue=form.querySelector('[data-ia-km-confirm-value]');if(kmConfirmedValue)kmConfirmedValue.value=String(kmValue);
      setProcessProgress(form,88,'Guardando Check-in',`KM ${Math.round(kmValue).toLocaleString('es-CL')} confirmado por el usuario · revisión humana 18/18 completa · guardando en la base central…`);
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
