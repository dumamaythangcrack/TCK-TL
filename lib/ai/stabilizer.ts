export function stabilizeResponseText(text: string): string {
  if (!text) return "";

  let stabilized = text;

  // 1. Break infinite repetition loops
  // Look for sequences of 15+ characters that repeat consecutively 3+ times
  const repeatRegex = /(.{15,120}?)(\s*\1){2,}/gi;
  if (repeatRegex.test(stabilized)) {
    stabilized = stabilized.replace(repeatRegex, "$1");
  }

  // 2. Normalize LaTeX wrappers (re-format raw $ and $$ to \( and \[ \])
  // Convert display math $$...$$ to \[...\]
  stabilized = stabilized.replace(/\$\$([\s\S]+?)\$\$/g, (_, equation) => {
    return `\\[ ${equation.trim()} \\]`;
  });

  // Convert inline math $...$ to \(...\)
  // Ensure we don't accidentally match standard currency (e.g. $100 or price ranges like $10-$20)
  stabilized = stabilized.replace(/(?<![\w\\$])\$((?!\d)[^$\n]+?)(?<![\w\\$])\$/g, (_, equation) => {
    return `\\( ${equation.trim()} \\)`;
  });

  // 3. Balance code blocks
  // Count the number of ``` occurrences
  const codeBlockCount = (stabilized.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    stabilized += "\n```"; // Close the unclosed block
  }

  return stabilized;
}
