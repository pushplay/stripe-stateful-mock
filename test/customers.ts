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
        only?: boolean;
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
        (test.only ? it.only : it)(`supports ${test.name}`, async () => {
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

    it("supports Stripe-Account header (Connect account)", async () => {
        const params: stripe.customers.ICustomerCreationOptions =  {
            source: "tok_visa"
        };

        chai.assert.isString(process.env["STRIPE_CONNECTED_ACCOUNT_ID"], "connected account ID is set");

        const localCustomer = await getLocalStripeClient().customers.create(params, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});

        let localRetrieveError: any;
        try {
            await getLocalStripeClient().customers.retrieve(localCustomer.id);
        } catch (err) {
            localRetrieveError = err;
        }
        chai.assert.isDefined(localRetrieveError, "customer should not be in the account, but should be in the connected account");

        const localConnectRetrieveCustomer = await getLocalStripeClient().customers.retrieve(localCustomer.id, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
        chai.assert.deepEqual(localConnectRetrieveCustomer, localCustomer);

        const localConnectRetrieveCard = await getLocalStripeClient().customers.retrieveSource(localCustomer.id, localCustomer.default_source as string, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
        chai.assert.equal(localConnectRetrieveCard.id, localCustomer.default_source as string);

        const liveCustomer = await getLiveStripeClient().customers.create(params, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});

        let liveRetrieveError: any;
        try {
            await getLiveStripeClient().customers.retrieve(liveCustomer.id);
        } catch (err) {
            liveRetrieveError = err;
        }
        chai.assert.isDefined(liveRetrieveError, "customer should not be in the account, but should be in the connected account");

        const liveConnectRetrieveCustomer = await getLiveStripeClient().customers.retrieve(liveCustomer.id, {stripe_account: process.env["STRIPE_CONNECTED_ACCOUNT_ID"]});
        chai.assert.deepEqual(liveConnectRetrieveCustomer, liveCustomer);

        assertCustomersAreBasicallyEqual(localCustomer, liveCustomer);
    });
});
