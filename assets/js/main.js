// Accessibility & footer features
(() => {
  const SETTINGS_KEY = 'vibe_settings_v1';

  // defaults (keep in-sync with settings.html defaults)
  const defaults = { displayName:'Alex Johnson', pronouns:'they/them', bio:'', theme:'pastel', captions:true, fontSize:'medium', dyslexic:false, avatar:'' };

  function loadSettings(){
    try{ return Object.assign({}, defaults, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch(e){ return Object.assign({}, defaults); }
  }

  function saveSettings(s){
    const cur = loadSettings();
    const merged = Object.assign({}, cur, s);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  }

  // apply theme (pastel, dark, high-contrast)
  function applyTheme(name){
    if(!name) { document.documentElement.removeAttribute('data-theme'); return; }
    document.documentElement.setAttribute('data-theme', name);
  }

  // apply font size
  function applyFontSize(sz){
    document.documentElement.style.fontSize = (sz==='small'? '14px': sz==='large'? '20px' : '18px');
  }

  // dyslexic font class
  function applyDyslexic(enabled){
    document.documentElement.classList.toggle('dyslexic', !!enabled);
  }

  // Captions overlay
  function ensureCaptionsOverlay(){
    let el = document.getElementById('vibe-captions');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'vibe-captions';
    el.setAttribute('aria-live','polite');
    el.setAttribute('aria-atomic','true');
    el.style.display = 'none';
    el.className = 'vibe-captions';
    document.body.appendChild(el);
    return el;
  }

  function showCaptions(on){
    const el = ensureCaptionsOverlay();
    el.style.display = on ? 'block' : 'none';
  }

  // Voice to text (SpeechRecognition)
  let recognition = null;
  let recognizing = false;
  // active stream used by quick-video feature
  let activeQuickVideoStream = null;
  function setupSpeech(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) return null;
    const r = new SpeechRecognition();
    r.lang = 'en-US';
    r.interimResults = true;
    r.maxAlternatives = 1;
    return r;
  }

  function startRecognition(button){
    if (!recognition) recognition = setupSpeech();
    if(!recognition) { alert('Speech recognition not supported in this browser.'); return; }
    let interim = '';
    const captionsEl = ensureCaptionsOverlay();
    recognition.onstart = () => { recognizing = true; button.classList.add('listening'); button.textContent = 'Stop Listening'; captionsEl.style.display='block'; captionsEl.textContent = 'Listening...'; };
    recognition.onresult = (e) => {
      interim = '';
      let final = '';
      for (let i=0;i<e.results.length;i++){
        const res = e.results[i];
        if(res.isFinal) final += res[0].transcript + ' ';
        else interim += res[0].transcript + ' ';
      }
      captionsEl.textContent = final + interim;
      // insert final recognized text into active input (improves UX for assistive users)
      if(final && final.trim()){
        insertRecognizedText(final.trim());
      }
    };
    recognition.onerror = (e) => { console.warn('Speech error', e); };
    recognition.onend = () => { recognizing = false; button.classList.remove('listening'); button.textContent = 'Voice-to-Text'; captionsEl.textContent = ''; if(!loadSettings().captions) captionsEl.style.display='none'; };
    recognition.start();
  }

  function stopRecognition(){ if(recognition && recognizing){ recognition.stop(); } }

  function insertRecognizedText(text){
    const active = document.activeElement;
    if(active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA' || active.isContentEditable)){
      const start = active.selectionStart || 0;
      const end = active.selectionEnd || start;
      const val = active.value || '';
      const newVal = val.slice(0,start) + text + val.slice(end);
      active.value = newVal;
      // move caret
      try{ active.selectionStart = active.selectionEnd = start + text.length; } catch(e){}
      active.focus();
      return;
    }
    // fallback: append to chat areas if present
    const chatSelectors = ['#chatBox','#chillChat','#chat'];
    for(const sel of chatSelectors){ const el = document.querySelector(sel); if(el){ const d=document.createElement('div'); d.className='caption-entry'; d.textContent=text; el.appendChild(d); el.scrollTop = el.scrollHeight; return; } }
    // else show in captions overlay
    const cap = ensureCaptionsOverlay(); cap.style.display='block'; cap.textContent = text;
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c];
    });
  }

  // Wire footer buttons across pages
  document.addEventListener('DOMContentLoaded', ()=>{
    const s = loadSettings();
    applyTheme(s.theme);
    applyFontSize(s.fontSize);
    applyDyslexic(s.dyslexic);
    showCaptions(!!s.captions);

    // displayName update (if dashboard shows it)
    const nameEl = document.getElementById('displayName');
    if(nameEl) nameEl.textContent = `Hi ${s.displayName || 'Alex'},`;

    const btnCaptions = document.getElementById('toggleCaptions');
    const btnContrast = document.getElementById('toggleContrast');
    const btnTheme = document.getElementById('toggleTheme');
    const btnVoice = document.getElementById('voiceToText');

    // Add accessibility attributes and titles
    if(btnCaptions){ btnCaptions.setAttribute('aria-label','Toggle captions'); btnCaptions.title='Toggle captions'; }
    if(btnContrast){ btnContrast.setAttribute('aria-label','Apply high contrast theme'); btnContrast.title='High contrast theme'; }
    if(btnTheme){ btnTheme.setAttribute('aria-label','Apply pastel theme'); btnTheme.title='Pastel theme'; }
    if(btnVoice){ btnVoice.setAttribute('aria-label','Start voice to text'); btnVoice.title='Voice to text (speech recognition)'; }

    if(btnCaptions){ btnCaptions.addEventListener('click', ()=>{
      const cur = loadSettings(); const next = !cur.captions; saveSettings({captions:next}); showCaptions(next);
      btnCaptions.classList.toggle('active', next);
      btnCaptions.setAttribute('aria-pressed', next ? 'true' : 'false');
    });
      // initial state
      if(btnCaptions) btnCaptions.setAttribute('aria-pressed', loadSettings().captions ? 'true' : 'false');
    }

    if(btnContrast){ btnContrast.addEventListener('click', ()=>{
      applyTheme('high-contrast'); saveSettings({theme:'high-contrast'});
    }); }

    if(btnTheme){ btnTheme.addEventListener('click', ()=>{
      applyTheme('pastel'); saveSettings({theme:'pastel'});
    }); }

    if(btnVoice){ btnVoice.addEventListener('click', ()=>{
      if (!recognizing){ startRecognition(btnVoice); } else { stopRecognition(); }
    }); }

    // keyboard shortcut: press 'v' to toggle voice on/off (skip when typing)
    document.addEventListener('keydown', (e)=>{
      if(e.key && e.key.toLowerCase() === 'v' && !e.metaKey && !e.ctrlKey && !e.altKey){
        const active = document.activeElement;
        if(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return; // avoid interfering with typing
        if(btnVoice) btnVoice.click();
      }
    });

    // Quick Access handlers (Text / Audio / Video)
    function ensureQuickModal(){
      // return the backdrop element (so showing it applies centering styles)
      let m = document.getElementById('quickModalBackdrop');
      if(m) return m;
      const html = `
        <div id="quickModalBackdrop" class="modal-backdrop" style="display:none; z-index:70;">
          <div id="quickModal" class="modal" role="dialog" aria-modal="true" style="width:520px;">
            <h3 id="quickModalTitle">Quick Access</h3>
            <div id="quickModalBody" style="margin-top:8px;"></div>
            <div style="text-align:right; margin-top:12px;"><button id="quickCancel" class="btn" style="background:#cfcfcf; color:#000;">Close</button> <button id="quickSend" class="btn">Send</button></div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
      return document.getElementById('quickModalBackdrop');
    }

    document.body.addEventListener('click', (e)=>{
      const qa = e.target.closest('[data-action]');
      if(!qa) return;
      const action = qa.dataset.action;
      if(!action) return;
      const backdrop = ensureQuickModal();
      const body = document.getElementById('quickModalBody');
      const title = document.getElementById('quickModalTitle');
      const send = document.getElementById('quickSend');
      const cancel = document.getElementById('quickCancel');
      body.innerHTML = '';
      if(action === 'quick-text'){
        title.textContent = 'Quick Text Message';
        body.innerHTML = '<textarea id="quickText" rows="6" style="width:100%; padding:10px; font-size:1rem; border-radius:6px; border:1px solid #d1d5db;"></textarea>';
        send.onclick = ()=>{ const t = document.getElementById('quickText').value.trim(); if(!t) return alert('Please type a message'); appendToRecent('Text', t); backdrop.style.display='none'; };
      } else if(action === 'quick-audio'){
        title.textContent = 'Quick Audio (Speech-to-Text)';
        body.innerHTML = '<div style="margin-bottom:8px;">Click Start and speak; recognized speech will appear below.</div><div style="display:flex; gap:8px; margin-bottom:8px;"><button id="quickStart" class="btn">Start</button><button id="quickStop" class="btn">Stop</button></div><textarea id="quickText" rows="6" style="width:100%; padding:10px; font-size:1rem; border-radius:6px; border:1px solid #d1d5db;"></textarea>';
        const start = document.getElementById('quickStart');
        const stop = document.getElementById('quickStop');
        let localRec = null;
        start.addEventListener('click', ()=>{
          if(!localRec) localRec = setupSpeech();
          if(!localRec) return alert('Speech recognition not available');
          localRec.onresult = (e)=>{ let text=''; for(let i=0;i<e.results.length;i++){ if(e.results[i].isFinal) text += e.results[i][0].transcript + ' '; }
            const ta = document.getElementById('quickText'); ta.value = (ta.value + ' ' + text).trim(); };
          localRec.start();
        });
        stop.addEventListener('click', ()=>{ if(localRec) try{ localRec.stop(); }catch(e){} });
        send.onclick = ()=>{ const t = document.getElementById('quickText').value.trim(); if(!t) return alert('No transcript to send'); appendToRecent('Audio', t); backdrop.style.display='none'; };
      } else if(action === 'quick-video'){
        title.textContent = 'Quick Video (Camera Preview)';
        body.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:8px;">
            <video id="quickVideoPreview" autoplay playsinline style="width:100%; border-radius:8px; background:#000;"></video>
            <div style="display:flex; gap:8px;">
              <button id="videoStart" class="btn">Start Camera</button>
              <button id="videoStop" class="btn">Stop Camera</button>
            </div>
            <div style="font-size:0.95rem; color:#6b7280;">Allow camera access to see yourself. Click Send to capture a snapshot and share.</div>
          </div>
        `;
        const videoEl = document.getElementById('quickVideoPreview');
        const startBtn = document.getElementById('videoStart');
        const stopBtn = document.getElementById('videoStop');

        async function startCamera(){
          try{
            if (activeQuickVideoStream) return; // already running
            const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            activeQuickVideoStream = s;
            videoEl.srcObject = s;
            videoEl.play().catch(()=>{});
          } catch(err){
            alert('Unable to access camera: ' + (err && err.message ? err.message : err));
          }
        }

        function stopCamera(){
          if(activeQuickVideoStream){
            try{ activeQuickVideoStream.getTracks().forEach(t=>t.stop()); }catch(e){}
            activeQuickVideoStream = null;
          }
          if(videoEl){ try{ videoEl.pause(); videoEl.srcObject = null; }catch(e){} }
        }

        startBtn.addEventListener('click', startCamera);
        stopBtn.addEventListener('click', stopCamera);

        send.onclick = ()=>{
          // capture snapshot if camera running
          if(videoEl && videoEl.srcObject){
            try{
              const canvas = document.createElement('canvas');
              canvas.width = videoEl.videoWidth || 640;
              canvas.height = videoEl.videoHeight || 480;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/png');
              appendImageToRecent('Video snapshot', dataUrl);
            } catch(e){ appendToRecent('Video', 'Shared a quick video snapshot'); }
          } else {
            appendToRecent('Video', 'Shared a quick video (no camera)');
          }
          stopCamera();
          backdrop.style.display='none';
        };
      }
      cancel.onclick = ()=>{ 
        // clean up any active quick-video stream
        try{ if(activeQuickVideoStream){ activeQuickVideoStream.getTracks().forEach(t=>t.stop()); activeQuickVideoStream = null; } }catch(e){}
        backdrop.style.display='none'; 
      };
      backdrop.style.display = 'flex';
    });

    function appendToRecent(type, text){
      const recent = document.querySelector('.recent-activity') || document.querySelector('#recentActivity') || null;
      if(recent){ const d = document.createElement('div'); d.style.background='#fff'; d.style.padding='10px'; d.style.marginTop='8px'; d.style.borderRadius='8px'; d.innerHTML = `<strong>${escapeHtml(type)}</strong>: ${escapeHtml(text)}`; recent.appendChild(d); return; }
      // fallback: if there's a recent-activity section, append text
      const recentArea = document.querySelector('.recent-activity'); if(recentArea){ const d=document.createElement('div'); d.textContent = `${type}: ${text}`; recentArea.appendChild(d); }
    }

    function appendImageToRecent(label, dataUrl){
      const recent = document.querySelector('.recent-activity') || document.querySelector('#recentActivity') || null;
      if(!recent) return;
      const wrapper = document.createElement('div');
      wrapper.style.background = '#fff'; wrapper.style.padding='10px'; wrapper.style.marginTop='8px'; wrapper.style.borderRadius='8px';
      const title = document.createElement('div'); title.innerHTML = `<strong>${escapeHtml(label)}</strong>`;
      const img = document.createElement('img'); img.src = dataUrl; img.alt = label; img.style.maxWidth='100%'; img.style.borderRadius='6px'; img.style.marginTop='8px';
      wrapper.appendChild(title); wrapper.appendChild(img); recent.appendChild(wrapper);
    }

    // ----------------------
    // Focus timer (Study page)
    // ----------------------
    // persistent keys inside the same SETTINGS_KEY storage
    const FOCUS_KEY = 'vibe_focus_settings_v1';
    function loadFocusSettings(){
      try{ const raw = localStorage.getItem(FOCUS_KEY); if(!raw) return {focusMinutes:25, breakMinutes:5}; return JSON.parse(raw); }catch(e){ return {focusMinutes:25, breakMinutes:5}; }
    }
    function saveFocusSettings(s){ try{ const cur = loadFocusSettings(); const merged = Object.assign({}, cur, s); localStorage.setItem(FOCUS_KEY, JSON.stringify(merged)); }catch(e){} }

    // timer state
    let focusTimerInterval = null;
    let remainingSeconds = 25 * 60;
    let currentPhase = 'focus'; // 'focus' or 'break'
    let timerRunning = false;

    function formatTime(sec){ const m = Math.floor(sec/60); const s = sec % 60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }

    function updateTimerDisplay(){
      const disp = document.getElementById('focusTimerDisplay');
      const phaseEl = document.getElementById('focusPhase');
      if(disp) disp.textContent = formatTime(remainingSeconds);
      if(phaseEl) phaseEl.textContent = currentPhase === 'focus' ? 'Focus Time' : 'Break Time';
    }

    function switchPhase(to){
      currentPhase = to || (currentPhase === 'focus' ? 'break' : 'focus');
      const fs = loadFocusSettings();
      remainingSeconds = (currentPhase === 'focus' ? (fs.focusMinutes || 25) : (fs.breakMinutes || 5)) * 60;
      updateTimerDisplay();
      // small audible cue
      try{ const a = new Audio(); a.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='; a.play().catch(()=>{}); }catch(e){}
    }

    function startTimer(){ if(timerRunning) return; timerRunning = true; const startBtn = document.getElementById('focusStartBtn'); if(startBtn) startBtn.classList.add('listening'); focusTimerInterval = setInterval(()=>{
        if(remainingSeconds <= 0){
          // switch phase automatically
          switchPhase();
          return;
        }
        remainingSeconds -= 1;
        updateTimerDisplay();
      }, 1000);
    }

    function stopTimer(resetToPhase){ if(focusTimerInterval) clearInterval(focusTimerInterval); focusTimerInterval = null; timerRunning = false; const startBtn = document.getElementById('focusStartBtn'); if(startBtn) startBtn.classList.remove('listening');
      if(resetToPhase){ currentPhase = resetToPhase; const fs = loadFocusSettings(); remainingSeconds = (currentPhase === 'focus' ? (fs.focusMinutes || 25) : (fs.breakMinutes || 5)) * 60; }
      updateTimerDisplay();
    }

    // wire up controls if present
    const startBtn = document.getElementById('focusStartBtn');
    const stopBtn = document.getElementById('focusStopBtn');
    const settingsBtn = document.getElementById('focusSettingsBtn');
    const settingsPanel = document.getElementById('focusSettingsPanel');
    const saveSettingsBtn = document.getElementById('saveFocusSettingsBtn');
    const focusMinutesInput = document.getElementById('focusMinutesInput');
    const breakMinutesInput = document.getElementById('breakMinutesInput');

    if(settingsBtn && settingsPanel){
      settingsBtn.addEventListener('click', ()=>{ settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none'; focusMinutesInput.focus(); });
    }
    if(saveSettingsBtn){
      saveSettingsBtn.addEventListener('click', ()=>{
        const f = Math.max(1, parseInt(focusMinutesInput.value,10) || 25);
        const b = Math.max(1, parseInt(breakMinutesInput.value,10) || 5);
        saveFocusSettings({focusMinutes:f, breakMinutes:b});
        // also persist into global settings for UI consistency
        saveSettings({});
        // reset timer to new focus length
        currentPhase = 'focus'; remainingSeconds = f * 60; updateTimerDisplay();
        settingsPanel.style.display = 'none';
      });
    }
    if(startBtn){ startBtn.addEventListener('click', ()=>{ if(!timerRunning) startTimer(); else stopTimer(); }); }
    if(stopBtn){ stopBtn.addEventListener('click', ()=>{ stopTimer('focus'); }); }

    // initialize focus settings on page load
    (function initFocus(){ const fs = loadFocusSettings(); if(focusMinutesInput) focusMinutesInput.value = fs.focusMinutes || 25; if(breakMinutesInput) breakMinutesInput.value = fs.breakMinutes || 5; currentPhase = 'focus'; remainingSeconds = (fs.focusMinutes || 25) * 60; updateTimerDisplay(); })();
  });
})();

    // ----------------------
    // Simple Music Player (Study page)
    // ----------------------
    (function(){
      const lofiBtn = document.getElementById('lofiPlaylistBtn');
      const chooseBtn = document.getElementById('chooseTrackBtn');
      const controls = document.getElementById('musicPlayerControls');
      let audio = null;
      let isPlaying = false;
      // small sample lo-fi playlist (external URLs may fail if offline)
      const playlist = [
        'https://cdn.simplecast.com/audio/lofi-sample-1.mp3',
        'https://cdn.simplecast.com/audio/lofi-sample-2.mp3'
      ];
      let currentIndex = 0;

      function ensureAudio(){ if(!audio){ audio = new Audio(); audio.crossOrigin = 'anonymous'; audio.addEventListener('ended', ()=>{ // advance
          currentIndex = (currentIndex + 1) % playlist.length; audio.src = playlist[currentIndex]; audio.play().catch(()=>{});
        }); }
      }

      function renderControls(){
        if(!controls) return;
        controls.innerHTML = '';
        const playPause = document.createElement('button'); playPause.className = 'btn'; playPause.style.width = '120px'; playPause.textContent = isPlaying ? 'Pause' : 'Play';
        const stop = document.createElement('button'); stop.className = 'btn'; stop.style.width = '120px'; stop.textContent = 'Stop';
        controls.appendChild(playPause); controls.appendChild(stop);
        playPause.addEventListener('click', ()=>{
          ensureAudio(); if(!isPlaying){ audio.play().catch(()=>{}); isPlaying = true; playPause.textContent='Pause'; } else { audio.pause(); isPlaying = false; playPause.textContent='Play'; }
        });
        stop.addEventListener('click', ()=>{ if(audio){ audio.pause(); audio.currentTime = 0; isPlaying = false; renderControls(); } });
      }

      if(lofiBtn){ lofiBtn.addEventListener('click', ()=>{
        ensureAudio(); currentIndex = 0; audio.src = playlist[currentIndex]; audio.play().catch(()=>{ alert('Unable to play remote audio. If offline use Choose Track to load a local file.'); }); isPlaying = true; renderControls();
      }); }

      if(chooseBtn){ chooseBtn.addEventListener('click', ()=>{
        // create hidden file input to choose a local audio file
        const input = document.createElement('input'); input.type='file'; input.accept = 'audio/*'; input.style.display='none';
        input.addEventListener('change', (e)=>{
          const f = e.target.files && e.target.files[0]; if(!f) return; const url = URL.createObjectURL(f); ensureAudio(); audio.src = url; audio.play().catch(()=>{}); isPlaying = true; renderControls();
        });
        document.body.appendChild(input); input.click(); setTimeout(()=>{ input.remove(); }, 5000);
      }); }
    })();

    // ----------------------
    // Mini Games for Chill page
    // ----------------------
    document.addEventListener('DOMContentLoaded', ()=>{
      // Like buttons for Chill posts
      try{
        const LIKE_KEY = 'vibe_likes_v1';
        function loadLikes(){ try{ return JSON.parse(localStorage.getItem(LIKE_KEY) || '{}'); }catch(e){ return {}; } }
        function saveLikes(obj){ try{ localStorage.setItem(LIKE_KEY, JSON.stringify(obj)); }catch(e){} }
        const likeState = loadLikes();
        document.querySelectorAll('.like-button').forEach(btn => {
          const id = btn.dataset.postId;
          const countEl = btn.querySelector('.like-count');
          // initialize count from DOM if not present in storage
          const initial = parseInt(countEl ? countEl.textContent : '0',10) || 0;
          if(!likeState[id]) likeState[id] = {count: initial, liked:false};
          // apply UI
          function apply(){
            const state = likeState[id];
            if(countEl) countEl.textContent = state.count;
            btn.setAttribute('aria-pressed', state.liked ? 'true' : 'false');
            const icon = btn.querySelector('i');
            if(icon){ icon.classList.toggle('fa-solid', state.liked); icon.classList.toggle('fa-regular', !state.liked); }
          }
          apply();
          btn.addEventListener('click', ()=>{
            const s = likeState[id];
            if(!s) return;
            if(s.liked){ s.liked = false; s.count = Math.max(0, s.count - 1); }
            else { s.liked = true; s.count = s.count + 1; }
            apply(); saveLikes(likeState);
          });
        });
        // persist any newly initialized default counts
        saveLikes(likeState);
      }catch(e){ /* ignore like wiring errors */ }
      // local escape helper (avoid depending on functions inside another IIFE)
      function escapeHtmlLocal(str){ return String(str).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]; }); }

      // Trivia
      const triviaBtn = document.getElementById('playTriviaBtn');
      const triviaArea = document.getElementById('triviaArea');
      const triviaQuestions = [
        {q:'What is the capital of France?', a:['Paris','Berlin','Rome','Madrid'], correct:0},
        {q:'What planet is known as the Red Planet?', a:['Venus','Mars','Jupiter','Saturn'], correct:1},
        {q:'Which language runs in a web browser?', a:['Python','C++','JavaScript','Java'], correct:2}
      ];
      function renderTrivia(){
        if(!triviaArea) return;
        triviaArea.innerHTML = '';
        const idx = Math.floor(Math.random()*triviaQuestions.length);
        const item = triviaQuestions[idx];
        const qEl = document.createElement('div'); qEl.style.marginBottom='8px'; qEl.innerHTML = `<strong>${escapeHtmlLocal(item.q)}</strong>`;
        triviaArea.appendChild(qEl);
        const list = document.createElement('div'); list.style.display='grid'; list.style.gap='8px';
        item.a.forEach((opt,i)=>{
          const b = document.createElement('button'); b.className='btn'; b.style.width='100%'; b.textContent = opt; b.addEventListener('click', ()=>{
            if(i===item.correct){ b.style.background='#2ecc71'; b.textContent = 'Correct ✓ ' + opt; } else { b.style.background='#e74c3c'; b.textContent = 'Wrong ✕ ' + opt; }
            // disable others
            Array.from(list.querySelectorAll('button')).forEach(btn=>btn.disabled=true);
          });
          list.appendChild(b);
        });
        triviaArea.appendChild(list);
        const again = document.createElement('button'); again.className='btn'; again.textContent='Next Question'; again.style.marginTop='10px'; again.addEventListener('click', renderTrivia);
        triviaArea.appendChild(again);
      }
      if(triviaBtn) triviaBtn.addEventListener('click', renderTrivia);

      // Word Scramble
      const scrambleBtn = document.getElementById('startScrambleBtn');
      const scrambleArea = document.getElementById('scrambleArea');
      const words = ['puzzle','javascript','vibespace','coffee','library','network'];
      let scrambleTimer = null;
      function pickWord(){ return words[Math.floor(Math.random()*words.length)]; }
      function shuffleWord(w){ return w.split('').sort(()=>Math.random()-0.5).join(''); }
      function startScramble(){
        if(!scrambleArea) return;
        scrambleArea.innerHTML = '';
        const word = pickWord(); const scrambled = shuffleWord(word);
        const prompt = document.createElement('div'); prompt.innerHTML = `<div style="font-weight:600; margin-bottom:8px;">Unscramble: <span style='letter-spacing:2px;'>${escapeHtmlLocal(scrambled)}</span></div>`;
        scrambleArea.appendChild(prompt);
        const input = document.createElement('input'); input.type='text'; input.placeholder='Type your answer here'; input.style.padding='8px'; input.style.width='60%'; input.style.marginRight='8px';
        const submit = document.createElement('button'); submit.className='btn'; submit.textContent='Submit';
        const result = document.createElement('div'); result.style.marginTop='8px';
        scrambleArea.appendChild(input); scrambleArea.appendChild(submit); scrambleArea.appendChild(result);
        const timeLeft = document.createElement('div'); timeLeft.style.marginTop='8px'; scrambleArea.appendChild(timeLeft);
        let seconds = 30; timeLeft.textContent = `Time: ${seconds}s`;
        scrambleTimer = setInterval(()=>{ seconds -=1; timeLeft.textContent = `Time: ${seconds}s`; if(seconds<=0){ clearInterval(scrambleTimer); result.textContent = `Time up! Answer: ${word}`; submit.disabled=true; } }, 1000);
        submit.addEventListener('click', ()=>{ clearInterval(scrambleTimer); const ans = input.value.trim().toLowerCase(); if(ans === word){ result.textContent = 'Correct! Nice job 😊'; result.style.color='#2ecc71'; } else { result.textContent = `Not quite — correct was: ${word}`; result.style.color='#e74c3c'; } submit.disabled=true; });
      }
      if(scrambleBtn) scrambleBtn.addEventListener('click', startScramble);
    });
