(async function () {
  'use strict';
  const config = window.JOGO_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const W = 1280, H = 720, FLOOR = 590;
  const R = Regras;
  let largura = W, altura = H, escala = 1, offsetX = 0, offsetY = 0;
  let modo = 'menu', vista = 'inicio', jogadorId = 'sol', rivalId = 'umbra', ultimoTreino = false;
  let p1 = R.lutador(jogadorId, 'p1'), p2 = R.lutador(rivalId, 'p2');
  let round = 60, ultimo = 0, ultimoCpu = 0, pontos = 0, recorde = 0;
  let mensagens = [], particulas = [], shake = 0, salvamento = false;
  const teclas = new Set(), toque = { left: false, right: false, guard: false };
  const nomesVistas = ['inicio', 'treino', 'luta', 'personagens'];

  document.title = config.nome || 'Ecos do Éter — Arena';
  if (config.cor) {
    document.documentElement.style.setProperty('--cor', config.cor);
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = config.cor;
  }
  PlacarUI.montar($('painel-placar'));
  const progresso = await Placar.iniciar();
  recorde = progresso.melhor || 0;
  $('best-score').textContent = String(recorde);
  Placar.aoMudar((p) => { recorde = p.melhor; $('best-score').textContent = String(recorde); });

  function ajustar() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    escala = Math.min(rect.width / W, rect.height / H);
    offsetX = (rect.width - W * escala) / 2; offsetY = (rect.height - H * escala) / 2;
    ctx.setTransform(dpr * escala, 0, 0, dpr * escala, dpr * offsetX, dpr * offsetY);
  }
  function elenco() {
    const render = (container, picked, action) => {
      const root = $(container); root.replaceChildren();
      R.LUCHADORES.forEach((f) => {
        const button = document.createElement('button'); button.type = 'button';
        button.className = `fighter-card${f.id === picked ? ' selected' : ''}`;
        button.style.setProperty('--fighter-color', f.cor); button.setAttribute('aria-pressed', String(f.id === picked));
        const portrait = document.createElement('span'); portrait.className = 'portrait'; portrait.textContent = f.nome.split(' ').map((x) => x[0]).join('');
        const name = document.createElement('strong'); name.textContent = f.nome;
        const ability = document.createElement('small'); ability.textContent = `${f.estilo} · ${f.poder}`;
        button.append(portrait, name, ability); button.addEventListener('click', () => action(f.id)); root.append(button);
      });
    };
    render('player-roster', jogadorId, (id) => { jogadorId = id; elenco(); atualizarVersus(); });
    render('rival-roster', rivalId, (id) => { rivalId = id; elenco(); atualizarVersus(); });
  }
  function cardVersus(element, id) {
    const f = R.LUCHADORES.find((x) => x.id === id) || R.LUCHADORES[0];
    const el = $(element); el.style.setProperty('--fighter-color', f.cor); el.replaceChildren();
    const n = document.createElement('strong'); n.textContent = f.nome;
    const p = document.createElement('small'); p.textContent = `${f.titulo} · ${f.poder}`; el.append(n, p);
  }
  function atualizarVersus() { cardVersus('fight-player-card', jogadorId); cardVersus('fight-rival-card', rivalId); }
  function mostrarVista(nome) {
    vista = nomesVistas.includes(nome) ? nome : 'inicio'; modo = 'menu';
    $('painel-placar').hidden = false;
    document.querySelector('.footer').hidden = false;
    for (const key of nomesVistas) $(`view-${key}`).hidden = key !== vista;
    $('result-screen').hidden = true; $('fight-hud').hidden = true; $('combat-controls').hidden = true; $('arena-caption').hidden = true;
    document.querySelectorAll('.nav-button').forEach((b) => b.classList.toggle('active', b.dataset.view === vista));
  }
  function iniciar(treino) {
    ultimoTreino = treino;
    modo = treino ? 'treino' : 'luta'; p1 = R.lutador(jogadorId, 'p1'); p2 = R.lutador(rivalId, 'p2');
    p1.x = 405; p2.x = 875; round = 60; pontos = 0; salvamento = false; particulas = []; mensagens = [];
    p1.facing = 1; p2.facing = -1;
    $('p1-name').textContent = p1.nome.toLocaleUpperCase('pt-BR'); $('p2-name').textContent = p2.nome.toLocaleUpperCase('pt-BR');
    $('result-screen').hidden = true; for (const key of nomesVistas) $(`view-${key}`).hidden = true;
    $('painel-placar').hidden = true;
    document.querySelector('.footer').hidden = true;
    $('fight-hud').hidden = false; $('combat-controls').hidden = false; $('arena-caption').hidden = false;
    $('arena-message').textContent = treino ? 'TREINO — PRATIQUE SEUS GOLPES' : 'ROUND 1 — LUTEM!';
    atualizarHUD();
  }
  function sair() { modo = 'menu'; mostrarVista('inicio'); }
  function atualizarHUD() {
    $('p1-health').style.width = `${p1.vida}%`; $('p2-health').style.width = `${p2.vida}%`;
    $('p1-energy').style.width = `${p1.etero}%`; $('p2-energy').style.width = `${p2.etero}%`;
    $('p1-energy-label').textContent = `ÉTER ${Math.floor(p1.etero)}`; $('p2-energy-label').textContent = `ÉTER ${Math.floor(p2.etero)}`;
    $('clock').textContent = String(Math.ceil(round));
  }
  function mensagem(texto, x, y, cor) { mensagens.push({ texto, x, y, cor: cor || '#fff', tempo: .9 }); }
  function efeito(x, y, cor, quantidade) {
    for (let i = 0; i < (quantidade || 14); i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 340;
      particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, tempo: .35 + Math.random() * .4, max: .75, cor, r: 2 + Math.random() * 5 });
    }
  }
  function pulsoGolpe(f) {
    if (!['quick', 'heavy', 'special'].includes(f.animacao)) return 0;
    const fase = f.animacaoDuracao ? 1 - R.clamp(f.recuperacao / f.animacaoDuracao, 0, 1) : 1;
    if (fase < .16) return -.22 * fase / .16;
    if (fase < .52) return (fase - .16) / .36;
    if (fase < .82) return 1 - (fase - .52) / .3 * .7;
    return .3 * (1 - (fase - .82) / .18);
  }
  function pular() {
    if (!['luta', 'treino'].includes(modo) || p1.noAr || p1.atordoado > 0 || p1.recuperacao > 0 || p1.y > 0) return;
    p1 = R.iniciarPulo(p1); p1.invulneravel = .12;
    efeito(p1.x, FLOOR - 8, p1.cor, 8);
  }
  function atacar(tipo) {
    if (!['luta', 'treino'].includes(modo) || p1.recuperacao > 0 || p1.atordoado > 0) return;
    p1.recuperacao = tipo === 'quick' ? .31 : tipo === 'heavy' ? .56 : .78;
    p1.animacaoDuracao = p1.recuperacao;
    p1.animacao = tipo;
    let resultado;
    if (tipo === 'quick') resultado = R.golpeRapido(p1, p2);
    if (tipo === 'heavy') resultado = R.golpeForte(p1, p2);
    if (tipo === 'special') resultado = R.especial(p1, p2);
    p1 = resultado.atacante; p2 = resultado.defensor;
    if (resultado.acertou) {
      const cor = tipo === 'special' ? p1.cor : '#fff0c0';
      efeito(p2.x, FLOOR - 100, cor, tipo === 'special' ? 34 : 14); shake = tipo === 'special' ? .26 : .1;
      mensagem(resultado.bloqueado ? 'BLOQUEADO' : `-${resultado.causado}`, p2.x, FLOOR - 185, resultado.bloqueado ? '#e7d6ba' : cor);
    } else mensagem(resultado.mensagem, p1.x, FLOOR - 175, '#fff');
    if (tipo === 'special' && resultado.acertou) mensagem(`${p1.poder.toLocaleUpperCase('pt-BR')}!`, p1.x, FLOOR - 230, p1.cor);
    checarFim(); atualizarHUD();
  }
  function movimento(dt) {
    for (const f of [p1, p2]) {
      f.recuperacao = Math.max(0, f.recuperacao - dt); f.atordoado = Math.max(0, f.atordoado - dt);
      f.invulneravel = Math.max(0, f.invulneravel - dt); f.flash = Math.max(0, f.flash - dt);
      f.pouso = Math.max(0, (f.pouso || 0) - dt);
      f.facing = f === p1 ? (p1.x <= p2.x ? 1 : -1) : (p2.x <= p1.x ? 1 : -1);
      f.guarda = f === p1 ? toque.guard || teclas.has('ShiftLeft') || teclas.has('ShiftRight') : false;
      if (f.guarda && f.atordoado <= 0 && f.recuperacao <= 0) f.animacao = 'block';
    }
    if (p1.atordoado <= 0 && !p1.guarda) {
      const esq = teclas.has('KeyA') || teclas.has('ArrowLeft') || toque.left;
      const dir = teclas.has('KeyD') || teclas.has('ArrowRight') || toque.right;
      const corrida = (dir ? 1 : 0) - (esq ? 1 : 0);
      if (corrida && p1.recuperacao <= 0) { p1.x += corrida * 325 * dt; p1.animacao = 'walk'; }
      else if (p1.recuperacao <= 0) p1.animacao = p1.guarda ? 'block' : 'idle';
    }
    const dist = p2.x - p1.x, abs = Math.abs(dist);
    if (p2.atordoado <= 0 && modo !== 'treino') {
      if (abs > 145) { p2.x -= Math.sign(dist) * 210 * dt; if (p2.recuperacao <= 0) p2.animacao = 'walk'; }
      else if (p2.recuperacao <= 0) { p2.guarda = Math.sin(performance.now() / 500) > .6; p2.animacao = p2.guarda ? 'block' : 'idle'; }
      ultimoCpu += dt;
      if (ultimoCpu > .56 + Math.random() * .48 && p2.recuperacao <= 0) {
        ultimoCpu = 0;
        if (abs < 135) {
          if (p2.etero >= 45 && Math.random() < .24) cpuAtaque('special');
          else if (Math.random() < .33) cpuAtaque('heavy'); else cpuAtaque('quick');
        } else if (abs < 300 && p2.etero >= 40 && Math.random() < .4) cpuAtaque('special');
      }
    } else if (p2.recuperacao <= 0 && modo === 'treino') p2.animacao = 'idle';
    p1.x = R.clamp(p1.x, 90, W - 110); p2.x = R.clamp(p2.x, 90, W - 110);
    if (p2.x - p1.x < 95) { const mid = (p1.x + p2.x) / 2; p1.x = mid - 48; p2.x = mid + 48; }
    for (const f of [p1, p2]) {
      f.etero = R.clamp(f.etero + (modo === 'treino' ? 15 : 2.2) * dt, 0, 100);
      if (f.recuo) { f.x += f.recuo * dt; f.recuo *= Math.exp(-11 * dt); if (Math.abs(f.recuo) < 8) f.recuo = 0; }
    }
    p1 = R.atualizarPulo(p1, dt);
    if (p1.y > 0 && p1.recuperacao <= 0 && !p1.guarda && p1.atordoado <= 0) p1.animacao = 'jump';
    if (modo === 'luta') { round = Math.max(0, round - dt); if (round === 0) fimPorTempo(); }
    for (const part of particulas) { part.x += part.vx * dt; part.y += part.vy * dt; part.vy += 250 * dt; part.tempo -= dt; }
    particulas = particulas.filter((p) => p.tempo > 0);
    for (const m of mensagens) { m.tempo -= dt; m.y -= 24 * dt; }
    mensagens = mensagens.filter((m) => m.tempo > 0);
    shake = Math.max(0, shake - dt); atualizarHUD();
  }
  function cpuAtaque(tipo) {
    if (p2.recuperacao > 0 || p2.atordoado > 0) return;
    p2.guarda = false;
    p2.recuperacao = tipo === 'quick' ? .38 : tipo === 'heavy' ? .63 : .84;
    p2.animacaoDuracao = p2.recuperacao; p2.animacao = tipo;
    let resultado;
    if (tipo === 'special') resultado = R.especial(p2, p1);
    else if (tipo === 'heavy') resultado = R.golpeForte(p2, p1);
    else resultado = R.golpeRapido(p2, p1);
    p2 = resultado.atacante; p1 = resultado.defensor;
    if (resultado.acertou) { efeito(p1.x, FLOOR - 100, tipo === 'special' ? p2.cor : '#fff0c0', tipo === 'special' ? 30 : 12); mensagem(resultado.bloqueado ? 'DEFESA!' : `-${resultado.causado}`, p1.x, FLOOR - 180, resultado.bloqueado ? '#e7d6ba' : p2.cor); }
    else if (tipo === 'special') mensagem(resultado.mensagem, p2.x, FLOOR - 170, p2.cor);
    checarFim(); atualizarHUD();
  }
  function checarFim() {
    if (!['luta', 'treino'].includes(modo)) return;
    if (modo === 'treino' && p2.vida <= 0) { p2.vida = 100; p2.atordoado = 0; mensagem('ALVO DE TREINO REINICIADO', p2.x, FLOOR - 210, p2.cor); atualizarHUD(); return; }
    const win = R.vencedor(p1, p2);
    if (win) terminar(win);
  }
  function fimPorTempo() { terminar(p1.vida === p2.vida ? 'empate' : p1.vida > p2.vida ? 'p1' : 'p2'); }
  function terminar(win) {
    if (salvamento || modo === 'menu') return;
    const treino = modo === 'treino'; modo = 'fim'; salvamento = true;
    const venceu = win === 'p1'; const titulo = win === 'empate' ? 'Empate!' : venceu ? 'Vitória!' : 'Derrota';
    $('result-title').textContent = titulo;
    $('result-copy').textContent = treino ? 'Sessão de treino concluída.' : venceu ? `${p1.nome} venceu o duelo! +${1000 + Math.ceil(round) * 10} pontos.` : win === 'empate' ? 'Os dois guerreiros deram tudo de si.' : `${p2.nome} levou a melhor desta vez.`;
    $('result-screen').hidden = false; $('combat-controls').hidden = true;
    const score = treino ? 0 : venceu ? 1000 + Math.ceil(round) * 10 : 0;
    if (score) Placar.registrarPartida(score, { personagem: p1.id, rival: p2.id, resultado: titulo }).catch(() => {});
  }
  function retangulo(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
  function fundo() {
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#101425'); sky.addColorStop(.55, '#222038'); sky.addColorStop(1, '#4b3156');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 58; i++) { const x = ((i * 197 + 31) % W), y = ((i * 127 + 19) % 390); ctx.globalAlpha = .22 + (i % 4) * .12; ctx.fillStyle = i % 6 ? '#fff' : '#d7b5ff'; ctx.fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2); }
    ctx.globalAlpha = 1;
    // Lua e arcos de energia compõem um palco abstrato próprio.
    const glow = ctx.createRadialGradient(640, 240, 20, 640, 240, 300); glow.addColorStop(0, '#9567cb45'); glow.addColorStop(1, '#9567cb00'); ctx.fillStyle = glow; ctx.fillRect(300, 0, 680, 580);
    ctx.strokeStyle = '#c4a3e52d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(640, 443, 475, 215, 0, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#11111c'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    const floorGlow = ctx.createLinearGradient(0, FLOOR, 0, H); floorGlow.addColorStop(0, '#b185d526'); floorGlow.addColorStop(1, '#090a12'); ctx.fillStyle = floorGlow; ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.strokeStyle = '#bea1db55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(W, FLOOR); ctx.stroke();
    for (let x = -200; x < 1600; x += 130) { ctx.strokeStyle = '#d0a9e112'; ctx.beginPath(); ctx.moveTo(640, FLOOR); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = FLOOR + 35; y < H; y += 35) { ctx.strokeStyle = '#d0a9e110'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  function manifestacao(f, agora, naFrente) {
    const fase = f.animacaoDuracao ? 1 - R.clamp(f.recuperacao / f.animacaoDuracao, 0, 1) : 0;
    const ativo = ['quick', 'heavy', 'special'].includes(f.animacao);
    const defesa = f.guarda || f.animacao === 'block';
    const balanco = Math.sin(agora / (defesa ? 80 : 190)) * (defesa ? 2 : 5);
    const empurrao = pulsoGolpe(f) * (f.animacao === 'heavy' ? 24 : f.animacao === 'special' ? 14 : 18);
    const x = f.x + f.facing * (naFrente ? 78 + empurrao : -58);
    const y = FLOOR - f.y - 70 + balanco;
    ctx.save(); ctx.translate(x, y); ctx.scale(f.facing, 1);
    ctx.globalAlpha = naFrente ? .88 : .53;
    ctx.shadowColor = f.cor; ctx.shadowBlur = naFrente ? (defesa ? 0 : 22) : 10;
    // Halo e silhueta espiritual própria, com braços animados conforme a ação.
    ctx.strokeStyle = f.cor; ctx.lineWidth = naFrente ? 4 : 2;
    ctx.beginPath(); ctx.ellipse(0, -39, 48 + Math.sin(agora / 90) * 3, 71, Math.sin(agora / 700) * .05, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = f.cor; ctx.beginPath(); ctx.moveTo(-36, -12); ctx.lineTo(-44, -77); ctx.lineTo(-28, -112); ctx.lineTo(0, -124); ctx.lineTo(29, -107); ctx.lineTo(43, -63); ctx.lineTo(34, -12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#171224'; retangulo(-22, -82, 44, 55, 13); ctx.fill();
    ctx.fillStyle = '#f2eaff'; ctx.beginPath(); ctx.ellipse(0, -111, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f.cor; ctx.beginPath(); ctx.moveTo(-21, -112); ctx.lineTo(-16, -133); ctx.lineTo(14, -134); ctx.lineTo(22, -111); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(5, -116, 5, 3); ctx.fillRect(-11, -116, 5, 3);
    ctx.strokeStyle = defesa ? '#d9c7a3' : f.cor; ctx.lineWidth = 13; ctx.lineCap = 'round';
    if (defesa) {
      const pulso = 1 + Math.sin(agora / 90) * .09;
      ctx.save(); ctx.scale(pulso, pulso); ctx.strokeStyle = '#d9c7a3'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(-25, -83); ctx.lineTo(5, -61); ctx.lineTo(29, -91); ctx.stroke();
      ctx.beginPath(); ctx.arc(31, -67, 48, -1.55, 1.35); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = f.cor; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-23, -83); ctx.lineTo(6, -66); ctx.stroke();
    } else if (ativo) {
      const alcance = (f.animacao === 'heavy' ? 83 : f.animacao === 'special' ? 64 : 70) * Math.max(0, pulsoGolpe(f));
      ctx.beginPath(); ctx.moveTo(23, -82); ctx.lineTo(42 + alcance * .42, -79); ctx.lineTo(60 + alcance, -76); ctx.stroke();
      if (fase > .12 && fase < .88) { ctx.globalAlpha *= .55; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(66 + alcance, -76, 31, -.9, .75); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.moveTo(-22, -82); ctx.lineTo(-39, -49); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, -82); ctx.lineTo(40, -54 + balanco); ctx.stroke();
    }
    ctx.restore();
  }
  function guerreiro(f, agora) {
    const ativo = ['quick', 'heavy', 'special'].includes(f.animacao);
    const defendendo = f.guarda || f.animacao === 'block';
    const naFrente = ativo || defendendo;
    const impacto = pulsoGolpe(f);
    const x = f.x + f.facing * impacto * (f.animacao === 'heavy' ? 31 : 20);
    const base = FLOOR - f.y;
    if (!naFrente) manifestacao(f, agora, false);
    const andando = f.animacao === 'walk' ? Math.sin(agora / 85 + x) * 9 : 0;
    ctx.save(); ctx.translate(x, base); ctx.scale(f.facing, 1);
    const squash = f.pouso > 0 ? Math.sin(Math.PI * (1 - f.pouso / .18)) * .12 : 0;
    ctx.scale(1 + squash, 1 - squash);
    const salto = f.y > 0 ? R.clamp(f.vy / 900, -1, 1) : 0;
    ctx.rotate(f.y > 0 ? -salto * .07 : impacto * (f.animacao === 'heavy' ? -.1 : -.055));
    ctx.globalAlpha = .4 * (1 - R.clamp(f.y / 220, 0, .75)); ctx.fillStyle = '#05050a'; ctx.beginPath(); ctx.ellipse(-f.facing * impacto * 18, 0, 52 - f.y * .12, 12 - f.y * .015, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = f.flash > 0 ? '#fff' : f.cor; ctx.shadowColor = f.cor; ctx.shadowBlur = defendendo ? 0 : f.animacao === 'special' ? 28 : 9;
    const joelho = f.y > 0 ? R.clamp(f.y / 170, 0, .48) : 0;
    ctx.save(); ctx.translate(0, -42); ctx.rotate(andando / 100 - impacto * .16 - joelho); retangulo(-24, -3, 20, 48, 8); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(0, -42); ctx.rotate(-andando / 100 + impacto * .12 + joelho); retangulo(5, -3, 20, 48, 8); ctx.fill(); ctx.restore();
    ctx.fillStyle = f.flash > 0 ? '#fff' : f.cor; retangulo(-31, -112, 62, 76, 15); ctx.fill();
    ctx.fillStyle = '#211a2d'; retangulo(-20, -101, 40, 54, 10); ctx.fill();
    ctx.strokeStyle = f.flash > 0 ? '#fff' : defendendo ? '#d9c7a3' : f.cor; ctx.lineWidth = 17; ctx.lineCap = 'round';
    if (defendendo) {
      const breathe = Math.sin(agora / 110) * 3;
      ctx.beginPath(); ctx.moveTo(-23, -96); ctx.lineTo(8, -72 + breathe); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(23, -96); ctx.lineTo(-8, -72 - breathe); ctx.stroke();
    } else if (f.y > 0) {
      ctx.beginPath(); ctx.moveTo(-24, -96); ctx.lineTo(-38, -127); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(24, -96); ctx.lineTo(40, -125); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(-24, -96); ctx.lineTo(-42, -63); ctx.stroke();
      const alcance = impacto * (f.animacao === 'heavy' ? 93 : f.animacao === 'special' ? 76 : 78);
      const punhoY = f.animacao === 'heavy' ? -90 : -78;
      ctx.beginPath(); ctx.moveTo(24, -96); ctx.lineTo(44 + alcance * .45, punhoY + 7); ctx.lineTo(53 + alcance, punhoY); ctx.stroke();
      ctx.fillStyle = '#fff0dc'; ctx.beginPath(); ctx.arc(55 + alcance, punhoY, 11 + impacto * 3, 0, Math.PI * 2); ctx.fill();
      if (impacto > .2) { ctx.globalAlpha = impacto * .65; ctx.strokeStyle = f.cor; ctx.lineWidth = f.animacao === 'heavy' ? 9 : 5; ctx.beginPath(); ctx.arc(50 + alcance, punhoY, f.animacao === 'heavy' ? 43 : 32, -.85, .8); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    ctx.fillStyle = '#f1d5c8'; ctx.beginPath(); ctx.arc(0, -128, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = f.cor; ctx.beginPath(); ctx.arc(0, -138, 25, Math.PI, Math.PI * 2); ctx.lineTo(19, -129); ctx.lineTo(-20, -129); ctx.fill();
    ctx.fillStyle = '#191721'; ctx.fillRect(4, -131, 5, 3); ctx.fillRect(-10, -131, 5, 3);
    if (defendendo) {
      const pulsa = 1 + Math.sin(agora / 95) * .035;
      ctx.save(); ctx.translate(8, -92); ctx.scale(pulsa, pulsa); ctx.strokeStyle = '#d9c7a3'; ctx.lineWidth = 3; ctx.globalAlpha = .28;
      ctx.beginPath(); ctx.arc(0, 0, 58, -1.52, 1.45); ctx.stroke(); ctx.restore();
    }
    if (f.animacao === 'special') { ctx.strokeStyle = f.cor; ctx.lineWidth = 7; ctx.globalAlpha = .65; ctx.beginPath(); ctx.arc(74, -107, 42 + Math.sin(agora / 30) * 10, -1.5, 1.5); ctx.stroke(); }
    ctx.restore();
    if (naFrente) manifestacao(f, agora, true);
  }
  function desenhar(agora) {
    ctx.save(); if (shake > 0) ctx.translate((Math.random() - .5) * 18 * shake / .26, (Math.random() - .5) * 12 * shake / .26);
    fundo();
    if (['luta', 'treino', 'fim'].includes(modo)) {
      guerreiro(p1, agora); guerreiro(p2, agora);
      for (const part of particulas) { ctx.globalAlpha = Math.min(1, part.tempo / part.max); ctx.fillStyle = part.cor; ctx.beginPath(); ctx.arc(part.x, part.y, part.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const m of mensagens) { ctx.globalAlpha = Math.min(1, m.tempo * 1.6); ctx.fillStyle = m.cor; ctx.font = '900 22px system-ui'; ctx.textAlign = 'center'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8; ctx.fillText(m.texto, m.x, m.y); ctx.shadowBlur = 0; }
      ctx.globalAlpha = 1;
    } else {
      // Silhuetas decorativas mantêm a arena viva atrás dos menus.
      const a = R.lutador(jogadorId, 'p1'), b = R.lutador(rivalId, 'p2'); a.x = 450; b.x = 840; a.facing = 1; b.facing = -1; a.etero = b.etero = 100;
      guerreiro(a, agora); guerreiro(b, agora);
    }
    ctx.restore();
  }
  function frame(agora) {
    const dt = ultimo ? Math.min((agora - ultimo) / 1000, .04) : 0; ultimo = agora;
    if (['luta', 'treino'].includes(modo)) movimento(dt);
    desenhar(agora); requestAnimationFrame(frame);
  }
  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => mostrarVista(b.dataset.view)));
  $('start-training').addEventListener('click', () => iniciar(true)); $('start-fight').addEventListener('click', () => iniciar(false));
  $('rematch-button').addEventListener('click', () => iniciar(ultimoTreino));
  $('exit-fight').addEventListener('click', sair);
  $('fullscreen-button').addEventListener('click', async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
    catch (_) { document.body.classList.toggle('fullscreen'); }
  });
  document.addEventListener('fullscreenchange', () => document.body.classList.toggle('fullscreen', !!document.fullscreenElement));
  document.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return; teclas.add(e.code);
    if (e.code === 'Space') pular();
    if (e.code === 'KeyJ') atacar('quick'); if (e.code === 'KeyK') atacar('heavy'); if (e.code === 'KeyL') atacar('special');
  });
  document.addEventListener('keyup', (e) => teclas.delete(e.code));
  window.addEventListener('blur', () => { teclas.clear(); toque.left = toque.right = toque.guard = false; });
  document.querySelectorAll('[data-action]').forEach((b) => {
    const action = b.dataset.action;
    const start = (e) => { e.preventDefault(); if (b.setPointerCapture) b.setPointerCapture(e.pointerId); if (action === 'left' || action === 'right' || action === 'guard') toque[action] = true; else if (action === 'jump') pular(); else atacar(action); };
    const stop = () => { if (action in toque) toque[action] = false; };
    b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('lostpointercapture', stop);
  });
  window.addEventListener('resize', ajustar); if ('ResizeObserver' in window) new ResizeObserver(ajustar).observe(canvas);
  elenco(); atualizarVersus(); ajustar(); mostrarVista('inicio'); requestAnimationFrame(frame);
})();
