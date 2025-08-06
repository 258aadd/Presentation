<template>
  <div class="browse-page">
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">📁 浏览文件</h2>
        <p class="page-subtitle">查看测试系统v1.0中已上传的文件内容</p>
      </div>
      <button class="btn btn-back" @click="$emit('navigate', 'home')">
        <span class="back-icon">←</span>
        返回主页
      </button>
    </div>

        <div class="browse-container">
          <div class="browse-card">

          <form @submit.prevent="handleSubmit">
            <div class="input-group">
              <label for="browse-user-id">用户ID:</label>
              <input
                id="browse-user-id"
                v-model="formData.userId"
                type="text"
                required
                placeholder="请输入用户ID"
              >
            </div>

            <div class="input-group">
              <label for="browse-title">选择标题:</label>
              <select id="browse-title" v-model="formData.title" required :disabled="loading">
                <option value="">
                  {{ loading ? '加载标题中...' :
                     titleOptions.length ? '请选择标题' :
                     formData.userId.trim() ? '该用户暂无上传内容' : '请先输入用户ID' }}
                </option>
                <option v-for="title in titleOptions" :key="title" :value="title">
                  {{ title }}
                </option>
              </select>
              <div v-if="loading" class="loading-indicator">
                <span class="loading-spinner"></span>
                正在加载标题...
              </div>
            </div>

            <div class="button-group">
              <button type="submit" class="btn btn-primary" :disabled="!formData.userId || !formData.title || loading">
                查看内容
              </button>
            </div>
          </form>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { database } from '../utils/database'

const emit = defineEmits<{
  navigate: [page: string]
  showContent: [userId: string, title: string]
}>()

const formData = reactive({
  userId: '',
  title: ''
})

const titleOptions = ref<string[]>([])
const loading = ref(false)
let debounceTimer: number | null = null

const loadTitles = async (userId: string) => {
  if (!userId.trim()) {
    titleOptions.value = []
    return
  }

  loading.value = true

  try {
    const titles = await database.getUserTitles(userId)
    titleOptions.value = titles
    formData.title = '' // 重置选择

    if (titles.length === 0) {
      console.log('该用户暂无上传内容')
    } else {
      console.log(`找到 ${titles.length} 个标题`)
    }
  } catch (error) {
    console.error('加载标题失败:', error)
    titleOptions.value = []
  } finally {
    loading.value = false
  }
}

// 防抖函数，避免频繁请求
const debouncedLoadTitles = (userId: string) => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    loadTitles(userId)
  }, 500) // 500ms 防抖延迟
}

// 监听用户ID变化，自动加载标题
watch(() => formData.userId, (newUserId) => {
  debouncedLoadTitles(newUserId)
}, { immediate: false })

const handleSubmit = async () => {
  if (!formData.userId || !formData.title) {
    alert('请填写用户ID并选择标题')
    return
  }

  try {
    const content = await database.getUserContent(formData.userId, formData.title)

    if (content) {
      // 触发显示内容事件
      emit('showContent', formData.userId, formData.title)
    } else {
      alert('未找到相关内容')
    }
  } catch (error) {
    console.error('加载内容失败:', error)
    alert('加载内容失败')
  }
}
</script>

<style scoped>
.browse-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 25px 30px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  flex: 1;
}

.page-title {
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 8px 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 0;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.back-icon {
  font-size: 1.2rem;
}

.browse-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}

.browse-card {
  max-width: 100%;
}



.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #4a5568;
}

.input-group input,
.input-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.input-group input:focus,
.input-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-group select:disabled {
  background-color: #f7fafc;
  color: #a0aec0;
  cursor: not-allowed;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #667eea;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top: 2px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.button-group {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 120px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-info {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

@media (max-width: 768px) {
  .browse-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
    text-align: center;
  }

  .browse-container {
    padding: 25px;
  }

  .button-group {
    flex-direction: column;
  }
}
</style>
