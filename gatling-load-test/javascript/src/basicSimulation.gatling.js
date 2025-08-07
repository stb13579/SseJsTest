import {
  simulation,
  atOnceUsers,
  constantUsersPerSec,
  getParameter,
  global,
  scenario,
  forever,
  pace,
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

export default simulation((setUp) => {
  const baseUrl = getParameter("baseUrl", "http://localhost:3000");
  const users = parseInt(getParameter("vu", "10"));
  const duration = parseInt(getParameter("duration", "30")); // seconds

  const httpProtocol = http.baseUrl(baseUrl);

  const sseProtocol = sse().baseUrl(baseUrl);

  const scn = scenario("SSE Crypto Feed")
    .exec(
      sse("Connect to /prices")
        .connect("/prices")
        .awaitMessage("first-price")
        .check()
    )
    .pause(1)
    .exec(
      forever()
        .on(
          pace(2) // Wait 2s between each message check
            .exec(
              sse("Await next message")
                .awaitMessage("price-update")
                .check()
            )
        )
    );

  setUp(scn.injectOpen(atOnceUsers(users)))
    .protocols(httpProtocol, sseProtocol)
    .assertions(
      global().failedRequests().count().lt(1)
    )
    .maxDuration(duration);
});