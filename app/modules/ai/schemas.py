"""
AI Chat Schemas
"""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str


class ChartData(BaseModel):
    type: str
    labels: list[str]
    datasets: list[dict[str, Any]]


class ChatResponse(BaseModel):
    intent: str
    answer: str
    table: Optional[dict[str, Any]] = None
    chart: Optional[ChartData] = None
    available_intents: list[str] = []
    action_result: Optional[dict[str, Any]] = None
