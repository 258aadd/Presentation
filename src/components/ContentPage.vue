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

      <!-- 主要内容区域 - 新的左右布局 -->
      <div class="main-content-layout">
        <!-- 左侧：视频和总体建议 -->
        <div class="left-column">
          <!-- 视频部分 -->
          <div class="video-section">
            <h3>🎬 视频内容</h3>
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

          <!-- 总体建议 -->
          <div class="text-box">
            <h3>💡 总体建议</h3>
            <div class="text-content">
              <div v-if="processedGeneralSuggestions" class="markdown-content" v-html="processedGeneralSuggestions"></div>
              <div v-else class="no-content">暂无总体建议内容</div>
            </div>
          </div>
        </div>

        <!-- 右侧：润色文本 -->
        <div class="right-column">
          <div class="text-box">
            <h3>✨ 润色文本</h3>
            <div class="polish-options">
              <div class="options-header">
                <span class="options-title">📋 显示选项</span>
                <div class="button-group">
                  <button
                    class="show-original-btn"
                    :class="{ active: showOriginalText }"
                    @click="toggleOriginalText"
                  >
                    {{ showOriginalText ? '隐藏原文' : '显示原文' }}
                  </button>
                  <button
                    class="edit-text-btn"
                    @click="openEditDialog"
                  >
                    编辑文本
                  </button>
                </div>
              </div>
              <div class="checkbox-grid">
                <label class="checkbox-label">
                  <input type="checkbox" v-model="polishTextOptions.showTextStructure" class="checkbox">
                  <span class="checkbox-text">🔧 文本结构</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="polishTextOptions.showTextPolishing" class="checkbox">
                  <span class="checkbox-text">✨ 文本润色</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="polishTextOptions.showSpeechFlow" class="checkbox">
                  <span class="checkbox-text">🎵 语流呈现</span>
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="polishTextOptions.showLanguageExpression" class="checkbox">
                  <span class="checkbox-text">💬 语言表达</span>
                </label>
              </div>
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
      </div>

      <!-- 编辑弹窗 -->
      <div v-if="showEditDialog" class="edit-dialog-overlay" @click="closeEditDialog">
        <div class="edit-dialog" @click.stop>
          <div class="edit-dialog-header">
            <h3>编辑润色文本</h3>
            <button class="close-btn" @click="closeEditDialog">×</button>
          </div>
          <div class="edit-dialog-content">
            <div class="edit-textarea-container">
              <textarea
                v-model="editedText"
                class="edit-textarea"
                placeholder="在此编辑润色后的文本..."
                rows="20"
              ></textarea>
            </div>
          </div>
          <div class="edit-dialog-footer">
            <button class="btn-cancel" @click="cancelEdit">取消</button>
            <button class="btn-save" @click="saveEdit">保存修改</button>
          </div>
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
  showTextStructure: false,     // 文本结构
  showTextPolishing: false,     // 文本润色
  showSpeechFlow: false,        // 语流呈现
  showLanguageExpression: false // 语言表达
})

// 原文本显示控制
const showOriginalText = ref(false)

// 编辑功能相关
const showEditDialog = ref(false)
const editedText = ref('')
const userModifiedText = ref('')
const originalCleanText = ref('') // 用户编辑时的原始纯文本

// 根据当前选项过滤文本
const applyCurrentFilter = (htmlContent: string) => {
  if (!htmlContent) return ''

  let filteredContent = htmlContent

  // 如果所有选项都未选中，则移除所有标记和修改
  if (!polishTextOptions.value.showTextStructure &&
      !polishTextOptions.value.showTextPolishing &&
      !polishTextOptions.value.showSpeechFlow &&
      !polishTextOptions.value.showLanguageExpression) {
    filteredContent = filteredContent.replace(/<del>.*?<\/del>/gs, '')
    filteredContent = removeTextStructureTags(filteredContent)
    filteredContent = removeSpeechFlowTags(filteredContent)
    filteredContent = removeLanguageExpressionTags(filteredContent)
    filteredContent = removeBlueStyling(filteredContent)
    return filteredContent
  }

  // 根据选项移除对应的标记
  if (!polishTextOptions.value.showTextStructure) {
    filteredContent = removeTextStructureTags(filteredContent)
  }
  if (!polishTextOptions.value.showSpeechFlow) {
    filteredContent = removeSpeechFlowTags(filteredContent)
  }
  if (!polishTextOptions.value.showLanguageExpression) {
    filteredContent = removeLanguageExpressionTags(filteredContent)
  }
  if (!polishTextOptions.value.showTextPolishing) {
    filteredContent = filteredContent.replace(/<del>.*?<\/del>/gs, '')
    filteredContent = removeBlueStyling(filteredContent)
  }

  return filteredContent
}

