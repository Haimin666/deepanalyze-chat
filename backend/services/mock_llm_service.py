"""
Mock LLM 服务 - 模拟 AI 聊天响应
用于开发和测试环境，无需真实 AI 模型
"""
import json
import time
import uuid
import threading
from typing import Generator, Dict, Optional, Callable

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


# 数据分析报告全流程响应
DATA_ANALYSIS_FULL_RESPONSE = """<Analyze>
用户需要生成一份数据分析报告，我将按照以下步骤进行：

1. **数据理解** - 分析数据结构和特征
2. **数据清洗** - 处理缺失值和异常值
3. **探索性分析** - 统计描述和可视化
4. **深度分析** - 发现数据规律和洞察
5. **报告生成** - 输出专业分析报告
</Analyze>

<Understand>
由于用户未提供具体数据文件，我将使用模拟数据演示完整的数据分析流程。

我将创建一个销售数据示例，包含：
- 📅 日期维度（全年数据）
- 🏷️ 产品类别（5大品类）
- 💰 销售金额（随机生成）
- 🗺️ 地区分布（5大区域）
- 📦 销售数量
</Understand>

<Code>
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

# 设置中文字体
font_path = '/usr/share/fonts/truetype/simhei/SimHei.ttf'
fm.fontManager.addfont(font_path)
plt.rcParams['font.sans-serif'] = ['SimHei'] 
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
```
</Code>

<Execute>
```
数据创建完成！
数据概览：
        日期   产品类别       销售金额   地区  销售数量  月份  季度
2024-01-01  电子产品  25678.32  华东    234   1   1
2024-01-02     服装  12345.67  华南    189   1   1
2024-01-03     食品   8901.23  华北    312   1   1
2024-01-04     家居  34567.89  西南    145   1   1
2024-01-05     美妆  19876.54  西北    267   1   1
2024-01-06  电子产品  28901.45  华东    198   1   1
2024-01-07     服装  15678.90  华南    223   1   1
2024-01-08     食品  11234.56  华北    287   1   1
2024-01-09     家居  32109.87  西南    167   1   1
2024-01-10     美妆  21456.78  西北    245   1   1

数据形状：(366, 7)
```
</Execute>

<Code>
```python
# 1. 数据概览和统计描述
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
```
</Code>

<Execute>
```
==================================================
数据统计描述
==================================================
           销售金额      销售数量        月份        季度
count   366.000000  366.000000  366.000000  366.000000
mean  25432.156789  254.846995    6.500000    2.497268
std   14123.456789  141.234567    3.456789    1.123456
min    1023.450000   12.000000    1.000000    1.000000
25%   12345.670000  134.000000    3.000000    1.000000
50%   25432.120000  255.000000    6.500000    2.500000
75%   38765.430000  376.000000   10.000000    4.000000
max   49876.540000  499.000000   12.000000    4.000000

按产品类别统计：
            销售金额                              销售数量
              sum      mean count       sum
产品类别                                        
电子产品  1892345.67  25890.12    73     18234
服装     1456789.23  19956.78    73     18923
食品      987654.32  13523.45    73     21456
家居     2134567.89  29234.56    73     16789
美妆     1234567.89  16912.45    73     20123

按地区统计：
             sum      mean  count
地区                                
华东  1892345.67  25890.12     73
华南  1567890.12  21456.78     73
华北  1345678.90  18423.45     73
西南  1234567.89  16912.45     73
西北  1567890.12  21456.78     73

按季度统计：
季度
1    2345678.90
2    2567890.12
3    2234567.89
4    2678901.23
```
</Execute>

<Code>
```python
# 3. 数据可视化
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 3.1 产品类别销售金额柱状图
ax1 = axes[0, 0]
category_sales = df.groupby('产品类别')['销售金额'].sum().sort_values(ascending=True)
colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
bars = ax1.barh(category_sales.index, category_sales.values, color=colors)
ax1.set_xlabel('销售金额 (元)', fontsize=12)
ax1.set_title('各产品类别销售金额', fontsize=14, fontweight='bold')
ax1.bar_label(bars, fmt='%.0f', padding=3)

# 3.2 月度销售趋势
ax2 = axes[0, 1]
monthly_sales = df.groupby('月份')['销售金额'].sum()
ax2.plot(monthly_sales.index, monthly_sales.values, marker='o', linewidth=2, color='#4ECDC4')
ax2.fill_between(monthly_sales.index, monthly_sales.values, alpha=0.3, color='#4ECDC4')
ax2.set_xlabel('月份', fontsize=12)
ax2.set_ylabel('销售金额 (元)', fontsize=12)
ax2.set_title('月度销售趋势', fontsize=14, fontweight='bold')
ax2.set_xticks(range(1, 13))

# 3.3 地区销售分布饼图
ax3 = axes[1, 0]
region_sales = df.groupby('地区')['销售金额'].sum()
ax3.pie(region_sales.values, labels=region_sales.index, autopct='%1.1f%%', 
        colors=colors, explode=[0.05, 0, 0, 0, 0])
ax3.set_title('地区销售分布', fontsize=14, fontweight='bold')

# 3.4 季度销售对比
ax4 = axes[1, 1]
quarterly_sales = df.groupby('季度')['销售金额'].sum()
ax4.bar(quarterly_sales.index, quarterly_sales.values, color=['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'])
ax4.set_xlabel('季度', fontsize=12)
ax4.set_ylabel('销售金额 (元)', fontsize=12)
ax4.set_title('季度销售对比', fontsize=14, fontweight='bold')
ax4.set_xticks([1, 2, 3, 4])
ax4.set_xticklabels(['Q1', 'Q2', 'Q3', 'Q4'])

plt.tight_layout()
plt.savefig('sales_analysis_charts.png', dpi=150, bbox_inches='tight')
plt.close()
print("图表已保存为 sales_analysis_charts.png")
```
</Code>

<Execute>
```
图表已保存为 sales_analysis_charts.png
```
</Execute>

<Answer>
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
| 类别 | 总销售额 | 平均销售额 | 销售数量 |
|------|----------|------------|----------|
| 🏠 家居 | 213.5万 | 29,235元 | 16,789 |
| 💻 电子产品 | 189.2万 | 25,890元 | 18,234 |
| 👔 服装 | 145.7万 | 19,957元 | 18,923 |
| 💄 美妆 | 123.5万 | 16,912元 | 20,123 |
| 🍔 食品 | 98.8万 | 13,523元 | 21,456 |

**💡 洞察**：家居类产品销售额最高，但食品类销售数量最多，建议优化高价值品类的销售策略。

#### 2. 地区分布分析
| 地区 | 总销售额 | 平均销售额 |
|------|----------|------------|
| 🌊 华东 | 189.2万 | 25,890元 |
| 🌴 华南 | 156.8万 | 21,457元 |
| 🏔️ 西北 | 156.8万 | 21,457元 |
| 🏛️ 华北 | 134.6万 | 18,423元 |
| 🌄 西南 | 123.5万 | 16,912元 |

**💡 洞察**：华东地区销售表现最佳，西北地区有较大增长潜力。

#### 3. 时间趋势分析
- **Q1**（1-3月）：234.6万
- **Q2**（4-6月）：256.8万
- **Q3**（7-9月）：223.5万
- **Q4**（10-12月）：267.9万

**💡 洞察**：Q4销售额最高，可能与年末促销活动相关。

---

### 三、可视化分析 📊

![销售分析图表](sales_analysis_charts.png)

---

### 四、建议与行动项 ✅

1. **产品策略**
   - 重点发展家居和电子产品品类
   - 提升食品类客单价

2. **区域策略**
   - 加大西北和西南地区的市场开拓力度
   - 巩固华东地区的市场优势

3. **时间策略**
   - Q2、Q4旺季加大备货
   - Q1、Q3开展促销活动

4. **后续分析建议**
   - 深入分析客户画像
   - 建立销售预测模型
   - 分析促销活动效果

---

📅 报告生成时间：2024年数据分析报告
</Answer>"""


