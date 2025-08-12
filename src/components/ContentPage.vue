<template>
  <div class="content-page">
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h2 class="page-title">{{ contentTitle }}</h2>
          <span class="title-badge">详情</span>
        </div>
        <p class="page-subtitle">内容分析结果</p>
      </div>
      <button class="btn-back" @click="$emit('navigate', 'browse')">
        <svg class="back-icon" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>返回浏览</span>
      </button>
    </div>

    <div class="content-container">
      <!-- 总体评价长条 -->
      <div class="overall-evaluation-bar">
        <h3>📊 总体评价</h3>
        <div class="evaluation-content">
          <div v-if="parsedSections.overall_evaluation" v-html="parsedSections.overall_evaluation"></div>
          <div v-else class="no-content">暂无总体评价内容</div>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content-grid">
        <div class="text-box">
          <h3>💡 总体建议</h3>
          <div class="text-content">
            <div v-if="parsedSections.general_suggestions" v-html="parsedSections.general_suggestions"></div>
            <div v-else class="no-content">暂无总体建议内容</div>
          </div>
        </div>

        <div class="text-box">
          <h3>✨ 润色文本</h3>
          <div class="polish-options">
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="polishTextOptions.showModifications" class="checkbox">
                增减修改
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="polishTextOptions.showVoiceIntonation" class="checkbox">
                语音语调
              </label>
            </div>
            <button
              class="show-original-btn"
              :class="{ active: showOriginalText }"
              @click="toggleOriginalText"
            >
              {{ showOriginalText ? '隐藏原文' : '显示原文' }}
            </button>
          </div>
          <div class="text-content">
            <div v-if="showOriginalText && parsedSections.original_text" class="original-text-display">
              <h4>📄 原文本</h4>
              <div v-html="parsedSections.original_text"></div>
              <div class="divider"></div>
            </div>
            <div v-if="filteredPolishedText" v-html="filteredPolishedText"></div>
            <div v-else class="no-content">暂无润色文本内容</div>
          </div>
        </div>
      </div>

      <!-- 视频在底部 -->
      <div class="video-section">
        <h3>视频内容</h3>
        <video
          v-if="videoSrc"
          :src="videoSrc"
          controls
          width="100%"
          @error="handleVideoError"
        >
          您的浏览器不支持视频播放。
        </video>
        <div v-else class="no-content">
          暂无视频内容
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { database, type FileData } from '../utils/database'
import { markdownToHtml } from '../utils/markdownRenderer'

defineEmits<{
  navigate: [page: string]
}>()

const props = defineProps<{
  userId?: string
  title?: string
}>()

const contentData = ref<FileData | null>(null)
const loading = ref(false)

const contentTitle = computed(() => contentData.value?.title || '内容详情')
const videoSrc = computed(() => contentData.value?.video || '')
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const markdownHtml = computed(() =>
  contentData.value?.markdown ? markdownToHtml(contentData.value.markdown) : ''
)

