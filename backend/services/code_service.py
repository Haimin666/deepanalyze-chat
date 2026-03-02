"""
代码执行服务层
"""
import os
import sys
import subprocess
import tempfile
from typing import Optional

from config.settings import CODE_EXECUTION_TIMEOUT, CHINESE_MATPLOT_STR


class CodeService:
    """代码执行服务"""

    def __init__(self, workspace_service):
        self.workspace_service = workspace_service

    def execute_code_safe(
        self,
        code_str: str,
        workspace_dir: str = None,
        timeout_sec: int = CODE_EXECUTION_TIMEOUT
    ) -> str:
        """在独立进程中安全执行代码"""
        if workspace_dir is None:
            workspace_dir = self.workspace_service.base_dir

        exec_cwd = os.path.abspath(workspace_dir)
        os.makedirs(exec_cwd, exist_ok=True)

        tmp_path = None
        try:
            fd, tmp_path = tempfile.mkstemp(suffix=".py", dir=exec_cwd)
            os.close(fd)

            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(code_str)

            # 设置无界面环境变量
            child_env = os.environ.copy()
            child_env.setdefault("MPLBACKEND", "Agg")
            child_env.setdefault("QT_QPA_PLATFORM", "offscreen")
            child_env.pop("DISPLAY", None)

            completed = subprocess.run(
                [sys.executable, tmp_path],
                cwd=exec_cwd,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout_sec,
                env=child_env,
            )

            output = (completed.stdout or "") + (completed.stderr or "")
            return output

        except subprocess.TimeoutExpired:
            return f"[Timeout]: execution exceeded {timeout_sec} seconds"
        except Exception as e:
            return f"[Error]: {str(e)}"
        finally:
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except Exception:
                pass

    def add_chinese_matplot_support(self, code: str) -> str:
        """添加中文matplotlib支持"""
        return CHINESE_MATPLOT_STR + "\n" + code
