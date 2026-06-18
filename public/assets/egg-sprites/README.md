# Egg sprites

Coloque aqui os PNGs finais que o app deve carregar no avatar.

O caminho e montado automaticamente a partir da categoria e do `id` cadastrado em `src/data/avatarItems.json`.

Exemplo:

```js
camisa_azul: { label: "Camisa azul", source: "png", price: 20 }
```

Arquivo esperado:

```txt
public/assets/egg-sprites/shirts/camisa_azul.png
```

Use PNG transparente em `256x256` px.

Categorias atuais:

```txt
hair/
shirts/
eyes/
mouths/
accessories/
pants/
pets/
base/
```
