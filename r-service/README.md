# A11YSCAPE R data API

A small R/Plumber service that reads the scanner's SQLite corpus, exposes
stored scan data to the frontend, and runs PCA/K-means over eligible scans. It
never writes scan, violation or website rows, and it does not fabricate data.

## Current scope

Implemented:

- Health check with live database connectivity and scan count
- Corpus summary derived from stored rows
- Recent scan listing with limit, status and text filters
- Single scan detail with its stored axe-core violations
- PCA and K-means over completed/partial scans, with explained variance,
  loadings, scores, silhouette-based k selection, assignments and centroids
- Persisted model runs in the additive `model_runs` table

Deliberately not implemented yet:

- Statistical analysis (descriptives, correlation, WCAG aggregation)
- Recommendations
- Report generation
- Three.js features

The `/api/analysis` routes are contract placeholders that return `501`, and
`/api/analysis/latest` returns `404`. They never return invented results.

## Requirements

- R **4.2 or newer** from <https://cran.r-project.org/>
- `Rscript` available on `PATH`
- The scanner database at `database/a11yscape.sqlite` (the default), or
  `DATABASE_PATH` pointing at it
- CRAN packages: `plumber`, `DBI`, `RSQLite`, `dplyr`, `tidyr`, `readr`,
  `jsonlite`, `testthat`

On Windows the installer usually adds R to `PATH`. If `Rscript --version` is not
recognised, add the installation's `bin` directory, for example:

```text
C:\Program Files\R\R-4.5.1\bin
```

This repository does not install R automatically.

## Install packages

From the repository root:

```bash
Rscript r-service/scripts/install-packages.R
```

## Start the service

From the repository root:

```bash
Rscript r-service/scripts/run.R
```

The service listens on `http://127.0.0.1:8000` by default and serves Swagger
documentation at `/__docs__/`.

Environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `R_PORT` | `8000` | Listening port |
| `R_HOST` | `127.0.0.1` | Bind address |
| `DATABASE_PATH` | `database/a11yscape.sqlite` | SQLite database, relative to the repo root |
| `CORS_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allowed origins |

The run script sets `A11YSCAPE_ROOT` and changes into `r-service`, so
`source("R/...")` resolves consistently.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | `200` when the database is reachable, `503` otherwise |
| `GET` | `/api/summary` | Stored scan counts, severity totals, top rules, recent scans |
| `GET` | `/api/scans/recent?limit=10&status=all&query=` | Recent stored scans |
| `GET` | `/api/scans/<id>` | One scan with its stored violations |
| `GET` | `/api/ml/runs?limit=20` | Persisted model runs, newest first |
| `POST` | `/api/ml/runs` | Run PCA/K-means on eligible scans; optional `{"k": 2}` |
| `GET` | `/api/analysis/latest` | `404`; analysis is not implemented yet |
| `GET`/`POST` | `/api/analysis` | `501`; analysis is not implemented yet |

`limit` is between `1` and `100`. `status` is one of `all`, `queued`, `running`,
`completed`, `partial`, `failed`. ML `k` must be an integer from `2` to `10` and
within the dataset's evaluable range; otherwise the service returns `400` or
`422`. A run with fewer than 3 complete eligible scans, or fewer than 2
non-constant features, is rejected rather than filled with invented output.

Example:

```bash
curl http://localhost:8000/health
curl "http://localhost:8000/api/scans/recent?limit=5&status=completed"
curl http://localhost:8000/api/summary
curl http://localhost:8000/api/ml/runs
curl -X POST http://localhost:8000/api/ml/runs -H 'Content-Type: application/json' -d '{}'
```

## Tests

```bash
Rscript r-service/scripts/test.R
```

The tests build a temporary in-memory SQLite database, insert known rows, and
verify that summaries, filters, scan detail, PCA/K-means output and validation
reflect exactly those rows. They never touch `database/a11yscape.sqlite`.

## Data safety

- Scanner-owned tables are read-only. The service only creates and appends to
  `model_runs` when a model run is requested.
- Only `completed` and `partial` scans contribute violations and model rows.
- Failed scans remain visible in scan listings and health counts, but their
  violations are excluded.
- If the database or required tables are missing, endpoints return `503` with
  a message instead of empty or invented data.

## Troubleshooting

- **`Rscript` not found**: install R and add its `bin` directory to `PATH`.
- **`Database file not found`**: run
  `npm run db:init --workspace scanner-service`, or set `DATABASE_PATH`.
- **`Missing tables`**: run the scanner database migrations.
- **Port already in use**: set `R_PORT` to another port.
- **CORS error in the browser**: add the frontend origin to `CORS_ORIGIN`.
