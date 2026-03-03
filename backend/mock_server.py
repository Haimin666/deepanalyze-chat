"""
Mock LLM Server - 独立的 Mock 聊天服务
运行在 8000 端口，提供与 OpenAI 兼容的聊天 API

启动方式:
    python mock_server.py

或使用 uvicorn:
    uvicorn mock_server:app --host 0.0.0.0 --port 8000
"""
import json
import time
import asyncio
from typing import AsyncGenerator, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel


# ========== 请求/响应模型 ==========

class ChatMessage(BaseModel):
    """聊天消息"""
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    """聊天完成请求"""
    model: str = "DeepAnalyze-8B"
    messages: List[ChatMessage]
    stream: bool = True
    session_id: str = "default"


class ChatCompletionChoice(BaseModel):
    """聊天完成选项"""
    index: int = 0
    message: Optional[ChatMessage] = None
    delta: Optional[dict] = None
    finish_reason: Optional[str] = None


class ChatCompletionResponse(BaseModel):
    """聊天完成响应"""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]


# ========== Mock 响应内容 ==========

DATA_ANALYSIS_RESPONSE = """<Analyze>
根据您提供的数据文件，我将对数据进行全面分析：

1. **数据概览**：数据集包含多个字段，需要进行数据清洗和统计分析
2. **分析目标**：识别数据模式、趋势和异常值
3. **方法选择**：使用 Python 进行数据处理和可视化分析
</Analyze>

<Understand>
数据理解阶段：

- 数据类型识别：数值型、分类型、时间序列
- 缺失值检查：统计各字段缺失比例
- 数据分布：计算均值、中位数、标准差等统计量
- 相关性分析：特征之间的关联关系
</Understand>

<Code>
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False

# 读取数据
df = pd.read_csv('data.csv')

# 数据概览
print("数据形状:", df.shape)
print("\\n数据类型:")
print(df.dtypes)
print("\\n统计摘要:")
print(df.describe())

# 缺失值分析
missing = df.isnull().sum()
missing_pct = (missing / len(df)) * 100
print("\\n缺失值统计:")
print(pd.DataFrame({'缺失数': missing, '缺失比例': missing_pct}))

# 数据可视化
fig, axes = plt.subplots(2, 2, figsize=(12, 10))

# 数值列分布
numeric_cols = df.select_dtypes(include=[np.number]).columns
if len(numeric_cols) > 0:
    df[numeric_cols[0]].hist(ax=axes[0, 0], bins=30, edgecolor='black')
    axes[0, 0].set_title(f'{numeric_cols[0]} 分布')
    axes[0, 0].set_xlabel(numeric_cols[0])
    axes[0, 0].set_ylabel('频数')

# 相关性热力图
if len(numeric_cols) >= 2:
    corr = df[numeric_cols].corr()
    sns.heatmap(corr, annot=True, cmap='coolwarm', ax=axes[0, 1])
    axes[0, 1].set_title('相关性热力图')

# 箱线图
if len(numeric_cols) > 0:
    df.boxplot(column=numeric_cols[:4].tolist() if len(numeric_cols) >= 4 else numeric_cols.tolist(), 
               ax=axes[1, 0])
    axes[1, 0].set_title('数值列箱线图')
    axes[1, 0].tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.savefig('analysis_result.png', dpi=150, bbox_inches='tight')
plt.show()

print("\\n分析完成！结果图表已保存为 analysis_result.png")
```
</Code>

<Execute>
```
数据形状: (1000, 8)

数据类型:
id          int64
name       object
value     float64
category   object
date       object
score     float64
count      int64
status     object

统计摘要:
              id        value       score        count
count  1000.000   1000.00000  1000.00000  1000.000000
mean    500.500    523.45678    75.23456    156.789000
std     288.819    298.76543    12.34567     89.012345
min       1.000     10.12345    45.67890     10.000000
25%     250.750    280.98765    65.43210    100.000000
50%     500.500    510.12345    75.00000    150.000000
75%     750.250    760.54321    85.67890    200.000000
max    1000.000    999.87654    99.99999    500.000000

分析完成！结果图表已保存为 analysis_result.png
```
</Execute>

<File>
- [analysis_result.png](http://localhost:8100/session_id/generated/analysis_result.png)
![分析结果图表](http://localhost:8100/session_id/generated/analysis_result.png)
</File>

<Answer>
## 数据分析总结

根据对您的数据文件进行的全面分析，以下是主要发现：

### 1. 数据质量评估
- **数据完整性**：整体数据完整性良好，缺失值比例较低（最高2.3%）
- **数据类型**：包含数值型、分类型和时间型数据
- **建议**：对缺失值进行适当填充或删除处理

### 2. 统计特征
- **数值分布**：主要数值字段呈现近似正态分布
- **相关性**：部分特征之间存在中等程度的相关性
- **异常值**：箱线图显示存在少量异常值，建议进一步分析

### 3. 可视化结果
已生成包含以下内容的分析图表：
- 数值分布直方图
- 特征相关性热力图
- 箱线图异常值检测
- 时间趋势分析

### 4. 后续建议
1. 处理缺失值和异常值
2. 进行特征工程和选择
3. 建立预测模型（如需要）
4. 深入分析特定业务指标

如需进一步分析特定维度或建立预测模型，请告知具体需求。
</Answer>"""

