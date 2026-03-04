"""
Mock LLM 服务 - 模拟 AI 聊天响应
用于开发和测试环境，无需真实 AI 模型
支持真实代码执行，生成真实的执行结果和文件
"""
import json
import time
import uuid
import threading
import re
import os
import tempfile
import subprocess
import sys
from typing import Generator, Dict, Optional, Callable, List
from pathlib import Path

# 停止会话管理器
class StopSessionManager:
    """管理可停止的流式会话"""
    
    def __init__(self):
        self._sessions: Dict[str, bool] = {}
        self._lock = threading.Lock()
    
    def create_session(self) -> str:
        """创建新会话，返回会话ID"""
        session_id = str(uuid.uuid4())[:8]
        with self._lock:
            self._sessions[session_id] = False
        return session_id
    
    def stop_session(self, session_id: str) -> bool:
        """停止指定会话"""
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id] = True
                return True
        return False
    
    def is_stopped(self, session_id: str) -> bool:
        """检查会话是否已停止"""
        with self._lock:
            return self._sessions.get(session_id, False)
    
    def cleanup_session(self, session_id: str):
        """清理会话"""
        with self._lock:
            self._sessions.pop(session_id, None)


# 全局停止会话管理器
stop_manager = StopSessionManager()


class CodeExecutor:
    """代码执行器 - 真实执行Python代码"""
    
    def __init__(self, workspace_dir: str = None, timeout: int = 60):
        self.workspace_dir = workspace_dir or tempfile.gettempdir()
        self.timeout = timeout
        self.generated_files: List[Dict] = []
    
    def set_workspace(self, workspace_dir: str):
        """设置工作目录"""
        self.workspace_dir = workspace_dir
        os.makedirs(workspace_dir, exist_ok=True)
    
    def execute_code(self, code: str) -> tuple:
        """
        执行Python代码并返回结果
        
        Returns:
            tuple: (success: bool, output: str, generated_files: list)
        """
        if not code or not code.strip():
            return False, "", []
        
        # 记录执行前的文件列表
        files_before = set()
        if os.path.exists(self.workspace_dir):
            files_before = set(os.listdir(self.workspace_dir))
        
        tmp_path = None
        try:
            # 创建临时文件
            fd, tmp_path = tempfile.mkstemp(suffix=".py", dir=self.workspace_dir)
            os.close(fd)
            
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(code)
            
            # 设置执行环境
            env = os.environ.copy()
            env["MPLBACKEND"] = "Agg"
            env["QT_QPA_PLATFORM"] = "offscreen"
            env.pop("DISPLAY", None)
            
            # 执行代码
            result = subprocess.run(
                [sys.executable, tmp_path],
                cwd=self.workspace_dir,
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=self.timeout,
                env=env,
            )
            
            output = (result.stdout or "") + (result.stderr or "")
            success = result.returncode == 0
            
            # 检测新生成的文件
            files_after = set()
            if os.path.exists(self.workspace_dir):
                files_after = set(os.listdir(self.workspace_dir))
            
            new_files = files_after - files_before
            generated_files = []
            
            for fname in new_files:
                if fname.endswith('.py') and fname == os.path.basename(tmp_path):
                    continue  # 跳过临时执行的py文件
                fpath = os.path.join(self.workspace_dir, fname)
                if os.path.isfile(fpath):
                    stat = os.stat(fpath)
                    generated_files.append({
                        "name": fname,
                        "path": fpath,
                        "size": stat.st_size,
                        "extension": os.path.splitext(fname)[1].lower()
                    })
            
            self.generated_files.extend(generated_files)
            return success, output.strip(), generated_files
            
        except subprocess.TimeoutExpired:
            return False, f"[Timeout]: 执行超时，超过 {self.timeout} 秒", []
        except Exception as e:
            return False, f"[Error]: {str(e)}", []
        finally:
            try:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
            except:
                pass


# 问候回复
GREETING_RESPONSE = """<Answer>
你好！我是 DeepAnalyze AI 助手，很高兴为您服务！👋

我可以帮助您完成以下任务：

## 🎯 核心功能
- **📊 数据分析与可视化** - 自动分析数据，生成专业图表
- **📈 生成专业数据分析报告** - 完整的数据分析全流程
- **📋 数据处理与清洗** - 处理缺失值、异常值、格式转换
- **📝 代码编写与执行** - Python 代码自动生成与运行

## 💡 使用方式
1. 直接输入您的问题，例如：`做一个数据分析报告全流程`
2. 上传数据文件（CSV、Excel、JSON 等）
3. 我会自动分析并生成报告

请告诉我您需要什么帮助？
</Answer>"""


