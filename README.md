# CAPS — Organize Rolês com Amigos

## Sobre o projeto

Aplicação web para organizar eventos/rolês com amigos, incluindo criação de eventos, RSVPs, enquetes e memórias.

## Como editar o código

Você pode trabalhar localmente com sua IDE preferida. Pré-requisitos: Node.js e npm instalados — recomendo instalar via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

Passos:

```sh
# 1) Clone o repositório usando a URL do seu projeto
git clone <URL_DO_SEU_REPOSITORIO>

# 2) Entre na pasta do projeto
cd amamosdemais

# 3) Instale as dependências
npm i

# 4) Inicie o servidor de desenvolvimento
npm run dev
```

Também é possível editar diretamente no GitHub (ícone de lápis em cada arquivo) ou usar GitHub Codespaces.

## Tecnologias

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deploy

O deploy para GitHub Pages está configurado via GitHub Actions em `.github/workflows/deploy.yml`. Ao fazer push na `main`, o fluxo compila e publica automaticamente.
