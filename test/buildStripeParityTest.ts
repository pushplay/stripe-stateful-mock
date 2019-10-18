import * as chai from "chai";
import Stripe = require("stripe");
import log = require("loglevel");
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {assertObjectsAreBasicallyEqual, ComparableStripeObject} from "./stripeAssert";

/**
 * Build a test that runs the same script twice: once with the local mock
 * and once with the live server and then compares the two returned sets
 * of Stripe objects for equality.
 */
export function buildStripeParityTest<T extends (Error | ComparableStripeObject)[]>(script: (stripeClient: Stripe, mode: "local" | "live") => Promise<T>): () => Promise<void> {
    return async () => {
        log.debug("running local test");
        const localResults = await script(getLocalStripeClient(), "local");

        log.debug("running live test");
        const liveResults = await script(getLiveStripeClient(), "live");

        for (let i = 0; i < localResults.length && i < liveResults.length; i++) {
            assertObjectsAreBasicallyEqual(localResults[i], liveResults[i], `objects are basically equal result[${i}]`);
        }

        chai.assert.lengthOf(localResults, liveResults.length, "local results and live results agree to this point they should have the same length");
    }
}