# 数据分析报告全流程响应模板 - 代码部分
DATA_ANALYSIS_CODE_1 = '''import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import os

# 设置中文字体（尝试多种方式）
plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

# 创建模拟销售数据
np.random.seed(42)
dates = pd.date_range('2024-01-01', '2024-12-31', freq='D')
n_records = len(dates)

data = {
    '日期': dates,
    '产品类别': np.random.choice(['电子产品', '服装', '食品', '家居', '美妆'], n_records),
    '销售金额': np.random.uniform(1000, 50000, n_records),
    '地区': np.random.choice(['华东', '华南', '华北', '西南', '西北'], n_records),
    '销售数量': np.random.randint(10, 500, n_records)
}

df = pd.DataFrame(data)
df['月份'] = df['日期'].dt.month
df['季度'] = df['日期'].dt.quarter

# 保存数据
df.to_csv('sales_data.csv', index=False, encoding='utf-8-sig')
print("数据创建完成！")
print(f"数据概览：")
print(df.head(10).to_string())
print(f"\\n数据形状：{df.shape}")
'''

DATA_ANALYSIS_CODE_2 = '''# 1. 数据概览和统计描述
print("=" * 50)
print("数据统计描述")
print("=" * 50)
print(df.describe())
print("\\n")

# 2. 按产品类别统计
category_stats = df.groupby('产品类别').agg({
    '销售金额': ['sum', 'mean', 'count'],
    '销售数量': 'sum'
}).round(2)
print("按产品类别统计：")
print(category_stats)

# 3. 按地区统计
region_stats = df.groupby('地区')['销售金额'].agg(['sum', 'mean', 'count']).round(2)
print("\\n按地区统计：")
print(region_stats)

# 4. 按季度统计
quarterly_stats = df.groupby('季度')['销售金额'].sum().round(2)
print("\\n按季度统计：")
print(quarterly_stats)
'''

DATA_ANALYSIS_CODE_3 = '''# 3. 数据可视化
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 3.1 产品类别销售金额柱状图
ax1 = axes[0, 0]
category_sales = df.groupby('产品类别')['销售金额'].sum().sort_values(ascending=True)
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
bars = ax1.barh(category_sales.index.astype(str), category_sales.values, color=colors)
ax1.set_xlabel('Sales Amount', fontsize=12)
ax1.set_title('Sales by Product Category', fontsize=14, fontweight='bold')
ax1.bar_label(bars, fmt='%.0f', padding=3)

# 3.2 月度销售趋势
ax2 = axes[0, 1]
monthly_sales = df.groupby('月份')['销售金额'].sum()
ax2.plot(monthly_sales.index, monthly_sales.values, marker='o', linewidth=2, color='#4ECDC4')
ax2.fill_between(monthly_sales.index, monthly_sales.values, alpha=0.3, color='#4ECDC4')
ax2.set_xlabel('Month', fontsize=12)
ax2.set_ylabel('Sales Amount', fontsize=12)
ax2.set_title('Monthly Sales Trend', fontsize=14, fontweight='bold')
ax2.set_xticks(range(1, 13))

# 3.3 地区销售分布饼图
ax3 = axes[1, 0]
region_sales = df.groupby('地区')['销售金额'].sum()
ax3.pie(region_sales.values, labels=region_sales.index.astype(str), autopct='%1.1f%%', 
        colors=colors, explode=[0.05, 0, 0, 0, 0])
ax3.set_title('Regional Sales Distribution', fontsize=14, fontweight='bold')

# 3.4 季度销售对比
ax4 = axes[1, 1]
quarterly_sales = df.groupby('季度')['销售金额'].sum()
ax4.bar(quarterly_sales.index, quarterly_sales.values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'])
ax4.set_xlabel('Quarter', fontsize=12)
ax4.set_ylabel('Sales Amount', fontsize=12)
ax4.set_title('Quarterly Sales Comparison', fontsize=14, fontweight='bold')
ax4.set_xticks([1, 2, 3, 4])
ax4.set_xticklabels(['Q1', 'Q2', 'Q3', 'Q4'])

plt.tight_layout()
plt.savefig('sales_analysis_charts.png', dpi=150, bbox_inches='tight')
plt.close()
print("图表已保存为 sales_analysis_charts.png")
'''


