import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

const repo = 'https://github.com/praneybehl/llm-wiki-plugin'
const site = 'https://praneybehl.github.io/llm-wiki-plugin/'
const socialImage = `${site}social-card.png`
const author = {
  '@type': 'Person',
  '@id': `${site}#author`,
  name: 'Praney Behl',
  url: 'https://github.com/praneybehl',
}
const faqItems = [
  {
    question: 'LLM Wiki とは何か？',
    answer:
      'LLM Wiki は、プロジェクトのソースを構造化した Markdown ページにコンパイルした、エージェントが保守する永続的なナレッジベースである。質問のたびに raw のドキュメントを読み直すのではなく、エージェントは各ソースを一度だけ取り込み、リンクと要約を継続的に保守し、その後の質問には蓄積した wiki から答える。',
  },
  {
    question: 'LLM Wiki は RAG とどう違うか？',
    answer:
      'RAG はクエリのたびに raw のドキュメントからチャンクを取り出すので、質問ごとに断片から文脈を組み立て直す。LLM Wiki は、取り込みの時点でソースを正本のページにコンパイルする。検索の対象はすでに統合された知識なので、修正、相互リンク、出所、矛盾がセッションをまたいで積み重なっていく。',
  },
  {
    question: 'LLM Wiki には埋め込みやベクトルデータベースが必要か？',
    answer:
      'ホスト型のサービスは必要ない。既定の検索では、ローカルの FastEmbed による埋め込みを使い捨ての sqlite-vec インデックスに格納し、BM25 の結果と統合する。依存パッケージを使わない語彙ベースの検索にしたい場合は、検索スクリプトを Python で直接、--no-embed を付けて実行する。型付きグラフも任意で使うもので、正本は Markdown のままである。任意で使える Cloudflare 上のホスト型バックエンドを使うと、チームやリモートのエージェント向けに、Workers AI による埋め込みと Vectorize が加わる。',
  },
  {
    question: 'LLM Wiki に対応しているコーディングエージェントは？',
    answer:
      'agentskills.io 互換のスキルは、Claude Code、Codex、Cursor、Gemini CLI、OpenCode、OpenClaw、Pi、OMP で動作を確認している。Claude Code では、プラグインを通じて /wiki:* のスラッシュコマンドも使える。ほかのエージェントでは、同じワークフローを自然言語で呼び出す。詳しくはエージェントの対応表を参照。',
  },
  {
    question: '複数のエージェントで1つの LLM Wiki を共有できるか？',
    answer:
      'できる。同じマシン上のエージェントは、ローカルのフォルダーを共有できる。複数のマシンにまたがるエージェントで共有するには、任意のホスト型 wiki をデプロイする。ホスト型 wiki は、wiki ごとに Durable Object を持つ1つの Cloudflare Worker で、MCP と JSON API によるアクセス、エージェントごとのトークンまたは OAuth、アトミックなコミット、競合検出を備える。正本は Markdown のままで、pull ミラーでローカルにコピーを置ける。',
  },
  {
    question: 'LLM Wiki をインストールして使い始めるには？',
    answer:
      '使っているエージェント向けのプラグインかスキルをインストールし、/wiki:init を実行する。/wiki:ingest でソースを取り込み、/wiki:query で質問すると、出典つきで答えが返る。構造と内容の問題を見つけるために、定期的に /wiki:lint を実行する。対応しているエージェントごとの正確なコマンドは、「はじめに」のガイドに載っている。',
  },
]


// docs/v3/ 以下のページは、更新を止めた v3.2.0 のドキュメントである。
const legacyPrefix = 'v3/'

function canonicalUrl(relativePath: string): string {
  const route = relativePath.endsWith('index.md')
    ? relativePath.slice(0, -'index.md'.length)
    : relativePath.replace(/\.md$/, '.html')
  return new URL(route, site).toString()
}

function structuredData(
  relativePath: string,
  title: string,
  description: string,
  url: string,
  lastUpdated: number,
): Record<string, unknown> {
  const website = {
    '@type': 'WebSite',
    '@id': `${site}#website`,
    name: 'LLM Wiki',
    url: site,
    description: 'エージェントが保守し、継続的にコンパイルし続けるナレッジベースのためのオープンソースのツール。',
    inLanguage: 'ja-JP',
    author: { '@id': author['@id'] },
  }
  const page =
    relativePath === 'index.md'
      ? {
          '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
          '@id': `${site}#software`,
          name: 'LLM Wiki',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Cross-platform',
          softwareVersion: '4.0.1',
          description,
          url,
          codeRepository: repo,
          image: socialImage,
          license: `${repo}/blob/main/LICENSE`,
          programmingLanguage: ['Python', 'TypeScript'],
          author: { '@id': author['@id'] },
        }
      : {
          '@type': 'TechArticle',
          '@id': `${url}#article`,
          headline: title,
          description,
          url,
          mainEntityOfPage: url,
          image: socialImage,
          datePublished: '2026-07-20',
          ...(Number.isFinite(lastUpdated) ? { dateModified: new Date(lastUpdated).toISOString() } : {}),
          isPartOf: { '@id': website['@id'] },
          author: { '@id': author['@id'] },
          inLanguage: 'ja-JP',
        }

  const graph: Record<string, unknown>[] = [website, author, page]
  if (relativePath === 'index.md') {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${site}#faq`,
      mainEntity: faqItems.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      })),
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}


