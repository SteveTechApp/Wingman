import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// Testing Library's default async timeout is 1000ms, which is comfortable
// locally but marginal on a CI runner - especially with v8 coverage
// instrumentation adding overhead to every module.
//
// finderDiscoveryResults.test.tsx failed in CI for exactly this reason: the
// Recommendations page was still rendering its "applying compatibility gates"
// loading state when the 1s budget expired, so findAllByText gave up on a page
// that would have resolved correctly a moment later. It passed locally, with
// and without coverage, which is the signature of a timing margin rather than
// a real defect.
//
// A longer budget does not slow down passing tests - a successful find still
// returns as soon as the element appears. It only extends how long a genuine
// failure takes to report, which is a good trade for removing a class of
// CI-only flakes across every async query in the suite.
configure({ asyncUtilTimeout: 5000 });

