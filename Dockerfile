FROM oven/bun:1.3.0-alpine AS builder

WORKDIR /app

COPY index.ts display.ts speedtest.ts speedtest-worker.ts worker.ts types.ts tsconfig.json package.json bun.lock ./

RUN bun build --compile --minify --outfile=/out/kagi-speedtest index.ts

FROM alpine:3.20

COPY --from=builder /out/kagi-speedtest /usr/local/bin/kagi-speedtest
RUN apk --no-cache add ca-certificates libstdc++

ENTRYPOINT ["/usr/local/bin/kagi-speedtest"]
