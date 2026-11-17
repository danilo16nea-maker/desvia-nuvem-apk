import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const Regras = require('../docs/jogo/regras.js');

test('a nuvem começa no centro da faixa e voa com impulso para cima', () => {
  const nuvem = Regras.novaNuvem();
  assert.equal(nuvem.x, Regras.PLAYER_X);
  assert.equal(nuvem.y, 300);
  assert.equal(Regras.voar(nuvem).vy, Regras.IMPULSE);
});

test('a gravidade aumenta a velocidade e move a nuvem para baixo', () => {
  const nuvem = Regras.atualizarNuvem(Regras.novaNuvem(), 0.02);
  assert.ok(nuvem.vy > 0);
  assert.ok(nuvem.y > 300);
});

test('um delta muito grande é limitado para estabilizar a física', () => {
  const longa = Regras.atualizarNuvem(Regras.novaNuvem(), 2);
  const limitada = Regras.atualizarNuvem(Regras.novaNuvem(), 0.04);
  assert.deepEqual(longa, limitada);
});

test('portais usam o sorteio recebido e mantêm o vão dentro da tela', () => {
  const baixo = Regras.criarPortal(() => 0, 0);
  const alto = Regras.criarPortal(() => 0.999, 0);
  assert.equal(baixo.x, Regras.W + 36);
  assert.equal(baixo.gap, 174);
  assert.ok(baixo.center - baixo.gap / 2 >= 82);
  assert.ok(alto.center + alto.gap / 2 <= Regras.FLOOR - 24);
  assert.notEqual(baixo.center, alto.center);
});

test('o vão diminui até o limite e a velocidade não cresce sem limite', () => {
  assert.equal(Regras.criarPortal(() => 0.5, 30).gap, 145);
  assert.equal(Regras.velocidade(0), 172);
  assert.equal(Regras.velocidade(1000), 285);
});

test('a nuvem pode passar pelo centro sem colisão e bate nas paredes do portal', () => {
  const portal = { x: 80, width: 68, center: 300, gap: 170 };
  assert.equal(Regras.colidePortal({ x: 92, y: 300, radius: 15 }, portal), false);
  assert.equal(Regras.colidePortal({ x: 92, y: 180, radius: 15 }, portal), true);
  assert.equal(Regras.colidePortal({ x: 20, y: 180, radius: 15 }, portal), false);
});

test('a nuvem perde ao tocar o topo ou o chão', () => {
  assert.equal(Regras.colideBorda({ y: 14, radius: 15 }), true);
  assert.equal(Regras.colideBorda({ y: 300, radius: 15 }), false);
  assert.equal(Regras.colideBorda({ y: 540, radius: 15 }), true);
});

test('um portal dá um ponto uma única vez quando fica para trás', () => {
  const portal = { x: 20, width: 68, center: 300, gap: 170, counted: false };
  const passo = Regras.moverPortais([portal], 0.4, 0);
  assert.equal(passo.pontos, 1);
  const repetido = Regras.moverPortais(passo.portais, 0.4, passo.pontos);
  assert.equal(repetido.pontos, 1);
});

test('o jogo termina ao bater na borda ou em um portal', () => {
  const portal = { x: 80, width: 68, center: 300, gap: 170 };
  assert.equal(Regras.terminou({ x: 92, y: 300, radius: 15 }, [portal]), false);
  assert.equal(Regras.terminou({ x: 92, y: 180, radius: 15 }, [portal]), true);
});
