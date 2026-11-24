import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const Regras = require('../docs/jogo/regras.js');

test('elenco possui quatro lutadores originais com identidades e cores próprias', () => {
  assert.equal(Regras.LUCHADORES.length, 4);
  assert.equal(new Set(Regras.LUCHADORES.map((x) => x.id)).size, 4);
  assert.equal(new Set(Regras.LUCHADORES.map((x) => x.cor)).size, 4);
  assert.ok(Regras.LUCHADORES.every((x) => x.poder && x.nome));
});

test('lutador inicializa vida, éter, posição e lado corretamente', () => {
  const a = Regras.lutador('lumen', 'p1');
  const b = Regras.lutador('brasa', 'p2');
  assert.equal(a.vida, 100); assert.equal(a.etero, 35); assert.equal(a.facing, 1);
  assert.equal(b.facing, -1); assert.equal(b.id, 'brasa');
});

test('pulo usa impulso e sobe em passos suaves, sem teletransportar o lutador', () => {
  const inicio = Regras.iniciarPulo(Regras.lutador('sol', 'p1'));
  const primeiro = Regras.atualizarPulo(inicio, 1 / 60);
  assert.equal(inicio.y, 0);
  assert.ok(primeiro.y > 0 && primeiro.y < 20);
  assert.equal(primeiro.noAr, true);
});

test('pulo atinge um arco e aterrissa com velocidade zerada', () => {
  let lutador = Regras.iniciarPulo(Regras.lutador('sol', 'p1'));
  let pico = 0;
  for (let i = 0; i < 60 && lutador.noAr; i++) {
    lutador = Regras.atualizarPulo(lutador, 1 / 60);
    pico = Math.max(pico, lutador.y);
  }
  assert.ok(pico > 100);
  assert.equal(lutador.y, 0);
  assert.equal(lutador.vy, 0);
  assert.equal(lutador.noAr, false);
});

test('não inicia outro pulo enquanto ainda está no ar', () => {
  const noAr = Regras.iniciarPulo(Regras.lutador('sol', 'p1'));
  assert.equal(Regras.iniciarPulo(noAr), noAr);
});

test('ataque rápido causa dano e recarrega um pouco do éter', () => {
  const a = Regras.lutador('sol', 'p1'), b = Regras.lutador('umbra', 'p2'); b.x = 490;
  const golpe = Regras.golpeRapido(a, b);
  assert.equal(golpe.acertou, true); assert.equal(golpe.causado, 8);
  assert.equal(golpe.defensor.vida, 92); assert.equal(golpe.atacante.etero, 42);
});

test('defesa reduz o dano e não tira vida abaixo de zero', () => {
  const a = Regras.lutador('brasa', 'p1'), b = { ...Regras.lutador('sol', 'p2'), guarda: true, vida: 3 };
  const golpe = Regras.dano(a, b, 15);
  assert.equal(golpe.bloqueado, true); assert.equal(golpe.defensor.vida, 0);
  assert.equal(golpe.causado, 3);
  assert.equal(golpe.defensor.recuo, 55);
});

test('golpe fora de alcance não causa dano', () => {
  const a = Regras.lutador('sol', 'p1'), b = Regras.lutador('umbra', 'p2'); b.x = 900;
  const golpe = Regras.golpeForte(a, b);
  assert.equal(golpe.acertou, false); assert.equal(golpe.defensor.vida, 100);
});

test('especial precisa de 35 de éter, gasta energia e pode romper guarda', () => {
  const a = { ...Regras.lutador('sol', 'p1'), etero: 35 };
  const b = { ...Regras.lutador('sol', 'p2'), x: 600, guarda: true };
  const golpe = Regras.especial(a, b);
  assert.equal(golpe.acertou, true); assert.equal(golpe.atacante.etero, 7);
  assert.equal(golpe.defensor.vida, 73); assert.equal(golpe.bloqueado, false);
});

test('especial insuficiente não muda o estado', () => {
  const a = { ...Regras.lutador('sol', 'p1'), etero: 34 }, b = Regras.lutador('umbra', 'p2');
  const golpe = Regras.especial(a, b);
  assert.equal(golpe.acertou, false); assert.equal(golpe.atacante.etero, 34);
  assert.equal(golpe.defensor.vida, 100);
});

test('especial fora de alcance consome energia mas não acerta', () => {
  const a = { ...Regras.lutador('sol', 'p1'), etero: 50 }, b = Regras.lutador('umbra', 'p2'); b.x = 1000;
  const golpe = Regras.especial(a, b);
  assert.equal(golpe.acertou, false); assert.equal(golpe.atacante.etero, 15);
  assert.equal(golpe.defensor.vida, 100);
});

test('lutador invulnerável ignora golpes', () => {
  const a = Regras.lutador('sol', 'p1'), b = { ...Regras.lutador('umbra', 'p2'), invulneravel: .2 };
  const golpe = Regras.golpeRapido(a, b);
  assert.equal(golpe.acertou, false); assert.equal(golpe.defensor.vida, 100);
});

test('vitória, derrota, empate e luta em andamento são detectados', () => {
  const a = Regras.lutador('sol', 'p1'), b = Regras.lutador('umbra', 'p2');
  assert.equal(Regras.vencedor(a, b), null);
  assert.equal(Regras.vencedor({ ...a, vida: 0 }, b), 'p2');
  assert.equal(Regras.vencedor(a, { ...b, vida: 0 }), 'p1');
  assert.equal(Regras.vencedor({ ...a, vida: 0 }, { ...b, vida: 0 }), 'empate');
});

test('dano recebido e energia nunca ultrapassam seus limites', () => {
  const a = { ...Regras.lutador('brasa', 'p1'), forca: 10 }, b = { ...Regras.lutador('sol', 'p2'), etero: 99 };
  const golpe = Regras.dano(a, b, 1000);
  assert.equal(golpe.defensor.vida, 0); assert.equal(golpe.defensor.etero, 100);
});
