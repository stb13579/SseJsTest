import {
  simulation,
  atOnceUsers,
  constantUsersPerSec,
  getParameter,
  global,
  scenario,
  forever,
  pace,
  pause,
  asLongAs,
  repeat,
  regex,
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

export default simulation((setUp) => {
  const baseUrl = getParameter("baseUrl", "http://localhost:3000");
  const users = parseInt(getParameter("vu", "10"));
  const duration = parseInt(getParameter("duration", "30")); // seconds

  const httpProtocol = http
    .baseUrl(baseUrl);

  // Real SSE load test - concurrent connections streaming data
  const scn = scenario("SSE Crypto Feed")
    .exec(
      sse("Connect to /prices")
        .get("/prices")
        .await(10)
        .on(
          sse.checkMessage("first-message")
            .check(regex("event: snapshot(.*)"))
        ),
      // Keep the connection open for the duration of the test
      // This simulates real users keeping SSE connections alive
      pause(duration - 5), // Keep connection open for most of test duration
      sse("Close SSE connection").close()
    );

  // Alternative simpler approach - just keep connection open without checks
  const simpleScn = scenario("Simple SSE Feed")
    .exec(
      sse("Connect to /prices")
        .get("/prices")
    )
    .pause(20) // Just wait 20 seconds for messages to flow
    .exec(
      sse("Close SSE connection")
        .close()
    );

  // You might also want to test different connection patterns:
  
  // Pattern 1: All users connect at once and hold connections
  const allAtOnce = scn.injectOpen(atOnceUsers(users));
  
  // Pattern 2: Gradual ramp-up to simulate realistic user growth
  const rampUp = scn.injectOpen(constantUsersPerSec(users / 10).during(10));
  
  // Pattern 3: Mixed - some connect early, others join later
  const mixed = scn.injectOpen(
    atOnceUsers(users / 2),
    constantUsersPerSec(users / 20).during(duration / 2)
  );

  setUp(allAtOnce) // Change this to test different patterns
    .protocols(httpProtocol)
    .assertions(
      global().failedRequests().count().lt(users) // Allow some failures
    )
    .maxDuration(duration);
});