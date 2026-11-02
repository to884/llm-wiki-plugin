---
title: コマンド
description: "9つの /wiki:* スラッシュコマンド（init、ingest、query、lint、stats、graph、upgrade、learn、evolve）のリファレンス。"
---

<!-- Adapted from: docs/commands.html (source: README.md "Commands" table, commands/wiki/{init,ingest,query,lint,stats,graph,upgrade}.md). -->

# コマンド {#commands}

Claude Code のプラグインには、9つの `/wiki:*` スラッシュコマンドが含まれている。ほかのエージェントでは、同じ依頼を自然言語で伝える。どちらの場合も、元になるスキルが呼び出される。

| コマンド | 内容 |
| --- | --- |
| [`/wiki:init [--global]`](#init) | 個人用のグローバルな wiki、または現在のプロジェクトの wiki を作る。 |
| [`/wiki:ingest <source>`](#ingest) | 新しいソースを処理して wiki に取り込む。グラフ層があれば、それも更新する。 |
| [`/wiki:query <question>`](#query) | wiki をもとに、出典つきで質問に答える。 |
| [`/wiki:lint`](#lint) | 構造と内容の健全性をチェックする。 |
| [`/wiki:stats`](#stats) | 規模、リンク密度と、スケーリングのどの閾値に達しているかを表示する。 |
| [`/wiki:graph <action>`](#graph) | 型付きグラフ層をコンパイル、lint、またはクエリする。 |
| [`/wiki:learn <task artifacts>`](#learn) | 検証済みの経験を記録し、再利用できるパターンにまとめる。 |
| [`/wiki:evolve <goal or action>`](#evolve) | スキルの改善をステージング、評価、確認、適用、ロールバックする。 |
| [`/wiki:upgrade`](#upgrade) | 既存の wiki を、現在のプラグインのバージョンにアップグレードする。 |

## `/wiki:init` {#init}

新しい LLM Wiki を作る。`--global` を付けると、`~/wiki/` に作り、raw ソースは `~/wiki/raw/` に置く。付けなければ、現在のプロジェクトの `wiki/` と `raw/` に作る。`--wiki-dir` と `--raw-dir` を指定すると、これらの既定値を変えられる。

```bash
/wiki:init
/wiki:init --global
```

このコマンドは、保存先のスコープとパスを確認して wiki を作る。続いて、バージョンを固定した FastEmbed、sqlite-vec、PyYAML を `uv` でインストールして動作を確かめ、ローカルの埋め込みモデルをキャッシュし、パースキャッシュを作り、現在の全セクションをベクトル化する。実行環境の JSON が `"status": "ready"` を返したあとでだけ、`SCHEMA.md` をユーザーと一緒に確認し、構成に合ったグローバルまたはプロジェクトのエージェントのメモリとの連携を提案する。ソースの取り込みや、プロジェクトの自動巡回は行わない。

## `/wiki:ingest <source>` {#ingest}

スキルの取り込みワークフローに従って、ソース（論文、記事、文字起こし、PDF、メモ）を wiki に取り込む。

```bash
/wiki:ingest raw/attention-is-all-you-need.pdf
```

エージェントは `SCHEMA.md` を読み、raw ソースを `raw/` に置き、大きければ分割して読み、要点を話し合う。そのうえで、wiki を調べて関係するページを洗い出し、ソースの要約ページを書き、`str_replace` で必要な箇所だけを更新し、新しいエンティティとコンセプトには新しいページを作り（それぞれに被リンクを付ける）、インデックスを更新し、`log.md` に1行追記する。グラフ層があり、ソースが型付きエッジを裏づけている場合は、グラフに lint をかけて抽出し直す。詳しくは [ワークフロー → 取り込み](/v3/workflows#ingest) を参照。

## `/wiki:query <question>` {#query}

wiki をもとに、出典つきで質問に答える。

```bash
/wiki:query How does attention scale with sequence length?
```

エージェントはインデックス（または該当する分割インデックス）を読み、必要な `[[wikilinks]]` をたどり、出典つきの回答をまとめる。インデックスの要約だけでは足りない場合は、ローカルのハイブリッド検索を実行する。

```bash
uv run --script skills/llm-wiki/scripts/wiki_search.py \
  "<query terms>" --top 10 --cache --json
```

FastEmbed + sqlite-vec によるセマンティックな順位付けを、BM25 と統合する。API キーは不要で、wiki やクエリのテキストを外部に送ることもない。依存パッケージを使わない語彙ベースの検索にするには、`python skills/llm-wiki/scripts/wiki_search.py "<query>" --no-embed` で PEP 723 の依存解決を経由せずに実行する。ページ単位で順位を付けるには `--granularity page` を使う。[検索と取得](/v3/search) を参照。関係を問う質問では `graph.sqlite` も参照できる。中身のある回答は `wiki/synthesis/` に保存できる。

## `/wiki:lint` {#lint}

構造と内容の健全性をチェックする。`--suggest-pages` を付けると、独立したページにすべきコンセプトを挙げる。

```bash
/wiki:lint
```

構造のチェックでは `wiki_lint.py` を実行し、孤立ページ、リンク切れの wikilink、大きすぎるページ、frontmatter の欠落、更新の止まったページ、重複したスラッグを検出する。内容のチェックでは、最近更新されたページとハブページを読み、矛盾や足りない点を探す。検出結果はすべて編集案として示され、黙って適用されることはない。詳しくは [ワークフロー → lint](/v3/workflows#lint) を参照。

## `/wiki:stats` {#stats}

wiki の規模、構成、リンク密度と、スケーリングのどの閾値に達しているかを表示する。

```bash
/wiki:stats
```

`wiki_stats.py` を実行し、出力を解釈する。インデックスの分割の閾値（150 ページまたはインデックス 300 行）、検索スクリプトを日常的に使う閾値（300 ページ）、週1回の lint の閾値（500 ページ）に近づいているか、400 行のソフト上限や 800 行のハード上限を超えるページがあるか、リンク密度が低すぎないかを伝える。

## `/wiki:graph <action>` {#graph}

wiki の型付きグラフ層をコンパイル、lint、またはクエリする。グラフは任意で、使うには `wiki/graph/ontology.yaml` が必要である。

```bash
/wiki:graph extract
/wiki:graph neighbors --node product:konvy
/wiki:graph edges --subject person:stephanie-emmanouel
/wiki:graph path --from person:praney-behl --to product:konvy
/wiki:graph facts --about product:konvy
```

`extract` は markdown をコンパイルして `nodes.jsonl`、`edges.jsonl`、`graph.sqlite`、`graph.graphml` を作る。`lint` は型付きエッジを検証する。クエリ系のサブコマンドは、コンパイル済みのグラフをたどる。正本は markdown のままなので、グラフはいつ削除しても作り直せる。[グラフ層のガイド](/v3/graph) を参照。

## `/wiki:upgrade` {#upgrade}

既存の wiki をアップグレードする。冪等なファイル操作、必須の実行環境のインストールとインデックスの同期、`SCHEMA.md` のマージ（ユーザーと一緒にセクションごとに確認する）を行う。

```bash
/wiki:upgrade
```

インストール済みの `init_wiki.py` と、設定されたグローバルまたはプロジェクトの wiki を別々に特定し、`--upgrade` を付けて実行する。既存のコンテンツには手を付けずに、バージョンを固定したローカルの実行環境一式をインストールして動作を確かめ、パースとベクトルのインデックスを同期し、`SCHEMA.md` に欠けているセクションを1つずつ確認していく。[v3 へのアップグレード](/v3/upgrade) を参照。

## `/wiki:learn <task artifacts>` {#learn}

検証済みの成功や失敗を、変更不可の raw の経験として記録する。それをソースページとして取り込み、証拠、適用できる範囲、反例を付けた再利用できるパターンにまとめる。スキルは変更せず、費用のかかるモデルの評価も始めない。[学習とスキルの改善](/v3/evolution) を参照。

## `/wiki:evolve <goal or action>` {#evolve}

範囲を区切った学習を行い、観測した証拠をまとめ、1つのスキル全体に対する変更を提案し、検証用データで選び、固定した結果を独立にテストする。`history` と `show <id>` で過去の試行を確認できる。`apply <id>` は、承認とレビューを済ませ、評価に合格した候補をインストールする。`rollback <id>` は、そのあとに別の編集がなければ、元の状態に戻す。ランナーの設定、デモ用のスイート、予算の管理、障害からの復旧については [学習とスキルの改善](/v3/evolution) を参照。
