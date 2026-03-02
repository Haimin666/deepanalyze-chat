"use client";

import { useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { StepNavItem, StructuredSectionType, SectionConfig } from "./types";

type StepNavigatorProps = {
  sections: StepNavItem[];
  activeSection: string;
  onScrollToSection: (sectionKey: string) => void;
};

// 颜色映射
const colorMap: Record<string, { bg: string; border: string; glow: string; text: string }> = {
  "bg-blue-500": {
    bg: "bg-blue-500",
    border: "border-blue-400",
    glow: "shadow-blue-500/50",
    text: "text-blue-600",
  },
  "bg-cyan-500": {
    bg: "bg-cyan-500",
    border: "border-cyan-400",
    glow: "shadow-cyan-500/50",
    text: "text-cyan-600",
  },
  "bg-gray-500": {
    bg: "bg-gray-500",
    border: "border-gray-400",
    glow: "shadow-gray-500/50",
    text: "text-gray-600",
  },
  "bg-orange-500": {
    bg: "bg-orange-500",
    border: "border-orange-400",
    glow: "shadow-orange-500/50",
    text: "text-orange-600",
  },
  "bg-green-500": {
    bg: "bg-green-500",
    border: "border-green-400",
    glow: "shadow-green-500/50",
    text: "text-green-600",
  },
  "bg-purple-500": {
    bg: "bg-purple-500",
    border: "border-purple-400",
    glow: "shadow-purple-500/50",
    text: "text-purple-600",
  },
};

export function StepNavigator({ sections, activeSection, onScrollToSection }: StepNavigatorProps) {
  const stepNavigatorRef = useRef<HTMLDivElement>(null);
  const activeStepRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 当 activeSection 变化时自动滚动到对应步骤
  useEffect(() => {
    if (activeSection && stepNavigatorRef.current) {
      const activeStepElement = activeStepRefs.current.get(activeSection);
      if (activeStepElement) {
        const container = stepNavigatorRef.current;
        const stepRect = activeStepElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const scrollLeft =
          activeStepElement.offsetLeft -
          containerRect.width / 2 +
          stepRect.width / 2;

        container.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        });
      }
    }
  }, [activeSection]);

  if (sections.length === 0) return null;

  return (
    <div className="relative border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-6 py-4 overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-pink-950/20 pointer-events-none" />

      <div
        ref={stepNavigatorRef}
        className="relative flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin"
      >
        {sections.map((section, idx) => {
          const isActive = activeSection === section.sectionKey;
          const activeIdx = sections.findIndex((s) => s.sectionKey === activeSection);
          const isCompleted = activeIdx > idx;
          const isPending = activeIdx < idx;

          const colors = colorMap[section.config.color] || colorMap["bg-gray-500"];

          return (
            <div
              key={section.sectionKey}
              className="flex items-center shrink-0"
              ref={(el) => {
                if (el) {
                  activeStepRefs.current.set(section.sectionKey, el);
                }
              }}
            >
              {/* 步骤节点 */}
              <button
                onClick={() => onScrollToSection(section.sectionKey)}
                className={`group relative flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-300 ${isActive
                  ? "scale-105"
                  : "hover:scale-102 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  }`}
              >
                {/* 圆圈容器 */}
                <div className="relative">
                  {/* 脉动动画背景 */}
                  {isActive && (
                    <div
                      className={`absolute inset-0 ${colors.bg} rounded-full animate-ping opacity-20`}
                    />
                  )}

                  {/* 主圆圈 */}
                  <div
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center font-semibold text-base transition-all duration-500 ${isActive
                      ? `${colors.bg} text-white shadow-lg ${colors.glow
                      } ring-2 ring-offset-1 ${colors.border.replace(
                        "border-",
                        "ring-"
                      )} ring-opacity-30 dark:ring-offset-gray-950`
                      : isCompleted
                        ? "bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md shadow-green-500/30"
                        : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-2 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
                      } ${!isActive &&
                      !isCompleted &&
                      "group-hover:border-gray-400 dark:group-hover:border-gray-500 group-hover:shadow-md"
                      }`}
                  >
                    {/* 内容 */}
                    {isCompleted ? (
                      <Check className="w-4 h-4 animate-in zoom-in duration-300" />
                    ) : (
                      <span
                        className={`text-base transition-transform duration-300 ${isActive
                          ? "scale-110"
                          : "group-hover:scale-105"
                          }`}
                      >
                        {section.config.icon}
                      </span>
                    )}

                    {/* 进度指示小点 */}
                    {isActive && (
                      <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white dark:bg-gray-950 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 标签 */}
                <div
                  className={`text-[11px] font-semibold whitespace-nowrap transition-all duration-300 ${isActive
                    ? `${colors.text} dark:text-white scale-105`
                    : isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                    }`}
                >
                  {section.type}
                </div>

                {/* 序号 */}
                <div
                  className={`absolute top-0 left-0 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${isActive
                    ? `${colors.bg} text-white shadow-sm`
                    : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                    }`}
                >
                  {idx + 1}
                </div>
              </button>

              {/* 连接线 */}
              {idx < sections.length - 1 && (
                <div className="relative w-16 h-1 mx-1">
                  {/* 背景轨道 */}
                  <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded-full" />

                  {/* 进度条 */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-700 ${isCompleted || isActive
                      ? "bg-gradient-to-r from-green-400 to-green-500 shadow-sm shadow-green-500/30"
                      : "bg-transparent"
                      }`}
                    style={{
                      transform: isActive ? "scaleX(0.5)" : "scaleX(1)",
                      transformOrigin: "left",
                    }}
                  />

                  {/* 流动动画 */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-shimmer" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
