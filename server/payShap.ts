export type PayShapInstructionConfig = { recipientName?: string; shapId?: string };

export function getPayShapInstructions(config: PayShapInstructionConfig) {
  const recipientName = config.recipientName?.trim();
  const shapId = config.shapId?.trim();
  if (!recipientName || !shapId) {
    return {
      paymentInstructionsConfigured: false,
      recipientName: null,
      shapId: null,
      message: "Your request is pending until Kamvai confirms the matching PayShap payment. Do not make a payment until recipient details are configured.",
    } as const;
  }
  return {
    paymentInstructionsConfigured: true,
    recipientName,
    shapId,
    message: "Your request is pending until Kamvai confirms the matching PayShap payment. A payment reference never unlocks access by itself.",
  } as const;
}
