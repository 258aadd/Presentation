<template>
  <div class="upload-page">
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">📤 上传文件</h2>
        <p class="page-subtitle">上传视频文件和Markdown文档到测试系统v1.0</p>
      </div>
      <button class="btn btn-back" @click="$emit('navigate', 'home')">
        <span class="back-icon">←</span>
        返回首页
      </button>
    </div>

    <div class="upload-container">
      <form @submit.prevent="handleSubmit" class="upload-form">
        <div class="form-section">
          <h3 class="section-title">📝 基本信息</h3>

          <div class="input-group">
            <label for="upload-user-id">
              <span class="label-icon">👤</span>
              用户ID
            </label>
            <input
              id="upload-user-id"
              v-model="formData.userId"
              type="text"
              required
              placeholder="请输入用户ID"
            >
          </div>

          <div class="input-group">
            <label for="upload-title">
              <span class="label-icon">✏️</span>
              标题
            </label>
            <input
              id="upload-title"
              v-model="formData.title"
              type="text"
              required
              placeholder="请输入标题"
            >
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">📁 文件选择</h3>

          <div class="input-group">
            <label for="video-file">
              <span class="label-icon">🎬</span>
              视频文件
            </label>
            <input
              id="video-file"
              type="file"
              accept="video/*"
              required
              @change="handleVideoChange"
              class="file-input"
            >
            <div v-if="videoInfo" class="file-info success">
              <div class="file-details">
                <strong>已选择文件:</strong> {{ videoInfo.name }}<br>
                <strong>文件大小:</strong> {{ videoInfo.size }}<br>
                <strong>文件类型:</strong> {{ videoInfo.type }}
              </div>
            </div>
          </div>

          <div class="input-group">
            <label for="markdown-file">
              <span class="label-icon">📝</span>
              Markdown文档/TXT文件
            </label>
            <input
              id="markdown-file"
              type="file"
              accept=".md,.markdown,.txt"
              required
              @change="handleMarkdownChange"
              class="file-input"
            >
            <div v-if="markdownInfo" class="file-info success">
              <div class="file-details">
                <strong>已选择文件:</strong> {{ markdownInfo.name }}<br>
                <strong>文件大小:</strong> {{ markdownInfo.size }}<br>
                <strong>文件类型:</strong> {{ markdownInfo.type }}
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="uploading">
            <span v-if="uploading" class="loading-spinner"></span>
            {{ uploading ? '上传中...' : '上传文件' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { database } from '../utils/database'
import { readFileAsDataURL, readFileAsText, formatFileSize, validateVideoFile } from '../utils/fileUtils'

const emit = defineEmits<{
  navigate: [page: string]
  showMessage: [message: string, type: 'success' | 'error']
  showLoading: [show: boolean]
}>()

const formData = reactive({
  userId: '',
  title: ''
})

const videoInfo = ref<{ name: string; size: string; type: string } | null>(null)
const markdownInfo = ref<{ name: string; size: string; type: string } | null>(null)
const uploading = ref(false)

let selectedVideoFile: File | null = null
let selectedMarkdownFile: File | null = null

const handleVideoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    const error = validateVideoFile(file)
    if (error) {
      alert(error)
      target.value = ''
      videoInfo.value = null
      selectedVideoFile = null
      return
    }

    selectedVideoFile = file
    videoInfo.value = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    }
  } else {
    videoInfo.value = null
    selectedVideoFile = null
  }
}

const handleMarkdownChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    // 检查是否为支持的文件类型（markdown或txt）
    const error = validateMarkdownOrTxtFile(file)
    if (error) {
      alert(error)
      target.value = ''
      markdownInfo.value = null
      selectedMarkdownFile = null
      return
    }

    selectedMarkdownFile = file
    markdownInfo.value = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    }
  } else {
    markdownInfo.value = null
    selectedMarkdownFile = null
  }
}


