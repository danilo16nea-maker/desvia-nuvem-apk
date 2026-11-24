/* Regras puras da arena: lutadores originais, combate e poderes de éter. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const LUCHADORES = [
    { id: 'sol', nome: 'Ayla Solis', titulo: 'Punho Solar', cor: '#ff9f54', poder: 'Impacto de Aurora', estilo: 'Equilibrada', forca: 1 },
    { id: 'lumen', nome: 'Nilo Vesper', titulo: 'Eco Prismático', cor: '#61d8ec', poder: 'Passo entre instantes', estilo: 'Velocidade', forca: .88 },
    { id: 'umbra', nome: 'Vera Umbra', titulo: 'Manto do Vazio', cor: '#bd86ff', poder: 'Campo de silêncio', estilo: 'Controle', forca: .95 },
    { id: 'brasa', nome: 'Téo Brasa', titulo: 'Fera Ressonante', cor: '#ff647c', poder: 'Onda de ruptura', estilo: 'Potência', forca: 1.12 }
  ];
  const MAX_VIDA = 100;
  const MAX_ETERO = 100;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function lutador(id, lado) {
    const personagem = LUCHADORES.find((p) => p.id === id) || LUCHADORES[0];
    return { id: personagem.id, nome: personagem.nome, cor: personagem.cor, poder: personagem.poder,
      lado: lado || 'p1', x: lado === 'p2' ? 780 : 500, y: 0, vida: MAX_VIDA, etero: 35,
      guarda: false, noAr: false, vy: 0, agachado: false, invulneravel: 0, atordoado: 0,
      recuperacao: 0, flash: 0, animacao: 'idle', facing: lado === 'p2' ? -1 : 1, forca: personagem.forca,
      especiais: 0 };
  }
  function iniciarPulo(f) {
    if (!f || f.noAr || f.y > 0 || f.atordoado > 0) return f;
    return { ...f, noAr: true, vy: 720, animacao: 'jump' };
  }
  function atualizarPulo(f, delta) {
    if (!f) return f;
    const dt = clamp(Number(delta) || 0, 0, .04);
    if (!f.noAr && f.y <= 0) return { ...f, y: 0, vy: 0 };
    const vy = f.vy - 1800 * dt;
    const y = f.y + (f.vy + vy) * .5 * dt;
    if (y <= 0) return { ...f, y: 0, vy: 0, noAr: false, pouso: .18, animacao: 'idle' };
    return { ...f, y, vy };
  }
  function dano(atacante, defensor, base, opcoes) {
    const opts = opcoes || {};
    if (!atacante || !defensor || defensor.vida <= 0 || defensor.invulneravel > 0) {
      return { atacante, defensor, causado: 0, bloqueado: false, acertou: false };
    }
    const valor = Math.max(0, Number(base) || 0) * (Number(atacante.forca) || 1);
    const bloqueado = !!defensor.guarda && !opts.rompeGuarda;
    const causado = Math.round(valor * (bloqueado ? .18 : 1));
    const novoDefensor = { ...defensor, vida: clamp(defensor.vida - causado, 0, MAX_VIDA),
      etero: clamp(defensor.etero + (bloqueado ? 5 : 10), 0, MAX_ETERO),
      atordoado: bloqueado ? Math.max(defensor.atordoado, .06) : Math.max(defensor.atordoado, opts.stun || .24),
      flash: .13, recuo: Math.sign(defensor.x - atacante.x) * (bloqueado ? 55 : 230), animacao: bloqueado ? 'block' : 'hit' };
    const novoAtacante = { ...atacante, etero: clamp(atacante.etero + (bloqueado ? 4 : 7), 0, MAX_ETERO) };
    return { atacante: novoAtacante, defensor: novoDefensor, causado, bloqueado, acertou: true };
  }
  function especial(atacante, defensor) {
    const custo = atacante && atacante.id === 'brasa' ? 40 : 35;
    if (!atacante || atacante.etero < custo || atacante.vida <= 0) {
      return { atacante, defensor, acertou: false, causado: 0, mensagem: 'Éter insuficiente' };
    }
    let forcaEspecial = 23, alcance = 345, stun = .52;
    const gasto = { ...atacante, etero: atacante.etero - custo, especiais: atacante.especiais + 1, animacao: 'special', recuperacao: atacante.recuperacao > 0 ? atacante.recuperacao : .72 };
    if (atacante.id === 'sol') forcaEspecial = 27; // Impacto de Aurora: explosão de alto dano.
    if (atacante.id === 'lumen') { forcaEspecial = 18; gasto.x = defensor.x - Math.sign(defensor.x - atacante.x) * 100; gasto.invulneravel = .42; } // avança num salto entre instantes.
    if (atacante.id === 'umbra') { forcaEspecial = 16; stun = .95; } // Campo de silêncio: mantém o rival suspenso.
    if (atacante.id === 'brasa') { forcaEspecial = 20; alcance = 420; stun = .68; } // onda larga que rompe a guarda.
    const distancia = Math.abs(atacante.x - defensor.x);
    if (distancia > alcance) return { atacante: gasto, defensor, acertou: false, causado: 0, mensagem: 'O poder não alcançou!' };
    const golpe = dano(gasto, defensor, forcaEspecial, { rompeGuarda: true, stun });
    return { ...golpe, mensagem: golpe.acertou ? `${atacante.poder}!` : 'Poder bloqueado' };
  }
  function golpeRapido(atacante, defensor) {
    if (Math.abs(atacante.x - defensor.x) > 125) return { atacante, defensor, causado: 0, acertou: false, mensagem: 'Fora de alcance' };
    const golpe = dano(atacante, defensor, 8, { stun: .16 });
    return { ...golpe, mensagem: golpe.bloqueado ? 'Defesa firme!' : 'Golpe rápido!' };
  }
  function golpeForte(atacante, defensor) {
    if (Math.abs(atacante.x - defensor.x) > 150) return { atacante, defensor, causado: 0, acertou: false, mensagem: 'Fora de alcance' };
    const golpe = dano(atacante, defensor, 15, { stun: .34 });
    return { ...golpe, mensagem: golpe.bloqueado ? 'Defesa firme!' : 'Golpe forte!' };
  }
  function vencedor(a, b) {
    if (a.vida <= 0 && b.vida <= 0) return 'empate';
    if (a.vida <= 0) return 'p2';
    if (b.vida <= 0) return 'p1';
    return null;
  }
  return { LUCHADORES, MAX_VIDA, MAX_ETERO, clamp, lutador, iniciarPulo, atualizarPulo, dano, especial, golpeRapido, golpeForte, vencedor };
});
