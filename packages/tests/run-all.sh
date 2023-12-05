#!/bin/bash
set -e             # Exit on error

rm -r ../../mochawesome-report

# Run tests
find src/functional -name "*.test.ts" | while read test_file; do
  echo "Running test: $test_file"

  # Unique report filename
  report_name="mocha-reports/mocha-report-$(basename "$test_file" .test.ts).json"

  R=t.json yarn anchor test --skip-build packages/tests/$test_file $report_name || true
done

yarn -s mochawesome-merge ../../mochawesome-report/mocha-reports/*.json > ../../mochawesome-report/mergedReport.json
yarn marge ../../mochawesome-report/mergedReport.json -o ../../mochawesome-report
yarn ts-node-esm analyseReport.ts