const validateMarkdownOrTxtFile = (file: File): string | null => {
  const allowedExtensions = ['.md', '.markdown', '.txt']
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

  if (!allowedExtensions.includes(fileExtension)) {
    return '请选择Markdown文件(.md, .markdown)或文本文件(.txt)'
  }

  if (file.size > 10 * 1024 * 1024) {
    return '文件大小不能超过10MB'
  }

  return null
}

const handleSubmit = async () => {
  if (!selectedVideoFile || !selectedMarkdownFile) {
    alert('请选择视频文件和文档文件')
    return
  }

  // 检查标题是否已存在
  const existingTitles = await database.getUserTitles(formData.userId)
  if (existingTitles.includes(formData.title)) {
    if (!confirm('该标题已存在，是否要覆盖？')) {
      return
    }
  }

  uploading.value = true

  try {
    console.log('=== Vue应用上传流程开始 ===')
    console.log(`视频文件: ${selectedVideoFile.name} (${formatFileSize(selectedVideoFile.size)})`)
    console.log(`Markdown文件: ${selectedMarkdownFile.name} (${formatFileSize(selectedMarkdownFile.size)})`)

    // 读取文件
    console.log('读取文件中...')
    const videoData = await readFileAsDataURL(selectedVideoFile)
    let markdownContent = await readFileAsText(selectedMarkdownFile)

    // 如果是txt文件，转换为markdown格式
    if (selectedMarkdownFile.name.toLowerCase().endsWith('.txt')) {
      console.log('检测到txt文件，转换为markdown格式...')
      markdownContent = convertTxtToMarkdown(markdownContent)
    }

    console.log('文件读取完成，开始保存...')

    // 保存数据
    const success = await database.saveData(formData.userId, formData.title, videoData, markdownContent)

    if (success) {
      // 重置表单
      formData.userId = ''
      formData.title = ''
      videoInfo.value = null
      markdownInfo.value = null
      selectedVideoFile = null
      selectedMarkdownFile = null

      // 重置文件输入框
      const videoInput = document.getElementById('video-file') as HTMLInputElement
      const markdownInput = document.getElementById('markdown-file') as HTMLInputElement
      if (videoInput) videoInput.value = ''
      if (markdownInput) markdownInput.value = ''

      alert('文件上传成功！')
      setTimeout(() => {
        emit('navigate', 'home')
      }, 1500)
    } else {
      alert('文件上传失败，请重试')
    }
  } catch (error) {
    console.error('上传过程中出错:', error)
    alert((error as Error).message || '文件处理失败，请检查文件格式')
  } finally {
    uploading.value = false
  }
}

const convertTxtToMarkdown = (txtContent: string): string => {
  return txtContent
}
</script>

<style scoped>
.upload-page {
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
  cursor: pointer;
}

.btn-back:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.back-icon {
  font-size: 1.2rem;
}

.upload-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}

.upload-form {
  max-width: 100%;
}

.form-section {
  margin-bottom: 40px;
}

.section-title {
  color: #4a5568;
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 25px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-group {
  margin-bottom: 25px;
}

.input-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: #4a5568;
  font-size: 1rem;
}

.label-icon {
  font-size: 1.1rem;
}

.input-group input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.file-input {
  background: #f7fafc;
  cursor: pointer;
}

.file-input:hover {
  background: #edf2f7;
}

.file-info {
  margin-top: 12px;
  padding: 15px;
  border-radius: 8px;
  font-size: 0.9rem;
}

.file-info.success {
  background: #f0fff4;
  border: 1px solid #c6f6d5;
  color: #2f855a;
}

.file-details {
  line-height: 1.5;
}

.form-actions {
  display: flex;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.btn {
  padding: 12px 32px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  justify-content: center;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .upload-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
    text-align: center;
  }

  .upload-container {
    padding: 25px;
  }

  .form-section {
    margin-bottom: 30px;
  }

  .section-title {
    font-size: 1.2rem;
  }
}

@media (max-width: 480px) {
  .upload-container {
    padding: 20px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .input-group input {
    padding: 10px 14px;
  }
}
</style>
