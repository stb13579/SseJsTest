import {
  simulation,
  scenario,
  constantUsersPerSec,
  atOnceUsers,
  rampUsers,
  pause,
  jsonPath
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

// Define the simulation
export default simulation((setUp) => {
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  const httpProtocol = http.baseUrl(baseUrl);

  // Quick price checker - connects briefly
  const quickChecker = scenario("QuickPriceChecker")
    .exec(
      sse("Prices").get("/prices")
        .await(5).on(
          sse.checkMessage("checkPrices").check(
          jsonPath("$.data").exists(),
          jsonPath("$.data").transform(data => data.includes("symbol")),
          jsonPath("$.data").transform(data => data.includes("price"))
          )
        ),
      pause(2, 8), // Wait 2-8 seconds to "read" prices
      sse("Prices").close()
    );

  // Active trader - stays connected longer
  const activeTrader = scenario("ActiveTrader")
    .exec(
      sse("Prices").get("/prices")
        .await(30).on(
          sse.checkMessage("checkPrices").check(
          jsonPath("$.data").exists(),
          jsonPath("$.data").transform(data => data.includes("symbol")),
          jsonPath("$.data").transform(data => data.includes("price"))
          )
        ),
      pause(25, 35), // Stay connected 25-35 seconds
      sse("Prices").close()
    );

  // Long-term monitor - keeps connection open
  const longTermMonitor = scenario("LongTermMonitor")
    .exec(
      sse("Prices").get("/prices")
        .await(300).on( // 5 minutes
          sse.checkMessage("checkPrices").check(
          jsonPath("$.data").exists(),
          jsonPath("$.data").transform(data => data.includes("symbol")),
          jsonPath("$.data").transform(data => data.includes("price"))
          )
        ),
      pause(280, 320), // Stay connected ~5 minutes with some variation
      sse("Prices").close()
    );

  setUp(
    // 70% are quick checkers
    quickChecker.injectOpen(
      atOnceUsers(10),
      rampUsers(50).during(60), // Ramp up over 1 minute
      constantUsersPerSec(2).during(300) // Steady stream for 5 minutes
    ),
    
    // 25% are active traders
    activeTrader.injectOpen(
      rampUsers(20).during(120), // Slower ramp up
      constantUsersPerSec(0.5).during(300)
    ),
    
    // 5% are long-term monitors
    longTermMonitor.injectOpen(
      atOnceUsers(5),
      rampUsers(5).during(300) // Very gradual increase
    )
  ).protocols(httpProtocol);
});
