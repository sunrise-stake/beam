#!/bin/bash
echo "test file" $1

report_name="mocha-reports/mocha-report-$(basename "$1" .test.ts).json"

echo "Executing: "
echo "mocha --config packages/tests/.mocharc.json --reporter mochawesome --reporter-options reportFilename=$report_name,quiet=true $1"

mocha --config packages/tests/.mocharc.json --reporter mochawesome --reporter-options reportFilename=$report_name,quiet=true $1
