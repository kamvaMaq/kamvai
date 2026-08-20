export function createCodeStackInstruction(stack?: string) {
  const selectedStack = stack?.trim();
  if (!selectedStack) {
    return "Choose a sensible, current stack for the brief and briefly state the choice before the implementation.";
  }
  return `Use this requested technology stack: ${selectedStack}. Keep the implementation internally consistent with that stack, name all required dependencies, and briefly state any stack-specific setup steps.`;
}
