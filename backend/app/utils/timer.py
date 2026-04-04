import asyncio
from typing import Callable, Awaitable

async def countdown(seconds: int, tick_callback: Callable[[int], Awaitable[None]]) -> None:
    """
    Counts down from `seconds` to 0, calling tick_callback(remaining) each second.
    Used by round_manager to broadcast timer ticks over WebSocket.
    """
    for remaining in range(seconds, -1, -1):
        await tick_callback(remaining)
        if remaining > 0:
            await asyncio.sleep(1)
