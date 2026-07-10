# Observatory

English README: [README.en.md](./README.en.md)

LLM 向けの観測基盤。検索・取得・抽出・要約を隠蔽し、`observe()` という高レベル API だけを公開する。

## What Observatory is not

- Not a Google Search wrapper
- Not a generic web scraper
- Not a crawler-only tool
- Not a RAG database by itself

Observatory is an observation layer that searches, fetches, extracts, summarizes, stores, and returns evidence-backed observations.

## ローカル常駐起動（推奨）

前提: [Docker Desktop](https://www.docker.com/products/docker-desktop/) など Docker Compose v2 が使えること。

### 1. バックエンド起動

`.env.example` を `.env` にコピーして API key を設定し、リポジトリルートで:

```bash
docker compose up -d --build
```

起動するサービス:

| サービス            | URL                        | 説明                     |
| ------------------- | -------------------------- | ------------------------ |
| observation-service | http://localhost:52033     | 観測 API                 |
| searxng             | http://localhost:52034     | 検索エンジン             |
| postgres            | localhost:52035            | 観測履歴 DB              |
| valkey              | (内部)                     | SearXNG 用キャッシュ     |
| mcp-server-http     | http://localhost:52036/mcp | 常駐 Streamable HTTP MCP |

動作確認:

```bash
curl http://localhost:52033/health
curl http://localhost:52036/health
```

### 2. MCP Server（ホストアプリ / HTTP MCP クライアント）

常駐版は `http://127.0.0.1:52036/mcp` で利用できます。HTTP MCP クライアントにはこの URL を設定してください。常駐版は `docker compose up -d --build` に含まれ、`docker compose restart mcp-server-http` で再起動できます。

`examples/cursor-mcp-docker.json` を参考に設定してください。`docker-compose.yml` のパスは環境に合わせて変更してください。

```json
{
  "mcpServers": {
    "observatory": {
      "command": "docker",
      "args": [
        "compose",
        "-f",
        "/path/to/observatory/docker-compose.yml",
        "--profile",
        "mcp",
        "run",
        "--rm",
        "-i",
        "mcp-server"
      ]
    }
  }
}
```

上記の `docker compose run --rm -i mcp-server` は IDE 用の互換方式です。常駐アプリ連携では常駐 HTTP MCP を使用してください。

### 3. 観測テスト

```bash
# URL 観測
curl -X POST http://localhost:52033/v1/observe-url \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"

# トピック観測（SearXNG 経由）
curl -X POST http://localhost:52033/v1/observe \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"recent changes in a software library\"}"
```

### 停止・削除

```bash
docker compose down
docker compose down -v   # DB ボリュームも削除
```

## OCI 常駐起動

本番環境では `.env.oci.example` を `.env.oci` にコピーし、長いランダムな `API_KEY` を必ず設定します。Observatory とホストランタイムを同じ Docker network に接続し、不要な外部公開を避けます。

```bash
docker network create doll_runtime || true
docker compose --env-file .env.oci -f infra/oci/docker-compose.observatory.yml up -d --build
docker compose --env-file .env.oci -f infra/oci/docker-compose.observatory.yml ps
```

同一 network 内のホストランタイムからは `http://mcp-server-http:8080/mcp` を使用します。ホストからのデバッグポートは `.env.oci` の localhost bind のみです。

ホストランタイム側の接続契約は次の環境変数です。`OBSERVATORY_API_KEY` には `.env` / `.env.oci` の `API_KEY` と同じ値を設定してください。

```env
OBSERVATORY_ENABLED=true
OBSERVATORY_MCP_NAME=observatory-local
OBSERVATORY_MCP_URL=http://127.0.0.1:52036/mcp
OBSERVATORY_SERVICE_URL=http://127.0.0.1:52033
OBSERVATORY_API_KEY=replace-with-the-same-value-as-API_KEY
OBSERVATORY_TIMEOUT_MS=45000
OBSERVATORY_REQUIRE_FRESHNESS_CHECK=true
```

## ヘルスチェック・ログ・再起動

```bash
docker compose ps
docker compose logs -f observation-service mcp-server-http
docker compose restart mcp-server-http
```

## 構成

```text
docker compose
  ├── postgres
  ├── valkey
  ├── searxng
  ├── observation-service   (Playwright + Readability)
  ├── mcp-server-http       (常駐 Streamable HTTP, /mcp)
  └── mcp-server            (profile: mcp, stdio 互換)
```

## 環境変数

`.env` をルートに置くと `docker compose` が読み込みます。雛形は `.env.example` を参照。

| 変数                | デフォルト | 説明                                                        |
| ------------------- | ---------- | ----------------------------------------------------------- |
| `SERVICE_PORT`      | `52033`    | Service 公開ポート                                          |
| `SEARXNG_PORT`      | `52034`    | SearXNG 公開ポート                                          |
| `POSTGRES_PORT`     | `52035`    | PostgreSQL 公開ポート                                       |
| `MCP_PORT`          | `52036`    | 常駐 Streamable HTTP MCP 公開ポート                         |
| `MCP_TRANSPORT`     | `http`     | `http` または stdio                                         |
| `FETCH_TIMEOUT`     | `30`       | 取得タイムアウト（秒）                                      |
| `FETCH_CONCURRENCY` | `3`        | トピック観測時の並列取得数                                  |
| `API_KEY`           | (空)       | 設定時は Service / MCP 双方で Bearer 認証。**本番では必須** |

## ローカル開発（任意）

```bash
pnpm install
pnpm build
pnpm test
USE_PLAYWRIGHT=false pnpm dev:service
```

## パイプライン

```text
observe(topic)
  → SearXNG 検索（Top 5）
  → Playwright 取得
  → Readability 本文抽出
  → ルールベース要約 + evidence 生成
  → PostgreSQL 保存
  → MCP へ返却
```

> 仕様上の Trafilatura は Python 製のため、TypeScript 実装では Mozilla Readability を使用しています。

## セキュリティ

本番公開時は [SECURITY.md](SECURITY.md) を参照してください。`API_KEY` の設定を推奨します。

## 仕様

[docs/仕様.md](docs/仕様.md)

## ライセンス

MIT