# 数据分析响应模板（上传数据时使用）
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
    """Mock LLM 服务类"""

    def __init__(self):
        self.data_keywords = DATA_ANALYSIS_KEYWORDS
        self.full_analysis_keywords = FULL_ANALYSIS_KEYWORDS

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
        
        # 2. 检查是否为完整数据分析流程
        if self.is_full_analysis_request(message_lower):
            return DATA_ANALYSIS_FULL_RESPONSE
        
        # 3. 检查是否为数据分析请求（有文件时）
        if self.is_data_analysis_request(message_lower):
            return DATA_ANALYSIS_RESPONSE
        
        # 4. 默认回复
        return DEFAULT_RESPONSE

    def stream_response(
        self, 
        messages: list, 
        session_id: Optional[str] = None
    ) -> Generator[str, None, None]:
        """
        流式生成响应
        
        Args:
            messages: 消息列表
            session_id: 可选的会话ID，用于支持停止功能
        
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

        # 模拟流式输出
        chunk_size = 5  # 每次输出的字符数
        for i in range(0, len(response), chunk_size):
            # 检查是否需要停止
            if session_id and stop_manager.is_stopped(session_id):
                print(f"[Mock] Session {session_id} stopped")
                return
            
            chunk = response[i:i + chunk_size]
            yield chunk
            time.sleep(0.02)  # 模拟网络延迟

    def stream_response_with_session(
        self, 
        messages: list
    ) -> tuple:
        """
        创建可停止的流式响应
        
        Returns:
            (session_id, generator) 元组
        """
        session_id = stop_manager.create_session()
        
        def generate():
            try:
                for chunk in self.stream_response(messages, session_id):
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
