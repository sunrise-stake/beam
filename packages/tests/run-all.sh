#!/bin/bash
set -e             # Exit on error

rm -r ../../mochawesome-report || true

# Run tests
find src/functional -name "*.test.ts" | while read test_file; do
  echo "Running test: $test_file"

  yarn anchor test --skip-build packages/tests/$test_file || true
done

yarn -s mochawesome-merge ../../mochawesome-report/mocha-reports/*.json > ../../mochawesome-report/mergedReport.json
#yarn marge ../../mochawesome-report/mergedReport.json -o ../../mochawesome-report
#yarn tsx src/analyseReport.ts