// 智能合并HTML标记和用户编辑差异
const mergeUserEditWithHTML = (htmlContent: string): string => {
  // 1. 先应用当前过滤选项，保留HTML标记
  const filteredHTML = applyCurrentFilter(htmlContent)

  // 2. 提取纯文本
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = filteredHTML
  const currentCleanText = tempDiv.textContent || tempDiv.innerText || ''

  // 3. 如果当前文本与编辑基础文本相同，在HTML基础上添加用户编辑差异
  if (currentCleanText === originalCleanText.value) {
    return addUserEditDiffToHTML(filteredHTML, originalCleanText.value, userModifiedText.value)
  }

  // 4. 如果不同，使用混合显示：显示过滤后的HTML + 用户编辑差异的分段显示
  const userDiff = computeTextDiff(originalCleanText.value, userModifiedText.value)
  return `${filteredHTML}<div style="margin-top: 15px; padding: 10px; border-top: 2px solid #e53e3e; background: rgba(229, 62, 62, 0.05);"><strong style="color: #e53e3e;">📝 用户编辑差异：</strong><br/>${userDiff}</div>`
}

// 在HTML中添加用户编辑差异标记
const addUserEditDiffToHTML = (htmlContent: string, originalText: string, modifiedText: string): string => {
  // 计算文本差异
  const diffResult = computeTextDiff(originalText, modifiedText)

  // 如果没有差异，返回原HTML
  if (diffResult === escapeHtml(originalText)) {
    return htmlContent
  }

  // 简单策略：如果文本完全相同，显示HTML + 差异，否则替换为差异结果
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  const htmlText = tempDiv.textContent || tempDiv.innerText || ''

  if (htmlText === originalText) {
    // 文本相同，可以安全地在HTML后添加差异
    return `${htmlContent}<div style="margin-top: 10px; padding: 8px; border-left: 3px solid #e53e3e; background: rgba(229, 62, 62, 0.05);"><strong style="color: #e53e3e; font-size: 0.9em;">用户编辑版本：</strong><br/>${diffResult}</div>`
  } else {
    // 文本不同，显示分段
    return `${htmlContent}<div style="margin-top: 15px; padding: 10px; border-top: 2px solid #e53e3e; background: rgba(229, 62, 62, 0.05);"><strong style="color: #e53e3e;">📝 用户编辑差异：</strong><br/>${diffResult}</div>`
  }
}

// 过滤润色文本内容
const filterPolishedText = (htmlContent: string) => {
  if (!htmlContent) return ''

  // 如果有用户编辑，默认显示编辑差异
  if (userModifiedText.value && originalCleanText.value) {
    return mergeUserEditWithHTML(htmlContent)
  }

  // 没有用户编辑时，按当前选项过滤
  return applyCurrentFilter(htmlContent)
}

// 移除文本结构标记（橙色 #FF4500）
const removeTextStructureTags = (content: string) => {
  let result = content
  let prev = ''

  const structurePattern = /<(?:span|b)\s+style="color:#FF4500;">（[\s\S]*?）<\/(?:span|b)>/g

  while (result !== prev) {
    prev = result
    result = result.replace(structurePattern, '')
  }
  return result
}

// 移除语流呈现标记（包括语速、停顿、语音变化、音量等）
const removeSpeechFlowTags = (content: string) => {
  let result = content
  let prev = ''

  // 原有的语流呈现标记（棕色 #8B4513）
  const speechPattern = /<(?:span|b)\s+style="color:#8B4513;">（[\s\S]*?）<\/(?:span|b)>/g

  // 新增的语音标注类型
  const speechSpeedPattern = /<(?:span|b)\s+style="color:#A0522D;">（语速：[\s\S]*?）<\/(?:span|b)>/g
  const pausePattern = /<(?:span|b)\s+style="color:#CD853F;">（停顿：[\s\S]*?）<\/(?:span|b)>/g
  const voiceChangePattern = /<(?:span|b)\s+style="color:#D2691E;">（语音变化：[\s\S]*?）<\/(?:span|b)>/g
  const volumePattern = /<(?:span|b)\s+style="color:#8B0000;">（音量：[\s\S]*?）<\/(?:span|b)>/g

  while (result !== prev) {
    prev = result
    // 移除所有语流呈现相关的标记
    result = result.replace(speechPattern, '')
    result = result.replace(speechSpeedPattern, '')
    result = result.replace(pausePattern, '')
    result = result.replace(voiceChangePattern, '')
    result = result.replace(volumePattern, '')
  }
  return result
}

