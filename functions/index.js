// functions/index.js
// Firebase Cloud Functions — AI/NLP keyword analysis and cover letter generator

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const pdfParse = require("pdf-parse");

admin.initializeApp();

const db = admin.firestore();


// ============================================================================
// HELPER: Clean and tokenise text into individual words
// ============================================================================

function tokenise(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}


// ============================================================================
// HELPER: Common English stop words
// ============================================================================

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "are",
  "you",
  "your",
  "have",
  "will",
  "must",
  "able",
  "from",
  "our",
  "all",
  "its",
  "any",
  "not",
  "but",
  "has",
  "can",
  "may",
  "each",
  "both",
  "been",
  "also",
  "into",
  "more",
  "their",
  "they",
  "than",
  "well",
  "very",
  "some",
  "such",
  "other",
  "about",
  "which",
  "would",
  "should",
  "could",
  "work",
  "team",
  "role",
  "what",
  "when",
  "where",
  "who",
  "how",
  "use",
  "using",
  "used",
  "new",
  "good",
  "strong",
  "candidate",
  "including",
  "required",
  "preferred",
  "responsibilities",
  "requirements",
  "experience",
  "position",
  "company",
  "working",
  "opportunity",
]);


// ============================================================================
// HELPER: Known technical multi-word phrases
// ============================================================================

const TECH_PHRASES = [
  "machine learning",
  "natural language processing",
  "software development",
  "web development",
  "mobile development",
  "full stack",
  "front end",
  "back end",
  "rest api",
  "restful api",
  "version control",
  "continuous integration",
  "continuous deployment",
  "cloud computing",
  "data structures",
  "agile methodology",
  "object oriented",
  "test driven",
  "user interface",
  "user experience",
  "relational database",
  "nosql database",
  "firebase firestore",
  "react native",
  "node js",
  "express js",
  "type script",
  "java script",
  "power shell",
  "ci cd",
  "devops",
  "unit testing",
  "system design",
  "problem solving",
  "communication skills",
  "attention to detail",
  "team player",
];


// ============================================================================
// HELPER: Extract important keywords
// ============================================================================

function extractKeywords(text = "") {
  const lower = text.toLowerCase();

  const found = new Set();

  // Detect multi-word technical phrases
  TECH_PHRASES.forEach((phrase) => {
    if (lower.includes(phrase)) {
      found.add(phrase);
    }
  });

  // Detect useful individual words
  tokenise(text).forEach((word) => {
    if (!STOP_WORDS.has(word) && word.length > 3) {
      found.add(word);
    }
  });

  return [...found];
}


// ============================================================================
// HELPER: Calculate ATS compatibility score
// ============================================================================

