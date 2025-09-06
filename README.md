# next-otel 

This repository is a repository that focusses on applying [OpenTelemetry](https://opentelemetry.io/)(OTEL) in a NextJS application. Because of the experimental state of OTEL web and it's plugins almost with every new version something needs to be adjusted like different named imports and exports. I try to keep this repository aligned with the latest versions of the OTEL packages but I don't always have time to do so.

## Installation

1. run `docker compose up`. This will create an otel collector, tempo and grafana. 
1. run `pnpm install` (or your preffered package manager)

## Running

**Frontend**
1. run `pnpm run dev`
1. open [http://localhost:3000](http://localhost:3000) to see the app

**Grafana**
1. open [http://localhost:3001](http://localhost:3001) to see the grafana dashboard
1. click `Explore`
1. set `Query type` to `Search`

If you have opened the frontend and/or clicked some buttons you could see some traces by running search.

1. click `Run query` (top right)

## Known issues

Propagating traces from a frontend request to the backend is not stable. This means if you have a server action that it will appear as different traces instead of a single trace that shows, for example: Page → Client Component → Server Action → fetch.

As a work-around you can make a `fetch` request directly from the client component which will be linked to the parent trace. But if you call a function in a file that is marked with 'use server' it will be a separate RSC trace.

This should be solved in the official OTEL packages but is also an issue that is not supported/solved by [Vercel](https://x.com/timneutkens/status/1961148614207520987) yet.

