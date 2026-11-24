# Ecos do Eter Arena — estado do projeto

## Jogo

- Arena de luta 2D em tela cheia, ajustada para paisagem no APK.
- Menus: início, treino, luta e seleção de personagem para os dois lados.
- Elenco original: Ayla Solis, Nilo Vesper, Vera Umbra e Téo Brasa, cada qual com cor e poder especial próprios.
- Golpes rápidos e fortes, defesa, pulo, barra de vida e éter, rival controlado pelo jogo e placar local.
- Animações: stand atrás em repouso e à frente em ataque/defesa; contorno defensivo neutro, golpes com avanço e recuo ao receber impacto, pulo com arco físico e aterrissagem suave.
- Pontuação e recorde ocultos durante treino e luta; botão de pulo para toque.
- Código do projeto em `docs/jogo/`; regras de combate puras em `docs/jogo/regras.js`.

## Conferência

- `node scripts/preparar.mjs` concluído; nome, ícones e manifest do app atualizados.
- `node --check docs/jogo/jogo.js` e `node --check docs/jogo/regras.js` concluídos.
- `node --test tests/*.test.mjs`: 35 aprovados, 0 falhas.

## Publicação

- Repositório: https://github.com/danilo16nea-maker/desvia-nuvem-apk
- Jogo web: https://danilo16nea-maker.github.io/desvia-nuvem-apk/jogo/
- Página de download do APK: https://danilo16nea-maker.github.io/desvia-nuvem-apk/
- Download direto do APK: https://github.com/danilo16nea-maker/desvia-nuvem-apk/releases/latest/download/jogo.apk
- O APK e a versão web são publicados automaticamente pelo GitHub Actions a cada push.