# 简单聊天回复
SIMPLE_CHAT_RESPONSES = {
    "你好": GREETING_RESPONSE,
    "hello": GREETING_RESPONSE,
    "hi": GREETING_RESPONSE,
    "你是谁": "<Answer>我是一个 AI 助手，专门帮助您进行数据分析和问题解答。\n\n我可以：\n- 📊 分析数据并生成报告\n- 📈 创建可视化图表\n- 💻 编写和执行代码\n- ❓ 回答您的问题\n\n请问有什么可以帮助您的？</Answer>",
    "功能": "<Answer>我可以帮助您：\n\n## 🎯 核心功能\n1. **数据分析** - 自动分析上传的数据文件\n2. **可视化图表** - 生成专业的统计图表\n3. **代码执行** - Python 代码自动生成与运行\n4. **报告生成** - 输出 PDF 格式分析报告\n\n## 💡 使用方式\n- 输入 `做一个数据分析报告全流程` 查看完整演示\n- 上传数据文件后输入 `分析这个数据`\n- 直接提问任何问题\n\n现在就试试吧！</Answer>",
    "帮助": "<Answer>您好！以下是使用指南：\n\n## 📖 快速开始\n\n### 1️⃣ 数据分析\n```\n上传数据文件 → 输入「分析这个数据」\n```\n\n### 2️⃣ 查看演示\n```\n输入「做一个数据分析报告全流程」\n```\n\n### 3️⃣ 提问\n```\n直接输入您的问题即可\n```\n\n## 🔧 支持的文件格式\n- CSV、Excel、JSON、TXT\n\n需要帮助请随时告诉我！</Answer>",
}

# 数据分析关键词
DATA_ANALYSIS_KEYWORDS = [
    "分析", "数据", "统计", "图表", "可视化",
    "analysis", "data", "报告", "报表",
    "趋势", "分布", "相关", "异常", "预测",
    "全流程", "分析报告"
]

# 数据分析全流程关键词
FULL_ANALYSIS_KEYWORDS = [
    "全流程", "完整", "完整分析", "数据分析报告",
    "做数据分析", "做一个数据分析", "生成报告"
]

DEFAULT_RESPONSE = """<Answer>
我理解您的问题。让我为您解答：

这是一个很好的问题！如果您需要数据分析服务，请：

## 🎯 您可以尝试：

1. **查看演示**
   - 输入 `做一个数据分析报告全流程`

2. **上传数据分析**
   - 上传 CSV/Excel 文件
   - 输入 `分析这个数据`

3. **简单问候**
   - 输入 `你好`

请问有什么可以帮助您的？
</Answer>"""


