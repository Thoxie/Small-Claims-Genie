---
name: Heavy CI validations OOM when run all at once
description: The mark-complete step runs every registered validation workflow in parallel; too many resource-heavy ones exhaust the dev container.
---

# Heavy CI validations OOM when run all at once

The mark-task-complete flow triggers **all** registered validation workflows in
parallel. When many of them are resource-heavy (PDF rendering via
pdftoppm/pdftk/ImageMagick/Chromium, plus typecheck/lint/build), the dev
container runs out of threads/memory and jobs die with **SIGABRT** (exit 134 /
pthread "thread creation" assertion) or the shared API server returns **HTTP
500** under the request storm. Crucially, the failures are indiscriminate — they
also knock over pre-existing tests and the root `typecheck` that pass fine alone.

**Why:** It's aggregate resource exhaustion from concurrency, not a per-test
defect. A test that passes individually and in small batches but fails only in
the full parallel run is almost certainly hitting this, not a real regression.

**How to apply:** Verify heavy tests individually or in small batches (that is
the trustworthy per-test signal). Treat a mass mark-complete validation failure
made of SIGABRT/exit-134 + API 500s as environmental. Before adding a large batch
of new heavy validation workflows, weigh that each one adds to the parallel load
of every future mark-complete run.