export default withMermaid(
  defineConfig({
    // プロジェクトのページは https://praneybehl.github.io/llm-wiki-plugin/ で配信する。
    // 生成されるアセットの URL をサブパスの下で解決させるため、末尾のスラッシュが必要である。
    base: '/llm-wiki-plugin/',
    lang: 'ja-JP',
    title: 'LLM Wiki',
    description:
      'LLM が整理し、継続的にコンパイルし続けるプロジェクトのナレッジベース。LLM Wiki プラグイン。',
    // 既定の（クリーンでない）URL のままにする。こうするとビルドで *.html ファイルが出力され、
    // /llm-wiki-plugin/getting-started.html のような以前からの外部リンクも引き続き解決できる。
    cleanUrls: false,
    lastUpdated: true,
    ignoreDeadLinks: false,
    sitemap: {
      hostname: site,
      // v3 のページは noindex なので、サイトマップには v4 のページだけを載せる。
      transformItems: (items) => items.filter((item) => !item.url.startsWith(legacyPrefix)),
    },
    transformPageData(pageData) {
      const url = canonicalUrl(pageData.relativePath)
      const legacy = pageData.relativePath.startsWith(legacyPrefix)
      const title =
        pageData.relativePath === 'index.md'
          ? 'LLM Wiki: LLM が整理するナレッジベース'
          : legacy
            ? `${pageData.title} (v3.2.0) | LLM Wiki`
            : `${pageData.title} | LLM Wiki`
      const description =
        pageData.description ||
        'エージェントが整理し、継続的にコンパイルし続けるプロジェクトのナレッジベースを構築し、保守する。'
      const data = structuredData(pageData.relativePath, title, description, url, pageData.lastUpdated)

      pageData.frontmatter.head ??= []
      pageData.frontmatter.head.push(
        ['link', { rel: 'canonical', href: url }],
        [
          'meta',
          {
            name: 'robots',
            content: legacy
              ? 'noindex,follow'
              : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
          },
        ],
        ['meta', { property: 'og:type', content: pageData.relativePath === 'index.md' ? 'website' : 'article' }],
        ['meta', { property: 'og:site_name', content: 'LLM Wiki' }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { property: 'og:url', content: url }],
        ['meta', { property: 'og:image', content: socialImage }],
        ['meta', { property: 'og:image:width', content: '1200' }],
        ['meta', { property: 'og:image:height', content: '630' }],
        ['meta', { property: 'og:image:alt', content: 'LLM Wiki のドキュメント' }],
        ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }],
        ['meta', { name: 'twitter:image', content: socialImage }],
        ['script', { type: 'application/ld+json' }, JSON.stringify(data)],
      )
    },
    head: [
      // `head` の項目はそのまま出力される（base は自動では前に付かない）ので、
      // favicon のパスには base を明示的に含める必要がある。
      ['link', { rel: 'icon', type: 'image/svg+xml', href: '/llm-wiki-plugin/favicon.svg' }],
      ['meta', { name: 'theme-color', content: '#4f46e5' }],
      ['meta', { name: 'color-scheme', content: 'light dark' }],
      ['link', { rel: 'alternate', type: 'text/plain', href: `${site}llms.txt`, title: 'LLM が読むためのドキュメントの索引' }],
    ],

    // Mermaid プラグインは動的 import でコンポーネントを登録する。そのため、Mermaid を
    // 明示しないと、Vite の開発時のスキャナーが依存関係のツリーを見落とす。
    vite: {
      optimizeDeps: {
        include: ['mermaid'],
      },
    },

    // Mermaid を strict にする。プラグインの既定は `securityLevel: 'loose'` なので上書きし、
    // 図はクライアントでのマウント後に描画する（SSR では自動で開始しない）。
    mermaid: {
      securityLevel: 'strict',
      startOnLoad: false,
      flowchart: {
        useMaxWidth: false,
      },
    },

    themeConfig: {
      logo: '/favicon.svg',
      siteTitle: 'LLM Wiki',

      nav: [
        { text: '概要', link: '/', activeMatch: '^/$' },
        {
          text: 'ガイド',
          link: '/getting-started',
          activeMatch: '^/(getting-started|workflows)',
        },
        { text: 'コマンド', link: '/commands', activeMatch: '^/commands' },
        {
          text: '検索',
          link: '/search',
          activeMatch: '^/(search|graph)',
        },
        {
          text: 'ホスト型',
          link: '/hosted',
          activeMatch: '^/(hosted|decisions)',
        },
        { text: 'エージェント', link: '/agents', activeMatch: '^/agents' },
        {
          text: 'v4.0.1',
          items: [
            {
              items: [
                { text: 'v4.0.1（最新）', link: '/' },
                { text: 'v3.2.0（旧版）', link: '/v3/' },
              ],
            },
            {
              items: [
                { text: 'v4 へのアップグレード', link: '/upgrade' },
                { text: '変更履歴', link: `${repo}/blob/main/CHANGELOG.md` },
                { text: 'リリース', link: `${repo}/releases` },
              ],
            },
          ],
        },
      ],

      sidebar: {
        // v3.2.0 のページには専用のサイドバーを使う。このキーは '/' より前に置くこと。
        '/v3/': [
          {
            text: 'v3.2.0（旧版）',
            items: [
              { text: 'ホーム', link: '/v3/' },
              { text: 'はじめに', link: '/v3/getting-started' },
            ],
          },
          {
            text: 'ガイド',
            items: [
              { text: 'コマンド', link: '/v3/commands' },
              { text: 'ワークフロー', link: '/v3/workflows' },
              { text: '学習とスキルの改善', link: '/v3/evolution' },
              { text: '検索と取得', link: '/v3/search' },
              { text: 'グラフ層', link: '/v3/graph' },
            ],
          },
          {
            text: 'エコシステム',
            items: [
              { text: '連携', link: '/v3/integrations' },
              { text: 'エージェント', link: '/v3/agents' },
            ],
          },
          {
            text: 'リリース',
            items: [
              { text: 'v3.2 へのアップグレード', link: '/v3/upgrade' },
              { text: '現行のバージョン（v4.0.1）', link: '/' },
            ],
          },
        ],
        '/': [
          {
            text: 'はじめに',
            items: [
              { text: 'ホーム', link: '/' },
              { text: 'はじめに', link: '/getting-started' },
            ],
          },
          {
            text: 'ガイド',
            items: [
              { text: 'コマンド', link: '/commands' },
              { text: 'ワークフロー', link: '/workflows' },
              { text: '学習とスキルの改善', link: '/evolution' },
              { text: '検索と取得', link: '/search' },
              { text: 'グラフ層', link: '/graph' },
            ],
          },
          {
            text: 'ホスト型',
            items: [
              { text: 'ホスト型 wiki', link: '/hosted' },
              { text: '判定モデル', link: '/decisions' },
            ],
          },
          {
            text: 'エコシステム',
            items: [{ text: 'エージェント', link: '/agents' }],
          },
          {
            text: 'リリース',
            items: [
              { text: 'v4 へのアップグレード', link: '/upgrade' },
              { text: 'v3.2.0 のドキュメント（旧版）', link: '/v3/' },
            ],
          },
        ],
      },

      // VitePress 組み込みのあいまい全文検索を、ローカルの候補表示にも使う。
      search: {
        provider: 'local',
        options: {
          // 検索結果に v4 のページだけが出るように、v3.2.0 のページは検索インデックスから外す。
          _render(src, env, md) {
            return env.relativePath.startsWith(legacyPrefix) ? '' : md.render(src, env)
          },
          miniSearch: {
            searchOptions: {
              fuzzy: 0.2,
              prefix: true,
              boost: { title: 4, text: 2, titles: 1 },
            },
          },
        },
      },

      outline: {
        level: [2, 3],
        label: 'このページの内容',
      },

      socialLinks: [{ icon: 'github', link: repo }],

      editLink: {
        pattern: `${repo}/edit/main/docs/:path`,
        text: 'GitHub でこのページを編集する',
      },

      lastUpdated: {
        text: '最終更新日',
        formatOptions: { dateStyle: 'medium' },
      },

      docFooter: {
        prev: '前のページ',
        next: '次のページ',
      },

      footer: {
        message: 'MIT ライセンスで公開している。',
        copyright: `Copyright © 2026 Praney Behl · <a href="${repo}">GitHub</a>`,
      },
    },
  }),
)
