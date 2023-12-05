import report from "../../mochawesome-report/mergedReport.json" assert { type: "json" };

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

report.results.forEach((suite) => {
  suite.suites.forEach((testSuite) => {
    testSuite.tests.forEach((test) => {
      totalTests++;
      if (test.state === "passed") {
        passedTests++;
      } else if (test.state === "failed") {
        failedTests++;
      }
    });
  });
});

console.log("Test Summary:");
console.log("Total Tests:", totalTests);
console.log("Passed:", passedTests);
console.log("Failed:", failedTests);

// Exit with error code if there are any failed tests
process.exit(failedTests > 0 ? 1 : 0);
