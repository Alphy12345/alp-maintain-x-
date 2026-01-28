import json
import queue
import threading
import time
from typing import Any, Dict, Generator, Tuple


class _EventBroadcaster:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._subscribers: Dict[int, "queue.Queue[Tuple[str, str]]"] = {}
        self._next_id = 1

    def subscribe(self) -> Tuple[int, "queue.Queue[Tuple[str, str]]"]:
        q: "queue.Queue[Tuple[str, str]]" = queue.Queue()
        with self._lock:
            sub_id = self._next_id
            self._next_id += 1
            self._subscribers[sub_id] = q
        return sub_id, q

    def unsubscribe(self, sub_id: int) -> None:
        with self._lock:
            self._subscribers.pop(sub_id, None)

    def publish(self, event: str, data: Any) -> None:
        payload = json.dumps(data, default=str)
        with self._lock:
            subscribers = list(self._subscribers.values())
        for q in subscribers:
            try:
                q.put_nowait((event, payload))
            except Exception:
                pass


_broadcaster = _EventBroadcaster()


def publish_work_order_event(action: str, work_order_id: int) -> None:
    _broadcaster.publish(
        "work_order",
        {
            "entity": "work_order",
            "action": action,
            "id": work_order_id,
            "ts": time.time(),
        },
    )


def publish_output_data_event(payload: Any) -> None:
    _broadcaster.publish(
        "output_data",
        payload,
    )


def sse_event_generator(ping_interval_seconds: int = 15) -> Generator[str, None, None]:
    sub_id, q = _broadcaster.subscribe()
    last_ping = time.time()
    try:
        while True:
            try:
                event, payload = q.get(timeout=1)
                yield f"event: {event}\n"
                yield f"data: {payload}\n\n"
            except queue.Empty:
                now = time.time()
                if now - last_ping >= ping_interval_seconds:
                    last_ping = now
                    yield "event: ping\n"
                    yield f"data: {int(now)}\n\n"
    finally:
        _broadcaster.unsubscribe(sub_id)
