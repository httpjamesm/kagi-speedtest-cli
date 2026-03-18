# kagi-speedtest-cli

CLI for running network speed tests against Kagi's speedtest endpoint.

## Run locally (Bun)

```bash
bun install
bun run index.ts
```

## Docker (lightweight)

This repo includes a multi-stage Docker build that compiles a single binary with Bun and ships it in a tiny runtime image.

Build locally:

```bash
docker build -t kagi-speedtest-cli:local .
```

Run:

```bash
docker run --rm kagi-speedtest-cli:local
```

Pass CLI flags through Docker:

```bash
docker run --rm kagi-speedtest-cli:local --help
docker run --rm kagi-speedtest-cli:local --url https://speedtest.example.com
```

## Pull from GHCR

Images are published to:

```text
ghcr.io/httpjamesm/kagi-speedtest-cli
```

Example pull and run:

```bash
docker pull ghcr.io/httpjamesm/kagi-speedtest-cli:latest
docker run --rm ghcr.io/httpjamesm/kagi-speedtest-cli:latest
```

Concrete image path for this repo: `ghcr.io/httpjamesm/kagi-speedtest-cli:latest`

## Automatic GHCR publishing

GitHub Actions workflow: `.github/workflows/docker-publish.yml`

It publishes multi-arch images (`linux/amd64`, `linux/arm64`) to GHCR on:

- pushes to `main`
- version tags like `v1.0.0`
- manual dispatch from Actions tab
