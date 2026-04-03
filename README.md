# technology

Base inicial con Astro `6.1.1` para generar un sitio estatico y publicarlo en GitHub Pages.

## Scripts

- `npm install`
- `npm run dev`
- `npm run check`
- `npm run build`
- `npm run preview`

## Deploy

El workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) compila el sitio y publica `dist/` en GitHub Pages cuando hay un push a `main`.

## GitHub Pages

En el repositorio de GitHub:

1. Ir a `Settings > Pages`.
2. En `Build and deployment`, elegir `GitHub Actions`.

La configuracion de Astro calcula `base` automaticamente:

- `https://<owner>.github.io/` para repos tipo `<owner>.github.io`
- `/<repo>` para repos normales como este
