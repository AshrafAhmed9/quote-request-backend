import random
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="Document Analysis Service")


class AnalyzeRequest(BaseModel):
    quote_id: str


class AnalyzeResponse(BaseModel):
    risk: str
    missing_items: List[str]
    confidence: int


RISKS = ["Low", "Medium", "High"]
POSSIBLE_MISSING = [
    "Structural drawings",
    "Load requirements",
    "Site survey report",
    "Environmental assessment",
    "Budget breakdown",
    "Timeline estimate",
    "Material specifications",
    "Safety compliance docs",
]


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    risk = random.choice(RISKS)
    count = random.randint(1, 4)
    missing = random.sample(POSSIBLE_MISSING, count)
    confidence = random.randint(70, 99)

    return AnalyzeResponse(
        risk=risk,
        missing_items=missing,
        confidence=confidence,
    )


@app.get("/health")
def health():
    return {"status": "healthy"}