// 解析Markdown内容，按一级标题分类
const parseMarkdownSections = (markdown: string) => {
  if (!markdown) return {}

  const sections: Record<string, string> = {}

  const parts = markdown.split(/^# /gm).filter(part => part.trim())

  parts.forEach(part => {
    const lines = part.split('\n')
    const title = lines[0].trim()
    const content = lines.slice(1).join('\n').trim()

    if (title.includes('总体评价') || title.includes('评价')) {
      sections.overall_evaluation = markdownToHtml(content)
    } else if (title.includes('原文本') || title.includes('原文') || title.includes('原始')) {
      sections.original_text = markdownToHtml(content)
    } else if (title.includes('总体建议') || title.includes('建议')) {
      sections.general_suggestions = markdownToHtml(content)
    } else if (title.includes('润色文本') || title.includes('润色') || title.includes('修改')) {
      sections.polished_text = markdownToHtml(content)
    }
  })

  return sections
}

const parsedSections = computed(() =>
  contentData.value?.markdown ? parseMarkdownSections(contentData.value.markdown) : {}
)

const polishTextOptions = ref({
  showModifications: false,
  showVoiceIntonation: false,
  showBodyLanguage: false
})

// 原文本显示控制
const showOriginalText = ref(false)

// 过滤润色文本内容
const filterPolishedText = (htmlContent: string) => {
  if (!htmlContent) return ''

  let filteredContent = htmlContent

  if (!polishTextOptions.value.showModifications &&
      !polishTextOptions.value.showVoiceIntonation) {
    filteredContent = filteredContent.replace(/<del>.*?<\/del>/gs, '')
    filteredContent = removeVoiceIntonationTags(filteredContent)
    filteredContent = removeBodyLanguageTags(filteredContent)
    filteredContent = removeBlueStyling(filteredContent)
    return filteredContent
  }


  if (!polishTextOptions.value.showVoiceIntonation) {
    filteredContent = removeVoiceIntonationTags(filteredContent)
  }

  filteredContent = removeBodyLanguageTags(filteredContent)

  if (!polishTextOptions.value.showModifications) {
    filteredContent = filteredContent.replace(/<del>.*?<\/del>/gs, '')
    filteredContent = removeBlueStyling(filteredContent)
  }

  return filteredContent
}

const removeVoiceIntonationTags = (content: string) => {
  let result = content
  let prev = ''

  // 循环移除，兼容嵌套
  const voicePattern = /<(?:span|b)\s+style="color:#8B4513;">（[\s\S]*?）<\/(?:span|b)>/g

  while (result !== prev) {
    prev = result
    result = result.replace(voicePattern, '')
  }
  return result
}

const removeBodyLanguageTags = (content: string) => {
  let result = content
  let prev = ''

  const bodyPattern = /<(?:span|b)\s+style="color:#006400;">（[\s\S]*?）<\/(?:span|b)>/g

  while (result !== prev) {
    prev = result
    result = result.replace(bodyPattern, '')
  }
  return result
}


// 移除蓝色样式但保留内容的辅助函数
const removeBlueStyling = (content: string) => {
  // 处理嵌套的span标签，从内到外逐层移除
  let result = content
  let prevResult = ''

  while (result !== prevResult) {
    prevResult = result
    result = result.replace(/<span\s+style="color:blue;">([^<]*(?:<(?!\/span>)[^<]*)*)<\/span>/g, '$1')
    result = result.replace(/<span\s+style="color:blue;">(<[^>]*>[^<]*<\/[^>]*>)<\/span>/g, '$1')
    result = result.replace(/<span\s+style="color:blue;">((?:(?!<span\s+style="color:blue;">).)*?)<\/span>/gs, '$1')
  }

  return result
}

// 过滤后的润色文本内容
const filteredPolishedText = computed(() =>
  filterPolishedText(parsedSections.value.polished_text || '')
)

const loadContent = async () => {
  if (!props.userId || !props.title) {
    console.error('缺少用户ID或标题')
    return
  }

  loading.value = true

  try {
    const content = await database.getUserContent(props.userId, props.title)

    if (content) {
      contentData.value = content
      console.log('内容加载成功')
    } else {
      console.error('未找到内容')
      contentData.value = null
    }
  } catch (error) {
    console.error('加载内容失败:', error)
    contentData.value = null
  } finally {
    loading.value = false
  }
}

const handleVideoError = (event: Event) => {
  console.error('视频加载失败:', event)
  alert('视频加载失败，可能是文件格式不支持或文件已损坏')
}

// 切换原文本显示状态
const toggleOriginalText = () => {
  showOriginalText.value = !showOriginalText.value
}

// 监听props变化，重新加载内容
watch(
  () => [props.userId, props.title],
  () => {
    if (props.userId && props.title) {
      loadContent()
    }
  },
  { immediate: true }
)

// 暴露方法供父组件调用
defineExpose({
  loadContent
})
</script>

<style scoped>
.content-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 20px 32px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.page-title {
  color: white;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.title-badge {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-shadow: none;
  box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3);
}

.page-subtitle {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0;
  opacity: 0.9;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 10px 18px;
  border-radius: 16px;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.btn-back:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
}

.btn-back:active {
  transform: translateY(0);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.back-icon {
  width: 18px;
  height: 18px;
  transition: transform 0.2s ease;
}

.btn-back:hover .back-icon {
  transform: translateX(-2px);
}

.content-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}

/* 总体评价长条样式 */
.overall-evaluation-bar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 25px 30px;
  margin-bottom: 25px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.overall-evaluation-bar h3 {
  color: white;
  margin: 0 0 15px 0;
  font-size: 1.4rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  border: none;
  padding: 0;
}

.evaluation-content {
  line-height: 1.7;
  font-size: 1.05rem;
}

.evaluation-content div {
  color: rgba(255, 255, 255, 0.95) !important;
}

.overall-evaluation-bar .no-content {
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 20px;
  font-style: italic;
}

/* 主要内容区域 - 1x2 网格布局 */
.main-content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin-bottom: 40px;
}