class MockLLMService:
    """Mock LLM 服务类 - 支持真实代码执行"""

    def __init__(self):
        self.data_keywords = DATA_ANALYSIS_KEYWORDS
        self.full_analysis_keywords = FULL_ANALYSIS_KEYWORDS
        self.code_executor = CodeExecutor()

    def set_workspace(self, workspace_dir: str):
        """设置代码执行的工作目录"""
        self.code_executor.set_workspace(workspace_dir)

    def is_full_analysis_request(self, message: str) -> bool:
        """判断是否为完整数据分析流程请求"""
        message_lower = message.lower()
        return any(kw in message_lower for kw in self.full_analysis_keywords)

    def is_data_analysis_request(self, message: str) -> bool:
        """判断是否为数据分析请求"""
        message_lower = message.lower()
        return any(kw in message_lower for kw in self.data_keywords)

    def get_simple_response(self, message: str) -> str:
        """获取简单聊天回复"""
        message_lower = message.lower().strip()
        return SIMPLE_CHAT_RESPONSES.get(message_lower, DEFAULT_RESPONSE)

    def get_response(self, message: str) -> str:
        """根据消息内容获取合适的响应"""
        message_lower = message.lower().strip()
        
        # 1. 精确匹配简单回复
        if message_lower in SIMPLE_CHAT_RESPONSES:
            return SIMPLE_CHAT_RESPONSES[message_lower]
        
        # 2. 检查是否为完整数据分析流程 - 返回None，需要流式处理
        if self.is_full_analysis_request(message_lower):
            return None  # 需要流式处理
        
        # 3. 检查是否为数据分析请求（有文件时）
        if self.is_data_analysis_request(message_lower):
            return None  # 需要流式处理
        
        # 4. 默认回复
        return DEFAULT_RESPONSE

    def _format_execute_output(self, output: str) -> str:
        """格式化执行输出"""
        if not output:
            return "```\n执行完成，无输出\n```"
        return f"```\n{output}\n```"

    def _format_file_tags(self, files: List[Dict], session_id: str, user_id: str) -> str:
        """生成文件标签"""
        if not files:
            return ""
        
        file_tags = []
        for f in files:
            # 构建文件URL路径
            rel_path = f"{user_id}/{session_id}/generated/{f['name']}"
            file_url = f"http://localhost:8100/{rel_path}"
            file_tags.append(f"- [{f['name']}]({file_url})")
        
        return "\n".join(file_tags)

    def _ensure_generated_dir(self, workspace_dir: str) -> str:
        """确保generated目录存在"""
        generated_dir = os.path.join(workspace_dir, "generated")
        os.makedirs(generated_dir, exist_ok=True)
        return generated_dir

    def stream_response(
        self, 
        messages: list, 
        session_id: Optional[str] = None,
        user_id: str = "default"
    ) -> Generator[str, None, None]:
        """
        流式生成响应
        
        Args:
            messages: 消息列表
            session_id: 可选的会话ID，用于支持停止功能
            user_id: 用户ID，用于文件路径生成
        
        Returns:
            生成器，每次返回一个字符串片段
        """
        if not messages:
            yield "您好！有什么可以帮助您的吗？"
            return

        # 获取最后一条用户消息
        last_message = messages[-1] if messages else {}
        user_content = last_message.get("content", "")
        
        # 获取响应内容
        response = self.get_response(user_content)
        
        # 如果是简单回复，直接流式输出
        if response:
            chunk_size = 5
            for i in range(0, len(response), chunk_size):
                if session_id and stop_manager.is_stopped(session_id):
                    print(f"[Mock] Session {session_id} stopped")
                    return
                chunk = response[i:i + chunk_size]
                yield chunk
                time.sleep(0.01)
            return
        
        # 数据分析全流程 - 执行真实代码
        if self.is_full_analysis_request(user_content):
            yield from self._stream_full_analysis(session_id, user_id)
            return
        
        # 默认回复
        chunk_size = 5
        for i in range(0, len(DEFAULT_RESPONSE), chunk_size):
            if session_id and stop_manager.is_stopped(session_id):
                return
            chunk = DEFAULT_RESPONSE[i:i + chunk_size]
            yield chunk
            time.sleep(0.01)

    def _stream_full_analysis(self, session_id: str = None, user_id: str = "default") -> Generator[str, None, None]:
        """流式输出完整数据分析流程，执行真实代码"""
        
        # 检查停止
        def check_stop():
            if session_id and stop_manager.is_stopped(session_id):
                return True
            return False
        
        # 分析部分
        analyze_text = """<Analyze>
用户需要生成一份数据分析报告，我将按照以下步骤进行：

1. **数据理解** - 分析数据结构和特征
2. **数据清洗** - 处理缺失值和异常值
3. **探索性分析** - 统计描述和可视化
4. **深度分析** - 发现数据规律和洞察
5. **报告生成** - 输出专业分析报告
</Analyze>

"""
        for chunk in self._chunked_yield(analyze_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 理解部分
        understand_text = """<Understand>
由于用户未提供具体数据文件，我将使用模拟数据演示完整的数据分析流程。

我将创建一个销售数据示例，包含：
- 📅 日期维度（全年数据）
- 🏷️ 产品类别（5大品类）
- 💰 销售金额（随机生成）
- 🗺️ 地区分布（5大区域）
- 📦 销售数量
</Understand>

"""
        for chunk in self._chunked_yield(understand_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 代码块1 - 创建数据
        code_1_text = f"""<Code>
```python
{DATA_ANALYSIS_CODE_1.strip()}
```
</Code>

"""
        for chunk in self._chunked_yield(code_1_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 执行代码1
        if self.code_executor.workspace_dir:
            self._ensure_generated_dir(self.code_executor.workspace_dir)
            success_1, output_1, files_1 = self.code_executor.execute_code(DATA_ANALYSIS_CODE_1)
        else:
            success_1, output_1, files_1 = True, "数据创建完成！(模拟输出)", []
        
        execute_1_text = f"""<Execute>
{self._format_execute_output(output_1 if output_1 else "执行成功")}
</Execute>

"""
        for chunk in self._chunked_yield(execute_1_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 代码块2 - 统计分析
        code_2_text = f"""<Code>
```python
{DATA_ANALYSIS_CODE_2.strip()}
```
</Code>

"""
        for chunk in self._chunked_yield(code_2_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 执行代码2
        if self.code_executor.workspace_dir:
            success_2, output_2, files_2 = self.code_executor.execute_code(DATA_ANALYSIS_CODE_2)
        else:
            success_2, output_2, files_2 = True, "统计分析完成！(模拟输出)", []
        
        execute_2_text = f"""<Execute>
{self._format_execute_output(output_2 if output_2 else "统计分析完成")}
</Execute>

"""
        for chunk in self._chunked_yield(execute_2_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 代码块3 - 可视化
        code_3_text = f"""<Code>
```python
{DATA_ANALYSIS_CODE_3.strip()}
```
</Code>

"""
        for chunk in self._chunked_yield(code_3_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 执行代码3 - 生成图表
        if self.code_executor.workspace_dir:
            success_3, output_3, files_3 = self.code_executor.execute_code(DATA_ANALYSIS_CODE_3)
        else:
            success_3, output_3, files_3 = True, "图表已保存！(模拟输出)", []
        
        execute_3_text = f"""<Execute>
{self._format_execute_output(output_3 if output_3 else "图表生成完成")}
</Execute>

"""
        for chunk in self._chunked_yield(execute_3_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

        # 文件标签 - 显示生成的文件
        all_files = files_1 + files_2 + files_3
        file_tags = self._format_file_tags(all_files, session_id or "default", user_id)
        
        if file_tags:
            file_text = f"""<File>
{file_tags}
</File>

"""
            for chunk in self._chunked_yield(file_text, 5):
                if check_stop(): return
                yield chunk
                time.sleep(0.01)

        # 最终答案
        answer_text = """<Answer>
## 📊 数据分析报告

### 一、数据概览

本次分析基于模拟的2024年全年销售数据，共 **366** 条记录，包含以下维度：
- **时间维度**：日期、月份、季度
- **产品维度**：5大产品类别（电子产品、服装、食品、家居、美妆）
- **地区维度**：5大区域（华东、华南、华北、西南、西北）
- **指标维度**：销售金额、销售数量

---

### 二、关键发现 📈

#### 1. 产品类别分析
根据实际执行结果，各产品类别的销售表现各有特点，建议优化高价值品类的销售策略。

#### 2. 地区分布分析
不同地区的销售表现存在差异，建议加大潜力地区的市场开拓力度。

#### 3. 时间趋势分析
各季度销售额呈现一定波动，可根据季节性特征制定营销策略。

---

### 三、可视化分析 📊

已生成包含以下内容的分析图表：
- 各产品类别销售金额柱状图
- 月度销售趋势图
- 地区销售分布饼图
- 季度销售对比图

请查看上方生成的图表文件。

---

### 四、建议与行动项 ✅

1. **产品策略**：重点发展高销售额品类
2. **区域策略**：加强潜力区域的市场开拓
3. **时间策略**：根据季节性波动调整备货和促销
4. **后续分析**：可进一步分析客户画像和建立预测模型

---

📅 报告生成时间：2024年数据分析报告
</Answer>"""
        
        for chunk in self._chunked_yield(answer_text, 5):
            if check_stop(): return
            yield chunk
            time.sleep(0.01)

    def _chunked_yield(self, text: str, chunk_size: int) -> Generator[str, None, None]:
        """分块生成文本"""
        for i in range(0, len(text), chunk_size):
            yield text[i:i + chunk_size]

    def stream_response_with_session(
        self, 
        messages: list,
        user_id: str = "default"
    ) -> tuple:
        """
        创建可停止的流式响应
        
        Returns:
            (session_id, generator) 元组
        """
        session_id = stop_manager.create_session()
        
        def generate():
            try:
                for chunk in self.stream_response(messages, session_id, user_id):
                    yield chunk
            finally:
                stop_manager.cleanup_session(session_id)
        
        return session_id, generate()


def create_mock_stream(messages: list) -> Generator[str, None, None]:
    """创建 mock 流式响应"""
    service = MockLLMService()
    return service.stream_response(messages)


# 使用示例
if __name__ == "__main__":
    print("=" * 60)
    print("Mock LLM 服务测试")
    print("=" * 60)

    # 测试不同类型的请求
    test_messages = [
        {"role": "user", "content": "你好"},
        {"role": "user", "content": "做一个数据分析报告全流程"},
        {"role": "user", "content": "你能做什么"},
        {"role": "user", "content": "分析这个数据"},
    ]

    service = MockLLMService()

    for msg in test_messages:
        print(f"\n用户: {msg['content']}")
        print("-" * 40)
        print("AI: ", end="", flush=True)

        for chunk in service.stream_response([msg]):
            print(chunk, end="", flush=True)
        print("\n")
