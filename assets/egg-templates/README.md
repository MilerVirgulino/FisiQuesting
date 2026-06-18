# Egg templates

Use estes PNGs como base para criar novos itens do avatar chibi em editor de pixel art.

- `base/chibi-body-base.png`: chibi cabecao limpo, bom para testar proporcao e volume.
- `guides/chibi-body-guide.png`: inclui zonas de cabelo, rosto, roupa, bracos e pes.
- `items/chibi-body-item-template.png`: contorno leve para desenhar um item por cima e depois ocultar/remover a guia.

Mantenha novos itens em `256x256` px com fundo transparente. Isso deixa cabelo, camisa, olhos, bocas, acessorios, calcas e pets alinhados com o preview atual do app.

Estrutura sugerida para arquivos de trabalho:

```txt
assets/egg-templates/
  base/
  guides/
  items/
    hair/
    shirts/
    eyes/
    mouths/
    accessories/
    pants/
    pets/
```

Quando o item estiver pronto para entrar no app, copie o PNG final para `public/assets/egg-sprites/<categoria>/`.
Depois cadastre o item em `src/data/avatarItems.json`, usando o mesmo `id` do nome do arquivo.
