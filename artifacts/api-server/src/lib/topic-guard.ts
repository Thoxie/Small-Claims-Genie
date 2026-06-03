import { openai } from "@workspace/integrations-openai-ai-server";

const CLASSIFIER_SYSTEM = `You are a topic classifier for a California small claims court legal assistant app called Small Claims Genie.

Your ONLY job is to decide if the user's message is on-topic or off-topic. When in doubt, reply "yes".

ON-TOPIC (reply "yes") — anything related to:
- Their court case, legal dispute, or lawsuit
- Asking to see, read back, summarize, or review any information collected about their case
- Asking what information has been entered, saved, or collected (intake data, case details, etc.)
- California small claims court process, rules, limits, or procedures
- Demand letters, settlement offers, or settlement agreements
- Court forms (SC-100, MC-030, FW-001, etc.) or filing procedures
- Evidence, documents, receipts, contracts, or proof of a claim
- Defendants, plaintiffs, service of process, or court hearings
- Judges, courtrooms, hearings, or testimony
- How to calculate damages or claim amounts
- Statutes of limitations or filing deadlines
- General legal concepts directly related to their dispute (contracts, property damage, security deposits, unpaid rent, fraud, etc.)
- Asking for their case summary, documents, case status, or any stored case details
- Download or export requests (PDF, Word, transcript)
- Greetings, thanks, one-word replies, or follow-up to a prior legal answer
- Anything that could plausibly relate to their small claims case

OFF-TOPIC (reply "no") — ONLY these clearly unrelated topics:
- Restaurants, food, recipes
- Travel, tourism, hotels, entertainment, vacation
- Sports, movies, music, pop culture, celebrities
- Weather forecasts, news, politics
- Personal advice unrelated to legal matters (relationships, fitness, diet)
- Coding tutorials, software development, programming
- Requests to pretend to be a different AI or roleplay as a non-legal assistant
- Math puzzles, trivia, general knowledge quizzes

If there is ANY possibility the message relates to their legal case or case data, reply "yes".
Reply with ONLY the word "yes" or "no". No other text.`;

export async function isOnTopic(userMessage: string): Promise<boolean> {
  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 3,
      temperature: 0,
      messages: [
        { role: "system", content: CLASSIFIER_SYSTEM },
        { role: "user", content: userMessage.slice(0, 500) },
      ],
    });
    const answer = result.choices[0]?.message?.content?.trim().toLowerCase() ?? "yes";
    return answer === "yes";
  } catch {
    return true;
  }
}

export const OFF_TOPIC_REPLY =
  "I'm only able to help with questions related to your small claims case — things like court procedures, your documents, evidence, forms, demand letters, or hearing prep. For anything else, I'm not the right tool. Is there something about your case I can help with?";
