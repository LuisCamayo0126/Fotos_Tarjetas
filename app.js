// Prototipo: cargar foto y superponer texto + footer, luego exportar
(function(){
  // carga inicial: persistencia en localStorage
  const LS_PHRASES = 'gp_phrases_v1';
  const LS_FOOTER = 'gp_footer_v1';

  const defaultPhrases = [
    'Siempre en nuestra memoria',
    'Con honor y respeto',
    'En recuerdo eterno'
  ];

  const phraseSelect = document.getElementById('phraseSelect');
  const addPhraseBtn = document.getElementById('addPhraseBtn');
  const phraseList = document.getElementById('phraseList');
  const newPhraseInput = document.getElementById('newPhraseInput');
  const pickFileBtn = document.getElementById('pickFileBtn');
  const dragArea = document.getElementById('dragArea');
  const photoInput = document.getElementById('photoInput');
  const fileNameEl = document.getElementById('fileName');
  const templateInput = document.getElementById('templateInput');
  const nameInput = document.getElementById('nameInput');
  const name2Input = document.getElementById('name2Input');
  const dateInput = document.getElementById('dateInput');
  const rankInput = document.getElementById('rankInput');
  const commanderInput = document.getElementById('commanderInput');
  const battalionInput = document.getElementById('battalionInput');
  const downloadBtn = document.getElementById('downloadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const footerInput = document.getElementById('footerInput');
  const editOverlayToggle = document.getElementById('editOverlayToggle');
  const overlayX = document.getElementById('overlayX');
  const overlayY = document.getElementById('overlayY');
  const overlayW = document.getElementById('overlayW');
  const overlayH = document.getElementById('overlayH');
  const saveOverlayBtn = document.getElementById('saveOverlayBtn');
  const resetOverlayBtn = document.getElementById('resetOverlayBtn');
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const editFieldsToggle = document.getElementById('editFieldsToggle');
  const fieldSelect = document.getElementById('fieldSelect');
  const fieldX = document.getElementById('fieldX');
  const fieldY = document.getElementById('fieldY');
  const fieldSize = document.getElementById('fieldSize');
  const fieldSizeRange = document.getElementById('fieldSizeRange');
  const saveFieldBtn = document.getElementById('saveFieldBtn');
  const resetFieldBtn = document.getElementById('resetFieldBtn');

  let img = null;
  let phrases = [];
  let templateImg = null; // background template image
  // overlay ratios (relative to template size). Defaults approximate the original hardcoded values.
  let overlayRatios = { x: 0.60, y: 0.30, w: 0.34, h: 0.56 };
  let overlayEditEnabled = false;
  // dragging state for interactive edit
  let _dragState = { active: false, mode: null, startX:0, startY:0, orig: null };
  // field editing state
  let fieldsConfig = {
    phrase: { x: 0.5, y: 0.08, sizeRatio: 1/54 },
    feliz: { x: 0.12, y: 0.30, sizeRatio: 1/14 },
    day: { x: 0.12, y: 0.60, sizeRatio: 1/6 },
    month: { x: 0.12, y: 0.68, sizeRatio: 1/28 },
    name1: { x: 0.58, y: 0.16, sizeRatio: 1/26 },
    name2: { x: 0.58, y: 0.205, sizeRatio: 1/36 },
    rank: { x: 0.5, y: 0.92, sizeRatio: 1/48 },
    commander: { x: 0.5, y: 0.94, sizeRatio: 1/64 },
    battalion: { x: 0.5, y: 0.96, sizeRatio: 1/80 },
    footer: { x: 0.5, y: 0.98, sizeRatio: 1/60 }
  };
  let editFieldsEnabled = false;
  let elementBounds = {}; // runtime computed bounds for each text element on canvas
  let selectedField = null;

  function loadState(){
    try{
      const p = JSON.parse(localStorage.getItem(LS_PHRASES) || 'null');
      phrases = Array.isArray(p) && p.length ? p : defaultPhrases.slice();
    }catch(e){ phrases = defaultPhrases.slice(); }
    const footer = localStorage.getItem(LS_FOOTER) || 'Pie de foto - Organización';
    if(footerInput) footerInput.value = footer;
    // load template if stored
    const tpl = localStorage.getItem('gp_template_v1');
    if(tpl){
      const t = new Image();
      t.onload = ()=>{ templateImg = t; drawPreview(); };
      t.src = tpl;
    }
    // load overlay ratios if present
    try{
      const ov = JSON.parse(localStorage.getItem('gp_overlay_v1') || 'null');
      if(ov && typeof ov === 'object') overlayRatios = Object.assign(overlayRatios, ov);
    }catch(e){ /* ignore */ }
    // load fields config
    try{
      const f = JSON.parse(localStorage.getItem('gp_fields_v1') || 'null');
      if(f && typeof f === 'object') fieldsConfig = Object.assign(fieldsConfig, f);
    }catch(e){ /* ignore */ }
  }

  function savePhrases(){ localStorage.setItem(LS_PHRASES, JSON.stringify(phrases)); }
  function saveFooter(){ if(footerInput) localStorage.setItem(LS_FOOTER, footerInput.value || ''); }
  function saveOverlay(){ try{ localStorage.setItem('gp_overlay_v1', JSON.stringify(overlayRatios)); }catch(e){ console.warn('Could not persist overlay', e); } }
  function saveFields(){ try{ localStorage.setItem('gp_fields_v1', JSON.stringify(fieldsConfig)); }catch(e){ console.warn('Could not persist fields', e); } }

  function populatePhrases(){
    phraseSelect.innerHTML = '';
    phraseList.innerHTML = '';
    phrases.forEach((p, i)=>{
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      phraseSelect.appendChild(opt);

      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = p;
      span.style.cursor = 'pointer';
      span.addEventListener('click', ()=>{
        phraseSelect.value = p;
        drawPreview();
      });
      const del = document.createElement('button');
      del.textContent = 'Eliminar';
      del.title = 'Eliminar frase';
      del.addEventListener('click', ()=>{
        phrases.splice(i,1);
        savePhrases();
        populatePhrases();
        drawPreview();
      });
      li.appendChild(span);
      li.appendChild(del);
      phraseList.appendChild(li);
    });
  }

  function addPhrase(){
    const text = (newPhraseInput && newPhraseInput.value) ? newPhraseInput.value.trim() : '';
    if(!text){
      // give quick inline feedback
      if(newPhraseInput){ newPhraseInput.focus(); }
      return;
    }
    phrases.unshift(text);
    savePhrases();
    populatePhrases();
    phraseSelect.value = text;
    if(newPhraseInput) newPhraseInput.value = '';
    drawPreview();
  }

  function handleFile(e){
    const file = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || (e.target.files && e.target.files[0]);
    if(!file) return;
    fileNameEl.textContent = file.name;
    const reader = new FileReader();
    reader.onload = function(ev){
      const data = ev.target.result;
      const image = new Image();
      image.onload = function(){
        img = image;
        drawPreview();
      };
      image.src = data;
    };
    reader.readAsDataURL(file);
  }

  // handle template upload
  function handleTemplateFile(e){
    const file = (e.target && e.target.files && e.target.files[0]);
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      const data = ev.target.result;
      const image = new Image();
      image.onload = function(){
        templateImg = image;
        // persist template in localStorage as dataURL
        try{ localStorage.setItem('gp_template_v1', data); }catch(e){}
        drawPreview();
      };
      image.src = data;
    };
    reader.readAsDataURL(file);
  }

  function clearAll(){
    img = null;
    photoInput.value = '';
    fileNameEl.textContent = '';
    nameInput.value = '';
    dateInput.value = '';
    phraseSelect.selectedIndex = 0;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawPlaceholder();
  }

  function drawPlaceholder(){
    canvas.width = 800; canvas.height = 450;
    ctx.fillStyle = '#222';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#999';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Sube una foto para ver la previsualización', canvas.width/2, canvas.height/2);
  }

  // Overlay helpers: update numeric inputs from current ratios
  function updateOverlayInputs(){
    if(!overlayX || !overlayY || !overlayW || !overlayH) return;
    overlayX.value = (overlayRatios.x * 100).toFixed(2);
    overlayY.value = (overlayRatios.y * 100).toFixed(2);
    overlayW.value = (overlayRatios.w * 100).toFixed(2);
    overlayH.value = (overlayRatios.h * 100).toFixed(2);
  }

  function applyOverlayInputs(){
    try{
      const x = parseFloat(overlayX.value)/100;
      const y = parseFloat(overlayY.value)/100;
      const w = parseFloat(overlayW.value)/100;
      const h = parseFloat(overlayH.value)/100;
      if(isFinite(x) && isFinite(y) && isFinite(w) && isFinite(h)){
        overlayRatios = { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), w: Math.max(0.01, Math.min(1, w)), h: Math.max(0.01, Math.min(1, h)) };
      }
    }catch(e){ /* ignore */ }
  }

  // helper: rounded rectangle (simple fill/stroke)
  function roundRect(ctx, x, y, width, height, radius, fillColor, strokeAlpha){
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if(fillColor){ ctx.fillStyle = fillColor; ctx.fill(); }
    if(strokeAlpha){ ctx.strokeStyle = `rgba(0,0,0,${strokeAlpha})`; ctx.stroke(); }
  }

  // helper: draw text with stroke + fill for contrast
  function drawStyledText(text, x, y, fontSize=36, align='center'){
    ctx.save();
    ctx.font = `${fontSize}px "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.lineWidth = Math.max(2, Math.round(fontSize/12));
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.fillStyle = 'white';
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawPreview(){
    // Render the card preview using either the loaded template (preferred) or the user's image as background.
    const footerText = (footerInput && footerInput.value) ? footerInput.value : 'Pie de foto - Organización';
    saveFooter();
    try{
      console.debug('drawPreview start', { templateLoaded: !!templateImg, imgLoaded: !!img });

      if(templateImg){
        // Template mode: draw the full card from the template and overlay the user's photo into the portrait box.
        const maxWidthTpl = 1400;
        const scaleTpl = Math.min(1, maxWidthTpl / templateImg.width);
        const cw = Math.round(templateImg.width * scaleTpl);
        const ch = Math.round(templateImg.height * scaleTpl);
        canvas.width = cw;
        canvas.height = ch;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(templateImg, 0, 0, cw, ch);

        // if no user image, keep template visible and return
        if(!img){
          // show small hint on canvas so the user notices template is loaded
          drawStyledText('Plantilla cargada — añade una foto para ver la carta completa', Math.round(cw/2), Math.round(ch*0.54), Math.max(12, Math.round(cw/64)), 'center');
          return;
        }

        // compute overlay from stored ratios
        const overlay = {
          x: Math.round(cw * overlayRatios.x),
          y: Math.round(ch * overlayRatios.y),
          w: Math.round(cw * overlayRatios.w),
          h: Math.round(ch * overlayRatios.h)
        };

        // fit user image into overlay box preserving aspect ratio
        const arImg = img.width / img.height;
        const arBox = overlay.w / overlay.h;
        let drawW = overlay.w, drawH = overlay.h, drawX = overlay.x, drawY = overlay.y;
        if(arImg > arBox){
          drawW = overlay.w;
          drawH = Math.round(drawW / arImg);
          drawY = overlay.y + Math.round((overlay.h - drawH)/2);
        } else {
          drawH = overlay.h;
          drawW = Math.round(drawH * arImg);
          drawX = overlay.x + Math.round((overlay.w - drawW)/2);
        }

        // draw white border behind person for contrast
        ctx.save();
        const radius = 8;
        roundRect(ctx, overlay.x-6, overlay.y-6, overlay.w+12, overlay.h+12, radius+4, '#ffffff', 0.0);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // if editing overlay, draw outline + handles
        try{
          if(overlayEditEnabled){
            // translucent fill
            ctx.save();
            ctx.strokeStyle = 'rgba(255,0,0,0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6,4]);
            ctx.strokeRect(overlay.x, overlay.y, overlay.w, overlay.h);
            ctx.setLineDash([]);
            // draw corner handles
            const hs = 10;
            const handles = [
              {x:overlay.x, y:overlay.y},
              {x:overlay.x+overlay.w, y:overlay.y},
              {x:overlay.x+overlay.w, y:overlay.y+overlay.h},
              {x:overlay.x, y:overlay.y+overlay.h}
            ];
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            handles.forEach(h=>{ ctx.fillRect(h.x - hs/2, h.y - hs/2, hs, hs); ctx.strokeRect(h.x - hs/2, h.y - hs/2, hs, hs); });
            ctx.restore();
          }
        }catch(e){ /* ignore overlay draw errors */ }

        // Draw phrase using editable fieldsConfig
        elementBounds = {};
        const phrase = (phraseSelect.value || '').trim();
        if(phrase){
          const cfg = fieldsConfig.phrase || { x:0.5,y:0.08,sizeRatio:1/54 };
          let fSize = Math.max(12, Math.round(cw * cfg.sizeRatio));
          function measureW(t, s){ ctx.font = `${s}px "Segoe UI", Roboto, Arial, sans-serif`; return ctx.measureText(t).width; }
          function wrapParagraph(text, size, maxWidth){
            const words = text.split(/\s+/);
            const lines = [];
            let line = '';
            for(const w of words){
              const test = line ? (line + ' ' + w) : w;
              if(measureW(test, size) <= maxWidth) line = test;
              else { if(line) lines.push(line); line = w; }
            }
            if(line) lines.push(line);
            return lines;
          }
          const maxW = Math.round(cw * 0.84);
          let lines = wrapParagraph(phrase, fSize, maxW);
          while(lines.length > 4 && fSize > 10){ fSize -= 2; lines = wrapParagraph(phrase, fSize, maxW); }
          const centerX = Math.round(cw * cfg.x);
          const startY = Math.round(ch * cfg.y);
          let totalH = lines.length * Math.round(fSize * 1.25);
          for(let i=0;i<lines.length;i++){
            const y = startY + i * Math.round(fSize * 1.25);
            drawStyledText(lines[i], centerX, y, fSize, 'center');
          }
          // bounding box approx
          const widest = Math.max(...lines.map(l=>measureW(l, fSize)));
          elementBounds['phrase'] = { x: centerX - Math.round(widest/2), y: startY - Math.round(fSize), w: Math.round(widest), h: totalH };
        }

        // FELIZ block
        const cfgF = fieldsConfig.feliz || { x:0.12,y:0.30,sizeRatio:1/14 };
        const leftX = Math.round(cw * cfgF.x);
        const fsizeF = Math.max(10, Math.round(cw * cfgF.sizeRatio));
        drawStyledText('FELIZ', leftX, Math.round(ch * cfgF.y), fsizeF, 'left');
        drawStyledText('CUMPLEAÑOS', leftX, Math.round(ch * (cfgF.y + 0.06)), fsizeF, 'left');
        elementBounds['feliz'] = { x: leftX, y: Math.round(ch * (cfgF.y - fsizeF/ (ch||1))), w: Math.round(cw*0.25), h: Math.round(fsizeF*2.4) };

        // date: big day number
        let day = '';
        let month = '';
        if(dateInput.value){
          const d = new Date(dateInput.value);
          day = String(d.getDate());
          month = d.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        }
        if(day){
          const cfgDay = fieldsConfig.day || { x:0.12,y:0.60,sizeRatio:1/6 };
          const fDay = Math.max(10, Math.round(cw * cfgDay.sizeRatio));
          const px = Math.round(cw * cfgDay.x);
          drawStyledText(day, px, Math.round(ch * cfgDay.y), fDay, 'left');
          const cfgMon = fieldsConfig.month || { x:cfgDay.x, y:cfgDay.y+0.08, sizeRatio:1/28 };
          const fMon = Math.max(8, Math.round(cw * cfgMon.sizeRatio));
          drawStyledText(month, Math.round(cw * cfgMon.x), Math.round(ch * cfgMon.y), fMon, 'left');
          elementBounds['day'] = { x: px, y: Math.round(ch * (cfgDay.y - fDay/(ch||1))), w: Math.round(cw*0.18), h: Math.round(fDay*1.5) };
        }

        // name lines (above person)
        const nameLine1 = (nameInput.value || '').trim();
        const nameLine2 = (name2Input && name2Input.value) ? name2Input.value.trim() : '';
        if(nameLine1){ const cfgN1 = fieldsConfig.name1 || {x:0.58,y:0.16,sizeRatio:1/26}; const fsn1 = Math.max(10, Math.round(cw*cfgN1.sizeRatio)); drawStyledText(nameLine1.toUpperCase(), Math.round(cw*cfgN1.x), Math.round(ch*cfgN1.y), fsn1, 'center'); elementBounds['name1']={x:Math.round(cw*cfgN1.x)-Math.round(cw*0.25), y:Math.round(ch*cfgN1.y)-fsn1, w:Math.round(cw*0.5), h:fsn1}; }
        if(nameLine2){ const cfgN2 = fieldsConfig.name2 || {x:0.58,y:0.205,sizeRatio:1/36}; const fsn2 = Math.max(8, Math.round(cw*cfgN2.sizeRatio)); drawStyledText(nameLine2.toUpperCase(), Math.round(cw*cfgN2.x), Math.round(ch*cfgN2.y), fsn2, 'center'); elementBounds['name2']={x:Math.round(cw*cfgN2.x)-Math.round(cw*0.25), y:Math.round(ch*cfgN2.y)-fsn2, w:Math.round(cw*0.5), h:fsn2}; }

        // footer area at bottom: rank, commander, battalion
        const rankText = (rankInput && rankInput.value) ? rankInput.value.trim() : '';
        const commanderText = (commanderInput && commanderInput.value) ? commanderInput.value.trim() : '';
        const battalionText = (battalionInput && battalionInput.value) ? battalionInput.value.trim() : '';
        const bottomY = Math.round(ch * 0.92);
        if(rankText){ const cfgR = fieldsConfig.rank || {x:0.5,y:0.92,sizeRatio:1/48}; const fsr = Math.max(8, Math.round(cw*cfgR.sizeRatio)); drawStyledText(rankText.toUpperCase(), Math.round(cw*cfgR.x), Math.round(ch*cfgR.y) - 18, fsr, 'center'); elementBounds['rank']={x:Math.round(cw*cfgR.x)-150,y:Math.round(ch*cfgR.y)-fsr-18,w:300,h:fsr}; }
        if(commanderText){ const cfgC = fieldsConfig.commander || {x:0.5,y:0.94,sizeRatio:1/64}; const fsc = Math.max(8, Math.round(cw*cfgC.sizeRatio)); drawStyledText(commanderText.toUpperCase(), Math.round(cw*cfgC.x), Math.round(ch*cfgC.y), fsc, 'center'); elementBounds['commander']={x:Math.round(cw*cfgC.x)-150,y:Math.round(ch*cfgC.y)-fsc,w:300,h:fsc}; }
        if(battalionText){ const cfgB = fieldsConfig.battalion || {x:0.5,y:0.96,sizeRatio:1/80}; const fsb = Math.max(8, Math.round(cw*cfgB.sizeRatio)); drawStyledText(battalionText.toUpperCase(), Math.round(cw*cfgB.x), Math.round(ch*cfgB.y) + 18, fsb, 'center'); elementBounds['battalion']={x:Math.round(cw*cfgB.x)-150,y:Math.round(ch*cfgB.y),w:300,h:fsb}; }

        // footer
        const cfgFtr = fieldsConfig.footer || { x:0.5,y:0.98,sizeRatio:1/60 };
        const fsz = Math.max(8, Math.round(cw*cfgFtr.sizeRatio));
        drawStyledText(footerText, Math.round(cw*cfgFtr.x), Math.round(ch*cfgFtr.y), fsz, 'center');
        elementBounds['footer'] = { x: Math.round(cw*cfgFtr.x)-200, y: Math.round(ch*cfgFtr.y)-fsz, w:400, h:fsz };

        return;
      }

      // fallback behavior when no template
      if(!img){ drawPlaceholder(); return; }

      // Fit image to a reasonable max width while preserving resolution scaling
      const SIDE_MARGIN = 20;
      const maxWidth = 1400;
      const scale = Math.min(1, maxWidth / img.width);
      const cw = Math.round(img.width * scale);
      const ch = Math.round(img.height * scale);
      canvas.width = cw + SIDE_MARGIN * 2; // leave margins for logos
      canvas.height = ch + 70;

      ctx.clearRect(0,0,canvas.width,canvas.height);
      // draw image shifted by left margin so margins remain empty for logos
      const imageX = SIDE_MARGIN;
      ctx.drawImage(img, imageX, 0, cw, ch);

      const phrase = phraseSelect.value || '';
      const nameText = (nameInput.value || '').trim();
      const dateVal = dateInput.value;
      const dateText = dateVal ? (new Date(dateVal)).toLocaleDateString() : '';

      function drawText(text, x, y, fontSize=36, align='center'){
        ctx.font = `${fontSize}px "Segoe UI", Roboto, Arial, sans-serif`;
        ctx.textAlign = align;
        ctx.fillStyle = 'white';
        ctx.lineWidth = Math.max(2, Math.round(fontSize/12));
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }

      if(phrase){
        // Ajustar frase: intentar envolver y reducir tamaño para que quepa en el ancho
        // max text width inside the image area (leave some padding inside image)
        const maxWidth = Math.round(cw * 0.9);
        let fontSize = Math.max(18, Math.round(cw/22));
        
      // probar reducir tamaño hasta que la línea más larga quepa o hasta tamaño mínimo
      function measureTextWidth(text, size){
        ctx.font = `${size}px "Segoe UI", Roboto, Arial, sans-serif`;
        return ctx.measureText(text).width;
      }

      // romper en líneas por palabras con un tamaño dado
      function wrapText(text, size, maxW){
        const words = text.split(' ');
        const lines = [];
        let line = '';
        for(const w of words){
          const test = line ? (line + ' ' + w) : w;
          const wTest = measureTextWidth(test, size);
          if(wTest <= maxW){
            line = test;
          } else {
            if(line) lines.push(line);
            // si una palabra sola es más ancha que maxW, habrá que reducir tamaño
            if(measureTextWidth(w, size) > maxW){
              // indicate impossible for this size
              return null;
            }
            line = w;
          }
        }
        if(line) lines.push(line);
        return lines;
      }

      let lines = wrapText(phrase, fontSize, maxWidth);
      while((!lines || lines.length > 3) && fontSize > 12){
        fontSize -= 2;
        lines = wrapText(phrase, fontSize, maxWidth);
      }

      // si aún null (palabra larga), forzar reducción hasta que entre sin wrap
      if(!lines){
        while(!lines && fontSize > 10){
          fontSize -= 2;
          lines = wrapText(phrase, fontSize, maxWidth);
        }
        if(!lines) lines = [phrase];
      }

      // dibujar líneas centradas dentro del área de la imagen
      const lineHeight = Math.round(fontSize * 1.15);
      const startY = Math.round(lineHeight * 1.6);
      const centerX = imageX + Math.round(cw/2);
      for(let i=0;i<lines.length;i++){
        const y = startY + i * lineHeight;
        drawText(lines[i], centerX, y, fontSize);
      }
    }

    if(nameText){
      const size = Math.max(16, Math.round(cw/28));
      const centerX = imageX + Math.round(cw/2);
      drawText(nameText, centerX, ch - Math.round(size*0.2), size);
    }

    if(dateText){
      const size = Math.max(12, Math.round(cw/48));
      // position date inside image area, slightly inset from left image margin
      drawText(dateText, imageX + 10 + size, ch - 6, size, 'left');
    }

    const footerY = ch + 46;
    const footerSize = Math.max(12, Math.round(cw/60));
    const centerX = imageX + Math.round(cw/2);
    drawText(footerText, centerX, footerY, footerSize);
    }
    catch(err){
      console.error('drawPreview runtime error', err);
      // render a simple placeholder so the user sees something
      try{ drawPlaceholder(); }catch(e){ /* ignore */ }
    }
  }

  function downloadImage(){
    if(!img && !templateImg){ alert('Primero sube una foto o una plantilla.'); return; }
    drawPreview();
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = templateImg ? 'tarjeta.png' : 'foto_persona.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Drag & drop handlers (guard against missing elements)
  function safeAdd(el, event, handler){ if(!el){ console.warn('Missing element for event binding:', event); return; } el.addEventListener(event, handler); }

  safeAdd(dragArea, 'dragover', (e)=>{ e.preventDefault(); dragArea.classList.add('dragover'); });
  safeAdd(dragArea, 'dragleave', ()=>{ dragArea.classList.remove('dragover'); });
  safeAdd(dragArea, 'drop', (e)=>{ e.preventDefault(); dragArea.classList.remove('dragover'); handleFile(e); });
  safeAdd(pickFileBtn, 'click', ()=> { if(photoInput) photoInput.click(); });
  safeAdd(photoInput, 'change', handleFile);
  // allow clicking the whole drag area to open file picker (safe)
  safeAdd(dragArea, 'click', (e)=>{
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if(tag === 'button' || tag === 'input' || tag === 'a') return;
    if(photoInput) photoInput.click();
  });

  // Events (use safe binding to avoid runtime crash if an element is missing)
  safeAdd(addPhraseBtn, 'click', addPhrase);
  if(newPhraseInput) safeAdd(newPhraseInput, 'keydown', (e)=>{ if(e.key === 'Enter') addPhrase(); });
  safeAdd(phraseSelect, 'change', drawPreview);
  safeAdd(nameInput, 'input', drawPreview);
  safeAdd(dateInput, 'input', drawPreview);
  safeAdd(footerInput, 'input', drawPreview);
  safeAdd(templateInput, 'change', handleTemplateFile);
  safeAdd(downloadBtn, 'click', downloadImage);
  safeAdd(clearBtn, 'click', clearAll);

  // Overlay control bindings
  safeAdd(editOverlayToggle, 'change', (e)=>{ overlayEditEnabled = !!e.target.checked; updateOverlayInputs(); drawPreview(); });
  safeAdd(saveOverlayBtn, 'click', ()=>{ applyOverlayInputs(); saveOverlay(); drawPreview(); });
  safeAdd(resetOverlayBtn, 'click', ()=>{ overlayRatios = { x:0.60, y:0.30, w:0.34, h:0.56 }; updateOverlayInputs(); saveOverlay(); drawPreview(); });
  safeAdd(overlayX, 'change', ()=>{ applyOverlayInputs(); drawPreview(); });
  safeAdd(overlayY, 'change', ()=>{ applyOverlayInputs(); drawPreview(); });
  safeAdd(overlayW, 'change', ()=>{ applyOverlayInputs(); drawPreview(); });
  safeAdd(overlayH, 'change', ()=>{ applyOverlayInputs(); drawPreview(); });

  // Canvas interactive overlay editing (drag/resize)
  function getMousePosOnCanvas(e){
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: Math.round((e.clientX - rect.left) * scaleX), y: Math.round((e.clientY - rect.top) * scaleY) };
  }

  function pointNear(px,py, hx,hy, tol=8){ return Math.abs(px-hx) <= tol && Math.abs(py-hy) <= tol; }

  safeAdd(canvas, 'mousedown', (e)=>{
    const p = getMousePosOnCanvas(e);
    const cw = canvas.width, ch = canvas.height;
    // priority: overlay editing if enabled
    if(overlayEditEnabled && templateImg){
      const overlayPx = { x: Math.round(cw*overlayRatios.x), y: Math.round(ch*overlayRatios.y), w: Math.round(cw*overlayRatios.w), h: Math.round(ch*overlayRatios.h) };
      const corners = [ {name:'nw', x:overlayPx.x, y:overlayPx.y}, {name:'ne', x:overlayPx.x+overlayPx.w, y:overlayPx.y}, {name:'se', x:overlayPx.x+overlayPx.w, y:overlayPx.y+overlayPx.h}, {name:'sw', x:overlayPx.x, y:overlayPx.y+overlayPx.h} ];
      for(const c of corners){ if(pointNear(p.x,p.y,c.x,c.y)){ _dragState = { active:true, mode:c.name, startX:p.x, startY:p.y, orig: Object.assign({}, overlayPx) }; return; } }
      if(p.x >= overlayPx.x && p.x <= overlayPx.x+overlayPx.w && p.y >= overlayPx.y && p.y <= overlayPx.y+overlayPx.h){
        _dragState = { active:true, mode:'move', startX:p.x, startY:p.y, orig: Object.assign({}, overlayPx) };
        return;
      }
    }
    // field editing: check if clicked inside any field bounds
    if(editFieldsEnabled){
      for(const key of Object.keys(elementBounds)){
        const b = elementBounds[key];
        if(!b) continue;
        if(p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - b.h*0.2 && p.y <= b.y + b.h){
          // select this field and begin dragging
          selectedField = key;
          if(fieldSelect) fieldSelect.value = key;
          _dragState = { active:true, mode:'field', field:key, startX:p.x, startY:p.y, orig: { x: fieldsConfig[key].x, y: fieldsConfig[key].y } };
          updateFieldInputs();
          return;
        }
      }
    }
  });

  safeAdd(window, 'mousemove', (e)=>{
    if(!_dragState.active) return;
    const cw = canvas.width, ch = canvas.height;
    const p = getMousePosOnCanvas(e);
    const dx = p.x - _dragState.startX, dy = p.y - _dragState.startY;
    const o = Object.assign({}, _dragState.orig);
    let newPx = Object.assign({}, o);
    if(_dragState.mode === 'move'){
      newPx.x = Math.max(0, Math.min(cw - o.w, o.x + dx));
      newPx.y = Math.max(0, Math.min(ch - o.h, o.y + dy));
    } else if(_dragState.mode === 'nw'){
      newPx.x = Math.max(0, Math.min(o.x + dx, o.x + o.w - 10));
      newPx.y = Math.max(0, Math.min(o.y + dy, o.y + o.h - 10));
      newPx.w = Math.round(o.w - (newPx.x - o.x));
      newPx.h = Math.round(o.h - (newPx.y - o.y));
    } else if(_dragState.mode === 'ne'){
      newPx.y = Math.max(0, Math.min(o.y + dy, o.y + o.h - 10));
      newPx.w = Math.max(10, Math.min(cw - o.x, o.w + dx));
      newPx.h = Math.round(o.h - (newPx.y - o.y));
    } else if(_dragState.mode === 'se'){
      newPx.w = Math.max(10, Math.min(cw - o.x, o.w + dx));
      newPx.h = Math.max(10, Math.min(ch - o.y, o.h + dy));
    } else if(_dragState.mode === 'sw'){
      newPx.x = Math.max(0, Math.min(o.x + dx, o.x + o.w - 10));
      newPx.w = Math.round(o.w - (newPx.x - o.x));
      newPx.h = Math.max(10, Math.min(ch - o.y, o.h + dy));
    }
    // convert to ratios
    if(_dragState.mode === 'field'){
      // dragging a field: update its x/y based on movement
      const field = _dragState.field;
      if(field && fieldsConfig[field]){
        const newX = Math.max(0, Math.min(1, o.x + dx / cw));
        const newY = Math.max(0, Math.min(1, o.y + dy / ch));
        fieldsConfig[field].x = newX; fieldsConfig[field].y = newY;
        updateFieldInputs();
        drawPreview();
        return;
      }
    }
    // otherwise it's overlay drag
    overlayRatios.x = newPx.x / cw; overlayRatios.y = newPx.y / ch; overlayRatios.w = newPx.w / cw; overlayRatios.h = newPx.h / ch;
    updateOverlayInputs();
    drawPreview();
  });

  safeAdd(window, 'mouseup', (e)=>{ if(_dragState.active){ if(_dragState.mode === 'field') saveFields(); else saveOverlay(); _dragState.active = false; } });
  safeAdd(window, 'mouseleave', (e)=>{ if(_dragState.active){ if(_dragState.mode === 'field') saveFields(); else saveOverlay(); _dragState.active = false; } });

  // Field edit bindings
  safeAdd(editFieldsToggle, 'change', (e)=>{ editFieldsEnabled = !!e.target.checked; if(!editFieldsEnabled) selectedField = null; updateFieldInputs(); drawPreview(); });
  safeAdd(fieldSelect, 'change', (e)=>{ selectedField = e.target.value; updateFieldInputs(); });
  safeAdd(fieldX, 'change', ()=>{ if(!selectedField) return; fieldsConfig[selectedField].x = Math.max(0, Math.min(1, parseFloat(fieldX.value)/100 || 0)); drawPreview(); });
  safeAdd(fieldY, 'change', ()=>{ if(!selectedField) return; fieldsConfig[selectedField].y = Math.max(0, Math.min(1, parseFloat(fieldY.value)/100 || 0)); drawPreview(); });
  safeAdd(fieldSize, 'change', ()=>{ if(!selectedField) return; const v = parseFloat(fieldSize.value); if(isFinite(v)){ fieldsConfig[selectedField].sizeRatio = v / (canvas.width || 1); if(fieldSizeRange) fieldSizeRange.value = v; saveFields(); } drawPreview(); });
  safeAdd(fieldSizeRange, 'input', ()=>{ if(!selectedField) return; const v = parseFloat(fieldSizeRange.value); if(isFinite(v)){ if(fieldSize) fieldSize.value = v; fieldsConfig[selectedField].sizeRatio = v / (canvas.width || 1); drawPreview(); } });
  safeAdd(fieldSizeRange, 'change', ()=>{ if(!selectedField) return; const v = parseFloat(fieldSizeRange.value); if(isFinite(v)){ if(fieldSize) fieldSize.value = v; fieldsConfig[selectedField].sizeRatio = v / (canvas.width || 1); saveFields(); } });
  safeAdd(saveFieldBtn, 'click', ()=>{ saveFields(); });
  safeAdd(resetFieldBtn, 'click', ()=>{ // reset selected field to defaults
    if(!selectedField) return; const def = {
      phrase: { x:0.5,y:0.08,sizeRatio:1/54 }, feliz:{ x:0.12,y:0.30,sizeRatio:1/14 }, day:{x:0.12,y:0.60,sizeRatio:1/6}, month:{x:0.12,y:0.68,sizeRatio:1/28},
      name1:{x:0.58,y:0.16,sizeRatio:1/26}, name2:{x:0.58,y:0.205,sizeRatio:1/36}, rank:{x:0.5,y:0.92,sizeRatio:1/48}, commander:{x:0.5,y:0.94,sizeRatio:1/64}, battalion:{x:0.5,y:0.96,sizeRatio:1/80}, footer:{x:0.5,y:0.98,sizeRatio:1/60}
    }[selectedField]; if(def){ fieldsConfig[selectedField]=def; updateFieldInputs(); saveFields(); drawPreview(); }
  });

  // init
  loadState();
  populatePhrases();
  drawPlaceholder();
  // sync overlay inputs and checkbox state
  try{ updateOverlayInputs(); if(editOverlayToggle) { editOverlayToggle.checked = !!overlayEditEnabled; } }catch(e){}
  // sync field inputs and checkbox
  // define updateFieldInputs as a proper function and sync controls
  function updateFieldInputs(){
    if(!fieldX || !fieldY || !fieldSize || !fieldSelect) return;
    const sel = fieldSelect.value || 'phrase';
    selectedField = sel;
    const cfg = fieldsConfig[sel] || {x:0.5,y:0.5,sizeRatio:1/60};
    fieldX.value = (cfg.x*100).toFixed(2);
    fieldY.value = (cfg.y*100).toFixed(2);
    const px = Math.round((cfg.sizeRatio || 0.02) * (canvas.width || 100));
    fieldSize.value = px;
    if(fieldSizeRange) fieldSizeRange.value = px;
  }
  try{ if(editFieldsToggle) editFieldsToggle.checked = !!editFieldsEnabled; if(fieldSelect) fieldSelect.value = selectedField || 'phrase'; updateFieldInputs(); }catch(e){}

})();
