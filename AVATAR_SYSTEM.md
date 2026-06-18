# Sistema de Ovo Avatar

O avatar atual foi simplificado para um ovo personalizavel. O app desenha o personagem em SVG dentro de `src/components/AvatarPreview.jsx`, sem spritesheet, manifesto ou recorte automatico.

## Onde ficam os modelos PNG

Use esta pasta como base para desenhar itens novos:

```txt
assets/egg-templates/
```

Arquivos:

- `base/egg-base.png`: ovo limpo em PNG transparente.
- `guides/egg-guide.png`: ovo com linhas-guia para rosto, cabelo e roupa.
- `items/egg-item-template.png`: contorno leve para desenhar itens por cima.

Todos os modelos tem `256x256` px, fundo transparente e o ovo centralizado. Ao criar uma roupa, cabelo, olho ou boca em pixel art, mantenha o arquivo nessa mesma dimensao para facilitar encaixar depois no app.

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
  outfits/
  hair/
  accessories/
```

O `id` cadastrado no objeto deve ser igual ao nome do arquivo, sem `.png`.

Exemplo:

```js
outfit: {
  folder: "outfits",
  defaultId: "outfit_scarf",
  items: {
    outfit_scarf: { label: "Cachecol", source: "svg" },
    roupa_azul: { label: "Roupa azul" }
  }
}
```

Arquivo correspondente:

```txt
public/assets/egg-sprites/outfits/roupa_azul.png
```

Itens sem `source: "svg"` sao tratados como PNG automaticamente.

## Como o app salva o avatar

O documento do usuario salva escolhas simples:

```js
{
  avatar: {
    kind: "egg",
    base: "egg_plain",
    eyes: "eyes_dot",
    mouth: "mouth_smile",
    outfit: "outfit_scarf",
    hair: "hair_sprout",
    colors: {
      egg: "#fff2c7",
      accent: "#f59e0b",
      outfit: "#2563eb",
      hair: "#3b2416"
    }
  }
}
```

## Onde cadastrar opcoes novas

As opcoes que aparecem no editor ficam em:

```txt
src/data/avatarItems.js
```

O desenho atual fica em:

```txt
src/components/AvatarPreview.jsx
```

Quando um item novo sair do editor de pixel art, coloque o PNG na pasta publica da categoria e adicione uma entrada em `items` usando o mesmo `id` do arquivo.
