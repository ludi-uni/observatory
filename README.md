# Observatory

English README: [README.en.md](./README.en.md)

LLM 向けの観測基盤。検索・取得・抽出・要約を隠蔽し、`observe()` という高レベル API だけを公開する。

## What Observatory is not

- Not a Google Search wrapper
- Not a generic web scraper
- Not a crawler-only tool
- Not a RAG database by itself

Observatory is an observation layer that searches, fetches, extracts, summarizes, stores, and returns evidence-backed observations.

## Docker で全部起動（推奨）

前提: [Docker Desktop](https://www.docker.com/products/docker-desktop/) など Docker Compose v2 が使えること。

### 1. バックエンド起動

リポジトリルートで:

```bash
docker compose up -d --build
```

起動するサービス:

| サービス            | URL                    | 説明                 |
| ------------------- | ---------------------- | -------------------- |
| observation-service | http://localhost:52033 | 観測 API             |
| searxng             | http://localhost:52034 | 検索エンジン         |
| postgres            | localhost:52035        | 観測履歴 DB          |
| valkey              | (内部)                 | SearXNG 用キャッシュ |

動作確認:

```bash
curl http://localhost:52033/health
```

### 2. MCP Server（Cursor 等）

バックエンド起動後、MCP は Docker 経由で stdio 接続します。

`examples/cursor-mcp-docker.json` を参考に設定してください。`docker-compose.yml` のパスは環境に合わせて変更してください。

```json
{
  "mcpServers": {
    "observatory": {
      "command": "docker",
      "args": [
        "compose",
        "-f",
        "D:/99.AITuber/observatory/docker-compose.yml",
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

> `docker compose up -d` では MCP は常駐しません。IDE 接続時に `docker compose run` で起動します。

### 3. 観測テスト

```bash
# URL 観測
curl -X POST http://localhost:52033/v1/observe-url \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://example.com\"}"

# トピック観測（SearXNG 経由）
curl -X POST http://localhost:52033/v1/observe \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"Oracle Cloud Backup\"}"
```

### 停止・削除

```bash
docker compose down
docker compose down -v   # DB ボリュームも削除
```

## 構成

```text
docker compose
  ├── postgres
  ├── valkey
  ├── searxng
  ├── observation-service   (Playwright + Readability)
  └── mcp-server            (profile: mcp, IDE 接続時)
```

## 環境変数

`.env` をルートに置くと `docker compose` が読み込みます。雛形は `.env.example` を参照。

| 変数                | デフォルト | 説明                                                        |
| ------------------- | ---------- | ----------------------------------------------------------- |
| `SERVICE_PORT`      | `52033`    | Service 公開ポート                                          |
| `SEARXNG_PORT`      | `52034`    | SearXNG 公開ポート                                          |
| `POSTGRES_PORT`     | `52035`    | PostgreSQL 公開ポート                                       |
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
