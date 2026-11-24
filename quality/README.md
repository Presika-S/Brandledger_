# Quality and impact reporting (Round 3, Improvement 2)

- `dataset.json`: 66 synthetic drafts, 82 labelled sentences, six classes
  (clean, wrong number, outdated value, expired fact, unsupported promo claim, terminology).
  Labels were written by hand. Hard cases (spelled-out numbers, "10k", keyword look-alikes) are kept in on purpose.
  The same data and thresholds are embedded in `index.html` (`QA_DATA`).
- Scoring runs against a frozen copy of the starting ledger, so live ledger edits never change the numbers.
- `test_quality.js`: runs the real engine code from `index.html` and exits 1 if any precision, recall,
  accuracy, macro F1 or fix-accuracy threshold in `dataset.json` is missed, or if the embedded dataset drifts.

```
node quality/test_quality.js
```

In the app: Brand Manager, Fact Owner and Admin see **Quality** in the menu; the Review queue links to it.
Reverse-check timing uses a seeded 400-item synthetic registry. The "manual search" time per item is an
editable assumption, not a measurement; machine times are measured in your browser.

Current results: accuracy 87.8%, macro F1 0.90, fix accuracy 29/31.
Known weak spots: spelled-out numbers, abbreviations like "10k", and keyword look-alikes ("users meetup")
are mis-handled. They are listed on the Quality page rather than hidden.
