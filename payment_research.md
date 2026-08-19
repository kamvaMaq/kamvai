# Payment-option research notes

## Verified findings

PayShap describes itself as an interbank digital payment service available through participating banks. The official PayShap site states that availability depends on participating banks.[1]

Standard Bank’s PayShap for Business page states that a business can make and receive immediate payments using a cellphone number or account number linked to a registered ShapID, including with parties at other banks. It can receive money directly into a bank account by sharing its ShapID or cellphone number.[2]

## Design implication

For an interim Kamvai launch with no payment-gateway account, the safest low-friction approach is a **manual PayShap/EFT request**. The app displays a unique payment reference and the merchant’s registered ShapID or bank-transfer instructions. It records the customer’s claimed payment reference as *pending* and only grants the paid entitlement after an authorised operator reconciles the actual bank credit. The app must not claim automatic confirmation or unlock access based solely on an uploaded proof of payment.

Payment links can be a later operational shortcut, but still require onboarding with a payment service. Cash or voucher-redemption operations also require a merchant process and should not be represented as automatically settled without a configured partner.

## References

[1]: https://www.payshap.co.za/ "PayShap"
[2]: https://www.standardbank.co.za/southafrica/business/products-and-services/ways-to-bank/innovative-payment-solution/payshap-for-business "PayShap for business"
