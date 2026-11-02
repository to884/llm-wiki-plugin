---
title: "How Cerebras Built Its Enterprise Knowledge Base"
source: https://www.cerebras.ai/blog/how-we-built-our-knowledge-base
published: 2026-07-15
downloaded: 2026-07-20
---

> Cerebras のブログ記事（出典は frontmatter の `source`）を日本語に訳したもの。記事中の図のラベルと、図に含まれるメッセージやコードの例は原文のまま残している。

JUL 15 2026

How We Built Our Knowledge Base（ナレッジベースをどう作ったか）
ISAAC TAI
DANIEL KIM
MIKE GAO

社員は社内のナレッジベースに、毎日 15,000 件を超える質問をしている。公開から3か月で、社内でもっとも広く使われているツールの1つになった。人、自動化の処理、エージェントが使っている。

Cerebras のチームは、データセンターの運用、チップ設計、ハードウェア、学習、推論、クラウドプラットフォームなど、さまざまな分野で働いている。毎年数百人の新しい社員が加わるので、コミュニケーションのチャンネルは同じ質問であふれていた。

「X はどこにある？」
「Y に詳しいのは誰？」
「Z とは何？」

人とシステムを、役に立つ情報につなげられるように、Cerebras Knowledge を作った。

1
2
SYNTHESIS
ANSWER + CITATIONS
FUSION + RERANK
RRF (K=60) -> LLM RERANK
RETRIEVAL
SIX LISTS IN PARALLEL
EMBEDDINGS
PGVECTOR - 3072-DIM - HNSW
DISTILLATION
LLM EXTRACTORS
SOURCES
SLACK - WIKI - CODE - INCIDENTS
データがある場所で、データを扱う

組織の中で情報を見つけるのは難しい。データは複数のツールに散らばっていて、四半期に一度くらい、誰かが同じ名案を出す。すべての情報が1か所に集まるように、何もかも1つのプラットフォームに記録しよう、というものだ。もちろん、信頼できる唯一の情報源という夢は、実際にはまず実現しない。

情報は、それを書くのに便利で使いやすい場所で生まれる。ドキュメントの修正提案、Slack のスレッド、GitHub のコード参照、Jira のステータスのメタデータがそうだ。これらのプラットフォームは、それぞれの分野に合わせて作られ、長年のプロダクト開発と分析で最適化されている。Google ドキュメントでプルリクエストを議論するのは、ひどい体験になるだろう。

そこで、既存のやり方をできるだけ変えずに済むシステムを設計することにした。データの収集の面では、各プラットフォームから直接データを取り出すことを意味した。

ナレッジベースの構成

ナレッジベースが提供するのは、次の3つである。

社内のデータを収集して保存するプラットフォーム。
そのデータに問い合わせるプラットフォーム。
認証と認可を強制し、監査と分析を行うレイヤー。

中心にあるのは1つの Postgres のテーブルで、多くのソースからの埋め込み、raw の要約、メタデータを保持している。システムは社内全体からデータを継続的に取り込み、すぐにクエリできるデータストアを保っている。

シンプルでありながら、ほとんどの形式のデータに対応できるデータのインターフェースが欲しかった。また、Cerebras のほかの開発者が独自のコネクターを作れるようにもしたかった。その結果、あえてシンプルな作りにした。Slack のスレッドからネットリストまで、すべてのソースが同じ埋め込みのテーブルに入り、そのテーブルにあるものはすべて、同じインターフェースですぐにクエリできる。

SLACK
WIKI / CONFLUENCE
CODE REPOS
NETLISTS
PRM DOCS
CUSTOM DATABASES
EMBEDDINGS
QUERY
DOCUMENT
EMBEDDING
METADATA
SOURCE + TIMESTAMPS
MCP - WEB UI - AGENTS
ONE EMBEDDINGS TABLE
ONE CONNECTOR PER SOURCE

各データソースは、そのデータが何か、どう接続するか、どのくらいの頻度で取得するかを定義する。生成される埋め込みの行は、Slack、コードリポジトリ、ドキュメントのシステム、独自のデータベースのどこから来たものでも、同じインターフェースに従う。

Slack

Slack は、設計の対象としてもっとも重要なデータソースだった。社内のエンジニアリングの議論のうち、もっとも新しいものが行われる場所だからだ。

SOCKET EVENT
ROUTE
BOT REPLY
REINGEST_THREAD
UPSERT THREAD
SYNC_WORKER
DISTILL
THREAD VECTOR
BURST VECTORS
@MENTION / DM
TRACKED CHANNEL
RESET WATERMARKS
構造のない Slack の会話をどう処理しているか

