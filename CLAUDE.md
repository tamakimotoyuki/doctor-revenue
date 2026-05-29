# CLAUDE.md — 医師別診療報酬-公開

## 公開可否札

**Public（GitHub Pages 公開リポ）**
- データ: 医師別月次収益（個人特定可能・経営情報・職員PII寄り）
- 認証: クライアントJS ID/PWゲート（base64難読化のみ）
- 想定利用者: 田蒔本人＋経営層・URL/ID/PWを知る関係者

## 重要

- このリポ＝**静的配信専用**。編集はこちらでせず、編集元リポへ
- 編集元: `C:\Users\tamak\claude for desktop\【ツール開発_たまき青空病院】\医師別診療報酬\`
- 内容は webapp/ の中身を root に展開したもの（index.html / assets/ / data/doctors.json）

## ★ 絶対禁止

- 患者PII・職員給与額・APIキー・OAuth tokenなど、医師別収益以外の機密データを置かない
- 編集元リポ（Private）の他フォルダの内容を持ち込まない