// 移除语言表达标记（绿色 #006400）
const removeLanguageExpressionTags = (content: string) => {
  let result = content
  let prev = ''

  const languagePattern = /<(?:span|b)\s+style="color:#006400;">（[\s\S]*?）<\/(?:span|b)>/g

  while (result !== prev) {
    prev = result
    result = result.replace(languagePattern, '')
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
  explicitNumberOrderedLists(
    filterPolishedText(parsedSections.value.polished_text || '')
  )
)



// 简化的修复函数，现在主要依赖CSS
const fixOrderedListNumbers = (html: string): string => {
  if (!html) return html;
  // 现在主要依赖全局CSS，这里只做基本处理
  return html;
}

// 为有序列表显式添加编号，作为样式失效时的兜底方案
const explicitNumberOrderedLists = (html: string): string => {
  if (!html) return html

  return html.replace(/<ol\b(?:[^>]*)>[\s\S]*?<\/ol>/g, (olBlock) => {
    // 提取所有 li
    const liMatches = olBlock.match(/<li\b[^>]*>[\s\S]*?<\/li>/g) || []
    if (liMatches.length === 0) return olBlock

    const rebuiltItems = liMatches.map((li, index) => {
      const inner = li
        .replace(/^<li\b[^>]*>/i, '')
        .replace(/<\/li>$/i, '')
      const numberedInner = `<span style="margin-right:6px;">${index + 1}. </span>${inner}`
      return `<li style="display:block;">${numberedInner}</li>`
    }).join('')

    // 标记为显式编号，避免被常规 ol 样式覆盖
    return `<ol data-explicit-numbered style="list-style:none; padding-left:0;">${rebuiltItems}</ol>`
  })
}

// 为总体建议添加分隔线的函数
const addSectionSeparators = (htmlContent: string): string => {
  if (!htmlContent) return ''

  // 先检查是否已经有HTML标题标签
  const hasHtmlHeadings = /<h[1-6]/i.test(htmlContent)

  if (hasHtmlHeadings) {
    // 如果有HTML标题，直接在标题间添加分隔线
    let headingCount = 0
    return htmlContent.replace(/<h([1-3])([^>]*)>/gi, (match) => {
      headingCount++
      if (headingCount === 1) {
        return match
      }
      return `<div class="section-separator"></div>${match}`
    })
  }

  // 如果没有HTML标题，查找可能的文本标题模式
  // 匹配独立段落中的中文标题，且后面跟随列表的情况
  let titleCount = 0
  let processed = htmlContent

  // 模式1: 匹配独立段落中的标题（如 <p>内容结构优化</p>）
  processed = processed.replace(/<p>\s*([\u4e00-\u9fa5]{2,8})\s*<\/p>(?=\s*<ul)/g, (match, title) => {
    titleCount++
    if (titleCount === 1) {
      return `<h3>${title.trim()}</h3>`
    }
    return `<div class="section-separator"></div><h3>${title.trim()}</h3>`
  })

  // 模式2: 如果没有匹配到模式1，尝试匹配强调的标题
  if (titleCount === 0) {
    processed = processed.replace(/<p>\s*<strong>([\u4e00-\u9fa5]{2,8})<\/strong>\s*<\/p>/g, (match, title) => {
      titleCount++
      if (titleCount === 1) {
        return `<h3>${title.trim()}</h3>`
      }
      return `<div class="section-separator"></div><h3>${title.trim()}</h3>`
    })
  }

  return processed
}

// 处理总体建议的显示
const processedGeneralSuggestions = computed(() => {
  const original = parsedSections.value.general_suggestions
  if (!original) return ''

  const fixed = fixOrderedListNumbers(original)
  const withLists = explicitNumberOrderedLists(fixed)
  return addSectionSeparators(withLists)
})

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

// 编辑功能方法
const openEditDialog = () => {
  // 获取完全清理后的纯文本作为编辑基础（移除所有标记）
  let cleanHTML = parsedSections.value.polished_text || ''

  // 移除所有标记，获得纯文本
  cleanHTML = cleanHTML.replace(/<del>.*?<\/del>/gs, '')
  cleanHTML = removeTextStructureTags(cleanHTML)
  cleanHTML = removeSpeechFlowTags(cleanHTML)
  cleanHTML = removeLanguageExpressionTags(cleanHTML)
  cleanHTML = removeBlueStyling(cleanHTML)

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = cleanHTML
  const cleanText = tempDiv.textContent || tempDiv.innerText || ''

  // 保存原始纯文本用于差异比较
  originalCleanText.value = cleanText
  editedText.value = userModifiedText.value || cleanText
  showEditDialog.value = true
}

const closeEditDialog = () => {
  showEditDialog.value = false
}

const cancelEdit = () => {
  editedText.value = ''
  closeEditDialog()
}

// 清理用户编辑状态
const clearUserEdit = () => {
  userModifiedText.value = ''
  originalCleanText.value = ''
}

const saveEdit = () => {
  if (editedText.value.trim()) {
    // 如果编辑后的文本与原文本相同，清理编辑状态
    if (editedText.value === originalCleanText.value) {
      clearUserEdit()
    } else {
      userModifiedText.value = editedText.value
    }
    closeEditDialog()
  }
}

// 字符级别的文本差异比较函数
const computeTextDiff = (originalText: string, modifiedText: string): string => {
  if (!originalText && !modifiedText) return ''
  if (!originalText) return `<span style="color: #e53e3e; font-weight: 600;">${escapeHtml(modifiedText)}</span>`
  if (!modifiedText) return `<del style="color: #999; text-decoration: line-through;">${escapeHtml(originalText)}</del>`

  // 如果文本完全相同，直接返回
  if (originalText === modifiedText) return escapeHtml(originalText)

  const original = originalText.split('')
  const modified = modifiedText.split('')

  // 使用动态规划计算最长公共子序列
  const lcs = computeLCS(original, modified)

  // 根据LCS生成差异标记
  return generateDiffHTML(original, modified, lcs)
}

// 计算最长公共子序列
const computeLCS = (arr1: string[], arr2: string[]): number[][] => {
  const m = arr1.length
  const n = arr2.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

// 根据LCS生成带差异标记的HTML
const generateDiffHTML = (original: string[], modified: string[], lcs: number[][]): string => {
  const result: string[] = []
  let i = original.length
  let j = modified.length

  // 收集所有的操作
  const operations: Array<{type: 'equal' | 'delete' | 'insert', text: string}> = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && original[i - 1] === modified[j - 1]) {
      // 相同字符
      operations.unshift({type: 'equal', text: original[i - 1]})
      i--
      j--
    } else if (i > 0 && (j === 0 || lcs[i - 1][j] >= lcs[i][j - 1])) {
      // 删除字符
      operations.unshift({type: 'delete', text: original[i - 1]})
      i--
    } else {
      // 插入字符
      operations.unshift({type: 'insert', text: modified[j - 1]})
      j--
    }
  }

  // 将连续的相同类型操作合并
  const mergedOps: Array<{type: 'equal' | 'delete' | 'insert', text: string}> = []
  for (const op of operations) {
    if (mergedOps.length > 0 && mergedOps[mergedOps.length - 1].type === op.type) {
      mergedOps[mergedOps.length - 1].text += op.text
    } else {
      mergedOps.push({...op})
    }
  }

  // 生成HTML
  for (const op of mergedOps) {
    switch (op.type) {
      case 'equal':
        result.push(escapeHtml(op.text))
        break
      case 'delete':
        result.push(`<del style="color: #999; text-decoration: line-through;">${escapeHtml(op.text)}</del>`)
        break
      case 'insert':
        result.push(`<span style="color: #e53e3e; font-weight: 600;">${escapeHtml(op.text)}</span>`)
        break
    }
  }

  return result.join('')
}

