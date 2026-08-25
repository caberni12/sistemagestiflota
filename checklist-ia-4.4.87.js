/* E-fleet Web 4.4.87 · NEXO IA Multimodal · R8.2.155 */
(() => {
  'use strict';
  const VERSION='4.4.87';
  const SESSION_KEY='sistema_gestion_flotas_sesion_v3';
  const CONNECTION_KEY='sistema_gestion_flotas_conexion_empresa_v1';
  const PHOTO_TYPES=[
    ['FRONTAL','Frontal','Fotografíe el vehículo de frente'],
    ['TRASERA','Trasera','Fotografíe completamente la parte trasera'],
    ['LATERAL_IZQUIERDO','Lateral izquierdo','Incluya puertas, ruedas y carrocería'],
    ['LATERAL_DERECHO','Lateral derecho','Incluya puertas, ruedas y carrocería'],
    ['TABLERO','Odómetro / tablero encendido','Enfoque claramente el kilometraje y las luces de advertencia. El KM se carga solo desde esta foto']
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
    const max=type==='TABLERO'?1920:1600,scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const quality=type==='TABLERO'?0.88:0.80,dataUrl=canvas.toDataURL('image/jpeg',quality),bytes=Math.round((dataUrl.length-dataUrl.indexOf(',')-1)*0.75);
    if(bytes<18000)throw new Error(`La fotografía ${type.toLowerCase()} parece vacía, oscura o demasiado comprimida.`);
    return{dataUrl,width:canvas.width,height:canvas.height,bytes};
  }
  function evidenceMarkup(){return `<section class="checklist-ia-card full" data-checklist-ia-card>
    <header><div><span class="eyebrow">CHECKLIST INTELIGENTE SIN GPS</span><h3>Inspección visual guiada</h3><p>NEXO IA leerá el odómetro, comparará evidencias y prellenará automáticamente los controles desde las fotos y el relato del conductor. El kilometraje no se escribe manualmente; el usuario solo revisa y confirma.</p></div><span class="checklist-ia-badge">IA asistida</span></header>
    <div class="checklist-ia-grid">${PHOTO_TYPES.map(([type,label,help])=>`<label class="checklist-ia-photo"><span>${escapeHtml(label)} *</span><input type="file" accept="image/*" capture="environment" data-ia-photo="${type}" required><small>${escapeHtml(help)}</small><b data-ia-file-name="${type}">Sin fotografía</b></label>`).join('')}</div>
    <label class="field full checklist-ia-note"><span>Nota del conductor por voz o texto</span><textarea name="NOTA_IA_CONDUCTOR" data-ia-note placeholder="Ej. El freno suena raro al pisarlo a fondo"></textarea><button class="btn soft" type="button" data-ia-dictate>🎙 Dictar observación</button><small>La IA clasifica la observación, pero no reemplaza el diagnóstico del taller.</small></label>
    <input type="hidden" name="SESION_IA_ID"><input type="hidden" name="FOTOS_VEHICULO"><input type="hidden" name="IA_RESULTADO_CODIFICADO"><input type="hidden" name="IA_TRANSCRIPCION">
    <div class="checklist-ia-status full" data-ia-status><i>○</i><div><b>Esperando evidencias</b><span>Se requieren cuatro vistas exteriores y una fotografía del tablero.</span></div></div>
  </section>`;}
  function enhance(form){
    if(!form||form.dataset.checklistIaEnhanced==='1')return;
    form.dataset.checklistIaEnhanced='1';
    const observation=form.querySelector('textarea[name="OBSERVACIONES"]')?.closest('label')||form.querySelector('.form-actions');
    const holder=document.createElement('div');holder.className='full';holder.innerHTML=evidenceMarkup();
    if(observation)observation.before(holder.firstElementChild);else form.appendChild(holder.firstElementChild);
    if(form.elements.KILOMETRAJE){const km=form.elements.KILOMETRAJE;km.required=false;km.readOnly=true;km.setAttribute('readonly','readonly');km.inputMode='none';km.tabIndex=-1;km.placeholder='Se carga automáticamente desde la foto del odómetro';km.title='Kilometraje validado por NEXO IA desde la fotografía del odómetro';}
    form.querySelectorAll('[data-checkin-control] input[type="radio"],[data-checkin-item]').forEach(control=>control.required=false);
    form.querySelectorAll('[data-ia-photo]').forEach(input=>input.addEventListener('change',()=>{const file=input.files?.[0],name=form.querySelector(`[data-ia-file-name="${input.dataset.iaPhoto}"]`);if(name)name.textContent=file?file.name:'Sin fotografía';form.dataset.iaReady='';form.elements.SESION_IA_ID.value='';}));
    form.querySelector('[data-ia-dictate]')?.addEventListener('click',event=>dictate(form.querySelector('[data-ia-note]'),event.currentTarget));
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
  function controls(form){
    const rows=[];
    form.querySelectorAll('[data-checkin-control]').forEach(card=>{const id=card.dataset.checkinControl,radio=card.querySelector(`input[name="checkin_${id}"]:checked`),note=card.querySelector('[data-checkin-note]');rows.push({id,respuesta:radio?.value||'',observacion:note?.value||'',critico:card.classList.contains('critical')||/crítico/i.test(card.textContent||'')});});
    form.querySelectorAll('[data-checkin-item]').forEach(select=>{rows.push({id:select.dataset.checkinItem,respuesta:select.value||'',observacion:form.querySelector(`[data-checkin-note="${select.dataset.checkinItem}"]`)?.value||'',critico:/crítico/i.test(select.closest('.checkin-item')?.textContent||'')});});
    return rows;
  }
  async function uploadEvidence(form){
    const result=[];
    for(let i=0;i<PHOTO_TYPES.length;i++){
      const [type,label]=PHOTO_TYPES[i],input=form.querySelector(`[data-ia-photo="${type}"]`),file=input?.files?.[0];
      if(!file)throw new Error(`Falta la fotografía: ${label}.`);
      setStatus(form,'working',`Preparando ${label}`,`${i+1} de ${PHOTO_TYPES.length} evidencias`);
      const image=await compressImage(file,type),name=`${String(type).toLowerCase()}-${Date.now()}-${i+1}.jpg`;
      const uploaded=await api('subirArchivoDrive',{DESTINO:'CHECKIN_IA',NOMBRE_ARCHIVO:name,TIPO_MIME:'image/jpeg',ARCHIVO_BASE64:image.dataUrl,CONTEXTO:`Checklist IA · ${type}`});
      result.push({url:uploaded.url||uploaded.direccionArchivo||'',bucket:uploaded.bucket||'flotas-checkin',archivoId:uploaded.path||'',path:uploaded.path||'',nombre:uploaded.nombre||name,tipoMime:'image/jpeg',tipoEvidencia:type,tamanoBytes:uploaded.tamanoBytes||image.bytes,calidadEstado:'ACEPTADA',calidadDetalle:`${image.width}x${image.height}`});
    }
    return result;
  }
  function applyAutomaticControls(form,data){
    const list=Array.isArray(data?.LISTA_AUTOMATICA)?data.LISTA_AUTOMATICA:(Array.isArray(data?.resultado?.controles_checkin)?data.resultado.controles_checkin:[]);
    for(const item of list){
      const id=String(item?.id||item?.ID||'').trim();if(!id)continue;const response=String(item?.respuesta||item?.RESPUESTA||'OK').toUpperCase();
      const radio=form.querySelector(`input[name="checkin_${CSS.escape(id)}"][value="${response==='FALLA'?'FALLA':response==='NA'?'NA':'OK'}"]`);
      if(radio){radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));}
      const select=form.querySelector(`[data-checkin-item="${CSS.escape(id)}"]`);if(select){select.value=response==='FALLA'?'FALLA':'OK';select.dispatchEvent(new Event('change',{bubbles:true}));}
      const note=form.querySelector(`[data-checkin-note="${CSS.escape(id)}"]`);if(note&&String(item?.observacion||item?.OBSERVACION||'').trim()){note.value=String(item.observacion||item.OBSERVACION).trim();note.dispatchEvent(new Event('input',{bubbles:true}));}
    }
    form.dataset.iaControlsFilled='1';
    return list;
  }
  function resultSummary(form,data){
    const r=data.resultado||{},sev=String(r.severidad||'BAJA').toUpperCase(),prediction=data.PREDICCION_MANTENIMIENTO||{};
    const km=Number(data.KILOMETRAJE_SUGERIDO||0),confidence=Math.round(Number(r.kilometraje_confianza||0)*100),days=prediction.DIAS_ESTIMADOS;
    const kmDia=Number(prediction.PROMEDIO_KM_DIA_USADO||0),predConfidence=Math.round(Number(prediction.CONFIANZA_PREDICCION||0)*100),trend=String(prediction.TENDENCIA_USO||'ESTABLE'),predLevel=String(prediction.NIVEL||'NORMAL'),predDate=String(prediction.FECHA_ESTIMADA||'');
    const testigos=Array.isArray(data.TESTIGOS_DETECTADOS)?data.TESTIGOS_DETECTADOS:(Array.isArray(r.testigos)?r.testigos:[]);
    const danos=Array.isArray(data.DANOS_DETECTADOS)?data.DANOS_DETECTADOS:(Array.isArray(r.danos)?r.danos:[]);
    const combustible=String(data.NIVEL_COMBUSTIBLE||r?.nivel_combustible?.estado||'').trim();
    const extras=`${combustible?` Combustible: ${combustible}.`:''}${testigos.length?` Testigos/anomalías: ${testigos.length}.`:''}${danos.length?` Daños visibles: ${danos.length}.`:''}`;
    const forecast=days!=null?` Predicción mantención: ${predLevel}, ${days} día(s)${predDate?` · ${predDate}`:''}${kmDia>0?` · ${kmDia.toFixed(1)} km/día`:''} · tendencia ${trend}${predConfidence?` · confianza ${predConfidence}%`:''}.`:'';
    setStatus(form,sev==='CRITICA'?'error':sev==='ALTA'?'warning':'ok',`Análisis ${sev.toLowerCase()} · ${data.MODO_ANALISIS||'IA'}`,`${r.resumen||'Análisis completado.'}${km?` Kilometraje validado: ${km.toLocaleString('es-CL')} km (${confidence}% confianza).`:''}${extras}${forecast}`);
  }
  async function process(form,submitter){
    const original=submitter?.textContent||'Guardar y evaluar check-in';if(submitter){submitter.disabled=true;submitter.textContent='Analizando fotografías…';}
    try{
      let sessionId=form.elements.SESION_IA_ID?.value||'',photos=safeJson(form.elements.FOTOS_VEHICULO?.value||'',[]),analysis=null;
      if(!sessionId){
        photos=await uploadEvidence(form);
        setStatus(form,'working','NEXO IA está revisando','Leyendo el odómetro desde la foto, comparando evidencias y clasificando la observación…');
        analysis=await api('analizarChecklistIaBorrador',{VEHICULO_ID:form.elements.VEHICULO_ID?.value||'',CONDUCTOR_ID:form.elements.CONDUCTOR_ID?.value||'',NOTA_CONDUCTOR:form.querySelector('[data-ia-note]')?.value||'',LISTA_CODIFICADA:JSON.stringify(controls(form)),EVIDENCIAS:photos});
        sessionId=analysis.SESION_IA_ID||'';if(!sessionId)throw new Error('El servidor no confirmó la sesión de análisis.');
        form.elements.SESION_IA_ID.value=sessionId;form.elements.FOTOS_VEHICULO.value=JSON.stringify(analysis.FOTOS_VEHICULO||photos);form.elements.IA_RESULTADO_CODIFICADO.value=JSON.stringify(analysis.resultado||{});form.elements.IA_TRANSCRIPCION.value=analysis.TRANSCRIPCION||'';
        resultSummary(form,analysis);
        if(analysis.KILOMETRAJE_REQUIERE_NUEVA_FOTO===true||analysis.KILOMETRAJE_VALIDADO!==true){
          const tablero=form.querySelector('[data-ia-photo="TABLERO"]');if(tablero){tablero.value='';const name=form.querySelector('[data-ia-file-name="TABLERO"]');if(name)name.textContent='Repita la foto del odómetro';}
          form.elements.SESION_IA_ID.value='';form.elements.FOTOS_VEHICULO.value='';form.dataset.iaReady='';
          throw new Error(`No fue posible validar el odómetro (${analysis.KILOMETRAJE_MOTIVO||'lectura insuficiente'}). Tome nuevamente la foto del tablero. El KM no se puede escribir manualmente.`);
        }
        const km=Number(analysis.KILOMETRAJE_SUGERIDO||0);if(!(km>0))throw new Error('NEXO IA no obtuvo un kilometraje válido desde la foto del odómetro.');if(form.elements.KILOMETRAJE)form.elements.KILOMETRAJE.value=String(km);
        const combustible=String(analysis.NIVEL_COMBUSTIBLE||analysis?.resultado?.nivel_combustible?.estado||'No determinado por IA').trim();if(form.elements.NIVEL_COMBUSTIBLE)form.elements.NIVEL_COMBUSTIBLE.value=combustible;
        const automatic=applyAutomaticControls(form,analysis);if(!automatic.length)throw new Error('NEXO IA no devolvió el checklist automático. Repita el análisis.');
      }
      const kmValue=Number(form.elements.KILOMETRAJE?.value||0);if(!(kmValue>0))throw new Error('El kilometraje debe validarse con una nueva fotografía del odómetro.');
      form.dataset.iaReady='1';
      toast('Checklist IA completado',`Odómetro validado: ${kmValue.toLocaleString('es-CL')} km. NEXO prellenó los controles desde fotos/voz; solo revise y confirme.`);
      form.requestSubmit(submitter||undefined);
    }catch(error){setStatus(form,'error','No se completó el análisis',String(error?.message||error));toast('Checklist IA',String(error?.message||error),'error');}
    finally{if(submitter){submitter.disabled=false;submitter.textContent=original;}}
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
  window.EFleetChecklistIA={version:VERSION,enhance,api};
})();
