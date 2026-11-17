(async function () {
  'use strict';

  const config = window.JOGO_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const canvas = $('game');
  const ctx = canvas.getContext('2d');
  const startScreen = $('start-screen');
  const endScreen = $('end-screen');
  const W = Regras.W;
  const H = 600;
  const FLOOR = Regras.FLOOR;
  let nuvem = Regras.novaNuvem();
  let portais = [];
  let estado = 'ready';
  let pontos = 0;
  let recorde = 0;
  let ultimoQuadro = 0;
  let relogioPortal = 0;
  let deslocamentoCeu = 0;
  let salvando = false;

  document.title = config.nome || 'Desvia, Nuvem!';
  $('titulo').textContent = config.nome || 'Desvia, Nuvem!';
  if (config.cor) {
    document.documentElement.style.setProperty('--cor', config.cor);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', config.cor);
  }

  PlacarUI.montar($('painel-placar'));
  const progresso = await Placar.iniciar();
  recorde = progresso.melhor;
  $('best-score').textContent = String(recorde);
  Placar.aoMudar((p) => {
    recorde = p.melhor;
    $('best-score').textContent = String(recorde);
  });

  function redimensionar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }

  function mostrarFim() {
    if (estado !== 'playing' || salvando) return;
    estado = 'over';
    salvando = true;
    $('final-score').textContent = String(pontos);
    $('save-message').textContent = 'Salvando recorde...';
    endScreen.hidden = false;
    Placar.registrarPartida(pontos).then(() => {
      $('save-message').textContent = 'Pontuação salva neste aparelho.';
    }).catch((erro) => {
      $('save-message').textContent = 'Não foi possível salvar: ' + erro.message;
    });
  }

  function comecar() {
    nuvem = Regras.novaNuvem();
    portais = [];
    pontos = 0;
    relogioPortal = 0.75;
    salvando = false;
    estado = 'playing';
    $('score').textContent = '0';
    startScreen.hidden = true;
    endScreen.hidden = true;
    voar();
  }

  function voar() {
    if (estado === 'playing') nuvem = Regras.voar(nuvem);
  }

  function atualizar(delta) {
    if (estado !== 'playing') return;
    const dt = Math.min(delta, 0.04);
    deslocamentoCeu = (deslocamentoCeu + 16 * dt) % W;
    nuvem = Regras.atualizarNuvem(nuvem, dt);
    relogioPortal -= dt;
    if (relogioPortal <= 0) {
      portais.push(Regras.criarPortal(Math.random, pontos));
      relogioPortal = 1.55;
    }
    const movidos = Regras.moverPortais(portais, dt, pontos);
    portais = movidos.portais;
    if (movidos.pontos !== pontos) {
      pontos = movidos.pontos;
      $('score').textContent = String(pontos);
    }
    if (Regras.terminou(nuvem, portais)) mostrarFim();
  }

  function desenharNuvem(x, y, escala, opacidade) {
    ctx.save();
    ctx.globalAlpha = opacidade;
    ctx.fillStyle = '#f6ffff';
    ctx.beginPath();
    ctx.ellipse(x, y, 27 * escala, 11 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 12 * escala, y - 5 * escala, 13 * escala, 13 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 2 * escala, y - 10 * escala, 16 * escala, 17 * escala, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 17 * escala, y - 4 * escala, 13 * escala, 13 * escala, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function desenharPortal(portal) {
    const topo = portal.center - portal.gap / 2;
    const baixo = portal.center + portal.gap / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(18,75,91,.2)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ed8350';
    ctx.strokeStyle = '#bd593f';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(portal.x, -18, portal.width, topo + 18, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(portal.x, baixo, portal.width, FLOOR - baixo + 18, 12); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffc27b';
    ctx.fillRect(portal.x + 10, Math.max(0, topo - 14), portal.width - 20, 7);
    ctx.fillRect(portal.x + 10, baixo + 7, portal.width - 20, 7);
    ctx.strokeStyle = 'rgba(255,236,193,.7)';
    ctx.lineWidth = 2;
    for (let y = 30; y < topo - 20; y += 34) {
      ctx.beginPath(); ctx.moveTo(portal.x + 13, y); ctx.lineTo(portal.x + portal.width - 13, y); ctx.stroke();
    }
    for (let y = baixo + 30; y < FLOOR - 16; y += 34) {
      ctx.beginPath(); ctx.moveTo(portal.x + 13, y); ctx.lineTo(portal.x + portal.width - 13, y); ctx.stroke();
    }
    ctx.restore();
  }

  function desenharJogador() {
    ctx.save();
    ctx.translate(nuvem.x, nuvem.y);
    ctx.rotate(Math.max(-0.45, Math.min(0.8, nuvem.vy / 700)));
    ctx.shadowColor = 'rgba(25,80,94,.25)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#f8feff';
    ctx.beginPath();
    ctx.ellipse(-3, 1, 22, 13, 0, 0, Math.PI * 2);
    ctx.arc(-13, -2, 9, 0, Math.PI * 2);
    ctx.arc(-2, -8, 12, 0, Math.PI * 2);
    ctx.arc(10, -2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#25647c';
    ctx.beginPath(); ctx.arc(6, -2, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function desenhar() {
    const ceu = ctx.createLinearGradient(0, 0, 0, H);
    ceu.addColorStop(0, '#75cfe0');
    ceu.addColorStop(1, '#d2f4ee');
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, W, H);
    desenharNuvem(55 - deslocamentoCeu, 118, .8, .82);
    desenharNuvem(250 - deslocamentoCeu * .55, 210, 1, .65);
    desenharNuvem(395 - deslocamentoCeu, 360, .7, .72);

    ctx.fillStyle = '#a6dbbd';
    ctx.beginPath();
    ctx.moveTo(0, 506); ctx.quadraticCurveTo(98, 445, 190, 506);
    ctx.quadraticCurveTo(275, 447, 360, 495); ctx.lineTo(360, FLOOR); ctx.lineTo(0, FLOOR); ctx.fill();
    portais.forEach(desenharPortal);
    desenharJogador();
    ctx.fillStyle = '#6cbd8d'; ctx.fillRect(0, FLOOR, W, 45);
    ctx.fillStyle = '#c1edbd'; ctx.fillRect(0, FLOOR, W, 7);
    ctx.fillStyle = 'rgba(40,132,105,.28)';
    for (let x = -20; x < W + 20; x += 36) {
      ctx.beginPath(); ctx.ellipse(x + (deslocamentoCeu % 36), FLOOR + 20, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function quadro(agora) {
    if (!ultimoQuadro) ultimoQuadro = agora;
    const delta = Math.min((agora - ultimoQuadro) / 1000, 0.04);
    ultimoQuadro = agora;
    atualizar(delta);
    desenhar();
    requestAnimationFrame(quadro);
  }

  function agir() {
    if (estado === 'ready' || estado === 'over') comecar();
    else voar();
  }

  $('start-button').addEventListener('click', comecar);
  $('restart-button').addEventListener('click', comecar);
  canvas.addEventListener('pointerdown', (evento) => { evento.preventDefault(); agir(); });
  window.addEventListener('keydown', (evento) => {
    if ((evento.code === 'Space' || evento.code === 'ArrowUp') && !evento.repeat) {
      evento.preventDefault(); agir();
    }
  });
  window.addEventListener('resize', redimensionar);
  if ('ResizeObserver' in window) new ResizeObserver(redimensionar).observe(canvas);
  redimensionar();
  desenhar();
  requestAnimationFrame(quadro);
})();
