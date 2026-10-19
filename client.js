const socket = io();
const { countries, rounds, labels } = window.VISAQUEST;
let roomState = null, myId = null, myRoom = null, tick = null, selected = false;
const $ = id => document.getElementById(id);
function esc(s){return String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(id).classList.add('active');}
function fillCountries(id){$(id).innerHTML=Object.entries(countries).map(([key,c])=>`<option value="${key}">${c.emoji} ${key} — ${esc(c.desc)}</option>`).join('');}
fillCountries('hostCountry');fillCountries('joinCountry');
function emitWithAck(event,payload){return new Promise(resolve=>socket.emit(event,payload,resolve));}
$('createBtn').onclick=async()=>{disableHome(true);const r=await emitWithAck('room:create',{name:$('hostName').value,country:$('hostCountry').value});if(!r?.ok){$('homeError').textContent=r?.error||'Nem sikerült létrehozni a szobát.';disableHome(false);return;}myId=r.playerId;myRoom=r.code;$('homeError').textContent='';};
$('joinBtn').onclick=async()=>{disableHome(true);const r=await emitWithAck('room:join',{code:$('joinCode').value,name:$('joinName').value,country:$('joinCountry').value});if(!r?.ok){$('homeError').textContent=r?.error||'Nem sikerült csatlakozni.';disableHome(false);return;}myId=r.playerId;myRoom=r.code;$('homeError').textContent='';};
function disableHome(v){$('createBtn').disabled=v;$('joinBtn').disabled=v;}
$('joinCode').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6));
$('copyBtn').onclick=async()=>{try{await navigator.clipboard.writeText(myRoom);$('copyBtn').textContent='Kimásolva ✓';setTimeout(()=>$('copyBtn').textContent='Kód másolása',1400);}catch{$('copyBtn').textContent='Kód: '+myRoom;}};
$('startBtn').onclick=()=>socket.emit('game:start');
$('nextBtn').onclick=()=>socket.emit('game:next');
$('restartBtn').onclick=()=>socket.emit('game:restart');
$('leaveBtn').onclick=()=>{clearInterval(tick);roomState=null;myId=null;myRoom=null;show('home');disableHome(false);};
socket.on('room:update',room=>{roomState=room;myRoom=room.code;renderRoom();});
socket.on('connect_error',()=>{$('homeError').textContent='Nem sikerült kapcsolódni a játékszerverhez. Frissítsd az oldalt, vagy próbáld újra.';});
function me(){return roomState?.players.find(p=>p.id===socket.id)||roomState?.players.find(p=>p.id===myId);}
function renderRoom(){if(!roomState)return;const player=me();if(!player)return;
  $('roomCode').textContent=roomState.code;
  const isHost=roomState.hostId===player.id;
  $('startBtn').classList.toggle('hidden',!isHost||roomState.status!=='lobby');
  $('lobbyStatus').textContent=isHost?'Te vagy a játékvezető. Ha mindenki csatlakozott, indítsd el a játékot.':'Várakozás a játékvezető indítására…';
  $('lobbyRoster').innerHTML=roomState.players.map(p=>`<div class="player-card"><div><b>${esc(p.name)} ${p.id===roomState.hostId?'★':''}</b><small>${countries[p.country].emoji} ${esc(p.country)}${p.connected?'':' · kapcsolat megszakadt'}</small></div><span class="tag">${p.connected?'csatlakozott':'offline'}</span></div>`).join('');
  $('playRoster').innerHTML=roomState.players.map(p=>`<div class="player-card"><div><b>${esc(p.name)}</b><small>${countries[p.country].emoji} ${esc(p.country)}</small></div><span class="tag">${p.answer!==null?'kész':'gondolkodik'}</span></div>`).join('');
  $('myCountry').textContent=`${countries[player.country].emoji} ${player.country} — ${countries[player.country].desc}`;
  $('myStats').innerHTML=Object.entries(labels).map(([k,l])=>`<div class="stat"><div class="muted" style="font-size:12px">${l}</div><div class="n">${player.stats[k]}<span class="muted" style="font-size:12px">/100</span></div><div class="bar"><div style="width:${player.stats[k]}%"></div></div></div>`).join('');
  if(roomState.status==='lobby'){clearInterval(tick);show('lobby');return;}
  if(roomState.status==='playing'||roomState.status==='reveal'){show('play');renderQuestion(player,isHost);return;}
  if(roomState.status==='finished'){clearInterval(tick);show('results');renderResults(player,isHost);}
}
function renderQuestion(player,isHost){const idx=roomState.roundIndex,r=roomState.question;if(!r)return;
  $('roundLabel').textContent=`${idx+1}. FORDULÓ / ${roomState.roundCount}`;$('qTitle').textContent=r.title;$('topic').textContent=r.topic;$('qText').textContent=r.text;$('progress').style.width=((idx+(roomState.status==='reveal'?1:0))/roomState.roundCount*100)+'%';
  const answered=player.answer!==null;selected=answered;
  $('options').innerHTML=r.options.map((o,i)=>`<button class="option ${answered&&player.answer===i?'chosen':''}" data-choice="${i}" ${roomState.status!=='playing'||answered?'disabled':''}><span class="letter">${'ABC'[i]}</span><span>${esc(o.label)}</span></button>`).join('');
  [...$('options').querySelectorAll('button')].forEach(b=>b.onclick=()=>{if(selected||roomState.status!=='playing')return;selected=true;socket.emit('game:answer',{choiceIndex:Number(b.dataset.choice)});$('playStatus').textContent='Döntés rögzítése…';});
  $('feedback').innerHTML='';$('nextBtn').classList.toggle('hidden',roomState.status!=='reveal'||!isHost);$('nextBtn').textContent=idx===roomState.roundCount-1?'Eredmények megtekintése →':'Következő forduló →';
  if(roomState.status==='playing'){
    $('playStatus').textContent=answered?'A döntésed rögzült. Várakozás a többiekre vagy az idő lejártára.':'Válassz 30 másodpercen belül. A forduló mindenkinél egyszerre fut.';
    clearInterval(tick);const paint=()=>{const sec=Math.max(0,Math.ceil((roomState.deadline-Date.now())/1000));$('timer').textContent=`00:${String(sec).padStart(2,'0')}`;};paint();tick=setInterval(paint,250);
  }else{
    clearInterval(tick);$('timer').textContent='00:00';const choice=player.answer===null?null:r.options[player.answer];
    $('feedback').innerHTML=`<div class="notice"><strong>${choice?'Döntésed: '+esc(choice.label):'Nem adtál le választ az idő lejárta előtt.'}</strong><br>${choice?esc(choice.note):'Ebben a körben a mutatóid nem változtak.'}</div><div class="concept"><b>Mini-tananyag</b><br>${esc(r.concept)}</div>`;
    $('playStatus').textContent=isHost?'A forduló lezárult. Tovább léphetsz, ha mindenki elolvasta a magyarázatot.':'A játékvezető hamarosan továbbléptet.';
  }
}
function renderResults(player,isHost){const sorted=[...roomState.players].sort((a,b)=>avg(b.stats)-avg(a.stats));$('leaderboard').innerHTML=sorted.map((p,i)=>`<div class="player-card"><div><b><span class="rank">${i+1}.</span> ${esc(p.name)} ${p.id===roomState.hostId?'★':''}</b><small>${countries[p.country].emoji} ${esc(p.country)} · ${Object.entries(labels).sort((a,b)=>p.stats[b[0]]-p.stats[a[0]])[0][1]} a legerősebb mutató</small></div><b>${Math.round(avg(p.stats))}/100</b></div>`).join('');
  $('myHistory').innerHTML=player.history.length?player.history.map((h,i)=>`<div class="history-item"><b>${i+1}. ${esc(h.title)}</b><p class="muted">${esc(h.choice)}</p><p>${esc(h.note)}</p><div class="concept"><b>Szakmai fogalom</b><br>${esc(h.concept)}</div></div>`).join(''):'<p class="muted">Nem rögzült döntés ebben a játékban.</p>';
  $('restartBtn').classList.toggle('hidden',!isHost);
}
function avg(s){return Object.values(s).reduce((a,b)=>a+b,0)/Object.keys(s).length;}
