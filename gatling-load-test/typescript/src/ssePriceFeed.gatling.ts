import {
  simulation,
  scenario,
  constantUsersPerSec,
  atOnceUsers,
  rampUsers,
  pause,
  jmesPath,
} from "@gatling.io/core";
import { http, sse } from "@gatling.io/http";

// Gatling's JavaScript engine exposes the Java interop API
declare const Java: any;

// Define the simulation
export default simulation((setUp) => {
  const System = Java.type("java.lang.System"); // Access Java System class for environment variables
  const baseUrl = System.getenv("BASE_URL") || "http://localhost:3000"; // Default to localhost if BASE_URL is not set

  const httpProtocol = http.baseUrl(baseUrl);

  // Quick price checker - connects briefly
  const quickChecker = scenario("QuickPriceChecker")
  .exec(
    sse("Prices").get("/prices")  // You need .get() to establish the connection
      .await(10).on(
        sse.checkMessage("price-update")
  .matching(jmesPath("event").is("price-update"))
  .check(
    jmesPath("data").exists(),
    // Check that prices are reasonable (not corrupted/null)
    jmesPath("data")
    .transform(raw => {
      const price = JSON.parse(raw).price;
      return price > 0 && price < 1_000_000; // check price is > 0 and < 1,000,000
    }),
  )),
    pause(2, 8),
    sse("Prices").close()
  );
  
  // Active trader - stays connected longer
  const activeTrader = scenario("ActiveTrader")
  .exec(
    sse("Prices").get("/prices")
      .await(30).on(
          sse.checkMessage("price-update")
  .matching(jmesPath("event").is("price-update"))
  .check(
    jmesPath("data").exists(),
    // Check that prices are reasonable (not corrupted/null)
    jmesPath("data")
    .transform(raw => {
      const price = JSON.parse(raw).price;
      return price > 0 && price < 1_000_000; // check price is > 0 and < 1,000,000
    }),
  )),
    pause(25, 35),
    sse("Prices").close()
  );

  // Long-term monitor - keeps connection open
  const longTermMonitor = scenario("LongTermMonitor")
    .exec(
    sse("Prices").get("/prices")
      .await(300).on(
          sse.checkMessage("price-update")
  .matching(jmesPath("event").is("price-update"))
  .check(
  jmesPath("data").exists(),
  jmesPath("data")
    .transform(raw => {
      const price = JSON.parse(raw).price;
      return price > 0 && price < 1_000_000; // check price is > 0 and < 1,000,000
    }) 
  )),

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