function calculateATSScore(cvText = "", jobText = "") {
  const jobKeywords = extractKeywords(jobText);

  const cvLower = cvText.toLowerCase();

  const matched = [];
  const missing = [];

  jobKeywords.forEach((keyword) => {
    if (cvLower.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  });

  const total = jobKeywords.length || 1;

  const rawScore = Math.round(
    (matched.length / total) * 100
  );

  // Keep score between 10 and 98
  const atsScore = Math.min(
    98,
    Math.max(10, rawScore)
  );

  return {
    atsScore,
    matched,
    missing,
    total,
  };
}


// ============================================================================
// HELPER: Calculate CV section scores
// ============================================================================

function calculateSectionScores(cvText = "") {
  const lower = cvText.toLowerCase();

  const skillsKeywords = [
    "python",
    "javascript",
    "java",
    "sql",
    "html",
    "css",
    "react",
    "node",
    "git",
    "api",
    "database",
    "cloud",
    "linux",
    "typescript",
    "mongodb",
    "mysql",
    "firebase",
    "docker",
    "aws",
    "azure",
  ];

  const expKeywords = [
    "experience",
    "worked",
    "developed",
    "built",
    "managed",
    "led",
    "created",
    "implemented",
    "responsible",
    "project",
    "company",
    "role",
    "position",
    "internship",
    "employment",
  ];

  const eduKeywords = [
    "degree",
    "diploma",
    "certificate",
    "university",
    "college",
    "bachelor",
    "honours",
    "masters",
    "qualification",
    "studied",
    "graduated",
    "school",
    "module",
    "course",
  ];

  const formatKeywords = [
    "skills",
    "education",
    "experience",
    "references",
    "summary",
    "objective",
    "contact",
    "email",
    "phone",
    "address",
    "profile",
    "achievements",
    "projects",
  ];

  function sectionScore(keywords) {
    const hits = keywords.filter((keyword) =>
      lower.includes(keyword)
    ).length;

    return Math.min(
      98,
      Math.round(
        (hits / keywords.length) * 100
      )
    );
  }

  return {
    skillsScore: sectionScore(skillsKeywords),
    experienceScore: sectionScore(expKeywords),
    educationScore: sectionScore(eduKeywords),
    formattingScore: sectionScore(formatKeywords),
  };
}


// ============================================================================
// HELPER: Generate improvement suggestions
// ============================================================================

function generateSuggestions(missing, sectionScores) {
  const suggestions = [];

  // HIGH PRIORITY
  // First 6 missing job-description keywords

  missing.slice(0, 6).forEach((keyword) => {
    suggestions.push({
      priorityLevel: "HIGH",
      category: "Keywords",
      affectedKeyword: keyword,

      suggestionText:
        `Add "${keyword}" to your CV where relevant — ` +
        "this keyword appears in the job description and may be scanned by an ATS.",

      impactRating: "HIGH",
    });
  });


  // MEDIUM PRIORITY
  // CV formatting

  if (sectionScores.formattingScore < 70) {
    suggestions.push({
      priorityLevel: "MEDIUM",
      category: "Formatting",
      affectedKeyword: null,

      suggestionText:
        "Use clear, standard section headings such as Skills, Education, " +
        "Work Experience, and References. ATS systems scan for these headings.",

      impactRating: "MEDIUM",
    });

    suggestions.push({
      priorityLevel: "MEDIUM",
      category: "Formatting",
      affectedKeyword: null,

      suggestionText:
        "Avoid complicated tables, text boxes, and multi-column layouts. " +
        "A simple CV structure is easier for ATS software to parse.",

      impactRating: "MEDIUM",
    });
  }


  // Work experience

  if (sectionScores.experienceScore < 70) {
    suggestions.push({
      priorityLevel: "MEDIUM",
      category: "Work Experience",
      affectedKeyword: null,

      suggestionText:
        "Add measurable achievements to your Work Experience section, " +
        "for example: 'Reduced processing time by 30%'.",

      impactRating: "MEDIUM",
    });
  }


  // Skills

  if (sectionScores.skillsScore < 70) {
    suggestions.push({
      priorityLevel: "MEDIUM",
      category: "Skills",
      affectedKeyword: null,

      suggestionText:
        "Expand your Skills section with relevant technical and soft skills. " +
        "Only include skills that accurately reflect your abilities.",

      impactRating: "MEDIUM",
    });
  }


  // LOW PRIORITY

  suggestions.push({
    priorityLevel: "LOW",
    category: "Professional Summary",
    affectedKeyword: null,

    suggestionText:
      "Add a concise professional summary tailored to the position and " +
      "naturally include relevant job-description keywords.",

    impactRating: "LOW",
  });


  suggestions.push({
    priorityLevel: "LOW",
    category: "Links",
    affectedKeyword: null,

    suggestionText:
      "For technology positions, consider including relevant professional " +
      "links such as GitHub, LinkedIn, or a portfolio.",

    impactRating: "LOW",
  });


  suggestions.push({
    priorityLevel: "LOW",
    category: "Acronyms",
    affectedKeyword: null,

    suggestionText:
      "Where appropriate, write the full technical term and its abbreviation, " +
      "for example Application Programming Interface (API).",

    impactRating: "LOW",
  });


  return suggestions;
}


// ============================================================================
// CLOUD FUNCTION 1: analyseCV
// ============================================================================

exports.analyseCV = functions.https.onCall(
  async (data, context) => {

    // ------------------------------------------------------------------------
    // 1. Authentication
    // ------------------------------------------------------------------------

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Login required."
      );
    }


    // ------------------------------------------------------------------------
    // 2. Receive data from React application
    // ------------------------------------------------------------------------

    const {
      cvText,
      jobDescription,
      cvID,
      jobID,
      userID,
      jobTitle,
      companyName,
    } = data;


    if (!jobDescription || !jobDescription.trim()) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Job description is required."
      );
    }


    if (!cvID) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "CV ID is required."
      );
    }


    if (!jobID) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Job description ID is required."
      );
    }


    // ------------------------------------------------------------------------
    // 3. Prepare CV text
    //
    // IMPORTANT:
    // Never treat "PDF_UPLOADED" as actual CV text.
    // ------------------------------------------------------------------------

    let workingCvText =
      cvText &&
      cvText !== "PDF_UPLOADED"
        ? String(cvText).trim()
        : "";


    // ------------------------------------------------------------------------
    // 4. If PDF text is not available, retrieve and parse the uploaded PDF
    // ------------------------------------------------------------------------

    if (!workingCvText) {

      console.log(
        "No usable CV text supplied by client. Attempting PDF extraction."
      );

      try {

        // Retrieve CV record
        const cvSnap = await db
          .collection("cvs")
          .doc(cvID)
          .get();


        if (!cvSnap.exists) {
          throw new Error(
            `CV document ${cvID} does not exist in Firestore.`
          );
        }


        const cvDoc = cvSnap.data();

        console.log(
          "CV document found:",
          cvDoc.fileName || cvID
        );


        // Check whether file URL exists
        const filePath = cvDoc.filePath;

        if (!filePath) {
          throw new Error(
            "The CV record does not contain a filePath."
          );
        }


        console.log(
          "Attempting to download CV from Firebase Storage."
        );


        // Download PDF
        const response = await fetch(filePath);


        if (!response.ok) {
          throw new Error(
            `Failed to download CV. HTTP status: ${response.status}`
          );
        }


        // Convert response into a Node Buffer
        const arrayBuffer =
          await response.arrayBuffer();

        const pdfBuffer =
          Buffer.from(arrayBuffer);


        console.log(
          "PDF downloaded successfully. Bytes:",
          pdfBuffer.length
        );


        // Extract PDF text
        const pdfData =
          await pdfParse(pdfBuffer);


        workingCvText =
          pdfData &&
          typeof pdfData.text === "string"
            ? pdfData.text.trim()
            : "";


        console.log(
          "PDF extraction successful. Characters:",
          workingCvText.length
        );


        console.log(
          "CV TEXT PREVIEW:",
          workingCvText.substring(0, 300)
        );


        // Save extracted text back to Firestore
        if (workingCvText.length > 20) {

          await db
            .collection("cvs")
            .doc(cvID)
            .update({
              extractedText: workingCvText,
            });


          console.log(
            "Extracted CV text saved back to Firestore."
          );
        }

      } catch (error) {

        console.error(
          "PDF EXTRACTION FAILED:",
          error
        );


        throw new functions.https.HttpsError(
          "internal",
          "The CV PDF could not be read. Please upload a text-based PDF or TXT file."
        );
      }
    }


    // ------------------------------------------------------------------------
    // 5. Make sure usable CV text actually exists
    // ------------------------------------------------------------------------

    if (
      !workingCvText ||
      workingCvText.length < 20
    ) {

      console.error(
        "CV text extraction returned insufficient text."
      );


      throw new functions.https.HttpsError(
        "invalid-argument",
        "We could not extract readable text from this CV. Please upload a text-based PDF or TXT file."
      );
    }


    const finalCvText =
      workingCvText;


    console.log(
      "FINAL CV TEXT LENGTH:",
      finalCvText.length
    );


    console.log(
      "FINAL CV TEXT PREVIEW:",
      finalCvText.substring(0, 300)
    );


    // ------------------------------------------------------------------------
    // 6. Perform ATS analysis
    // ------------------------------------------------------------------------

    const {
      atsScore,
      matched,
      missing,
      total,
    } = calculateATSScore(
      finalCvText,
      jobDescription
    );


    console.log(
      "ATS ANALYSIS:",
      {
        atsScore,
        matched: matched.length,
        missing: missing.length,
        total,
      }
    );


    // ------------------------------------------------------------------------
    // 7. Calculate section scores
    // ------------------------------------------------------------------------

    const sectionScores =
      calculateSectionScores(
        finalCvText
      );


    console.log(
      "SECTION SCORES:",
      sectionScores
    );


    // ------------------------------------------------------------------------
    // 8. Save extracted job-description keywords
    // ------------------------------------------------------------------------

    const jobKeywords =
      extractKeywords(
        jobDescription
      );


    await db
      .collection("jobDescriptions")
      .doc(jobID)
      .update({
        extractedKeywords:
          JSON.stringify(jobKeywords),
      });


    // ------------------------------------------------------------------------
    // 9. Save complete ATS result
    // ------------------------------------------------------------------------

    const resultRef =
      await db
        .collection("atsResults")
        .add({

          userID:
            userID || context.auth.uid,

          cvID,

          jobID,

          jobTitle:
            jobTitle || "",

          companyName:
            companyName || "",

          atsScore,

          keywordsMatched:
            matched.length,

          keywordsMissing:
            missing.length,

          matchedKeywordsList:
            matched,

          missingKeywordsList:
            missing,

          skillsScore:
            sectionScores.skillsScore,

          experienceScore:
            sectionScores.experienceScore,

          educationScore:
            sectionScores.educationScore,

          formattingScore:
            sectionScores.formattingScore,

          analysisDate:
            admin.firestore.FieldValue.serverTimestamp(),

        });


    console.log(
      "ATS result saved:",
      resultRef.id
    );


    // ------------------------------------------------------------------------
    // 10. Generate improvement suggestions
    // ------------------------------------------------------------------------

    const suggestions =
      generateSuggestions(
        missing,
        sectionScores
      );


    const batch =
      db.batch();


    suggestions.forEach(
      (suggestion) => {

        const suggestionRef =
          db
            .collection("suggestions")
            .doc();


        batch.set(
          suggestionRef,
          {
            ...suggestion,

            resultID:
              resultRef.id,

            dateGenerated:
              admin.firestore.FieldValue.serverTimestamp(),
          }
        );
      }
    );


    await batch.commit();


    console.log(
      "Suggestions generated:",
      suggestions.length
    );


    // ------------------------------------------------------------------------
    // 11. Return analysis result to React
    // ------------------------------------------------------------------------

    return {

      resultID:
        resultRef.id,

      atsScore,

      keywordsMatched:
        matched.length,

      keywordsMissing:
        missing.length,

      skillsScore:
        sectionScores.skillsScore,

      experienceScore:
        sectionScores.experienceScore,

      educationScore:
        sectionScores.educationScore,

      formattingScore:
        sectionScores.formattingScore,
    };
  }
);


