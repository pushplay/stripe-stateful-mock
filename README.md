# stripe-stateful-mock

Simulates a stateful Stripe server for local unit testing.  Makes Stripe calls 50-100x faster.  Supports charge, capture and refund with the most common [test tokens](https://stripe.com/docs/testing).  Also supports idempotency.

Correctness of this test server is not guaranteed!  Set up unit testing to work against either the Stripe server with a test account or this unit test server with a flag to switch between them.  Test against the official Stripe server occasionally to ensure correctness on the fine details.

## Usage

`node stripe-stateful-mock`

Starts an HTTP server (default port is 8000).  This can be connected to with any Stripe client.  For example in JavaScript...

```javascript
const Stripe = require("stripe");
let client = new Stripe("sk_test_foobar");
client.setHost("localhost", 8000, "http");
```

The server supports the following settings through environment variables:

- `LOG_LEVEL` sets the log output verbosity.  Values are: `silent`, `error`, `warn`, `info`, `debug`.
- `PORT` the port to start the server on.  Defaults to 8000.

## Bonus features

This server supports a few bonus test tokens to test scenarios not testable against the real server.

### Source token tok_500

Use the charge source token `tok_500` to get a 500 response from the server.

### Source token chains

Send a source token composed of multiple test tokens separated by pipes (`|`) to get the response for each call in the order the tokens are composed.

#### Example 1

`tok_chargeDeclinedInsufficientFunds|tok_visa`

The first time this charge source token is used an insufficient funds response will be sent.  The second time it's used the charge will succeed with a visa transaction.

#### Example 2

`tok_500|tok_500|tok_visa|asdfasdf`

The first and second time this charge source token is used a 500 response is returned.  The third time the charge will succeed with a visa transaction.

A random string is appended to the end to guarantee this sequence won't be confused for a similar test (eg `tok_500|tok_500|tok_visa|hjklhjkl`) that may be running simultaneously.  It's a lazy hack that accomplishes namespacing.

## Existing work

[stripe-mock](https://github.com/stripe/stripe-mock) - Stripe's official mock server has better POST body checking but is stateless.

[stripe-ruby-mock](https://github.com/rebelidealist/stripe-ruby-mock) - Patches the Stripe Ruby client so it only works with Ruby.

[mock-stripe](https://github.com/prasanthkv/mock-stripe) - Written in Go and I can't be bothered.
