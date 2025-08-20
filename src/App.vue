<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { database } from './utils/database_old'
import HomePage from './components/HomePage.vue'
import UploadPage from './components/UploadPage.vue'
import BrowsePage from './components/BrowsePage.vue'
import ContentPage from './components/ContentPage.vue'
import StoragePage from './components/StoragePage.vue'

const currentPage = ref('home')
const contentData = ref({ userId: '', title: '' })
const loading = ref(false)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const navigate = (page: string) => {
  currentPage.value = page
}

const showContent = (userId: string, title: string) => {
  contentData.value = { userId, title }
  currentPage.value = 'content'
}

const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
  message.value = text
  messageType.value = type

  setTimeout(() => {
    message.value = ''
  }, 3000)
}

const showLoading = (show: boolean) => {
  loading.value = show
}

onMounted(async () => {
  try {
    await database.init()
    console.log('数据库初始化成功')
  } catch (error) {
    console.error('数据库初始化失败:', error)
    showMessage('数据库初始化失败，部分功能可能无法使用', 'error')
  }
})
</script>

<template>
  <div class="app">
    <header>
      <h1>测试系统v2.0</h1>
    </header>

    <main class="main-content">
      <!-- 主页 -->
      <HomePage
        v-if="currentPage === 'home'"
        @navigate="navigate"
      />

      <!-- 上传页面 -->
      <UploadPage
        v-if="currentPage === 'upload'"
        @navigate="navigate"
        @show-message="showMessage"
        @show-loading="showLoading"
      />

      <!-- 浏览页面 -->
      <BrowsePage
        v-if="currentPage === 'browse'"
        @navigate="navigate"
        @show-content="showContent"
      />

      <!-- 内容展示页面 -->
      <ContentPage
        v-if="currentPage === 'content'"
        :user-id="contentData.userId"
        :title="contentData.title"
        @navigate="navigate"
      />

      <!-- 存储管理页面 -->
      <StoragePage
        v-if="currentPage === 'storage'"
        @navigate="navigate"
        @view-content="showContent"
      />
    </main>

    <!-- 加载动画 -->
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>处理中...</p>
    </div>

    <!-- 消息提示 -->
    <div v-if="message" :class="['message', messageType]">
      {{ message }}
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

header {
  text-align: center;
  padding: 20px 0;
}

header h1 {
  color: white;
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  margin: 0;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px 20px;
}

/* 加载动画 */
.loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading p {
  color: white;
  margin-top: 15px;
  font-size: 1.1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 消息提示 */
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.message.success {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.message.error {
  background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
}

@media (max-width: 768px) {
  header h1 {
    font-size: 2rem;
  }

  .main-content {
    padding: 0 15px 15px;
  }
}
</style>
