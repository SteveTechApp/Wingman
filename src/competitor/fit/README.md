Structured competitor fit has been added.

Pipeline:
1. Transport technology
2. Device class
3. I/O topology
4. Control / features
5. Generation preference

New files:
- src/competitor/fit/types.ts
- src/competitor/fit/classifier.ts
- src/competitor/fit/score.ts
- src/competitor/fit/index.ts

Important:
Existing UI/service code still needs to call structuredFitRank() or compareStructuredCompetitor()
at the point where candidate WyreStorm SKUs are ranked.