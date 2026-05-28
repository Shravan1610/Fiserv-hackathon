from dataclasses import dataclass
from typing import Optional

@dataclass
class Expense:
    id: str
    merchant: Optional[str]
    amount: Optional[float]
    date: Optional[str]
    category: str
    confidence: float
