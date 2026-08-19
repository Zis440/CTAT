export function parseTransactionDescription(description: string): { purpose: string; candidate: string; performedBy: string; testName?: string } {
  if (!description) return { purpose: "-", candidate: "-", performedBy: "-" };

  if (description === "Razorpay recharge" || description.includes("Razorpay recharge")) {
    return { purpose: "Recharge", candidate: "-", performedBy: "-" };
  }

  const separator = description.includes(" — ") ? " — " : (description.includes(" - ") ? " - " : null);

  if (separator) {
    const parts = description.split(separator);
    let purpose = parts[0].replace(" Session", "").replace(" Fee", "").trim();
    let candidate = "";
    let performedBy = "-";

    if (parts.length >= 3) {
      performedBy = parts[parts.length - 1].trim();
      candidate = parts.slice(1, parts.length - 1).join(separator).trim();
    } else {
      candidate = parts.slice(1).join(separator).trim();
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

    if (uuidRegex.test(purpose) || (purpose.length > 20 && !purpose.includes(" "))) {

      const temp = purpose;
      purpose = candidate.replace(" Session", "").trim();
      candidate = temp;
    }

    if (candidate.startsWith("Patient ")) candidate = candidate.substring(8);

    if (!purpose) purpose = "-";
    if (!candidate) candidate = "-";

    let testName: string | undefined = undefined;

    if (purpose === "Screening Assessment" || purpose === "Screening Assessment (Anonymous)" || purpose === "screening_level1" || purpose === "Employee Mental Health & Wellbeing") {
      purpose = "Employee Mental Health & Wellbeing";
    } else if (purpose === "Narrative Intelligence" || purpose === "TAT" || purpose === "Narrative Assessment") {
      purpose = "Narrative Assessment";
    } else if (purpose === "Psychologist Verification Request" || purpose === "Report Validation Request") {
      purpose = "Report Validation Request";
      if (candidate.includes(separator)) {
        const candidateParts = candidate.split(separator);
        testName = candidateParts[0].trim();
        candidate = candidateParts.slice(1).join(separator).trim();
      }
    }

    return { purpose, candidate, performedBy, testName };
  }

  let fallbackPurpose = description.replace(" Session", "").replace(" Fee", "").trim();
  if (fallbackPurpose === "Screening Assessment" || fallbackPurpose === "Screening Assessment (Anonymous)" || fallbackPurpose === "screening_level1") {
    fallbackPurpose = "Employee Mental Health & Wellbeing";
  } else if (fallbackPurpose === "Narrative Intelligence" || fallbackPurpose === "TAT") {
    fallbackPurpose = "Narrative Assessment";
  } else if (fallbackPurpose === "Psychologist Verification Request" || fallbackPurpose === "Report Validation Request") {
    fallbackPurpose = "Report Validation Request";
  }
  return { purpose: fallbackPurpose, candidate: "-", performedBy: "-" };
}
