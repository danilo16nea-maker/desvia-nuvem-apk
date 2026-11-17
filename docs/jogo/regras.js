/* Regras puras de Desvia, Nuvem! O sorteio é recebido para permitir testes repetíveis. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const W = 360;
  const FLOOR = 555;
  const PLAYER_X = 92;
  const RADIUS = 15;
  const GRAVITY = 1180;
  const IMPULSE = -405;
  const GATE_WIDTH = 68;

  function novaNuvem() {
    return { x: PLAYER_X, y: 300, vy: 0, radius: RADIUS };
  }

  function voar(nuvem) {
    return { ...nuvem, vy: IMPULSE };
  }

  function atualizarNuvem(nuvem, delta) {
    const dt = Math.max(0, Math.min(Number(delta) || 0, 0.04));
    const vy = nuvem.vy + GRAVITY * dt;
    return { ...nuvem, vy, y: nuvem.y + vy * dt };
  }

  function velocidade(pontos) {
    return Math.min(285, 172 + Math.max(0, Number(pontos) || 0) * 3.2);
  }

  function criarPortal(sorteio, pontos) {
    const aleatorio = typeof sorteio === 'function' ? sorteio : Math.random;
    const gap = Math.max(145, 174 - Math.max(0, Number(pontos) || 0) * 1.2);
    const margem = 82 + gap / 2;
    const faixa = FLOOR - 24 - margem * 2;
    const r = Math.max(0, Math.min(0.999999999, Number(aleatorio()) || 0));
    return { x: W + 36, width: GATE_WIDTH, center: margem + r * faixa, gap, counted: false };
  }

  function moverPortais(portais, delta, pontos) {
    const dt = Math.max(0, Math.min(Number(delta) || 0, 0.04));
    const dx = velocidade(pontos) * dt;
    let novosPontos = pontos;
    const atualizados = [];
    for (const portal of portais) {
      const x = portal.x - dx;
      let counted = portal.counted;
      if (!counted && x + portal.width < PLAYER_X) {
        counted = true;
        novosPontos += 1;
      }
      if (x + portal.width >= -4) atualizados.push({ ...portal, x, counted });
    }
    return { portais: atualizados, pontos: novosPontos };
  }

  function colideBorda(nuvem) {
    return nuvem.y - nuvem.radius < 0 || nuvem.y + nuvem.radius > FLOOR - 4;
  }

  function colidePortal(nuvem, portal) {
    const sobrepoeX = nuvem.x + nuvem.radius > portal.x && nuvem.x - nuvem.radius < portal.x + portal.width;
    const topoVao = portal.center - portal.gap / 2;
    const baixoVao = portal.center + portal.gap / 2;
    const bateParede = nuvem.y - nuvem.radius < topoVao || nuvem.y + nuvem.radius > baixoVao;
    return sobrepoeX && bateParede;
  }

  function terminou(nuvem, portais) {
    return colideBorda(nuvem) || portais.some((portal) => colidePortal(nuvem, portal));
  }

  return { W, FLOOR, PLAYER_X, RADIUS, GRAVITY, IMPULSE, GATE_WIDTH,
    novaNuvem, voar, atualizarNuvem, velocidade, criarPortal, moverPortais,
    colideBorda, colidePortal, terminou };
});
