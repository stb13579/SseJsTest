import {
  simulation,
  atOnceUsers,
  constantUsersPerSec,
  getParameter,
  global,
  scenario,
  jmesPath,
  forever,
  pace
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

export default simulation((setUp) => {
  const baseUrl = getParameter("baseUrl", "http://localhost:3000");
  const users = parseInt(getParameter("vu", "10"));
  const duration = parseInt(getParameter("duration", "30")); // seconds
  const pattern = getParameter("pattern", "allAtOnce");

  const httpProtocol = http.baseUrl(baseUrl);

  // Real SSE load test - concurrent connections streaming data
  const scn = scenario("SSE Crypto Feed")
    .exec(
      sse("Connect to /prices")
        .get("/prices")
        .await(10)
        .on(sse.checkMessage("snapshot").matching(jmesPath("event").is("snapshot")))
    )
    .exec(
      // consume initial batch of price updates after the snapshot
      sse.processUnmatchedMessages((messages, session) => session)
    )
    .exec(
      forever().on(
        pace(2)
          .exec(
            sse("Await price update")
              .setCheck()
              .await(10)
              .on(sse.checkMessage("price-update").matching(jmesPath("event").is("price-update")))
          )
          .exec(
            // drain any extra price updates between checks
            sse.processUnmatchedMessages((messages, session) => session)
          )
      )
    )
    .exec(sse("Close SSE connection").close());

  let injection;
  switch (pattern) {
    case "rampUp":
      injection = scn.injectOpen(constantUsersPerSec(users / 10).during(10));
      break;
    case "mixed":
      injection = scn.injectOpen(
        atOnceUsers(Math.floor(users / 2)),
        constantUsersPerSec(Math.max(users / 20, 1)).during(Math.max(duration / 2, 1))
      );
      break;
    default:
      injection = scn.injectOpen(atOnceUsers(users));
  }

  setUp(injection)
    .protocols(httpProtocol)
    .assertions(global().failedRequests().count().lt(users), global().responseTime().max().lt(2000))
    .maxDuration(duration + 5);
});
