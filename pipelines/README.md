# coworkspace-pipelines

Pipeline **reutilizable** de CI/CD para los 9 microservicios de CoworkSpace. Cada microservicio lo invoca con `workflow_call`, así que un cambio aquí actualiza el proceso de todos.

```yaml
# .github/workflows/ci.yml en cada microservicio
jobs:
  pipeline:
    uses: YAYR10/coworkspace-pipelines/.github/workflows/microservicio.yml@main
    permissions: { contents: write, packages: write }
    with:
      service-name: booking-service
      notify-repo: YAYR10/coworkspace-api-gateway
    secrets: inherit
```

| Job | Qué hace | Cuándo |
|---|---|---|
| `test` | `npm ci`, Prisma generate, ESLint, Jest, build | siempre (push y pull request) |
| `docker` | Imagen en GHCR con etiqueta = SHA del commit (y `latest`) | `needs: test`, solo push a `main` |
| `deploy` | Deploy Hook de Render con la imagen de ese commit, en el entorno `production` | `needs: docker` |
| `notify` | `repository_dispatch` (`service-deployed`) al API Gateway, que se redespliega | después de `deploy` |

## Entradas

| Input | Por defecto | Uso |
|---|---|---|
| `service-name` | — | Nombre del servicio e imagen (`coworkspace-<service-name>`) |
| `working-directory` | `.` | Carpeta del servicio (en el monorepo: `services/<servicio>`) |
| `node-version` | `20` | Versión de Node |
| `environment` | `production` | Entorno de GitHub; con *required reviewers* exige aprobación manual |
| `notify-repo` | `''` | Repositorio que recibe el `repository_dispatch` |

## Secrets (Settings → Secrets and variables → Actions de cada microservicio)

| Secret | Para qué |
|---|---|
| `RENDER_DEPLOY_HOOK` | URL del Deploy Hook del servicio en Render |
| `DISPATCH_TOKEN` | Token *fine-grained* con permiso *Contents: write* sobre el repositorio del gateway (solo servicios distintos al gateway) |

GHCR usa el `GITHUB_TOKEN` automático: no hace falta guardar credenciales del registro.