最初に、raw のテキストに単純な埋め込みを使うだけで十分な性能が出るかを試した。すぐに、ベクトル検索だけでは、関係するデータをすべて見つけるには足りないと分かった。

Slack のメッセージには、いくつかの難しさがある。

情報の密度の差がとても大きい。「hey yeah sure mike」も、カーネルの詳しい説明も、どちらも1件のメッセージである。
メッセージの長さがまちまちで、短いメッセージのほうが、長く詳しいメッセージよりもコサイン類似度で上に来ることがよくある。
メッセージの意味は、周りの会話に左右されることが多い。

ハイブリッドな方法が必要だった。どのスレッドも複数の検索手法で同時に取り出せるように Slack の取り込みを作り、各手法がほかの手法の弱点を補うようにした。

全文検索は、埋め込みでは区別がぼやける正確なトークンを捉える。エラーの文字列、フラグの名前、ホスト名などである。エンジニアがエラーメッセージをそのまま貼り付けたときは、語彙が正確に一致することがほぼ常に最良の証拠であり、意味の類似度がどれほど高くても、それより上に来るべきではない。
埋め込みによる検索は、言い換えを捉える。「restore hangs after manifest load」と質問した人と、「checkpoint stalls on the NFS mount」と答えた人は、同じ語彙を一度も使っていないかもしれない。違う言葉で書かれた質問と回答を結びつけるのが、ベクトルの類似度である。(1)
逆文書頻度（IDF）は、意味のある情報と埋め草を区別する。あまり使われない設定フラグのような、まれなトークンを中心にした短いメッセージは、上位に来るべきである。「sounds good, thanks!」は、埋め込みの空間では多くのクエリの近くにあるが、語のまれさを考慮すると、スコアはほぼ 0 になる。
経過時間による減衰は、Slack の回答には賞味期限があることを表す。2つのスレッドが同じ質問に答えていても、6か月前のスレッドは、もう存在しないインフラについて書いているかもしれない。ほかの関連度が同じなら、新しいスレッドを優先する。
SEARCH / SLACK CANDIDATES
FULL-TEXT
QUERY

“restore hangs after manifest load”

2W AGO
NO SHARED TOKENS
PARAPHRASE MATCH
CKPT_PREFETCH: RARE
RECENT WINS TIE
THREAD

Checkpoint stalls on the NFS mount — set CKPT_PREFETCH=4.

1D AGO
EXACT TOKENS
ERR_MANIFEST_TIMEOUT: RARE
MESSAGE

ERR_MANIFEST_TIMEOUT: restore hangs after manifest load.

3H AGO
FALSE NEIGHBOR
NO RARE TOKENS
MESSAGE

sounds good, thanks! will try that

8MO AGO
ALSO MATCHES
8 MO: DECAYED
THREAD

restore hangs after manifest load → use LEGACY_FETCHER=1.

01
FULL-TEXT
EXACT TOKENS, PASTED ERRORS
02
EMBEDDING
PARAPHRASE ACROSS VOCABULARY
03
IDF
RARE TOKENS BEAT FILLER
04
AGE DECAY
NEWER ANSWERS WIN TIES
BOOSTED BY THIS SIGNAL
PENALIZED

どのスコアリングも、単独では信用しない。各手法は同じコーパスについて独自の順位を作り、それらをクエリの時点で統合する（「再ランキング」を参照）。

Socket Mode

リアルタイムでデータを集めるために、ワークスペースに Slack のボットを入れ、Socket Mode で動かした。Slack はすべてのメッセージのイベントを常時接続の WebSocket で送ってくるので、Web API をポーリングしてレート制限を使い果たすことなく、リアルタイムで更新を受け取れる。

イベントが届くと、すぐに受信を確認し、変わらないイベント ID で重複を除き、そのメッセージを取り込み処理のコンシューマー向けに印を付ける。

取り込みのコンシューマーは、新しいメッセージを単独では保存しない。メッセージが属するスレッドを特定し、親メッセージとすべての返信を含む会話全体を Slack API から取得し直す。そのうえで、スレッド全体を1行として書き戻す。そのため、既存のスレッドへの返信があると、親とほかの返信もすべて取得し直すことになり、保存した内容、参加者の一覧、最終更新のタイムスタンプは常に会話全体を反映する。

