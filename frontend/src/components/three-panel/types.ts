// 类型定义文件

export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  attachments?: FileAttachment[];
  localOnly?: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface WorkspaceFile {
  name: string;
  size: number;
  extension: string;
  icon: string;
  download_url: string;
  preview_url?: string;
}

export type WorkspaceNode = {
  name: string;
  path: string; // relative path
  is_dir: boolean;
  size?: number;
  extension?: string;
  icon?: string;
  download_url?: string;
  children?: WorkspaceNode[];
  is_generated?: boolean; // 标识是否为代码生成的文件或文件夹
};

export interface AnalysisSection {
  type: "Analyze" | "Understand" | "Code" | "Execute" | "Answer";
  content: string;
  icon: string;
  color: string;
}

export type StructuredSectionType =
  | "Analyze"
  | "Understand"
  | "Code"
  | "Execute"
  | "Answer"
  | "File";

// Arborist 树节点类型
export type ArborNode = {
  id: string;
  name: string;
  isDir: boolean;
  icon?: string;
  download_url?: string;
  extension?: string;
  size?: number;
  children?: ArborNode[];
  isGenerated?: boolean; // 标识是否为代码生成的文件
};

// 预览类型
export type PreviewType = "text" | "image" | "pdf" | "binary";

// Section 配置类型
export type SectionConfig = {
  icon: string;
  color: string;
};

export type SectionConfigsMap = Record<StructuredSectionType, SectionConfig>;

// 步骤导航项
export interface StepNavItem {
  type: StructuredSectionType;
  sectionKey: string;
  config: SectionConfig;
}
