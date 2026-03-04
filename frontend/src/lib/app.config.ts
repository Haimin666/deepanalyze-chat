/**
 * DeepAnalyze Frontend Configuration
 * 前端配置文件
 * 
 * 说明：
 * 1. 所有配置项都可以通过环境变量覆盖
 * 2. 环境变量命名规则：NEXT_PUBLIC_ + 配置项大写
 * 3. 例如：apiBaseUrl -> NEXT_PUBLIC_API_BASE_URL
 */

// ===================
// API 配置
// ===================
export const apiConfig = {
  // 后端 API 地址
  // 开发环境：使用相对路径通过 Next.js API Routes 代理
  // 生产环境：配置实际的后端地址
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8200',
  
  // 文件服务器地址
  fileServerUrl: process.env.NEXT_PUBLIC_FILE_SERVER_URL || 'http://localhost:8100',
  
  // API 请求超时时间 (毫秒)
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  
  // API 重试次数
  retryCount: parseInt(process.env.NEXT_PUBLIC_API_RETRY || '3', 10),
};

// ===================
// 认证配置
// ===================
export const authConfig = {
  // 会话超时时间 (分钟)
  // 用户无操作超过此时间将自动退出
  sessionTimeoutMinutes: parseInt(
    process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES || '10',
    10
  ),
  
  // Token 存储方式 (cookie/localStorage)
  tokenStorage: process.env.NEXT_PUBLIC_TOKEN_STORAGE || 'cookie',
  
  // 是否记住登录状态
  rememberMe: process.env.NEXT_PUBLIC_REMEMBER_ME === 'true',
};

// ===================
// UI 配置
// ===================
export const uiConfig = {
  // 默认主题 (light/dark/system)
  defaultTheme: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'system',
  
  // 默认语言
  defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'zh-CN',
  
  // 是否启用动画
  enableAnimations: process.env.NEXT_PUBLIC_ENABLE_ANIMATIONS !== 'false',
  
  // 消息自动滚动到底部
  autoScrollToBottom: process.env.NEXT_PUBLIC_AUTO_SCROLL !== 'false',
};

// ===================
// 功能开关
// ===================
export const featureFlags = {
  // 是否启用文件上传
  enableFileUpload: process.env.NEXT_PUBLIC_ENABLE_FILE_UPLOAD !== 'false',
  
  // 是否启用代码执行
  enableCodeExecution: process.env.NEXT_PUBLIC_ENABLE_CODE_EXECUTION !== 'false',
  
  // 是否启用报告导出
  enableReportExport: process.env.NEXT_PUBLIC_ENABLE_REPORT_EXPORT !== 'false',
  
  // 是否启用会话历史
  enableSessionHistory: process.env.NEXT_PUBLIC_ENABLE_SESSION_HISTORY !== 'false',
  
  // 是否启用用户管理
  enableUserManagement: process.env.NEXT_PUBLIC_ENABLE_USER_MANAGEMENT !== 'false',
};

// ===================
// 文件上传配置
// ===================
export const uploadConfig = {
  // 最大文件大小 (MB)
  maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '50', 10),
  
  // 允许的文件类型 (逗号分隔)
  allowedTypes: process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 
    '.csv,.xlsx,.xls,.json,.txt,.pdf,.png,.jpg,.jpeg,.gif,.svg',
  
  // 最大文件数量
  maxFileCount: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_COUNT || '10', 10),
};

// ===================
// 代码编辑器配置
// ===================
export const editorConfig = {
  // 默认字体大小
  fontSize: parseInt(process.env.NEXT_PUBLIC_EDITOR_FONT_SIZE || '14', 10),
  
  // 是否显示行号
  showLineNumbers: process.env.NEXT_PUBLIC_SHOW_LINE_NUMBERS !== 'false',
  
  // 是否启用代码折叠
  enableCodeFolding: process.env.NEXT_PUBLIC_ENABLE_CODE_FOLDING !== 'false',
  
  // Tab 大小
  tabSize: parseInt(process.env.NEXT_PUBLIC_TAB_SIZE || '2', 10),
};

// ===================
// 开发配置
// ===================
export const devConfig = {
  // 是否为开发模式
  isDev: process.env.NODE_ENV === 'development',
  
  // 是否启用调试日志
  enableDebugLog: process.env.NEXT_PUBLIC_DEBUG === 'true',
  
  // 是否使用 Mock 数据
  useMockData: process.env.NEXT_PUBLIC_USE_MOCK === 'true',
};

// ===================
// 组合配置对象
// ===================
const config = {
  api: apiConfig,
  auth: authConfig,
  ui: uiConfig,
  features: featureFlags,
  upload: uploadConfig,
  editor: editorConfig,
  dev: devConfig,
  
  // 便捷方法
  getBackendUrl: () => apiConfig.backendUrl,
  getFileServerUrl: () => apiConfig.fileServerUrl,
  getSessionTimeout: () => authConfig.sessionTimeoutMinutes * 60 * 1000,
  isFeatureEnabled: (feature: keyof typeof featureFlags) => featureFlags[feature],
};

export default config;