システム内の Slack のチャンネルには、それぞれ専用のデータソースがある。これで、データの鮮度を細かく調整できる。たとえば、あるチームは、活発な障害対応のチャンネルを、より頻繁に取り込むことを選べる。

スレッドとメッセージ

Slack の raw のテキストは、raw の内容に Postgres の全文検索（GIN）インデックスを張っているので、届いた時点でキーワードで検索できる。一方、ベクトル検索を役に立つものにするために、いくつかの処理を追加している。(8)

蒸留（distillation）の段階で、LLM がスレッド全体から構造化されたデータを取り出す。

エンジニアが実際に検索しそうな、1行の質問。
短い要約。
解決策。
言及されたシステムとコードの参照。
#CKPT-SUPPORT / THREAD_8F42
FULL THREAD INPUT
09:14
QUESTION
MAYA

Restore stalls after manifest load on the larger cluster. Small runs are fine.

09:17
SUMMARY
OWEN

I can reproduce with 128 shards. The logs stop before cache warmup.

09:18
CONTEXT
SAM

My laptop also stalls when it sees Monday.

09:21
RESOLUTION
MAYA

Setting CKPT_PREFETCH=4 makes it complete. The default is too high for the NFS mount.

DISTILL
FULL THREAD
STRUCTURED ARTIFACT
ONE PER THREAD
{
"question"
"Why does restore stall after manifest load?"
"summary"
"Large restores stop before cache warmup."
"resolution"
"Set CKPT_PREFETCH=4 for the NFS mount."
"systems"
["checkpoint restore", "NFS"]
"code_refs"
["CKPT_PREFETCH"]
}
EXTRACTED FROM ALL FOUR MESSAGES
NORMALIZE
+ EMBED
EMBEDDING ROW
PGVECTOR
NORMALIZED DOCUMENT

Question + summary + resolution + systems + code references

source
slack_thread
source_id
thread_8f42
embedding
3,072 dims
metadata
channel + authors + time
ONE QUERYABLE DATABASE RECORD
01
RAW THREAD
ALL MESSAGES ENTER TOGETHER
02
THREAD ARTIFACT
ONE JSON OBJECT FROM THE THREAD
03
EMBEDDED ROW
NORMALIZED DOCUMENT IN PGVECTOR

これらのデータをベクトル化し、共通の埋め込みのテーブルに書き込む。元の会話のテキストを直接ベクトル化することはしない。実験では、スレッドを一貫した形式に正規化すると、精度が大きく上がった。(7,9) 追加のメタデータも、意味の照合に役立つ手がかりになる。

バースト

この時点で Slack の検索は十分よくなっていたが、同じ問題に何度も突き当たった。長いスレッドの中の重要なメッセージが、スレッド単位の要約に必ずしも反映されないことである。

個々のメッセージの情報を強めるために、バーストを使っている。バーストとは、同じ投稿者の連続したメッセージのまとまりである。答えが、スレッドの要約に語彙がまったく入らない脇道の1件のメッセージにあることがあるので、個々のバーストを、先頭にスレッドの話題を文脈として付けてベクトル化している。(2) バーストの埋め込みがあれば、そのメッセージを単独で見つけられる。

情報の少ないデータがデータベースに入らないように、各バーストを複数の手がかりの重み付きの組み合わせで採点し、閾値を超えたものだけをベクトル化する。

コーパス全体で比較的まれなトークンを含む（IDF が 4.0 以上）。
バーストをまとめた長さが 200 文字以上である。
バーストの中の1件以上のメッセージにリアクションが付いていて、周りからの評価で加点される。
AUTHOR A - SHORT
AUTHOR A - FOLLOW-UP
AUTHOR B - TECHNICAL DETAIL
AUTHOR B - RESOLUTION
AUTHOR C - ACK
BURST 01 - FILTERED
BURST 02 - EMBEDDED
SHORT - COMMON TOKENS - NO REACTIONS
LONG - RARE TERMS - REACTED TO

蒸留のあと、条件を満たしたバーストをベクトル化し、スレッド単位のレコードと並べて埋め込みのテーブルに保存する。

コードリポジトリ

最初は、コードリポジトリをベクトル化する必要があるのかを議論した。Claude Code などのコマンドラインツールが広まり、「grep さえあればいい」と思える中で、コードの埋め込みを作るのは直感に反するように感じた。業界のほかの人と話し、大規模なコードベースでのセマンティック検索についての Cursor の調査結果を読んだうえで、試すことにした。

社内には多くのリポジトリがあり、40 GB を超えるものもある。いちばんの懸念は、それらを効率よく最新に保つ方法だった。

