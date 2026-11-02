---
title: はじめに
description: 使っているエージェントに LLM Wiki のスキルをインストールし、init、最初の取り込み、最初のクエリ、最初の lint を順に試す。
---

<!-- Adapted from: docs/getting-started.html (source: README.md "Installation"/"Quick start", commands/wiki/init.md, commands/wiki/ingest.md). -->

# はじめに {#getting-started}

使っているコーディングエージェントにスキルをインストールし、初期化、取り込み、クエリ、lint の4ステップを繰り返す。

## インストール {#install}

インストールの方法は2つある。Claude Code には、プラグイン一式（スキル、`/wiki:*` スラッシュコマンド、マーケットプレイスのマニフェスト）を入れる。ほかの対応エージェントには、同じ [agentskills.io](https://agentskills.io) 形式のスキルを [`skills` CLI](https://github.com/vercel-labs/skills) で入れる。全体像は [エージェントの対応表](/v3/agents) を参照。

最初に [`uv`](https://docs.astral.sh/uv/getting-started/installation/) をインストールする。前提条件はこれだけで、同梱のツールのために、バージョンを固定した独立の環境を `uv` が作る。

### Claude Code: プラグイン一式 {#a-claude}

ネイティブの方法で、スキル、スラッシュコマンド、マニフェストがまとめて入る。

```bash
/plugin marketplace add praneybehl/llm-wiki-plugin
/plugin install llm-wiki@llm-wiki
```

インストールすれば、プラグインはどのプロジェクトでも動く。wiki をどこに置くかは、インストールでは決まらない。

以下のエージェントは、同じスキルを `skills` CLI でインストールする。どれも同じコマンドで、`-a` の値だけが違う。`-g` を付けるとすべてのプロジェクトで使えるようにグローバルにインストールし、外すと現在のプロジェクトだけにインストールする。スラッシュコマンドは Claude Code 専用で、ほかのエージェントではスキルを自然言語で呼び出す。

### Codex (OpenAI) {#a-codex}

```bash
npx skills add praneybehl/llm-wiki-plugin -a codex -g
```

`/skills`、`$llm-wiki`、または自然言語で呼び出す。同梱のスクリプトも実行できる。

### Cursor {#a-cursor}

```bash
npx skills add praneybehl/llm-wiki-plugin -a cursor -g
```

`/llm-wiki` または自然言語で呼び出す。同梱のスクリプトも実行できる。

### Gemini CLI {#a-gemini}

```bash
npx skills add praneybehl/llm-wiki-plugin -a gemini-cli -g
```

`/skills` の管理コマンド、または自然言語で呼び出す。同梱のスクリプトも実行できる。

### OpenCode {#a-opencode}

```bash
npx skills add praneybehl/llm-wiki-plugin -a opencode -g
```

自然言語で依頼すると、エージェントがネイティブの `skill` ツールでスキルを呼び出す。OpenCode は `.claude/skills/` と `~/.claude/skills/` も読むので、Claude Code 向けにインストールしたスキルもそのまま使える。同梱のスクリプトも実行できる。

### OpenClaw {#a-openclaw}

```bash
npx skills add praneybehl/llm-wiki-plugin -a openclaw -g
```

スキルは、自動的にユーザーコマンドとして公開される。同梱のスクリプトも実行できる。

### Pi Agent {#a-pi}

```bash
npx skills add praneybehl/llm-wiki-plugin -a pi -g
```

`/skill:llm-wiki` または自然言語で呼び出す。同梱のスクリプトも実行できる。

### OMP ("Oh My Pi") {#a-omp}

OMP は、管理対象のスキルとユーザーのスキルを `~/.omp/agent/skills/` から読み込み、`skill://` で自動的に公開する。OMP はまだ `npx skills` のレジストリにないので、リポジトリをクローンしてスキルのシンボリックリンクを張ってインストールする。

```bash
git clone https://github.com/praneybehl/llm-wiki-plugin.git
mkdir -p ~/.omp/agent/skills
ln -s "$(pwd)/llm-wiki-plugin/skills/llm-wiki" ~/.omp/agent/skills/llm-wiki
```

### そのほかのランタイム: クローンしてシンボリックリンクを張る {#a-other}

Hermes Agent をはじめ、`npx skills` のレジストリにまだない agentskills.io 互換のランタイムでは、エージェントのスキルディレクトリにシンボリックリンクを張ればスキルを使える。

```bash
git clone https://github.com/praneybehl/llm-wiki-plugin.git
mkdir -p ~/.hermes/skills
ln -s "$(pwd)/llm-wiki-plugin/skills/llm-wiki" ~/.hermes/skills/llm-wiki
```

wiki そのものは、特定のエージェントに依存しない。中身は markdown ファイルを置いたディレクトリにすぎない。あるエージェントで取り込み、別のエージェントでクエリすることもできる。

## wiki の場所を選ぶ {#choose-the-wiki-location}

スキルのスコープと wiki のスコープは、互いに独立している。

- **個人用のグローバルな wiki:** `~/wiki/` のようにユーザーレベルで固定したパスに置く、1つのナレッジベース。raw ソースは `~/wiki/raw/` に置く。このパスを、エージェントのグローバルな指示に書いておく。どのプロジェクトからでも、長く残すべき知見やソースをこの wiki に追加できる。
- **プロジェクトの wiki:** `wiki/` と `raw/` を1つのプロジェクトの中に置く。そのプロジェクトのエージェントのメモリファイルに、相対パスで場所を書いておく。知識をプロジェクトごとに分けられ、リポジトリと一緒にバージョン管理しやすい。

`-g` でスキルをグローバルにインストールしても、スキルがどこでも使えるようになるだけで、グローバルな wiki は作られない。同じように、グローバルな wiki があっても、プロジェクトが自動で巡回されることはない。エージェントがプロジェクトの資料を取り込むのは、依頼されたときか、長く残すべき知見を保存するようグローバルな指示で求められているときである。

## 最初の wiki を作る {#your-first-wiki}

以下のコマンドは、Claude Code の `/wiki:*` スラッシュ構文を使う。ほかのエージェントでは、同じ依頼を自然言語で伝える。

1. **構造を初期化する。** プロジェクトをまたいで使う個人用の wiki を1つ作る場合:

   ```bash
   /wiki:init --global
   ```

   現在のプロジェクト専用の wiki にする場合は、`--global` を付けずに `/wiki:init` を実行する。

   > **期待する結果**: wiki の構造を作り、FastEmbed 0.8.0、sqlite-vec 0.1.9、PyYAML 6.0.3 をインストールする。ローカルの `BAAI/bge-small-en-v1.5` モデルがなければダウンロードし、パースキャッシュを作り、現在の全セクションをベクトル化する。セットアップが完了するのは、実行環境の JSON が `"status": "ready"` を返したときだけである。そのあとエージェントはスキーマを一緒に確認し、エージェントのメモリとの連携を提案する。承認なしにそこへ書き込むことはない。

   > 以前のバージョンで作った **wiki がすでにある**場合は、代わりに [`/wiki:upgrade`](/v3/upgrade) を実行する。必須の実行環境のセットアップと、コーパス全体の差分同期を同じように行い、既存のページには手を付けない。

2. **最初のソースを追加する。** テキストを含むものなら何でも、設定した raw ルート（グローバル構成なら `~/wiki/raw/`）に置き、次を実行する。

   ```bash
   /wiki:ingest ~/wiki/raw/your-source.pdf
   ```

   > **期待する結果**: エージェントは設定された wiki を特定し、ソースを読み（大きければ分割して読む）、要点をユーザーと話し合う。そのうえで、ソースの要約を書き、関係するエンティティとコンセプトのページを必要な箇所だけ更新し、新しいページを作り（それぞれに少なくとも1つの被リンクを付ける）、インデックスを更新し、`log.md` に1行追記する。

3. **質問する。** ソースをいくつか取り込んだら、次を実行する。

   ```bash
   /wiki:query What does my wiki say about X?
   ```

   > **期待する結果**: エージェントはインデックスを読んで候補のページを見つけ、それらを読み、`[[wikilink]]` の出典を付けて回答をまとめる。中身のある回答は、調べた内容が蓄積されるように `wiki/synthesis/` に保存することを提案する。

4. 定期的に**健全性をチェックする**。

   ```bash
   /wiki:lint
   ```

   > **期待する結果**: 孤立ページ、リンク切れの wikilink、大きすぎるページ、frontmatter の欠落、古くなった主張を検出する。検出結果は編集案として示され、wiki が黙って書き換えられることはない。

::: info
スラッシュコマンドを使わなくてもよい。自然言語で依頼しても、エージェントは同じスキルを呼び出す。コマンドは、明示的に呼び出したいときのために用意している。[コマンドリファレンス](/v3/commands) を参照。
:::

## 任意の学習ワークフロー {#optional-learning-workflow}

検証済みのタスクのあとで `/wiki:learn`（または「このタスクから学んで」）を使うと、教訓を残せる。テスト済みのスキル改善を作るには `/wiki:evolve` を使う。初期化では、経験とパターンのテンプレートと、アーカイブについての案内がインストールされる。既存の wiki には `/wiki:upgrade` で追加される。モデルの評価が自動で始まることはない。[学習とスキルの改善](/v3/evolution) を参照。
