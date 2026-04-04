# knowledge-base

映像制作向けの知識ベース基盤（詳細は [AGENTS.md](AGENTS.md)）。

## ローカル起動

```bash
docker compose up --build
```

- フロント: http://localhost:3000  
- API: http://localhost:8000 （例: `GET /health`）  
- API ドキュメント（Swagger UI）: http://localhost:8000/docs  
- PostgreSQL: localhost:5432（`ankane/pgvector`）