// HTML转义函数
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
/* 全局CSS覆盖，确保有序列表编号显示 */
</style>

<style>
/* 非scoped样式确保列表编号显示（对显式编号的列表放行） */
.markdown-content ol:not([data-explicit-numbered]) {
  list-style-type: decimal;
  list-style-position: outside;
  margin: 0 0 1em 0;
  padding: 0 0 0 30px;
}

.markdown-content ol:not([data-explicit-numbered]) li {
  list-style-type: decimal;
  display: list-item;
  margin: 0 0 0.5em 0;
  padding: 0;
}
</style>

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
  font-size: 1.9rem;
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
  font-size: 1.05rem;
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
  font-size: 1.55rem;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  border: none;
  padding: 0;
}

.evaluation-content {
  line-height: 1.7;
  font-size: 1.1rem;
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

/* 主要内容区域 - 左右两列布局 */
.main-content-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
  margin-bottom: 40px;
  align-items: stretch; /* 让两列高度一致 */
}

/* 左侧列 - 视频和总体建议 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%; /* 确保填满容器高度 */
}

/* 左侧列中的总体建议框 */
.left-column .text-box {
  flex: 1; /* 让总体建议框填满剩余空间 */
  display: flex;
  flex-direction: column;
}

/* 右侧列 - 润色文本 */
.right-column {
  display: flex;
  flex-direction: column;
  align-items: stretch; /* 确保内容拉伸填满容器 */
  height: 100%; /* 确保填满容器高度 */
}

