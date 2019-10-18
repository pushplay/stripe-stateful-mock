import * as chai from "chai";
import {getLocalStripeClient} from "./stripeUtils";
import {generateId} from "../src/api/utils";

describe("accounts", () => {

    const localStripeClient = getLocalStripeClient();

    it("can create a standard account", async () => {
        const account = await localStripeClient.accounts.create({type: "standard"} as any);
        chai.assert.isString(account.id);
        chai.assert.isUndefined(account.created);
        chai.assert.equal(account.type, "standard");
    });

    it("can create a custom account", async () => {
        const account = await localStripeClient.accounts.create({
            type: "custom",
            country: "CA",
            default_currency: "cad",
            email: "example@email.com"
        });
        chai.assert.isString(account.id);
        chai.assert.isNumber(account.created);
        chai.assert.equal(account.country, "CA");
        chai.assert.equal(account.default_currency, "cad");
        chai.assert.equal(account.email, "example@email.com");
        chai.assert.equal(account.type, "custom");
    });

    it("can create an express account", async () => {
        const account = await localStripeClient.accounts.create({type: "express"} as any);
        chai.assert.isString(account.id);
        chai.assert.isNumber(account.created);
        chai.assert.equal(account.type, "express");
    });

    it("can create an account with a specific ID", async () => {
        const accountReq: any = {
            type: "standard",
            id: generateId()    // This does not work in the live server.
        };
        const account = await localStripeClient.accounts.create(accountReq);
        chai.assert.equal(account.id, accountReq.id);

        const getAccount = await localStripeClient.accounts.retrieve(account.id);
        chai.assert.deepEqual(getAccount, account);
    });

    it("cannot create an account from a connect account", async () => {
        const account = await localStripeClient.accounts.create({type: "custom"});
        chai.assert.isString(account.id);

        let createError: any;
        try {
            const account2 = await localStripeClient.accounts.create({type: "custom"}, {
                stripe_account: account.id
            });
            chai.assert.fail(account2, undefined, "should not create the account");
        } catch (err) {
            createError = err;
        }
        chai.assert.isDefined(createError);
        chai.assert.equal(createError.statusCode, 400);
    });

    it("can retrieve an account", async () => {
        const account = await localStripeClient.accounts.create({type: "standard"} as any);
        chai.assert.isString(account.id);
        chai.assert.isUndefined(account.created);
        chai.assert.equal(account.type, "standard");

        const getAccount = await localStripeClient.accounts.retrieve(account.id);
        chai.assert.deepEqual(getAccount, account);

        const getAccountWithHeader = await localStripeClient.accounts.retrieve(account.id, {stripe_account: account.id});
        chai.assert.deepEqual(getAccountWithHeader, account);
    });

    it("cannot retrieve an account that doesn't exist", async () => {
        let getError: any;
        try {
            const regetAccount = await localStripeClient.accounts.retrieve(generateId());
            chai.assert.fail(regetAccount, undefined, "should not get an account");
        } catch (err) {
            getError = err;
        }
        chai.assert.isDefined(getError);
        chai.assert.equal(getError.statusCode, 403);
        chai.assert.equal(getError.rawType, "invalid_request_error");
        chai.assert.equal(getError.type, "StripePermissionError");
    });

    it("can delete an account", async () => {
        const account = await localStripeClient.accounts.create({type: "standard"} as any);
        chai.assert.isString(account.id);
        chai.assert.isUndefined(account.created);
        chai.assert.equal(account.type, "standard");

        const delAccount = await localStripeClient.accounts.del(account.id);
        chai.assert.equal(delAccount.id, account.id);
        chai.assert.isTrue(delAccount.deleted);

        let getError: any;
        try {
            const regetAccount = await localStripeClient.accounts.retrieve(account.id);
            chai.assert.fail(regetAccount, undefined, "should not get the account");
        } catch (err) {
            getError = err;
        }
        chai.assert.isDefined(getError);
        chai.assert.equal(getError.statusCode, 403);
        chai.assert.equal(getError.rawType, "invalid_request_error");
        chai.assert.equal(getError.type, "StripePermissionError");
    });

    it("cannot delete an account that doesn't exist", async () => {
        let delError: any;
        try {
            const regetAccount = await localStripeClient.accounts.del(generateId());
            chai.assert.fail(regetAccount, undefined, "should not delete an account");
        } catch (err) {
            delError = err;
        }
        chai.assert.isDefined(delError);
        chai.assert.equal(delError.statusCode, 403);
        chai.assert.equal(delError.rawType, "invalid_request_error");
        chai.assert.equal(delError.type, "StripePermissionError");
    });

    it("can list accounts", async () => {
        const listStart = await localStripeClient.accounts.list();

        const anotherAccount = await localStripeClient.accounts.create({type: "custom"});
        const listOneMore = await localStripeClient.accounts.list();
        chai.assert.lengthOf(listOneMore.data, listStart.data.length + 1);
        chai.assert.deepInclude(listOneMore.data, anotherAccount);
    });
});
