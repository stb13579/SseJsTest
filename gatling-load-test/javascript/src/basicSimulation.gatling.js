import {
  simulation,
  atOnceUsers,
  constantUsersPerSec,
  getParameter,
  global,
  scenario,
  forever,
  pace
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

export default simulation((setUp) => {
  const baseUrl = getParameter("baseUrl", "http://localhost:3000");
  const users = parseInt(getParameter("vu", "10"));
  const duration = parseInt(getParameter("duration", "30")); // seconds

  const httpProtocol = http.baseUrl(baseUrl);

  const sseProtocol = sse().baseUrl(baseUrl);

  const scn = scenario("SSE Crypto Feed")
    .exec(sse("Connect to /prices").connect("/prices").awaitMessage("snapshot").check())
    .exec(
      // consume any updates that might arrive while establishing the connection
      sse.processUnmatchedMessages((messages, session) => session)
    )
    .pause(1)
    .exec(
      forever().on(
        pace(2) // Wait 2s between each message check
          .exec(sse("Await next message").awaitMessage("price-update").check())
          .exec(
            // handle additional price updates pushed within the same interval
            sse.processUnmatchedMessages((messages, session) => session)
          )
      )
    );

  setUp(scn.injectOpen(atOnceUsers(users)))
    .protocols(httpProtocol, sseProtocol)
    .assertions(global().failedRequests().count().lt(1))
    .maxDuration(duration);
});
