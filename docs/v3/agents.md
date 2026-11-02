---
title: エージェント
description: llm-wiki スキルに対応しているコーディングエージェント、それぞれのインストール方法、使うメモリファイル。
---

<!-- Adapted from: docs/agents.html (source: README.md agent table, skills/llm-wiki/references/agent-memory-integration.md). -->

# エージェント {#agents}

`llm-wiki` スキルは標準の [agentskills.io](https://agentskills.io) 形式なので、以下のすべてのエージェントで動く。インストールしたスキルからは、init と実行環境のセットアップ、ハイブリッド検索または語彙ベースの検索、構造の lint、stats、グラフの lint、グラフの抽出、グラフのクエリといった wiki の操作を使える。依存パッケージを使うスクリプトは、`uv run --script` を通じて、バージョンを固定した PEP 723 の環境で実行される。

## 対応表 {#support-matrix}

| エージェント | `--agent` の値 | 呼び出し方 | スクリプトの実行 |
| --- | --- | --- | :---: |
| Claude Code | `claude-code` | `/wiki:*` スラッシュコマンド（同梱）または自然言語 | ✅ |
| Codex (OpenAI) | `codex` | `/skills` または `$llm-wiki` / 自然言語 | ✅ |
| Cursor | `cursor` | `/llm-wiki` または自然言語 | ✅ |
| Gemini CLI | `gemini-cli` | `/skills` の管理コマンド / 自然言語 | ✅ |
| OpenCode | `opencode` | 自然言語（エージェントがネイティブの `skill` ツールを呼び出す） | ✅ |
| OpenClaw | `openclaw` | ユーザーコマンドとして自動で公開される | ✅ |
| Pi Agent | `pi` | `/skill:llm-wiki` または自然言語 | ✅ |
| OMP ("Oh My Pi") | 手動（下記を参照） | 自然言語（スキルは `skill://` で自動的に公開される） | ✅ |
| Hermes Agent | 手動（下記を参照） | 自然言語 | ✅ |

OpenCode は `.claude/skills/` と `~/.claude/skills/` も読むので、Claude Code 向けにインストールしたスキルを、追加のインストールなしで使える。

## インストールのコマンド例 {#install-snippets}
最初に [`uv`](https://docs.astral.sh/uv/getting-started/installation/) をインストールする。どのエージェントも、バージョンを固定した同じローカルの実行環境を呼び出すので、エージェントごとの Python 環境は要らない。


**Claude Code** には、プラグイン一式（スキル、スラッシュコマンド、マニフェスト）を入れる。

```bash
/plugin marketplace add praneybehl/llm-wiki-plugin
/plugin install llm-wiki@llm-wiki
```

**Codex、Cursor、Gemini CLI、OpenCode、OpenClaw、Pi** には、`skills` CLI でスキルを入れる。対応表の `--agent` の値に置き換えて実行する。

```bash
npx skills add praneybehl/llm-wiki-plugin -a codex -g
npx skills add praneybehl/llm-wiki-plugin -a cursor -g
npx skills add praneybehl/llm-wiki-plugin -a gemini-cli -g
npx skills add praneybehl/llm-wiki-plugin -a opencode -g
npx skills add praneybehl/llm-wiki-plugin -a openclaw -g
npx skills add praneybehl/llm-wiki-plugin -a pi -g
```

現在のプロジェクトだけにインストールするには、`-g` を外す。

**OMP ("Oh My Pi")** と **Hermes Agent** は、まだ `npx skills` のレジストリにない。リポジトリをクローンし、エージェントのスキルディレクトリにスキルのシンボリックリンクを張る。OMP は、管理対象のスキルとユーザーのスキルを `~/.omp/agent/skills/` から読み込み、`skill://` で公開する。

```bash
git clone https://github.com/praneybehl/llm-wiki-plugin.git
mkdir -p ~/.omp/agent/skills ~/.hermes/skills
ln -s "$(pwd)/llm-wiki-plugin/skills/llm-wiki" ~/.omp/agent/skills/llm-wiki
ln -s "$(pwd)/llm-wiki-plugin/skills/llm-wiki" ~/.hermes/skills/llm-wiki
```

## エージェントのメモリファイル {#agent-memory-file}

wiki を作ったら、エージェントがその場所を覚えておけるように、短い記述を追加する。プロジェクトをまたいで使う個人用の wiki なら、`~/wiki/` のようにユーザーレベルで固定したパスをエージェントのグローバルな指示に書く。プロジェクト専用の wiki なら、プロジェクトのメモリファイルに相対パスを書く。ファイル名はエージェントによって違う。

| エージェント | メモリファイル |
| --- | --- |
| Claude Code | `CLAUDE.md` |
| Codex (OpenAI) | `AGENTS.md` |
| Cursor | `AGENTS.md`（または `.cursor/rules/*.mdc`） |
| OpenCode | `AGENTS.md`（`CLAUDE.md` も読む） |
| Gemini CLI | `GEMINI.md` |
| Pi Agent | `AGENTS.md` |
| OpenClaw | `AGENTS.md` |
| OMP (Oh My Pi) | `AGENTS.md` |

複数のエージェントを使う場合は、対応しているエージェントでは `AGENTS.md` を正本にし、`CLAUDE.md` からそこへシンボリックリンクを張るとよい。スキルが承認なしにメモリファイルへ書き込むことはない。グローバル用とプロジェクト用の記述の例は、`skills/llm-wiki/references/agent-memory-integration.md` にある。

::: info
スラッシュコマンドは Claude Code 専用である。ほかのエージェントでは、「この論文を wiki に追加して」「X について wiki には何と書いてある？」「wiki に lint をかけて」のように、自然言語でスキルを呼び出す。wiki そのものは特定のエージェントに依存しないので、あるエージェントで取り込み、別のエージェントでクエリできる。
:::

## 経験の記録と手順の改善 {#experience-and-procedure-improvements}

上に挙げたスキル対応のエージェントはすべて、インストールした `references/evolution-workflow.md` と `scripts/wiki_evolve.py` を使い、自然言語で `/wiki:learn` と `/wiki:evolve` のワークフローを実行できる。スラッシュコマンドそのものがあるのは Claude Code だけである。記録とライフサイクル管理のツールは、Python の標準ライブラリだけを使う。共通の評価アダプターは、9つのホストすべてに対応している。ただし、インストールされているバージョン、認証、使えるツール、報告される利用量の集計はホストごとに違う。改善ワークフローの実行要件と、実地検証のレポートを参照。教訓を記録するために、新しくエージェントとの連携を作る必要はない。[学習とスキルの改善](/v3/evolution) を参照。