// ============================================================================
// CLOUD FUNCTION 2: generateCoverLetter
// ============================================================================

exports.generateCoverLetter =
  functions.https.onCall(
    async (data, context) => {

      // Authentication
      if (!context.auth) {

        throw new functions.https.HttpsError(
          "unauthenticated",
          "Login required."
        );
      }


      const {
        userName,
        jobTitle,
        companyName,
        matchedKeywords,
        atsScore,
      } = data;


      const today =
        new Date().toLocaleDateString(
          "en-ZA",
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          }
        );


      // Top five matching keywords
      const topKeywords =
        (matchedKeywords || [])
          .slice(0, 5);


      let keywordSentence =
        "I have a strong technical background relevant to this position.";


      if (topKeywords.length === 1) {

        keywordSentence =
          `My technical background includes ${topKeywords[0]}.`;

      } else if (topKeywords.length > 1) {

        keywordSentence =
          `My technical background includes ` +
          `${topKeywords.slice(0, -1).join(", ")} ` +
          `and ${topKeywords[topKeywords.length - 1]}.`;
      }


      const scoreNote =
        atsScore >= 70
          ? "I am confident that my skills and experience closely match the requirements of this position."
          : "I am eager to grow my skills further and contribute meaningfully to your team.";


      const letterContent =
`${userName}
${today}

The Hiring Manager
${companyName}

Re: Application for ${jobTitle} Position

Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. As a graduate in Applications Development with a solid foundation in software engineering and problem-solving, I am excited about the opportunity to contribute to your organisation.

${keywordSentence} Through my academic projects and practical experience, I have developed the ability to design, develop, and maintain software solutions that meet real-world requirements. I am proficient in working within agile environments and collaborating effectively within cross-functional teams.

${scoreNote} I am particularly drawn to this role because it aligns with my career goals and allows me to apply my technical knowledge in a professional setting. I am a fast learner, highly motivated, and committed to delivering quality work.

I have attached my CV for your consideration and would welcome the opportunity to discuss my suitability for this role in more detail. Thank you for your time and consideration.

Yours sincerely,
${userName}`;


      return {

        letterContent,

        keywordsIncluded:
          topKeywords,
      };
    }
  );