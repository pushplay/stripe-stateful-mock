import * as chai from "chai";
import * as stripe from "stripe";
import {getLiveStripeClient, getLocalStripeClient} from "./stripeUtils";
import {generateId} from "../src/api/utils";
import {
    assertChargesAreBasicallyEqual,
    assertCustomersAreBasicallyEqual,
    assertErrorThunksAreEqual
} from "./stripeAssert";

describe("customers", () => {

    const customerTests: {
        name: string;
        success: boolean;
        params: stripe.customers.ICustomerCreationOptions;
        charge?: {
            success: boolean;
            params: stripe.charges.IChargeCreationOptions;
        };
    }[] = [
        {
            name: "basic creation with no params",
            success: true,
            params: {}
        },
        {
            name: "creating with a specific ID",    // undocumented feature
            success: true,
            params: {
                id: `cus_${generateId()}`
            } as any
        },
        {
            name: "creating and charging a source",
            success: true,
            params: {
                source: "tok_visa"
            },
            charge: {
                success: true,
                params: {
                    currency: "usd",
                    amount: 8675309
                }
            }
        },
        {
            name: "tok_chargeDeclined",
            success: false,
            params: {
                source: "tok_chargeDeclined"
            }
        },
        {
            name: "tok_chargeDeclinedInsufficientFunds",
            success: false,
            params: {
                source: "tok_chargeDeclinedInsufficientFunds"
            }
        },
        {
            name: "tok_chargeDeclinedIncorrectCvc",
            success: false,
            params: {
                source: "tok_chargeDeclinedIncorrectCvc"
            }
        },
        {
            name: "tok_chargeDeclinedExpiredCard",
            success: false,
            params: {
                source: "tok_chargeDeclinedExpiredCard"
            }
        },
        {
            name: "tok_chargeCustomerFail",
            success: true,
            params: {
                source: "tok_chargeCustomerFail"
            },
            charge: {
                success: false,
                params: {
                    currency: "usd",
                    amount: 8675309
                }
            }
        }
    ];

    customerTests.forEach(test => {
        it(`supports ${test.name}`, async () => {
            if (test.success) {
                const localCustomer = await getLocalStripeClient().customers.create(test.params);
                const liveCustomer = await getLiveStripeClient().customers.create(test.params);
                assertCustomersAreBasicallyEqual(localCustomer, liveCustomer);

                const getLocalCustomer = await getLocalStripeClient().customers.retrieve(localCustomer.id);
                chai.assert.deepEqual(getLocalCustomer, localCustomer);

                if (test.charge) {
                    if (test.charge.success) {
                        const localCharge = await getLocalStripeClient().charges.create({
                            ...test.charge.params,
                            customer: localCustomer.id
                        });
                        const liveCharge = await getLiveStripeClient().charges.create({
                            ...test.charge.params,
                            customer: liveCustomer.id
                        });
                        assertChargesAreBasicallyEqual(localCharge, liveCharge);
                    } else {
                        await assertErrorThunksAreEqual(
                            () => getLocalStripeClient().charges.create(test.charge.params),
                            () => getLiveStripeClient().charges.create(test.charge.params)
                        );
                    }
                }
            } else {
                await assertErrorThunksAreEqual(
                    () => getLocalStripeClient().customers.create(test.params),
                    () => getLiveStripeClient().customers.create(test.params)
                );
            }
        });
    });
});