# 简单聊天回复
SIMPLE_CHAT_RESPONSES = {
    "你好": "你好！我是您的 AI 助手，有什么可以帮助您的吗？",
    "hello": "Hello! How can I help you today?",
    "你是谁": "我是一个 AI 助手，专门帮助您进行数据分析和问题解答。",
    "功能": "我可以帮助您：\n1. 数据分析和可视化\n2. 代码编写和执行\n3. 问题解答和建议\n\n请上传数据文件开始分析！",
    "帮助": "您可以：\n- 上传数据文件进行自动分析\n- 提问关于数据分析的问题\n- 让我生成代码并执行\n\n试试问我「帮我分析这个数据」",
}

DEFAULT_RESPONSE = """我理解您的问题。让我为您解答：

这是一个很好的问题！如果您需要数据分析服务，请上传数据文件，我将：
1. 自动分析数据结构和质量
2. 生成统计摘要和可视化图表
3. 提供专业的分析建议

您可以尝试问我「分析这个数据」或「帮我做数据分析」。"""


# ========== Mock 服务类 ==========

class MockLLMService:
    """Mock LLM 服务"""

    def __init__(self):
        self.data_keywords = [
            "分析", "数据", "统计", "图表", "可视化",
            "analysis", "data", "统计", "报告", "报表",
            "趋势", "分布", "相关", "异常", "预测"
        ]

    def is_data_analysis_request(self, message: str) -> bool:
        """判断是否为数据分析请求"""
        message_lower = message.lower()
        return any(kw in message_lower for kw in self.data_keywords)

    def get_simple_response(self, message: str) -> str:
        """获取简单聊天回复"""
        message_lower = message.lower().strip()
        return SIMPLE_CHAT_RESPONSES.get(message_lower, DEFAULT_RESPONSE)

    def get_response(self, messages: List[ChatMessage]) -> str:
        """获取完整响应"""
        if not messages:
            return "您好！有什么可以帮助您的吗？"

        # 获取最后一条用户消息
        last_message = messages[-1] if messages else None
        user_content = last_message.content.lower() if last_message else ""

        # 判断响应类型
        if self.is_data_analysis_request(user_content):
            return DATA_ANALYSIS_RESPONSE
        else:
            return self.get_simple_response(user_content)


# ========== FastAPI 应用 ==========

mock_service = MockLLMService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    print("🚀 Mock LLM Server 启动中...")
    print("   - 服务地址: http://localhost:8000")
    print("   - API 文档: http://localhost:8000/docs")
    yield
    print("👋 Mock LLM Server 关闭中...")


app = FastAPI(
    title="Mock LLM Server",
    description="Mock AI 聊天服务 - OpenAI 兼容 API",
    version="1.0.0",
    lifespan=lifespan,
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "Mock LLM Server",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/v1/chat/completions",
            "health": "/health",
        },
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": "1.0.0"}


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """聊天完成 API - OpenAI 兼容格式"""

    if request.stream:
        return StreamingResponse(
            stream_response(request.messages, request.model),
            media_type="text/event-stream",
        )
    else:
        # 非流式响应
        response_text = mock_service.get_response(request.messages)
        response_id = f"chatcmpl-{int(time.time())}"

        return JSONResponse({
            "id": response_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": response_text,
                    },
                    "finish_reason": "stop",
                }
            ],
        })


async def stream_response(
    messages: List[ChatMessage],
    model: str
) -> AsyncGenerator[str, None]:
    """流式响应生成器"""
    response_text = mock_service.get_response(messages)
    response_id = f"chatcmpl-{int(time.time())}"
    created = int(time.time())

    # 首先发送角色信息
    chunk = {
        "id": response_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": {"role": "assistant"},
                "finish_reason": None,
            }
        ],
    }
    yield json.dumps(chunk, ensure_ascii=False) + "\n"
    await asyncio.sleep(0.01)

    # 分块发送内容
    chunk_size = 5  # 每次发送的字符数
    for i in range(0, len(response_text), chunk_size):
        content_chunk = response_text[i:i + chunk_size]
        chunk = {
            "id": response_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "delta": {"content": content_chunk},
                    "finish_reason": None,
                }
            ],
        }
        yield json.dumps(chunk, ensure_ascii=False) + "\n"
        await asyncio.sleep(0.02)  # 模拟网络延迟

    # 发送结束标记
    chunk = {
        "id": response_id,
        "object": "chat.completion.chunk",
        "created": created,
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": {},
                "finish_reason": "stop",
            }
        ],
    }
    yield json.dumps(chunk, ensure_ascii=False) + "\n"


# 兼容性路由 - 不带 /v1 前缀
@app.post("/chat/completions")
async def chat_completions_compat(request: ChatCompletionRequest):
    """聊天完成 API - 兼容不带 /v1 前缀的请求"""
    return await chat_completions(request)


# ========== 主入口 ==========

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Mock LLM Server - 独立的 Mock 聊天服务")
    print("=" * 60)
    print()
    print("启动信息:")
    print("  - 服务地址: http://localhost:8000")
    print("  - API 文档: http://localhost:8000/docs")
    print("  - 聊天接口: POST /v1/chat/completions")
    print()
    print("测试命令:")
    print("  curl -X POST http://localhost:8000/v1/chat/completions \\")
    print("    -H 'Content-Type: application/json' \\")
    print("    -d '{\"model\": \"DeepAnalyze-8B\", \"messages\": [{\"role\": \"user\", \"content\": \"你好\"}], \"stream\": false}'")
    print()

    uvicorn.run(app, host="0.0.0.0", port=8000)
