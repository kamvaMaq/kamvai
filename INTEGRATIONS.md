# Kamvai provider activation guide

Kamvai’s core application, generation flows, server-side allowance enforcement, privacy preferences, draft storage, image generation, shareable draft previews, and masked-voucher audit records are implemented in the project. The following provider-dependent capabilities require the merchant’s own credentials and commercial agreements before they can be enabled in a live environment.

| Capability | Required decision or credential | Activation boundary |
|---|---|---|
| Google account sign-in | A Google OAuth client ID and client secret registered for the production domain | Add a Google identity provider to the authentication flow and register the approved redirect URI. |
| Email verification and receipts | A verified SendGrid sender domain, dynamic-template IDs, and a server-side SendGrid API key | Implement hashed, expiring OTP records; rate-limit sends; select templates by interface language; and process delivery/bounce events. |
| Voucher redemption | A signed merchant agreement and API credentials for **one** licensed South African payment provider that confirms support for the selected voucher brands | Replace the protected `payments.redeemVoucher` adapter boundary with the provider’s server-side request and authenticated callback verification. Never write the raw code to a log or database column. |
| Manual PayShap requests | A business bank account with a registered ShapID or recipient identifier, supplied as `PAYSHAP_SHAP_ID`, plus the recipient name in `PAYSHAP_RECIPIENT_NAME` | Kamvai creates a unique reference and keeps the request pending. An administrator must match the real bank credit and reference before confirming the request and creating an entitlement. |
| Payment callbacks | Provider-issued webhook or notification configuration | Verify signatures, expected amount, transaction reference, and provider callback authenticity before marking an entitlement active. |
| POPIA deletion requests | An operational support or self-service deletion process | Add a verified account-closure workflow that removes or anonymises the user’s retained personal data in accordance with the published privacy policy and statutory record-keeping obligations. |

> **Security boundary.** Voucher values are deliberately masked at the first server-side boundary. The current project records only the masked reference, selected plan, voucher network, amount, attempt status, and provider reference after activation. It does not retain a full voucher code.

## Payment-provider selection

The current interface supports **Kazang**, **1ForYou**, **Blue Voucher**, and **OTT** as user-selectable voucher networks, but it does not assert that any particular provider currently supports all four. Confirm current brand support, settlement rules, callback signing requirements, and the provider’s required compliance onboarding before enabling a network in production. The payment notification design should follow the selected provider’s current official documentation; for example, PayFast’s ITN flow requires server-side verification of the notification signature, amount, sender, and a validation request before confirming a payment.[1]

## Manual PayShap payment flow

Kamvai now uses **manual PayShap requests** as its selected interim payment route. A customer selects a pass and receives a non-sequential, expiring Kamvai payment reference. Once the merchant configures a registered ShapID and recipient name, the customer is shown only the recipient details, exact amount, reference, and expiry. The request remains **pending** after payment; an administrator must reconcile the actual credit in the merchant bank account before confirming it. Confirmation creates the weekly or monthly entitlement. A proof of payment, screenshot, or the possession of a reference never grants access by itself.

PayShap is available through participating banks, and Standard Bank describes its business implementation as receiving payment through a registered ShapID, cellphone number, or account number.[2] [3]

## Current user identity

Kamvai now includes an email/password sign-up, hashed expiring OTP, verified-email confirmation, and password sign-in flow. The SendGrid sender, API credential, and Dynamic Template are configured server-side. Google sign-in remains a future activation item because no Google OAuth client has been supplied.

The configured SendGrid sender is also used for a **payment-confirmation email** after an authorised PayShap reconciliation activates a pass and for an **account-deletion request acknowledgement**. These deliveries are deliberately non-blocking: a confirmed entitlement or recorded privacy request is never rolled back simply because an email provider is temporarily unavailable.

## Final launch boundaries

The manual PayShap route is now configured with the supplied recipient identifier and recipient name. The customer interface creates an expiring reference and shows the configured PayShap instructions. Paid access remains pending until an administrator reconciles the actual bank credit; this is deliberate and must not be relaxed without a bank-connected verification method.

The application includes an account-deletion **request and review** workflow. Before a public launch, a qualified privacy and legal reviewer should finalise the published privacy notice, data-retention schedule, response timelines, and the operational procedure used when an administrator marks a request completed. The application does not make a legal-compliance determination.

The interface has language selection and baseline resources for all 11 official South African languages. A native-speaker review of every production string, including emails and legal content, remains necessary before claiming full localisation coverage.

> **Merchant-managed prerequisites.** Google OAuth cannot be activated without an OAuth client ID and secret created in the merchant’s Google Cloud project. Full-language publication requires a native-speaker or professional localisation review. These are governed external approvals rather than application-code defects.

## Reference

[1]: https://developers.payfast.co.za/ "PayFast Developer Documentation"
[2]: https://www.payshap.co.za/ "PayShap"
[3]: https://www.standardbank.co.za/southafrica/business/products-and-services/ways-to-bank/innovative-payment-solution/payshap-for-business "PayShap for business"
