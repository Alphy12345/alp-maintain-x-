from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from events import sse_event_generator

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/work-orders")
def work_order_events():
    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/output-data")
def output_data_events():
    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
