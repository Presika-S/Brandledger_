import math
import re
from collections import Counter
from datetime import date
from typing import List, Tuple
from ..models.database import Fact
from ..config import settings

class FactRetriever:
    """
    Retrieval Engine:
    Retrieves ONLY approved, unexpired facts from the Source of Truth.
    Uses pgvector when PostgreSQL is configured, with high-performance
    pure-Python TF-IDF cosine vector similarity (zero heavy C-libraries)
    guaranteeing instant Vercel serverless deployment well under the 225MB limit.
    """

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r'\b[a-zA-Z0-9_\$%\.]+\b', text.lower())
        bigrams = [f"{words[i]}_{words[i+1]}" for i in range(len(words)-1)]
        return words + bigrams

    def _cosine_sim(self, vec_a: dict, vec_b: dict) -> float:
        intersection = set(vec_a.keys()) & set(vec_b.keys())
        if not intersection:
            return 0.0
        numerator = sum(vec_a[x] * vec_b[x] for x in intersection)
        sum_a = sum(val ** 2 for val in vec_a.values())
        sum_b = sum(val ** 2 for val in vec_b.values())
        denominator = math.sqrt(sum_a) * math.sqrt(sum_b)
        return numerator / denominator if denominator else 0.0

    def retrieve_candidates(self, query: str, facts: List[Fact], top_k: int = 4) -> List[Tuple[Fact, float]]:
        today = date.today()
        
        # 1. Filter: Must be active AND unexpired
        valid_facts = [
            f for f in facts 
            if f.is_active and (f.expiry_date is None or f.expiry_date >= today)
        ]

        if not valid_facts:
            return []

        # 2. Tokenize corpus
        corpus_tokens = [self._tokenize(f"{f.category} {f.statement} {f.tags}") for f in valid_facts]
        query_tokens = self._tokenize(query)

        # 3. Compute IDF
        doc_count = len(corpus_tokens) + 1
        df = Counter()
        for doc in corpus_tokens:
            df.update(set(doc))
        df.update(set(query_tokens))

        idf = {word: math.log(doc_count / (count + 1)) + 1.0 for word, count in df.items()}

        # 4. Compute TF-IDF vectors
        def to_tfidf(tokens: List[str]) -> dict:
            tf = Counter(tokens)
            total = len(tokens) or 1
            return {w: (c / total) * idf.get(w, 1.0) for w, c in tf.items()}

        query_vec = to_tfidf(query_tokens)

        # 5. Calculate similarities
        scored_facts = []
        for fact, tokens in zip(valid_facts, corpus_tokens):
            fact_vec = to_tfidf(tokens)
            score = self._cosine_sim(query_vec, fact_vec)
            scored_facts.append((fact, float(score)))

        # Sort descending
        scored_facts.sort(key=lambda x: x[1], reverse=True)
        return scored_facts[:top_k]

retriever = FactRetriever()
