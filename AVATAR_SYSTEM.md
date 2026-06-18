# Sistema de Avatar Chibi

O avatar atual usa um chibi cabecao personalizavel. O app desenha o personagem base em SVG dentro de `src/components/AvatarPreview.jsx`, sem spritesheet, manifesto ou recorte automatico.

## Onde ficam os modelos PNG

Use esta pasta como base para desenhar itens novos:

```txt
assets/egg-templates/
```

Arquivos:

- `base/chibi-body-base.png`: chibi cabecao limpo em PNG transparente.
- `guides/chibi-body-guide.png`: chibi cabecao com linhas-guia para rosto, cabelo, roupa, bracos e pes.
- `items/chibi-body-item-template.png`: contorno leve para desenhar itens por cima.

Todos os modelos tem `256x256` px, fundo transparente e o personagem centralizado. Ao criar cabelo, camisa, olhos, bocas, acessorios, calcas ou pets em pixel art, mantenha o arquivo nessa mesma dimensao para facilitar encaixar depois no app.

## Onde colocar sprites novos

Sprites finais que o app deve carregar ficam em:

```txt
public/assets/egg-sprites/
```

Estrutura:

```txt
public/assets/egg-sprites/
  base/
  eyes/
  mouths/
  hair/
  shirts/
  accessories/
  pants/
  pets/
```

O `id` cadastrado no objeto deve ser igual ao nome do arquivo, sem `.png`.

Exemplo:

```js
shirts: {
  folder: "shirts",
  defaultId: "shirt_none",
  items: {
    shirt_none: { label: "Nenhuma", source: "svg" },
    camisa_azul: { label: "Camisa azul", source: "png", price: 20 }
  }
}
```

Arquivo correspondente:

```txt
public/assets/egg-sprites/shirts/camisa_azul.png
```

Itens sem `source: "svg"` sao tratados como PNG automaticamente.
Itens com `price` maior que zero precisam ser comprados com moedas antes de salvar.

## Como o app salva o avatar

O documento do usuario salva escolhas simples:

```js
{
  avatar: {
    kind: "chibi",
    base: "chibi_body",
    hair: "hair_none",
    shirts: "shirt_none",
    eyes: "eyes_none",
    mouths: "mouth_none",
    accessories: "accessories_none",
    pants: "pants_none",
    pets: "pets_none"
  }
}
```

## Onde cadastrar opcoes novas

As opcoes que aparecem no editor ficam em:

```txt
src/data/avatarItems.json
```

O desenho atual fica em:

```txt
src/components/AvatarPreview.jsx
```

Quando um item novo sair do editor de pixel art, coloque o PNG na pasta publica da categoria e adicione uma entrada em `items` usando o mesmo `id` do arquivo. O arquivo `src/data/avatarItems.js` so transforma esse JSON em funcoes para o app.