CocoIndex でコードの埋め込みを維持する

いくつかの実験を経て、CocoIndex に落ち着いた。コードベースのベクトル化を得意とする、オープンソースのドキュメント埋め込みのフレームワークである。

リポジトリごとに、言語ごとの正規表現の境界を、粗いものから細かいものの順に使ってコードを分割する。分割処理は、まずクラスのような上位の境界を試す。分割したチャンクがまだ大きすぎるなら、メソッドの境界に、さらに小さなブロックに切り替える。分割したチャンクをベクトル化し、ベクトルを Postgres に書き込む。1つのファイルから、ファイル単位と関数単位のレコードのように、粒度の違う複数の埋め込みができることもある。

CHECKPOINT_LOADER.CC
LANGUAGE-AWARE
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
class CheckpointLoader {
 public:
  Status LoadManifest(Path p) {
    auto bytes = fs_.Read(p);
    if (!bytes.ok()) return bytes.status();
    manifest_ = ParseManifest(*bytes);
    return ValidateShards(manifest_);
  }
  Status WarmShardCache() {
    for (const auto& shard : manifest_.shards()) {
      cache_.Pin(shard.key());
      stats_.Record(shard.bytes());
    }
    return OkStatus();
  }
  Status Restore(RestoreOptions opts) {
    auto lease = coordinator_.Acquire(opts.cluster);
    if (!lease.ok()) return lease.status();
    for (auto id : manifest_.ordered_ids()) {
      RETURN_IF_ERROR(fetcher_.Fetch(id));
    }
    return coordinator_.Release(*lease);
  }
 private:
  FileSystem fs_;
  Manifest manifest_;
  ShardCache cache_;
};
1 TRY: CLASS
2 METHOD: LOADMANIFEST()
3 IF STILL LARGE: IF
2 METHOD: WARMSHARDCACHE()
3 IF STILL LARGE: FOR
2 METHOD: RESTORE()
3 IF STILL LARGE: IF
3 IF STILL LARGE: FOR
2 SECTION: PRIVATE FIELDS
01
NAIVE WINDOWS
CUT EVERY N TOKENS
02
LANGUAGE-AWARE
HIGH -> LOW REGEX BOUNDARIES
SEMANTIC NODE
FIXED SPLIT
Language-aware recursive chunking selected

CocoIndex は、同期のメタデータを Postgres で管理する。コミットのたびに、リポジトリ全体を計算し直すのではなく、変更されたコードのチャンクだけをベクトル化し直してエクスポートする。同期の状態と埋め込みの保存先が同じデータベースにあるので、この方法はとくにうまくいった。

コードベースの数が増えてきたので、リポジトリの登録は、チームが自分で提出できる設定ファイルで行うようにした。設定ファイルには、ファイルパス単位の許可リストと拒否リストも書ける。

独自のデータソース

すでに独自のデータベースを持っていて、ナレッジベースに参加するためだけに、データを Slack やドキュメントのシステムに移したくないチームもあった。それらのチームは、既存のテーブルに対して同じクエリの仕組みを使いたがっていた。

これに対応するために、独自のソースをプラグインのスクリプトとして扱っている。チームは、自分のシステムからデータを読み、埋め込みのテーブルと同じ形の行を出力する小さな Python のモジュールと、対応するデータソースの項目を、プルリクエストで提出する。

スクリプトが、ほかの埋め込みの行と同じスキーマで共通のデータベースに書き込む限り、ほかの部分は変更なしで動く。データは Slack、コード、ドキュメントと並んでクエリできるようになり、システムのほかの部分で特別な処理は要らない。

計画とツールの並列実行

クエリのたびに、まず短い計画の段階を実行し、どのツールとデータソースが関係しそうかを LLM が決める。主なツールは次のとおり。

subsystem_index: ファイルごとの LLM による要約。
search: Slack、wiki、コード、そのほかのインデックス済みのソースにまたがる統一したベクトル検索のパイプライン。内部で統合して再ランキングする。
search_slack: Slack を直接検索する。
search_code: ソースリポジトリに対する ripgrep。
recent_prs: 質問に関係する最近のプルリクエスト。
who_knows: そのトピックの専門知識を示している人。

プランナーは、インデックスしている内容を簡潔にまとめた説明をもとに動く。どのプロジェクトがあるか、各プロジェクトでどのソースが使えるか、各ソースが答えるのに向いている質問は何か、という説明である。ユーザーのクエリと有効な範囲が与えられると、プランナーはツールの選択を出力する。実行部はそれを並列に実行し、結果を共通の証拠の形式に正規化して、最後の統合を行う LLM に渡す。(4)

