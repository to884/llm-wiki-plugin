<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

// docs/v3/ 以下のページはすべて、更新を止めた v3.2.0 のドキュメントである。
const { page } = useData()
const legacy = computed(() => page.value.relativePath.startsWith('v3/'))
</script>

<template>
  <div v-if="legacy" class="vp-doc legacy-banner">
    <div class="custom-block warning" role="note">
      <p class="custom-block-title">旧版</p>
      <p>
        これは v3.2.0 のドキュメントである。現行のメジャーバージョンは v4 で、v4 では Paperclip 連携が削除され、
        任意で使えるホスト型 wiki が加わった。<a :href="withBase('/upgrade')">アップグレードガイド</a>を読むか、
        <a :href="withBase('/')">現行のドキュメント</a>に移動してほしい。
      </p>
    </div>
  </div>
</template>

<style scoped>
.legacy-banner {
  margin-bottom: 24px;
}
</style>
