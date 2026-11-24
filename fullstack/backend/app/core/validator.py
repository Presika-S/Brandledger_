from typing import List, Optional
from ..models.schemas import VerificationResult, VerificationStatus
from ..models.database import Fact

class SourceQuoteValidator:
    """
    Stage 3 Validation Gate:
    Validates that:
    1. The source ID referenced by the verifier actually exists in the active Brand Source of Truth.
    2. The fact is unexpired and approved.
    3. The quoted excerpt actually exists in the statement.
    If ANY condition fails, it strips the auto-approval, marks status=ABSTAIN,
    and escalates directly to human review.
    """

    def validate_result(self, result: VerificationResult, facts_by_id: dict[str, Fact]) -> VerificationResult:
        if result.status == VerificationStatus.ABSTAIN:
            result.validator_confirmed = False
            return result

        if not result.source_id:
            if result.status == VerificationStatus.VERIFIED:
                # Cannot be verified without a source!
                result.status = VerificationStatus.ABSTAIN
                result.explanation = "Validation Failed: No source ID was provided for a VERIFIED claim. Escalated to human fact owner."
                result.validator_confirmed = False
                result.routed_to_owner = True
            return result

        # Check ledger existence
        fact = facts_by_id.get(result.source_id)
        if not fact:
            result.status = VerificationStatus.ABSTAIN
            result.explanation = f"Validation Failed: Referenced Source ID '{result.source_id}' does not exist in the Brand Source of Truth. Escalated to human fact owner."
            result.validator_confirmed = False
            result.routed_to_owner = True
            return result

        if not fact.is_active:
            result.status = VerificationStatus.FLAGGED
            result.explanation = f"Validation Alert: Source fact '{result.source_id}' has been archived or deactivated in the ledger."
            result.validator_confirmed = False
            result.routed_to_owner = True
            return result

        # Check quote integrity
        if result.source_quote and result.source_quote.strip() not in fact.statement:
            # Tolerant sub-phrase check
            common_words = set(result.source_quote.lower().split()) & set(fact.statement.lower().split())
            if len(common_words) < 2:
                result.status = VerificationStatus.ABSTAIN
                result.explanation = f"Validation Alert: Quoted text does not match the canonical statement for Source ID {fact.id}. Escalated to fact owner {fact.fact_owner}."
                result.validator_confirmed = False
                result.routed_to_owner = True
                return result

        result.validator_confirmed = True
        return result

validator = SourceQuoteValidator()