QUESTION
PLANNER
SEARCH
SEARCH_SLACK
SEARCH_CODE
RECENT_PRS
WHO_KNOWS
EVIDENCE
SYNTHESIS
NORMALIZED ROWS
ANSWER + CITATIONS
再ランキング

ドキュメントは、別の質問に答えるものでも、クエリと語彙が同じというだけで上位に出てくることがある。再ランキングの前に、各検索器の、互いに比べられない結果のリストを、reciprocal rank fusion（RRF）で統合する。各ドキュメントについて、そのドキュメントが現れるリストごとに weight / (60 + rank) を足す。weight の既定値は 1.0、平滑化の定数は 60 である。

RESET_
VECTOR
1
CKPT_LOADER.CC
2
CLASS: CHECKPOINTLOADER
3
WIKI: CHECKPOINT FORMAT
4
THREAD: NFS STALL
5
INC-82: SLOW RESTORE
FTS
1
WIKI: CHECKPOINT FORMAT
2
CKPT_LOADER.CC
3
RUNBOOK: NFS MOUNTS
4
INC-82: SLOW RESTORE
5
THREAD: CACHE WARMUP
THREAD SUMMARIES
1
THREAD: NFS STALL
2
THREAD: CACHE WARMUP
3
CLASS: CHECKPOINTLOADER
4
WIKI: LOAD STALLS
5
INC-82: SLOW RESTORE
GRAPH
1
CLASS: CHECKPOINTLOADER
2
MANIFEST_PARSER.H
3
RUNBOOK: NFS MOUNTS
4
THREAD: NFS STALL
5
WIKI: CHECKPOINT FORMAT
WIKI VECTOR
1
WIKI: CHECKPOINT FORMAT
2
WIKI: LOAD STALLS
3
RUNBOOK: NFS MOUNTS
4
INC-82: SLOW RESTORE
5
CLASS: CHECKPOINTLOADER
SLACK FTS
1
THREAD: NFS STALL
2
THREAD: CACHE WARMUP
3
BURST: TIMEOUT FLAGS
4
INC-82: SLOW RESTORE
5
CLASS: CHECKPOINTLOADER
MERGED
1
CLASS: CHECKPOINTLOADER
0.0792
2
INC-82: SLOW RESTORE
0.0776
3
WIKI: CHECKPOINT FORMAT
0.0640
4
THREAD: NFS STALL
0.0640
5
THREAD: CACHE WARMUP
0.0476
6
RUNBOOK: NFS MOUNTS
0.0476
SCORE(D) = SUM 1 / (60 + RANK_L(D))   |   K = 60

平滑化の定数があるので、1つの強い票より、複数の検索器の合意のほうが重みを持つ。複数の検索器で上位に現れるドキュメントは、1つの検索器でだけ1位のドキュメントに勝てる。そのあと、重複したチャンクを1つのソースにまとめ直し、1つのファイルから入る結果の数に上限を設けて、より多様な上位 20 件を得る。

元のクエリとそれらの候補を、小さな再ランキング用のモデルに送る。モデルは各ドキュメントに 0〜10 のスコアを付け、上位 10 件を残す。(6)

順位が確定したら、選ばれた結果に文脈を戻す。たとえば、wiki のセクションが一致した場合は、隣の2つのセクションも取り込み、チャンクの分割で切り離された見出し、前提条件、注意事項が失われないようにする。これで読み手は、重要な文脈が欠けた孤立した段落ではなく、ひとまとまりの抜粋を受け取れる。

つまり、検索の出力は内容の豊富な証拠のまとまりである。異なる検索器からの結果を統合し、ソース単位で重複を除き、実際の質問に照らして再ランキングし、そのあとで初めて周りの文脈を加えて広げている。

MCP

MCP との連携では、検索の部品を、「この質問に答える」という1つのエンドポイントの裏に隠さず、個別のツールとして公開している。これらのツールは意図してシンプルにし、できるだけ LLM を使わないようにしているので、クライアントは速く安く問い合わせられる。(5)

MCP のツールは、それぞれ1つの検索の基本操作に対応する。search_slack、search_code、search、who_knows などである。ツールの入出力は範囲が狭く、構造化されていて、安定しているので、ツールの中に追加の処理の流れを組み込まなくても、どのクライアントやエージェントからでも呼び出しやすい。