/* 确保右侧润色文本框与左侧总体建议框底部对齐 */
.right-column .text-box {
  flex: 1; /* 让润色文本框填满剩余空间 */
  display: flex;
  flex-direction: column;
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
  font-size: 1.35rem;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

.text-content {
  flex: 1;
  max-height: 500px; /* 设置最大高度为500px */
  overflow-y: auto;
  line-height: 1.7;
  font-size: 1.05rem;
  position: relative; /* 为底部渐变效果提供定位基础 */
  scroll-behavior: smooth; /* 平滑滚动 */
  padding: 0 15px 15px 15px; /* 与polish-options保持一致的左右边距 */
  margin: 0 -25px -25px -25px; /* 抵消text-box的内边距，确保内容对齐 */
  /* 美化滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #667eea #f1f5f9;
}

/* Webkit浏览器滚动条样式 */
.text-content::-webkit-scrollbar {
  width: 8px;
}

.text-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.text-content::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.text-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 滚动区域底部渐变效果 - 继承上面的text-content样式 */

.text-content::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(transparent, rgba(247, 250, 252, 0.8));
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.text-content:hover::after {
  opacity: 1;
}

.text-content div {
  color: #2d3748;
}

.polish-options {
  margin-bottom: 20px;
  padding: 15px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.options-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.options-title {
  font-size: 1.1rem;
  font-weight: 650;
  color: #374151;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.checkbox-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
  padding: 10px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
  border: 1px solid rgba(203, 213, 224, 0.6);
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.05);
}

.checkbox-text {
  font-weight: 600;
  letter-spacing: 0.2px;
  font-size: 0.9rem;
}

.checkbox-label:hover {
  color: #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.08) 100%);
  border-color: rgba(102, 126, 234, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
}

.checkbox {
  width: 14px;
  height: 14px;
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
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.checkbox:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}



/* 按钮组样式 */
.button-group {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* 显示原文按钮样式 */
.show-original-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  white-space: nowrap;
  min-width: 85px;
  letter-spacing: 0.2px;
}

/* 编辑文本按钮样式 */
.edit-text-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 18px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(240, 147, 251, 0.3);
  white-space: nowrap;
  min-width: 85px;
  letter-spacing: 0.2px;
}

.show-original-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
  filter: brightness(1.1);
}

.edit-text-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(240, 147, 251, 0.5);
  filter: brightness(1.1);
}

.show-original-btn.active {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
}

.show-original-btn.active:hover {
  box-shadow: 0 8px 25px rgba(72, 187, 120, 0.5);
}

/* 原文本显示区域样式 */
.original-text-display {
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  padding: 20px;
  margin: 0 0 20px 0; /* 移除左右margin，保持与text-content对齐 */
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
  padding: 25px;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  transition: all 0.3s ease;
}

