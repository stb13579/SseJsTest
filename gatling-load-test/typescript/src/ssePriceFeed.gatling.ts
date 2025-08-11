import {
  simulation,
  scenario,
  constantUsersPerSec,
  atOnceUsers,
  rampUsers,
  pause,
  jmesPath,
  substring,
  regex
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

// Gatling's JavaScript engine exposes the Java interop API
declare const Java: any;

// Define the simulation
export default simulation((setUp) => {
  const System = Java.type("java.lang.System");
  const baseUrl = System.getenv("BASE_URL") || "http://localhost:3000";

  const httpProtocol = http.baseUrl(baseUrl);

  // Quick price checker - connects briefly
  const quickChecker = scenario("QuickPriceChecker")
  .exec(
    sse("Prices").get("/prices")
      .await(5).on(
         sse.checkMessage("price-update").check(regex("data: price(.*)"))
      ),
  
    pause(2, 8),
    sse("Prices").close()
  );

  // Active trader - stays connected longer
  const activeTrader = scenario("ActiveTrader")
  .exec(
    sse("Prices").get("/prices")
      .await(30).on(
          sse.checkMessage("price-update").check(regex("data: price(.*)"))
      ),
  
    pause(25, 35),
    sse("Prices").close()
  );

  // Long-term monitor - keeps connection open
  const longTermMonitor = scenario("LongTermMonitor")
    .exec(
    sse("Prices").get("/prices")
      .await(300).on(
          sse.checkMessage("price-update").check(regex("data: price(.*)"))
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
