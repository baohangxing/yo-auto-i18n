<script lang="ts" setup>
import { defineProps } from 'vue'

const props = defineProps<{
  msg: string
}>()

const h3 = '你好'
</script>

<template>
  <div>
    <h3>{{ h3 }}</h3>
    <h3>{{ props.msg }}</h3>
    <ul>
      <li>
        <a>babel</a>
      </li>
      <li>
        <a>路由器</a>
      </li>
      <li>
        <a>vuex</a>
      </li>
      <li>
        <a>eslint</a>
      </li>
      <li>
        <a>打字稿</a>
      </li>
    </ul>
    <h3>基本链接</h3>
    <ul>
      <li><a href="https://vuejs.org" target="_blank" rel="noopener">核心文档</a></li>
      <li><a href="https://forum.vuejs.org" target="_blank" rel="noopener">论坛</a></li>
      <li><a href="https://chat.vuejs.org" target="_blank" rel="noopener">社区聊天</a></li>
      <li><a href="https://twitter.com/vuejs" target="_blank" rel="noopener">推特</a></li>
      <li><a href="https://news.vuejs.org" target="_blank" rel="noopener">新闻</a></li>
    </ul>
    <h3>生态系统</h3>
    <ul>
      <li><a href="https://router.vuejs.org" target="_blank" rel="noopener">vue-router</a></li>
      <li><a href="https://vuex.vuejs.org" target="_blank" rel="noopener">vuex</a></li>
      <li>
        <a>vue-devtools</a>
      </li>
      <li><a href="https://vue-loader.vuejs.org" target="_blank" rel="noopener">vue-loader</a></li>
      <li><a href="https://github.com/vuejs/awesome-vue" target="_blank" rel="noopener">awesome-vue</a></li>
    </ul>
  </div>
</template>

<style scoped>
h3 {
  margin: 40px 0 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