.video-section:hover {
  box-shadow: 0 8px 30px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.video-section h3 {
  color: #4a5568;
  margin: 0 0 15px 0;
  font-size: 1.35rem;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

.video-section video {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-width: 100%;
  height: auto;
  background: #000;
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

/* 总体建议中的分隔线样式 */
.section-separator {
  margin: 24px 0;
  position: relative;
  text-align: center;
}

.section-separator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #667eea 20%, #764ba2 50%, #667eea 80%, transparent 100%);
  transform: translateY(-50%);
}

.section-separator::after {
  content: '✦';
  background: #f7fafc;
  color: #667eea;
  padding: 0 12px;
  font-size: 12px;
  position: relative;
  z-index: 1;
}

/* 移除了重复的列表样式规则，使用非scoped版本 */

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

/* 总体建议中的标题特别样式 */
.text-box .markdown-content :deep(h1),
.text-box .markdown-content :deep(h2),
.text-box .markdown-content :deep(h3) {
  color: #667eea;
  font-weight: 700;
  margin-top: 0.8em;
  margin-bottom: 1em;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.2);
  position: relative;
}

.text-box .markdown-content :deep(h1):first-child,
.text-box .markdown-content :deep(h2):first-child,
.text-box .markdown-content :deep(h3):first-child {
  margin-top: 0;
}

.markdown-content :deep(h1) { font-size: 2em; }
.markdown-content :deep(h2) { font-size: 1.5em; }
.markdown-content :deep(h3) { font-size: 1.3em; }

.markdown-content :deep(p) {
  margin-bottom: 1em;
}

.markdown-content :deep(ul) {
  margin-left: 0;
  margin-bottom: 1em;
  padding-left: 24px;
  list-style-type: disc;
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
  .main-content-layout {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-bottom: 30px;
    align-items: stretch; /* 保持拉伸对齐 */
  }

  .left-column,
  .right-column {
    gap: 15px;
    height: auto; /* 移动端不强制高度 */
  }

  /* 移动端取消flex填充，恢复自然高度 */
  .left-column .text-box,
  .right-column .text-box {
    flex: none;
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
    font-size: 1.25rem;
  }

  /* 移动端文本内容滚动区域调整 */
  .text-content {
    max-height: 350px; /* 移动端减小最大高度 */
    padding: 0 12px 12px 12px; /* 移动端调整padding与polish-options一致 */
    margin: 0 -15px -15px -15px; /* 移动端margin抵消 */
  }

  .text-content::-webkit-scrollbar {
    width: 6px; /* 移动端更细的滚动条 */
  }

  /* 移动端复选框样式调整 */
  .polish-options {
    padding: 12px;
  }

  .options-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    text-align: center;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .checkbox-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .checkbox-label {
    font-size: 0.85rem;
    padding: 10px 12px;
    width: 100%;
    justify-content: flex-start;
  }

  .show-original-btn {
    font-size: 0.8rem;
    padding: 8px 14px;
    min-width: 80px;
    border-radius: 16px;
  }

  .edit-text-btn {
    font-size: 0.8rem;
    padding: 8px 14px;
    min-width: 80px;
    border-radius: 16px;
  }

  .button-group {
    gap: 10px;
    justify-content: center;
    flex-direction: row;
    width: 100%;
  }

  /* 移动端分隔线样式调整 */
  .section-separator {
    margin: 16px 0;
  }

  .section-separator::after {
    font-size: 10px;
    padding: 0 8px;
  }

  /* 移动端总体建议标题样式调整 */
  .text-box .markdown-content :deep(h1),
  .text-box .markdown-content :deep(h2),
  .text-box .markdown-content :deep(h3) {
    font-size: 1.1rem;
    margin-top: 0.6em;
    margin-bottom: 0.8em;
    padding-bottom: 6px;
  }
}

/* 编辑弹窗样式 */
.edit-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.edit-dialog {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.edit-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 30px;
  border-bottom: 1px solid #e2e8f0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px 20px 0 0;
  color: white;
}

.edit-dialog-header h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: white;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.edit-dialog-content {
  flex: 1;
  padding: 25px 30px;
  overflow: hidden;
}

.edit-textarea-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.edit-textarea {
  width: 100%;
  height: 400px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 15px;
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s ease;
  font-family: inherit;
  background: #f7fafc;
}

.edit-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: white;
}

.edit-dialog-footer {
  padding: 20px 30px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  background: #f7fafc;
  border-radius: 0 0 20px 20px;
}

.btn-cancel,
.btn-save {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
}

.btn-cancel {
  background: #e2e8f0;
  color: #4a5568;
}

.btn-cancel:hover {
  background: #cbd5e0;
  transform: translateY(-1px);
}

.btn-save {
  background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3);
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);
}



@media (max-width: 768px) {
  .edit-dialog {
    width: 95%;
    max-height: 90vh;
  }

  .edit-dialog-header,
  .edit-dialog-content,
  .edit-dialog-footer {
    padding: 15px 20px;
  }

  .edit-textarea {
    height: 300px;
  }

  .btn-cancel,
  .btn-save {
    padding: 10px 20px;
    font-size: 0.9rem;
    min-width: 80px;
  }
}
</style>
