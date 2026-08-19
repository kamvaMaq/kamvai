# Kamvai provider activation guide

Kamvai’s core application, generation flows, server-side allowance enforcement, privacy preferences, draft storage, image generation, shareable draft previews, and masked-voucher audit records are implemented in the project. The following provider-dependent capabilities require the merchant’s own credentials and commercial agreements before they can be enabled in a live environment.

| Capability | Required decision or credential | Activation boundary |
|---|---|---|
| Google account sign-in | A Google OAuth client ID and client secret registered for the production domain | Add a Google identity provider to the authentication flow and register the approved redirect URI. |
| Email verification and receipts | A verified SendGrid sender domain, dynamic-template IDs, and a server-side SendGrid API key | Implement hashed, expiring OTP records; rate-limit sends; select templates by interface language; and process delivery/bounce events. |
| Voucher redemption | A signed merchant agreement and API credentials for **one** licensed South African payment provider that confirms support for the selected voucher brands | Replace the protected `payments.redeemVoucher` adapter boundary with the provider’s server-side request and authenticated callback verification. Never write the raw code to a log or database column. |
| Payment callbacks | Provider-issued webhook or notification configuration | Verify signatures, expected amount, transaction reference, and provider callback authenticity before marking an entitlement active. |
| POPIA deletion requests | An operational support or self-service deletion process | Add a verified account-closure workflow that removes or anonymises the user’s retained personal data in accordance with the published privacy policy and statutory record-keeping obligations. |

> **Security boundary.** Voucher values are deliberately masked at the first server-side boundary. The current project records only the masked reference, selected plan, voucher network, amount, attempt status, and provider reference after activation. It does not retain a full voucher code.

## Payment-provider selection

The current interface supports **Kazang**, **1ForYou**, **Blue Voucher**, and **OTT** as user-selectable voucher networks, but it does not assert that any particular provider currently supports all four. Confirm current brand support, settlement rules, callback signing requirements, and the provider’s required compliance onboarding before enabling a network in production. The payment notification design should follow the selected provider’s current official documentation; for example, PayFast’s ITN flow requires server-side verification of the notification signature, amount, sender, and a validation request before confirming a payment.[1]

## Current user identity

The template’s existing secure identity flow remains in place for the delivered application. Google and email/OTP are intentionally not represented as fake buttons or simulated credentials. They should be enabled only after the corresponding provider credentials and sender-verification details are supplied.

## Reference

[1]: https://developers.payfast.co.za/ "PayFast Developer Documentation"
