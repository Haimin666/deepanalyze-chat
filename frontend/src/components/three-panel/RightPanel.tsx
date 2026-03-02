"use client";

import type React from "react";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";

type RightPanelProps = {
  showCodeEditor: boolean;
  editorHeight: number;
  codeEditorContent: string;
  isExecutingCode: boolean;
  codeExecutionResult: string;
  isDarkMode: boolean;
  onCodeChange: (value: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onExecuteCode: () => void;
  onClose: () => void;
  userMenu?: React.ReactNode;
};

export function RightPanel({
  showCodeEditor,
  editorHeight,
  codeEditorContent,
  isExecutingCode,
  codeExecutionResult,
  isDarkMode,
  onCodeChange,
  onMouseDown,
  onExecuteCode,
  onClose,
  userMenu,
}: RightPanelProps) {
  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 min-h-0 h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 h-12 shrink-0">
        <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Code
        </h2>
        <div className="flex items-center gap-2">
          {showCodeEditor && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Close
              </Button>
              <Button
                size="sm"
                onClick={onExecuteCode}
                disabled={!codeEditorContent || isExecutingCode}
                className="h-6 px-3 text-xs bg-black text-white dark:bg-white dark:text-black"
              >
                {isExecutingCode ? "Running..." : "Run"}
              </Button>
            </>
          )}
          {/* User Menu */}
          {userMenu}
        </div>
      </div>

      {!showCodeEditor ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center select-none">
            <p className="text-sm">Click a code block to edit</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col p-4 editor-container overflow-hidden">
          {/* Code Editor */}
          <div
            className="min-h-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-black flex flex-col"
            style={{ height: `${editorHeight}%` }}
          >
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <span className="text-xs text-gray-500 font-mono">
                python
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={codeEditorContent}
                onChange={(value) => onCodeChange(value || "")}
                theme={isDarkMode ? "vs-dark" : "light"}
                options={{
                  fontSize: 14,
                  fontFamily:
                    "var(--font-mono), 'Courier New', monospace",
                  lineNumbers: "on",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  insertSpaces: true,
                  wordWrap: "on",
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                  glyphMargin: false,
                  selectOnLineNumbers: true,
                  roundedSelection: false,
                  readOnly: false,
                  cursorStyle: "line",
                  smoothScrolling: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  suggestOnTriggerCharacters: true,
                  acceptSuggestionOnEnter: "on",
                  tabCompletion: "on",
                  scrollbar: {
                    vertical: "visible",
                    verticalScrollbarSize: 10,
                  },
                }}
                loading={
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">加载编辑器...</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>

          {/* Resizer */}
          <div
            className="h-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-row-resize flex items-center justify-center group"
            onMouseDown={onMouseDown}
          >
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded group-hover:bg-gray-400 dark:group-hover:bg-gray-500"></div>
          </div>

          {/* Terminal Output */}
          <div
            className="min-h-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 flex flex-col"
            style={{ height: `${100 - editorHeight}%` }}
          >
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Output
              </span>
            </div>
            <div className="flex-1 min-h-0 p-3 overflow-auto font-mono text-sm bg-white dark:bg-black text-gray-800 dark:text-gray-200">
              {codeExecutionResult ? (
                <div>
                  <div className="text-gray-500 dark:text-gray-400 mb-1">
                    $ python main.py
                  </div>
                  <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {codeExecutionResult}
                  </pre>
                  <div className="flex items-center mt-2">
                    <span className="text-gray-500 dark:text-gray-400">
                      $
                    </span>
                    <span className="w-2 h-4 bg-gray-400 dark:bg-gray-500 ml-1 animate-pulse"></span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 dark:text-gray-500 italic">
                  Run code to see output...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
