import requests
import json
import os
import time

BASE_URL = "http://localhost:8200"
SESSION_ID = "test_automation_session"

# ANSI颜色代码，用于控制台输出高亮
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def print_step(msg):
    print(f"\n{YELLOW}==> {msg}{RESET}")


def assert_status(response, expected_status=200, step_name=""):
    if response.status_code == expected_status:
        print(f"{GREEN}[PASS]{RESET} {step_name}")
        return True
    else:
        print(f"{RED}[FAIL]{RESET} {step_name}")
        print(f"    Expected: {expected_status}, Got: {response.status_code}")
        print(f"    Response: {response.text}")
        return False


def main():
    # 全局 Session 保持 Token
    client = requests.Session()

    print_step("1. Auth API 测试 (登录)")
    # 注意: OAuth2PasswordRequestForm 期望接收 form data (application/x-www-form-urlencoded)
    res = client.post(f"{BASE_URL}/api/auth/login", data={"username": "admin", "password": "admin123"})
    if assert_status(res, 200, "管理员登录"):
        token = res.json().get("access_token")
        client.headers.update({"Authorization": f"Bearer {token}"})
    else:
        print("登录失败，终止后续需要权限的测试。")
        return

    print_step("2. Admin API 测试 (用户管理)")
    new_user_data = {"username": "test_user_1", "password": "password123", "role": "user"}
    res = client.post(f"{BASE_URL}/api/admin/users", json=new_user_data)
    assert_status(res, 200, "创建新用户")
    user_id = res.json().get("id") if res.status_code == 200 else None

    res = client.get(f"{BASE_URL}/api/admin/users")
    assert_status(res, 200, "获取所有用户列表")

    if user_id:
        res = client.delete(f"{BASE_URL}/api/admin/users/{user_id}")
        assert_status(res, 200, "删除刚才创建的用户")

    print_step("3. Workspace API 测试 (工作区与文件管理)")
    # 3.1 清空测试空间
    res = client.delete(f"{BASE_URL}/workspace/clear", params={"session_id": SESSION_ID})
    assert_status(res, 200, "清空工作区")

    # 3.2 创建一个临时文件用于上传
    with open("dummy.txt", "w", encoding="utf-8") as f:
        f.write("Hello DeepAnalyze!")

    # 上传文件 (根目录)
    with open("dummy.txt", "rb") as f:
        files = {"files": ("dummy.txt", f, "text/plain")}
        res = client.post(f"{BASE_URL}/workspace/upload", params={"session_id": SESSION_ID}, files=files)
        assert_status(res, 200, "上传文件到工作区")

    # 获取文件列表
    res = client.get(f"{BASE_URL}/workspace/files", params={"session_id": SESSION_ID})
    assert_status(res, 200, "获取工作区文件列表")

    # 上传文件到子目录
    with open("dummy.txt", "rb") as f:
        files = {"files": ("dummy_sub.txt", f, "text/plain")}
        res = client.post(f"{BASE_URL}/workspace/upload-to", params={"session_id": SESSION_ID, "dir": "subfolder"},
                          files=files)
        assert_status(res, 200, "上传文件到指定子目录")

    # 移动文件
    res = client.post(f"{BASE_URL}/workspace/move",
                      params={"session_id": SESSION_ID, "src": "dummy.txt", "dst_dir": "subfolder"})
    assert_status(res, 200, "移动文件")

    # 获取文件树
    res = client.get(f"{BASE_URL}/workspace/tree", params={"session_id": SESSION_ID})
    assert_status(res, 200, "获取工作区文件树结构")

    # 删除文件
    res = client.delete(f"{BASE_URL}/workspace/file", params={"session_id": SESSION_ID, "path": "subfolder/dummy.txt"})
    assert_status(res, 200, "删除指定文件")

    # 删除文件夹
    res = client.delete(f"{BASE_URL}/workspace/dir",
                        params={"session_id": SESSION_ID, "path": "subfolder", "recursive": True})
    assert_status(res, 200, "递归删除文件夹")

    # 移除本地临时文件
    os.remove("dummy.txt")

    print_step("4. Execute API 测试 (代码沙盒)")
    code_payload = {"code": "print('Hello from Sandbox')", "session_id": SESSION_ID}
    res = client.post(f"{BASE_URL}/execute", json=code_payload)
    if assert_status(res, 200, "执行 Python 代码"):
        print(f"    代码输出: {res.json().get('result').strip()}")

    print_step("5. Proxy API 测试")
    res = client.get(f"{BASE_URL}/proxy", params={"url": "https://www.baidu.com"})
    assert_status(res, 200, "代理获取外部网页")

    print_step("6. Chat & History API 测试 (对话与落库)")
    # 注意: 如果你本地的 vLLM 服务器 (localhost:8000) 没开，这步的请求会报错，我加上异常捕获
    chat_payload = {
        "session_id": SESSION_ID,
        "messages": [{"role": "user", "content": "你好，请生成一份简单的数据报告。"}],
        "workspace": []
    }
    print("    正在请求大模型流式对话 (这可能需要几秒钟)...")
    try:
        # stream=True 监听流式返回
        res = client.post(f"{BASE_URL}/chat/completions", json=chat_payload, stream=True, timeout=10)
        assert_status(res, 200, "发起流式对话请求")
        # 读取流式返回(仅读取一小段以验证连接)
        for line in res.iter_lines():
            if line:
                print(f"    [Stream Received]: {line.decode('utf-8')[:80]}...")
                break  # 验证到有流式输出即可断开
    except requests.exceptions.RequestException as e:
        print(f"{YELLOW}[WARN]{RESET} 大模型推理连接失败 (这通常是因为你尚未启动 vLLM): {e}")

    # 等待一小会儿确保异步落库完成
    time.sleep(1)

    # 验证落库记录：查询会话列表
    res = client.get(f"{BASE_URL}/chat/sessions")
    assert_status(res, 200, "获取所有历史会话列表")

    # 验证落库记录：查询特定会话消息
    res = client.get(f"{BASE_URL}/chat/sessions/{SESSION_ID}/messages")
    if assert_status(res, 200, "获取特定会话的消息历史"):
        msg_count = len(res.json())
        print(f"    当前会话消息数 (应包含刚才的提问): {msg_count} 条")

    print_step("7. Export API 测试 (报告导出)")
    export_payload = {
        "session_id": SESSION_ID,
        "title": "My Auto Test Report",
        "messages": [
            {"role": "assistant", "content": "<Answer>这里是自动生成的回答测试内容，应当被提取到报告中。</Answer>"}
        ]
    }
    res = client.post(f"{BASE_URL}/export/report", json=export_payload)
    if assert_status(res, 200, "导出 Markdown/PDF 报告"):
        print(f"    下载链接: {json.dumps(res.json().get('download_urls'), indent=2, ensure_ascii=False)}")

    print_step("🎉 所有 API 测试流程执行完毕！")


if __name__ == "__main__":
    main()