/* 文本框样式 */
.text-box {
  background: #f7fafc;
  padding: 25px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}

.text-box:hover {
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.text-box h3 {
  color: #4a5568;
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

.text-content {
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
}

.text-content div {
  color: #2d3748;
}

.polish-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  color: #4a5568;
  cursor: pointer;
  user-select: none;
  transition: color 0.3s ease;
}

.checkbox-label:hover {
  color: #667eea;
}

.checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #cbd5e0;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.checkbox:checked {
  background: #667eea;
  border-color: #667eea;
  position: relative;
}

.checkbox:checked::before {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 11px;
  font-weight: bold;
  line-height: 1;
}

.checkbox:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* 显示原文按钮样式 */
.show-original-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  white-space: nowrap;
}

.show-original-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.show-original-btn.active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3);
}

.show-original-btn.active:hover {
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}

/* 原文本显示区域样式 */
.original-text-display {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.original-text-display h4 {
  color: #4a5568;
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.original-text-display div {
  color: #2d3748;
  line-height: 1.6;
}

.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
  margin: 16px 0 0 0;
}

/* 视频部分样式 */
.video-section {
  background: #f7fafc;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.video-section h3 {
  color: #4a5568;
  margin-bottom: 15px;
  font-size: 1.3rem;
  font-weight: 600;
}

.video-section video {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-width: 100%;
  height: auto;
}

.no-content {
  text-align: center;
  color: #718096;
  padding: 40px;
  font-style: italic;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

/* Markdown内容样式 */
.markdown-content {
  line-height: 1.6;
  color: #2d3748;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: #4a5568;
}

.markdown-content :deep(h1) { font-size: 2em; }
.markdown-content :deep(h2) { font-size: 1.5em; }
.markdown-content :deep(h3) { font-size: 1.3em; }

.markdown-content :deep(p) {
  margin-bottom: 1em;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 20px;
  margin-bottom: 1em;
}

.markdown-content :deep(li) {
  margin-bottom: 0.5em;
}

.markdown-content :deep(code) {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.markdown-content :deep(pre) {
  background: #2d3748;
  color: #e2e8f0;
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  padding-left: 15px;
  margin-left: 0;
  margin-bottom: 1em;
  color: #4a5568;
  font-style: italic;
}

.markdown-content :deep(a) {
  color: #667eea;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .content-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
    text-align: center;
    padding: 16px 24px;
  }

  .title-section {
    justify-content: center;
    margin-bottom: 4px;
  }

  .page-title {
    font-size: 1.5rem;
  }

  .title-badge {
    font-size: 0.7rem;
    padding: 3px 10px;
  }

  .page-subtitle {
    font-size: 0.85rem;
  }

  .btn-back {
    align-self: center;
    padding: 10px 16px;
  }

  .content-container {
    padding: 25px;
  }

  /* 移动端单列布局 */
  .main-content-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-bottom: 30px;
  }

  .overall-evaluation-bar {
    padding: 20px 25px;
    margin-bottom: 20px;
  }

  .overall-evaluation-bar h3 {
    font-size: 1.2rem;
  }

  .evaluation-content {
    font-size: 1rem;
  }

  .text-box {
    min-height: 150px;
    padding: 15px;
  }

  .text-box h3 {
    font-size: 1.1rem;
  }

  /* 移动端复选框样式调整 */
  .polish-options {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }

  .checkbox-group {
    width: 100%;
  }

  .checkbox-label {
    font-size: 0.85rem;
  }

  .show-original-btn {
    align-self: flex-start;
    font-size: 0.8rem;
    padding: 5px 12px;
  }
}
</style>
