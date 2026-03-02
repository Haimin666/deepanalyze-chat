"""
Mock LLM 服务 - 模拟 AI 聊天响应
用于开发和测试环境，无需真实 AI 模型
"""
import json
import time
from typing import Generator

# 数据分析完整响应模板
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

# 时间趋势（如果有时间列）
time_cols = df.select_dtypes(include=['datetime64']).columns
if len(time_cols) > 0 and len(numeric_cols) > 0:
    df.plot(x=time_cols[0], y=numeric_cols[0], ax=axes[1, 1])
    axes[1, 1].set_title('时间趋势')
else:
    axes[1, 1].text(0.5, 0.5, '无时间序列数据', ha='center', va='center')
    axes[1, 1].set_title('时间趋势分析')

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

缺失值统计:
          缺失数  缺失比例
id          0     0.0%
name       15     1.5%
value      23     2.3%
category   10     1.0%
date        5     0.5%
score      18     1.8%
count       0     0.0%
status      8     0.8%

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


class MockLLMService:
    """Mock LLM 服务类"""

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

    def stream_response(self, messages: list) -> Generator[str, None, None]:
        """流式生成响应"""
        if not messages:
            yield "您好！有什么可以帮助您的吗？"
            return

        # 获取最后一条用户消息
        last_message = messages[-1] if messages else {}
        user_content = last_message.get("content", "").lower()

        # 判断响应类型
        if self.is_data_analysis_request(user_content):
            response = DATA_ANALYSIS_RESPONSE
        else:
            response = self.get_simple_response(user_content)

        # 模拟流式输出
        chunk_size = 5  # 每次输出的字符数
        for i in range(0, len(response), chunk_size):
            chunk = response[i:i + chunk_size]
            yield chunk
            time.sleep(0.02)  # 模拟网络延迟


def create_mock_stream(messages: list) -> Generator[str, None, None]:
    """创建 mock 流式响应"""
    service = MockLLMService()
    return service.stream_response(messages)


# 使用示例
if __name__ == "__main__":
    print("=" * 60)
    print("Mock LLM 服务测试")
    print("=" * 60)

    # 测试数据分析请求
    test_messages = [
        {"role": "user", "content": "帮我分析这个数据"},
        {"role": "user", "content": "你好"},
        {"role": "user", "content": "你能做什么"},
    ]

    service = MockLLMService()

    for msg in test_messages:
        print(f"\n用户: {msg['content']}")
        print("-" * 40)
        print("AI: ", end="")

        for chunk in service.stream_response([msg]):
            print(chunk, end="", flush=True)
        print("\n")
