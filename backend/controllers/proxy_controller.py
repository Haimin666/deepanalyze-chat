"""
代理控制器
"""
import httpx
from fastapi import Query, HTTPException
from fastapi.responses import Response


class ProxyController:
    """代理控制器"""

    async def proxy(self, url: str = Query(...)):
        """简单CORS代理"""
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
                r = await client.get(url)

            return Response(
                content=r.content,
                media_type=r.headers.get("content-type", "application/octet-stream"),
                headers={"Access-Control-Allow-Origin": "*"},
                status_code=r.status_code,
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Proxy fetch failed: {e}")