ほとんどのツールは、ベクトル検索、語彙ベースの検索、ripgrep のような1つのクエリのパイプラインを実行し、軽いヒューリスティックで採点し、raw の証拠の行を返す。

Claude Code など、MCP に対応したエージェントが、処理の流れを組み立てる役になる。どのツールをどの順序で呼び、結果をどう組み合わせて最終的な回答やコードの編集にするかを、エージェントが決める。検索のレイヤーそのものは、リクエストに応えるのに、そうした LLM の判断に依存しない。

Web UI

Web UI にも同じツールがあるが、ユーザーの質問ごとに最初から最後まで実行される、完全なクエリのパイプラインにつながっている。プランナーと実行部の段階は、UI のエージェントが受け持つ。

プランナー: 軽い LLM の処理がクエリと有効なプロジェクトを調べ、search、search_slack、subsystem_index のような、呼び出す検索ツールを選ぶ。

実行部: システムはそれらのツールの呼び出しを並列に実行し、結果を集めて、スコア、新しさ、ソースの手がかりを含む共通の証拠のスキーマに正規化する。

統合: 最後の LLM の処理が、型付きの証拠のまとまりと元の質問を受け取り、出典、注意事項、ソースをまたいだ統合を含む、UI に表示する回答を作る。

ユーザーから見れば、Web UI は単に「質問すると答えが返る」ものである。内部では、MCP のクライアントが明示的に再現できるのと同じ、プランナー → 実行部 → 統合の流れが動いている。

MCP CLIENT
WEB UI
DIRECT TOOL CALLS
RAW EVIDENCE ROWS
CLIENT ORCHESTRATES
PLANNER
EXECUTOR
SYNTHESIS
組織

コーパスが大きくなると、「どこでも何でも検索する」はすぐに役に立たなくなった。コンパイラーのチームのエンジニアは、結果にインフラの運用手順書が出てくることを望まなかったし、その逆も同じだった。検索を最初から関係のあるものにする仕組みが、プロジェクトである。

プロジェクトと範囲を絞った検索

クエリの対象になる作業範囲を整理する主な方法として、プロジェクトを導入した。プロジェクトとは、名前を付けたデータソースのまとまりである。チームや取り組みに関係する特定の Slack のチャンネル、コードリポジトリ、社内のデータベース、ドキュメントのスペースからなる。

プロジェクトは、意図して軽くしている。共有の障害対応チャンネルや中央のプラットフォームのリポジトリのような同じデータソースを、複製せずに、複数のプロジェクトから参照できる。

COMPILER PROJECT
PLATFORM PROJECT
COMPILER SLACK
MONOLITH REPO
SHARED INCIDENTS
PLATFORM REPO
CLOUD RUNBOOKS
DEFAULT QUERY SCOPE
DEFAULT QUERY SCOPE
利用開始時の設定と既定値

利用を始めるとき、ユーザーは、ML の学習基盤、コンパイラー、データセンターの運用のように、自分の働き方に合った既定のプロジェクトを選ぶか作るよう求められる。

その既定のプロジェクトはユーザーのプロフィールに保存され、クエリの範囲を自動で絞る。新しいエンジニアは、どの Slack のチャンネル、リポジトリ、ドキュメントのスペースが重要かを先に覚えなくても、質の高い回答を得られる。

おわりに

結局、このナレッジベースがうまくいっているのは、すべてを1つの硬直したシステムに押し込むのではなく、情報がすでにある場所で人に応えているからである。さまざまな検索手法を組み合わせることで、証拠をすばやく見つけられる。その結果、実際の社内データに対応できる柔軟さを保ちながら、Cerebras が成長を続けても役に立ち続けるだけの構造を持った検索の体験になった。

REFERENCES

Malkov and Yashunin, Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs, arXiv:1603.09320 / IEEE TPAMI 2018.
Anthropic, Introducing Contextual Retrieval, 2024.
Cormack, Clarke, and Büttcher, Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods, SIGIR 2009.
Li et al., Search-o1: Agentic Search-Enhanced Large Reasoning Models, arXiv:2501.05366, 2025.
Anthropic, Code Execution with MCP, 2025.
Liu et al., Lost in the Middle: How Language Models Use Long Contexts, arXiv:2307.03172, 2023.
Anthropic, Use XML Tags.
Salesforce/Slack Engineering, How Slack AI Processes Billions of Messages.
Improving Agents, Best Nested Data Format.
Cursor, Improving Agent with Semantic Search, 2025.
