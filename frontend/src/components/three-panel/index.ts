// 主组件导出
export { ThreePanelInterface, ThreePanelInterface as ThreePanel } from "./ThreePanelInterface";

// 类型导出
export type {
  Message,
  FileAttachment,
  WorkspaceFile,
  WorkspaceNode,
  ArborNode,
  PreviewType,
  StructuredSectionType,
  SectionConfig,
} from "./types";

// 工具函数导出
export {
  formatFileSize,
  copyToClipboard,
  extractCode,
} from "./utils";

export { normalizeToLocalFileUrl, ensureGeneratedInUrl } from "./url-utils";
