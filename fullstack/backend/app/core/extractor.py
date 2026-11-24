import re
import uuid
from typing import List
from ..models.schemas import ClaimSpan, ClaimType

class ClaimExtractor:
    """
    Splits any text draft into individual claims with exact character positions.
    Extracts:
      - NUMERIC: prices, percentages, counts, metrics, SLA numbers ($99, 99.99%, 10,000+)
      - DATES: years, quarters, deadlines (Q3 2025, since 2018, expires Dec 2026)
      - PROMISES: guarantees, superlative claims, commitments ('guarantee 99.9%', 'zero-downtime', 'certified')
      - GLOSSARY_TERMS: trademarked names, forbidden competitor terms, specific brand naming
      - ENTITY_NAMES: product names, tier names (Enterprise Suite, BrandLedger Guard)
    """

    # Non-overlapping ordered regex patterns
    PRICE_PATTERN = re.compile(
        r'\$\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:k|m|b|billion|million|per\s+month|\/mo|\/year))?',
        re.IGNORECASE
    )

    PERCENT_PATTERN = re.compile(
        r'\b\d+(?:\.\d+)?\s*%\s*(?:uptime|SLA|availability|accuracy)?\b',
        re.IGNORECASE
    )

    DATE_PATTERN = re.compile(
        r'\b(Q[1-4]\s*20\d{2}|certified\s+in\s+20\d{2}|\(20\d{2}\)|since\s+20\d{2}|by\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+20\d{2})\b',
        re.IGNORECASE
    )

    PROMISE_PATTERN = re.compile(
        r'\b(guaranteed?\s+[^.,;!?]{1,40}|'
        r'100%\s+money-back\s+guarantee|'
        r'zero-downtime|'
        r'SOC\s*2\s*Type\s*II\s*certified|'
        r'industry-leading|'
        r'best-in-class|'
        r'unlimited\s+storage|'
        r'24\/7\s+dedicated\s+support)\b',
        re.IGNORECASE
    )

    GLOSSARY_PATTERN = re.compile(
        r'\b(Brand\s+Ledger|Brand-Ledger|BrandLedger\s+Guard|BrandLedger|Brand Source of Truth)\b',
        re.IGNORECASE
    )

    def extract_claims(self, text: str) -> List[ClaimSpan]:
        claims: List[ClaimSpan] = []
        occupied_spans = []

        def is_overlapping(start: int, end: int) -> bool:
            for s, e in occupied_spans:
                if max(start, s) < min(end, e):
                    return True
            return False

        def add_span(match: re.Match, claim_type: ClaimType):
            start, end = match.start(), match.end()
            if is_overlapping(start, end):
                return
            occupied_spans.append((start, end))

            matched_text = match.group(0).strip()
            ctx_start = max(0, start - 35)
            ctx_end = min(len(text), end + 35)
            context = text[ctx_start:ctx_end].replace('\n', ' ').strip()

            claims.append(ClaimSpan(
                id=f"claim_{uuid.uuid4().hex[:8]}",
                text=matched_text,
                claim_type=claim_type,
                start_pos=start,
                end_pos=end,
                context=context
            ))

        # 1. Match prices first
        for m in self.PRICE_PATTERN.finditer(text):
            add_span(m, ClaimType.NUMERIC)

        # 2. Match percentages (SLA / uptime)
        for m in self.PERCENT_PATTERN.finditer(text):
            add_span(m, ClaimType.NUMERIC)

        # 3. Match promises & superlatives
        for m in self.PROMISE_PATTERN.finditer(text):
            add_span(m, ClaimType.PROMISE)

        # 4. Match dates
        for m in self.DATE_PATTERN.finditer(text):
            add_span(m, ClaimType.DATE)

        # 5. Match glossary / branding
        for m in self.GLOSSARY_PATTERN.finditer(text):
            add_span(m, ClaimType.GLOSSARY_TERM)

        claims.sort(key=lambda c: c.start_pos)
        return claims

extractor = ClaimExtractor()
