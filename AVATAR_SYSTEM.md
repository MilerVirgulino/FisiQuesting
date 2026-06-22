# Sistema de Avatar Chibi

O avatar atual usa um chibi cabecao personalizavel. As camadas do personagem sao carregadas do catalogo no Firebase e renderizadas no frontend a partir de `pixelData` ou de fontes remotas aprovadas.

## Onde ficam os modelos PNG

Use esta pasta como base para desenhar itens novos:

```txt
assets/egg-templates/
```

Arquivos:

- `base/chibi-body-base.png`: chibi cabecao limpo em PNG transparente.
- `guides/chibi-body-guide.png`: chibi cabecao com linhas-guia para rosto, cabelo, roupa, bracos e pes.
- `items/chibi-body-item-template.png`: contorno leve para desenhar itens por cima.

Todos os modelos tem `256x256` px, fundo transparente e o personagem centralizado. Eles servem apenas como referencia externa para desenho; o fluxo principal de criacao acontece na oficina de pixel art do app.

## Onde entram itens novos

Itens finais entram pelo Firebase:

- o aluno desenha na oficina do app;
- a criacao fica em `customAccessoryRequests`;
- o admin aprova, escolhe categoria e preco;
- itens aprovados aparecem no catalogo do avatar;
- corpos na categoria `base` ficam gratuitos automaticamente.

## Como o app salva o avatar

O documento do usuario salva escolhas simples:

```js
{
  avatar: {
    kind: "chibi",
    base: "id_do_corpo_publicado",
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
Firebase (`avatarItems` e `customAccessoryRequests` publicados)
```

O desenho atual fica em:

```txt
src/components/AvatarPreview.jsx
```

Quando um item novo sair do editor de pixel art, ele deve ser aprovado no painel admin. O app monta o catalogo a partir do Firebase; catalogos e sprites locais foram removidos.
