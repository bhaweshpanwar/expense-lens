from ..providers.provider_manager import ProviderManager
from typing import Dict, Any

class UnusualExpenseService:
    def __init__(self):
        self.provider_manager = ProviderManager()

    async def analyze_expense(self, data: Dict[str, Any]) -> Dict[str, Any]:
        amount = data.get("amount", 0)
        historical_avg = data.get("historical_average", 0)

        difference = amount - historical_avg

        # Logic for flagging: flag if amount is > 20% different from average
        # or if historical_avg is 0 and amount is significant.
        flagged = False
        if historical_avg > 0:
            if abs(difference) / historical_avg > 0.2:
                flagged = True
        elif amount > 0:
            flagged = True

        reason = ""
        if flagged:
            # Use AI for a factual explanation
            explanation_data = {
                "amount": amount,
                "historical_average": historical_avg,
                "difference": difference
            }
            reason = await self.provider_manager.explain_unusual_expense(explanation_data)
        else:
            reason = "Expense is within normal historical range."

        return {
            "flagged": flagged,
            "reason": reason,
            "current_amount": amount,
            "historical_average": historical_avg,
            "difference": difference
        }
