import { mysqlPool } from "../db/mysql";

type CreateAinagerInput = {
  email: string;
  companyName: string; // from websiteAnalysis.title
  instruction: string; // soft instruction from website
  knowledgeBase: string; // comprehensive text for document
  websiteDomain: string; // from analysis.domain
  websiteDescription?: string | null;
  pdfFilePath: string; // generated PDF file path to store in DB
};

function extractDomainFromEmail(email: string): string {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : "";
}

function buildAinagerNameFromEmail(email: string): string {
  const domain = extractDomainFromEmail(email);
  if (!domain) return "ainager";
  
  // Extract the main part of the domain (before .com, .org, etc.)
  const domainParts = domain.split('.');
  const mainDomain = domainParts[0] || domain;
  
  // Convert to title case and clean up
  const companyName = mainDomain
    .replace(/[-_]+/g, ' ') // Replace hyphens/underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
  
  return companyName || domain;
}

export async function createAinagerAndDocumentMySql(input: CreateAinagerInput): Promise<{
  ainagerId: number;
  documentId: number;
  ainagerName: string;
}> {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.beginTransaction();

    const ainagerName = buildAinagerNameFromEmail(input.email);

    // Check if ainager with this name already exists
    const [existingRows] = await connection.execute(
      `SELECT ainager_id FROM chat_ainager WHERE ainager_name = ? LIMIT 1`,
      [ainagerName]
    );

    let ainagerId: number;
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      ainagerId = (existingRows as any)[0].ainager_id as number;
      // Optionally refresh instruction/pdf_file for existing ainager
      await connection.execute(
        `UPDATE chat_ainager SET ainager_instruction = ?, pdf_file = ? WHERE ainager_id = ?`,
        [input.instruction, input.pdfFilePath, ainagerId]
      );
    } else {
      // Insert into chat_ainager
      const [ainagerResult] = await connection.execute(
        `INSERT INTO chat_ainager 
          (ainager_name, ainager_description, ainager_create_date, ainager_delete_date, openai_key, ainager_type, ainager_instruction, pdf_file, owner_id, corpmail, is_active)
         VALUES (?, ?, NOW(), NULL, NULL, ?, ?, ?, NULL, ?, 1)`,
        [
          ainagerName,
          input.websiteDescription ?? null,
          "company",
          input.instruction,
          input.pdfFilePath,
          input.email,
        ]
      );
      ainagerId = (ainagerResult as any).insertId as number;
    }

    const [docResult] = await connection.execute(
      `INSERT INTO chat_document 
        (ainager_id, instruction_id, file, document_type, title, description, llm_description, platform, uploaded_by_id, upload_date, modified_date)
       VALUES (?, NULL, ?, 'PDF', ?, ?, ?, 'WEB', NULL, NOW(), NOW())`,
      [
        ainagerId,
        input.pdfFilePath,
        input.companyName ? `Knowledge base for ${input.companyName}` : `Knowledge base ${input.websiteDomain}`,
        input.websiteDescription ?? "Comprehensive document generated from website analysis.",
        input.knowledgeBase,
      ]
    );

    const documentId = (docResult as any).insertId as number;

    await connection.commit();

    return { ainagerId, documentId, ainagerName };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    connection.release();
  }
}


