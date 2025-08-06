<template>
  <div class="content-page">
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">📄 {{ contentTitle }}</h2>
        <p class="page-subtitle">测试系统v1.0内容详情</p>
      </div>
      <button class="btn btn-back" @click="$emit('navigate', 'browse')">
        <span class="back-icon">←</span>
        返回浏览
      </button>
    </div>

    <div class="content-container">
      <!-- 2x2 文本展示框 -->
      <div class="content-grid">
        <div class="text-box">
          <h3>总体评价</h3>
          <div class="text-content">
            <div v-if="parsedSections.overall_evaluation" v-html="parsedSections.overall_evaluation"></div>
            <div v-else class="no-content">暂无总体评价内容</div>
          </div>
        </div>

        <div class="text-box">
          <h3>原文本</h3>
          <div class="text-content">
            <div v-if="parsedSections.original_text" v-html="parsedSections.original_text"></div>
            <div v-else class="no-content">暂无原文本内容</div>
          </div>
        </div>

        <div class="text-box">
          <h3>总体建议</h3>
          <div class="text-content">
            <div v-if="parsedSections.general_suggestions" v-html="parsedSections.general_suggestions"></div>
            <div v-else class="no-content">暂无总体建议内容</div>
          </div>
        </div>

        <div class="text-box">
          <h3>润色文本</h3>
          <div class="polish-options">
            <label class="checkbox-label">
              <input type="checkbox" v-model="polishTextOptions.showModifications" class="checkbox">
              增减修改
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="polishTextOptions.showVoiceIntonation" class="checkbox">
              语音语调
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="polishTextOptions.showBodyLanguage" class="checkbox">
              肢体动作
            </label>
          </div>
          <div class="text-content">
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
const markdownHtml = computed(() =>
  contentData.value?.markdown ? markdownToHtml(contentData.value.markdown) : ''
)

// 解析Markdown内容，按一级标题分类
const parseMarkdownSections = (markdown: string) => {
  if (!markdown) return {}

  const sections: Record<string, string> = {}

  // 按一级标题分割内容
  const parts = markdown.split(/^# /gm).filter(part => part.trim())

  parts.forEach(part => {
    const lines = part.split('\n')
    const title = lines[0].trim()
    const content = lines.slice(1).join('\n').trim()

    // 根据标题映射到对应的字段
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

// 解析后的四个部分内容
const parsedSections = computed(() =>
  contentData.value?.markdown ? parseMarkdownSections(contentData.value.markdown) : {}
)

// 润色文本显示选项
const polishTextOptions = ref({
  showModifications: false,    // 增减修改
  showVoiceIntonation: false,  // 语音语调
  showBodyLanguage: false      // 肢体动作
})

// 过滤润色文本内容
const filterPolishedText = (htmlContent: string) => {
  if (!htmlContent) return ''

  let filteredContent = htmlContent

  // 如果没有选择任何选项，显示纯净的修改后文本
  if (!polishTextOptions.value.showModifications &&
      !polishTextOptions.value.showVoiceIntonation &&
      !polishTextOptions.value.showBodyLanguage) {
    // 移除删除标记
    filteredContent = filteredContent.replace(/<del>.*?<\/del>/gs, '')
    // 移除所有语音语调和肢体动作标记（支持多种格式）
    filteredContent = removeVoiceIntonationTags(filteredContent)
    filteredContent = removeBodyLanguageTags(filteredContent)
    // 最后移除新增内容的蓝色样式，保留内容
    filteredContent = removeBlueStyling(filteredContent)
    return filteredContent
  }

  // 关键修改：先移除不需要显示的标记，再处理蓝色样式
  // 这样可以确保在移除蓝色样式时，不需要的标记已经被清理
  if (!polishTextOptions.value.showVoiceIntonation) {
    // 不显示语音语调：移除语音语调标记
    filteredContent = removeVoiceIntonationTags(filteredContent)
  }

  if (!polishTextOptions.value.showBodyLanguage) {
    // 不显示肢体动作：移除肢体动作标记
    filteredContent = removeBodyLanguageTags(filteredContent)
  }

  // 最后处理增减修改的显示
  if (!polishTextOptions.value.showModifications) {
    // 不显示增减修改：移除删除标记和蓝色样式
    filteredContent = filteredContent.replace(/<del>.*?<\/del>/gs, '')
    filteredContent = removeBlueStyling(filteredContent)
  }

  return filteredContent
}

// 移除语音语调标记的辅助函数
const removeVoiceIntonationTags = (content: string) => {
  let result = content
  let prevResult = ''

  // 循环处理，确保移除所有语音语调标记，包括嵌套的
  while (result !== prevResult) {
    prevResult = result

    // 匹配多种格式的语音语调标记
    const patterns = [
      // <b style="color:#8B4513;">（语音语调：...）</b>
      /<b\s+style="color:#8B4513;">（语音语调：[^）]*）<\/b>/g,
      // <span style="color:#8B4513;">（语音语调：...）</span>
      /<span\s+style="color:#8B4513;">（语音语调：[^）]*）<\/span>/g,
    ]

    patterns.forEach(pattern => {
      result = result.replace(pattern, '')
    })
  }

  return result
}

// 移除肢体动作标记的辅助函数
const removeBodyLanguageTags = (content: string) => {
  let result = content
  let prevResult = ''

  // 循环处理，确保移除所有肢体动作标记，包括嵌套的
  while (result !== prevResult) {
    prevResult = result

    // 匹配多种格式的肢体动作标记，支持不同颜色
    const patterns = [
      // <b style="color:#8B4513;">（肢体动作：...）</b>
      /<b\s+style="color:#8B4513;">（肢体动作：[^）]*）<\/b>/g,
      // <span style="color:#8B4513;">（肢体动作：...）</span>
      /<span\s+style="color:#8B4513;">（肢体动作：[^）]*）<\/span>/g,
      // <span style="color:#006400;">（肢体动作：...）</span>
      /<span\s+style="color:#006400;">（肢体动作：[^）]*）<\/span>/g,
    ]

    patterns.forEach(pattern => {
      result = result.replace(pattern, '')
    })
  }

  return result
}

// 移除蓝色样式但保留内容的辅助函数
const removeBlueStyling = (content: string) => {
  // 处理嵌套的span标签，从内到外逐层移除
  let result = content
  let prevResult = ''

  // 循环处理，直到没有更多的蓝色span标签
  while (result !== prevResult) {
    prevResult = result
    // 移除最内层的蓝色span标签，保留内容
    result = result.replace(/<span\s+style="color:blue;">([^<]*(?:<(?!\/span>)[^<]*)*)<\/span>/g, '$1')
    // 处理只包含其他标签的蓝色span
    result = result.replace(/<span\s+style="color:blue;">(<[^>]*>[^<]*<\/[^>]*>)<\/span>/g, '$1')
    // 处理复杂嵌套情况
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

.content-container {
  background: white;
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.1);
}

/* 2x2 网格布局 */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

/* 文本框样式 */
.text-box {
  background: #f7fafc;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  min-height: 200px;
  display: flex;
  flex-direction: column;
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

/* 润色文本选项样式 */
.polish-options {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
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
  top: -2px;
  left: 2px;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.checkbox:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
    gap: 20px;
    align-items: stretch;
    text-align: center;
  }

  .content-container {
    padding: 25px;
  }

  /* 移动端单列布局 */
  .content-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-bottom: 30px;
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
  }

  .checkbox-label {
    font-size: 0.85rem;
  }
}
</style>
