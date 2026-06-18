# Egg templates

Use estes PNGs como base para criar novos itens do ovo avatar em editor de pixel art.

- `base/egg-base.png`: ovo limpo, bom para testar proporcao e volume.
- `guides/egg-guide.png`: inclui zonas de cabelo, rosto, roupa e linha central.
- `items/egg-item-template.png`: contorno leve para desenhar um item por cima e depois ocultar/remover a guia.

Mantenha novos itens em `256x256` px com fundo transparente. Isso deixa cabelo, rosto, boca e roupa alinhados com o preview atual do app.

Estrutura sugerida para arquivos de trabalho:

```txt
assets/egg-templates/
  base/
  guides/
  items/
    eyes/
    mouths/
    outfits/
    hair/
    accessories/
```

Quando o item estiver pronto para entrar no app, copie o PNG final para `public/assets/egg-sprites/<categoria>/`.
