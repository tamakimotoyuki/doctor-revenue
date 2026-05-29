# 医師別診療報酬（公開ホスティング用）

GitHub Pages 公開専用の静的サイト。

- **編集元**: `C:\Users\tamak\claude for desktop\【ツール開発_たまき青空病院】\医師別診療報酬\`
- **公開URL**: GitHub Pages（後続のセットアップで決定）
- **認証**: クライアントJS ID/PWゲート（素人除けレベル・本気の認証ではない）

## デプロイ手順

```powershell
cd "C:\Users\tamak\claude for desktop\【ツール開発_たまき青空病院】\医師別診療報酬"
python scripts/build_json.py
cp -r webapp/. "C:\Users\tamak\claude for desktop\【医師別診療報酬-公開】\"
cd "C:\Users\tamak\claude for desktop\【医師別診療報酬-公開】"
git add . && git commit -m "deploy" && git push
```

## 公開可否

データ種別: 医師別収益（個人特定可能・経営情報）
ID/PWゲートはソースコードに難読化された値が露出する＝**URLを知る素人を止めるレベル**のみ。本気の防御には不適。
