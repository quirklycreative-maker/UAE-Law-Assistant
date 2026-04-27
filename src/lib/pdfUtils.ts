export async function extractTextFromPdf(file: File): Promise<string> {
  console.log("Mock PDF extraction for file:", file.name);
  return `Content of ${file.name} (Mocked analysis for stability).`;
}
