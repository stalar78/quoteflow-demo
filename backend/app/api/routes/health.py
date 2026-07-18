from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/api/health")
def health(request: Request) -> dict[str, str]:
    return {
        "status": "ok",
        "service": "quoteflow-api",
        "requestId": request.state.request_id,
    }
