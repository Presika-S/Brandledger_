import re
from typing import Optional, List, Tuple
from ..models.schemas import ClaimSpan, ClaimType, VerificationResult, VerificationStatus
from ..models.database import Fact

class RulesEngine:
    """
    Stage 1 Verification: Deterministic exact rules engine.
    Instantly verifies or flags numbers, dates, SLA figures, and glossary terms.
    If unambiguous rule match occurs, avoids costly/unpredictable LLM calls.
    """

    def evaluate_rule(self, claim: ClaimSpan, facts: List[Fact]) -> Optional[VerificationResult]:
        claim_lower = claim.text.lower()
        context_lower = claim.context.lower()

        # Rule Set 1: Pricing Claims
        price_match = re.search(r'\$\s*(\d+)', claim.text)
        if price_match:
            claimed_amount = int(price_match.group(1))
            
            # Find relevant pricing facts in ledger
            for fact in facts:
                if fact.category.lower() == "pricing" and fact.is_active:
                    fact_price_match = re.search(r'\$\s*(\d+)', fact.statement)
                    if fact_price_match:
                        approved_amount = int(fact_price_match.group(1))
                        
                        # Match scope (e.g. starter, enterprise, team)
                        scope_match = False
                        for kw in ['starter', 'team', 'enterprise', 'pro', 'month', 'annual']:
                            if kw in context_lower and kw in fact.statement.lower():
                                scope_match = True
                                break
                        if not scope_match and ('starter' not in context_lower and 'enterprise' not in context_lower):
                            # Default plan scope
                            scope_match = True

                        if scope_match:
                            if claimed_amount == approved_amount:
                                return VerificationResult(
                                    claim_id=claim.id,
                                    claim_text=claim.text,
                                    claim_type=claim.claim_type,
                                    start_pos=claim.start_pos,
                                    end_pos=claim.end_pos,
                                    status=VerificationStatus.VERIFIED,
                                    confidence=1.0,
                                    source_id=fact.id,
                                    source_quote=fact.statement,
                                    source_owner=fact.fact_owner,
                                    explanation=f"Exact match verified against approved pricing source.",
                                    validator_confirmed=True
                                )
                            else:
                                return VerificationResult(
                                    claim_id=claim.id,
                                    claim_text=claim.text,
                                    claim_type=claim.claim_type,
                                    start_pos=claim.start_pos,
                                    end_pos=claim.end_pos,
                                    status=VerificationStatus.FLAGGED,
                                    confidence=0.98,
                                    source_id=fact.id,
                                    source_quote=fact.statement,
                                    source_owner=fact.fact_owner,
                                    suggested_fix=f"${approved_amount}",
                                    explanation=f"Pricing discrepancy detected. Claimed ${claimed_amount}, but approved source specifies ${approved_amount}.",
                                    validator_confirmed=True
                                )

        # Rule Set 2: Uptime / SLA Percentages
        pct_match = re.search(r'(\d+(?:\.\d+)?)\s*%', claim.text)
        if pct_match and any(w in context_lower for w in ['uptime', 'sla', 'availability']):
            claimed_pct = float(pct_match.group(1))
            for fact in facts:
                if "sla" in fact.category.lower() or "uptime" in fact.statement.lower():
                    fact_pct_match = re.search(r'(\d+(?:\.\d+)?)\s*%', fact.statement)
                    if fact_pct_match:
                        approved_pct = float(fact_pct_match.group(1))
                        if abs(claimed_pct - approved_pct) < 0.001:
                            return VerificationResult(
                                claim_id=claim.id,
                                claim_text=claim.text,
                                claim_type=claim.claim_type,
                                start_pos=claim.start_pos,
                                end_pos=claim.end_pos,
                                status=VerificationStatus.VERIFIED,
                                confidence=1.0,
                                source_id=fact.id,
                                source_quote=fact.statement,
                                source_owner=fact.fact_owner,
                                explanation="SLA uptime percentage strictly matches the approved engineering SLA policy.",
                                validator_confirmed=True
                            )
                        else:
                            return VerificationResult(
                                claim_id=claim.id,
                                claim_text=claim.text,
                                claim_type=claim.claim_type,
                                start_pos=claim.start_pos,
                                end_pos=claim.end_pos,
                                status=VerificationStatus.FLAGGED,
                                confidence=0.99,
                                source_id=fact.id,
                                source_quote=fact.statement,
                                source_owner=fact.fact_owner,
                                suggested_fix=f"{approved_pct}% uptime SLA",
                                explanation=f"Unapproved SLA guarantee. Claimed {claimed_pct}%, but approved engineering SLA is {approved_pct}%.",
                                validator_confirmed=True
                            )

        # Rule Set 3: Compliance & Certification Dates (e.g., SOC 2 Type II)
        if "soc 2" in claim_lower or "soc-2" in claim_lower:
            for fact in facts:
                if "soc 2" in fact.statement.lower() or "soc-2" in fact.statement.lower():
                    # Check year
                    year_match = re.search(r'20\d{2}', context_lower)
                    fact_year_match = re.search(r'20\d{2}', fact.statement)
                    if year_match and fact_year_match:
                        claimed_year = year_match.group(0)
                        approved_year = fact_year_match.group(0)
                        if claimed_year == approved_year:
                            return VerificationResult(
                                claim_id=claim.id,
                                claim_text=claim.text,
                                claim_type=claim.claim_type,
                                start_pos=claim.start_pos,
                                end_pos=claim.end_pos,
                                status=VerificationStatus.VERIFIED,
                                confidence=1.0,
                                source_id=fact.id,
                                source_quote=fact.statement,
                                source_owner=fact.fact_owner,
                                explanation="SOC 2 certification status matches the active compliance audit record.",
                                validator_confirmed=True
                            )
                        else:
                            return VerificationResult(
                                claim_id=claim.id,
                                claim_text=claim.text,
                                claim_type=claim.claim_type,
                                start_pos=claim.start_pos,
                                end_pos=claim.end_pos,
                                status=VerificationStatus.FLAGGED,
                                confidence=0.95,
                                source_id=fact.id,
                                source_quote=fact.statement,
                                source_owner=fact.fact_owner,
                                suggested_fix=f"SOC 2 Type II certified ({approved_year})",
                                explanation=f"Outdated certification reference ({claimed_year}). Current renewal is for {approved_year}.",
                                validator_confirmed=True
                            )

        # Rule Set 4: Forbidden superlatives / unbacked claims
        forbidden_superlatives = ["best-in-class", "industry-leading", "zero-downtime", "100% money-back guarantee"]
        for forbidden in forbidden_superlatives:
            if forbidden in claim_lower:
                # Check if legal approved this in ledger
                has_approval = any(forbidden in f.statement.lower() and f.is_active for f in facts)
                if not has_approval:
                    return VerificationResult(
                        claim_id=claim.id,
                        claim_text=claim.text,
                        claim_type=claim.claim_type,
                        start_pos=claim.start_pos,
                        end_pos=claim.end_pos,
                        status=VerificationStatus.FLAGGED,
                        confidence=0.92,
                        source_id=None,
                        suggested_fix="high-performance",
                        explanation=f"Unsubstantiated superlative '{claim.text}' violates Brand Style & Legal guidelines without an approved audit claim.",
                        validator_confirmed=False
                    )

        # Rule Set 5: Brand Nomenclature & Trademark Spacing
        if claim.text in ["Brand Ledger", "Brand-Ledger", "brandledger", "brand ledger"]:
            for fact in facts:
                if fact.id == "fact_naming_brand" or "brandledger" in fact.statement.lower():
                    return VerificationResult(
                        claim_id=claim.id,
                        claim_text=claim.text,
                        claim_type=ClaimType.GLOSSARY_TERM,
                        start_pos=claim.start_pos,
                        end_pos=claim.end_pos,
                        status=VerificationStatus.FLAGGED,
                        confidence=1.0,
                        source_id=fact.id,
                        source_quote=fact.statement,
                        source_owner=fact.fact_owner,
                        suggested_fix="BrandLedger",
                        explanation="Violates Brand Style Guide: Product name must be written as single-word camel-case 'BrandLedger'.",
                        validator_confirmed=True
                    )
        elif claim.text == "BrandLedger":
            for fact in facts:
                if fact.id == "fact_naming_brand":
                    return VerificationResult(
                        claim_id=claim.id,
                        claim_text=claim.text,
                        claim_type=ClaimType.GLOSSARY_TERM,
                        start_pos=claim.start_pos,
                        end_pos=claim.end_pos,
                        status=VerificationStatus.VERIFIED,
                        confidence=1.0,
                        source_id=fact.id,
                        source_quote=fact.statement,
                        source_owner=fact.fact_owner,
                        explanation="Approved brand nomenclature verified against Style Guide.",
                        validator_confirmed=True
                    )

        # No deterministic rule matched -> return None to proceed to semantic retrieval + LLM
        return None

rules_engine = RulesEngine()
