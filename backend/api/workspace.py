import os, shutil
from pathlib import Path
from typing import List
import httpx
from fastapi import APIRouter, File, UploadFile, Query, HTTPException, Response
from fastapi.concurrency import run_in_threadpool
from services.workspace_service import get_session_workspace, uniquify_path, execute_code_safe, build_tree, build_download_url, get_file_icon

router = APIRouter()

@router.get("/workspace/files")
async def get_workspace_files(session_id: str = Query("default")):
    workspace_dir = get_session_workspace(session_id)
    generated_dir = Path(workspace_dir) / "generated"
    generated_files = set(f.name for f in generated_dir.iterdir() if f.is_file()) if generated_dir.exists() else set()

    files =[]
    for f in Path(workspace_dir).iterdir():
        if f.is_file() and f.name not in generated_files:
            rel = f"{session_id}/{f.name}"
            files.append({"name": f.name, "size": f.stat().st_size, "extension": f.suffix.lower(), "icon": get_file_icon(f.suffix), "download_url": build_download_url(rel), "preview_url": build_download_url(rel) if f.suffix.lower() in[".jpg",".png",".pdf",".txt",".csv"] else None})
    return {"files": files}

@router.get("/workspace/tree")
async def workspace_tree(session_id: str = Query("default")):
    def prefix_urls(node, sid):
        if node.get("download_url"): node["download_url"] = build_download_url(f"{sid}/{node.get('path', '')}")
        for child in node.get("children",[]): prefix_urls(child, sid)
    tree_data = build_tree(Path(get_session_workspace(session_id)))
    prefix_urls(tree_data, session_id)
    return tree_data

@router.delete("/workspace/file")
async def delete_workspace_file(path: str = Query(...), session_id: str = Query("default")):
    target = (Path(get_session_workspace(session_id)).resolve() / path).resolve()
    if target.is_dir() or not target.exists(): raise HTTPException(400, "Invalid or not found")
    target.unlink()
    return {"message": "deleted"}

@router.post("/workspace/move")
async def move_path(src: str = Query(...), dst_dir: str = Query(""), session_id: str = Query("default")):
    abs_workspace = Path(get_session_workspace(session_id)).resolve()
    abs_src = (abs_workspace / src).resolve()
    abs_dst_dir = (abs_workspace / dst_dir).resolve()
    abs_dst_dir.mkdir(parents=True, exist_ok=True)
    target = uniquify_path(abs_dst_dir / abs_src.name)
    shutil.move(str(abs_src), str(target))
    return {"message": "moved", "new_path": str(target.relative_to(abs_workspace))}

@router.delete("/workspace/dir")
async def delete_workspace_dir(path: str = Query(...), recursive: bool = Query(True), session_id: str = Query("default")):
    target = (Path(get_session_workspace(session_id)).resolve() / path).resolve()
    if not target.is_dir(): raise HTTPException(400, "Not a directory")
    shutil.rmtree(target) if recursive else target.rmdir()
    return {"message": "deleted"}

@router.post("/workspace/upload")
async def upload_files(files: List[UploadFile] = File(...), session_id: str = Query("default")):
    workspace_dir = Path(get_session_workspace(session_id))
    uploaded =[]
    for file in files:
        dst = uniquify_path(workspace_dir / file.filename)
        content = await file.read()
        with open(dst, "wb") as f: f.write(content)
        uploaded.append({"name": dst.name, "path": str(dst.relative_to(workspace_dir))})
    return {"message": "Success", "files": uploaded}

@router.post("/workspace/upload-to")
async def upload_to_dir(dir: str = Query(""), files: List[UploadFile] = File(...), session_id: str = Query("default")):
    target_dir = (Path(get_session_workspace(session_id)).resolve() / dir).resolve()
    target_dir.mkdir(parents=True, exist_ok=True)
    for f in files:
        dst = uniquify_path(target_dir / f.filename)
        with open(dst, "wb") as buffer: buffer.write(await f.read())
    return {"message": "Success"}

@router.delete("/workspace/clear")
async def clear_workspace(session_id: str = Query("default")):
    ws = get_session_workspace(session_id)
    if os.path.exists(ws): shutil.rmtree(ws)
    os.makedirs(ws, exist_ok=True)
    return {"message": "Cleared"}

@router.post("/execute")
async def execute_code_api(request: dict):
    return {"success": True, "result": await run_in_threadpool(execute_code_safe, request.get("code", ""), get_session_workspace(request.get("session_id", "default")))}

@router.get("/proxy")
async def proxy(url: str):
    async with httpx.AsyncClient(follow_redirects=True) as client:
        r = await client.get(url)
    return Response(content=r.content, media_type=r.headers.get("content-type"), status_code=r.status_code)