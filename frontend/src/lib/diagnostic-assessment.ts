export type AssessmentSubject = "english" | "hindi" | "mathematics";
export type GladLevel = "independent" | "instructional" | "frustrational";

export interface WorksheetItem {
  id: string;
  prompt: string;
  options?: string[];
  answer: string;
}

export interface WorksheetResult {
  id: string;
  grade: number;
  subject: AssessmentSubject;
  correct: number;
  total: number;
  percentage: number;
  level: GladLevel;
  completedAt: string;
}

const worksheetBank: Record<number, Record<AssessmentSubject, WorksheetItem[]>> = {
  1: {
    english: [
      { id: "c1-en-1", prompt: "Choose the word that begins with the same sound as “sun”.", options: ["sock", "moon", "fish"], answer: "sock" },
      { id: "c1-en-2", prompt: "Which word names an animal?", options: ["run", "cat", "blue"], answer: "cat" },
      { id: "c1-en-3", prompt: "Complete the sentence: “I ___ a book.”", options: ["read", "reads", "reading"], answer: "read" },
      { id: "c1-en-4", prompt: "Type the plural of “book”.", answer: "books" },
    ],
    hindi: [
      { id: "c1-hi-1", prompt: "“कमल” शब्द में पहला अक्षर कौन-सा है?", options: ["क", "म", "ल"], answer: "क" },
      { id: "c1-hi-2", prompt: "“फल” किसका नाम है?", options: ["एक वस्तु", "एक रंग", "एक खेल"], answer: "एक वस्तु" },
      { id: "c1-hi-3", prompt: "खाली स्थान भरें: “बच्चा ___ रहा है।”", options: ["खेल", "लाल", "कमल"], answer: "खेल" },
      { id: "c1-hi-4", prompt: "“नाव” शब्द में कौन-सी मात्रा है?", options: ["ा", "ि", "ु"], answer: "ा" },
    ],
    mathematics: [
      { id: "c1-ma-1", prompt: "What is 4 + 3?", answer: "7" },
      { id: "c1-ma-2", prompt: "Which number comes after 16?", answer: "17" },
      { id: "c1-ma-3", prompt: "There are 5 birds. 2 more arrive. How many are there?", answer: "7" },
      { id: "c1-ma-4", prompt: "Which is greater?", options: ["8", "5"], answer: "8" },
    ],
  },
  2: {
    english: [
      { id: "c2-en-1", prompt: "Choose the past-tense form: “Yesterday I ___ to school.”", options: ["walk", "walked", "walking"], answer: "walked" },
      { id: "c2-en-2", prompt: "Choose the describing word: “The small kite flew.”", options: ["small", "kite", "flew"], answer: "small" },
      { id: "c2-en-3", prompt: "Complete: “Riya ___ two pencils.”", options: ["has", "have", "having"], answer: "has" },
      { id: "c2-en-4", prompt: "Type the opposite of “early”.", answer: "late" },
    ],
    hindi: [
      { id: "c2-hi-1", prompt: "“किताब” शब्द में कौन-सी मात्रा दिखाई देती है?", options: ["ि", "ा", "ू"], answer: "ि" },
      { id: "c2-hi-2", prompt: "खाली स्थान भरें: “बच्चे मैदान में ___ हैं।”", options: ["खेल रहे", "मीठा", "लाल"], answer: "खेल रहे" },
      { id: "c2-hi-3", prompt: "“दिन” का विलोम चुनें।", options: ["रात", "सुबह", "समय"], answer: "रात" },
      { id: "c2-hi-4", prompt: "Type the plural form of “लड़का”.", answer: "लड़के" },
    ],
    mathematics: [
      { id: "c2-ma-1", prompt: "What is 36 + 27?", answer: "63" },
      { id: "c2-ma-2", prompt: "In 54, how many tens are there?", answer: "5" },
      { id: "c2-ma-3", prompt: "A box has 18 crayons. 6 are used. How many remain?", answer: "12" },
      { id: "c2-ma-4", prompt: "What is 5 groups of 2?", answer: "10" },
    ],
  },
  3: {
    english: [
      { id: "c3-en-1", prompt: "Choose the sentence with correct punctuation.", options: ["Where is my bag?", "Where is my bag.", "where is my bag?"], answer: "Where is my bag?" },
      { id: "c3-en-2", prompt: "Complete: “The children ___ playing outside.”", options: ["is", "are", "was"], answer: "are" },
      { id: "c3-en-3", prompt: "Asha planted a seed. She watered it every day. What did Asha plant?", answer: "a seed" },
      { id: "c3-en-4", prompt: "Type the past-tense form of “carry”.", answer: "carried" },
    ],
    hindi: [
      { id: "c3-hi-1", prompt: "खाली स्थान भरें: “सूरज ___ से निकलता है।”", options: ["पूर्व", "रात", "नीचे"], answer: "पूर्व" },
      { id: "c3-hi-2", prompt: "“पेड़ पर पक्षी बैठा है।” वाक्य में कौन बैठा है?", options: ["पक्षी", "पेड़", "वाक्य"], answer: "पक्षी" },
      { id: "c3-hi-3", prompt: "“मीठा” का विलोम चुनें।", options: ["खट्टा", "अच्छा", "मोटा"], answer: "खट्टा" },
      { id: "c3-hi-4", prompt: "Type the plural form of “कहानी”.", answer: "कहानियाँ" },
    ],
    mathematics: [
      { id: "c3-ma-1", prompt: "What is 7 × 6?", answer: "42" },
      { id: "c3-ma-2", prompt: "What is 348 rounded to the nearest hundred?", options: ["300", "350", "400"], answer: "300" },
      { id: "c3-ma-3", prompt: "Share 24 marbles equally among 4 children. How many does each child get?", answer: "6" },
      { id: "c3-ma-4", prompt: "Which fraction is equal to one half?", options: ["2/4", "1/3", "3/4"], answer: "2/4" },
    ],
  },
  4: {
    english: [
      { id: "c4-en-1", prompt: "Choose the correct word: “The bird ___ across the lake yesterday.”", options: ["fly", "flew", "flies"], answer: "flew" },
      { id: "c4-en-2", prompt: "Which word is closest in meaning to “careful”?", options: ["cautious", "noisy", "quick"], answer: "cautious" },
      { id: "c4-en-3", prompt: "“Mina packed an umbrella because the sky was dark.” Why did Mina pack it?", options: ["The sky looked dark.", "She was going swimming.", "It was already sunny."], answer: "The sky looked dark." },
      { id: "c4-en-4", prompt: "Type the plural of “city”.", answer: "cities" },
    ],
    hindi: [
      { id: "c4-hi-1", prompt: "“मेहनत” का समान अर्थ वाला शब्द चुनें।", options: ["परिश्रम", "आराम", "खेल"], answer: "परिश्रम" },
      { id: "c4-hi-2", prompt: "“सीमा ने पौधों को पानी दिया।” काम किसने किया?", options: ["सीमा ने", "पौधों ने", "पानी ने"], answer: "सीमा ने" },
      { id: "c4-hi-3", prompt: "खाली स्थान भरें: “यदि वर्षा होगी, तो हम घर पर ___।”", options: ["रहेंगे", "रहा", "रहता"], answer: "रहेंगे" },
      { id: "c4-hi-4", prompt: "Type the opposite of “सफल”.", answer: "असफल" },
    ],
    mathematics: [
      { id: "c4-ma-1", prompt: "What is 3/4 of 20?", answer: "15" },
      { id: "c4-ma-2", prompt: "What is 1,250 − 475?", answer: "775" },
      { id: "c4-ma-3", prompt: "A bus travels 48 km in one hour. How far does it travel in 3 hours?", answer: "144" },
      { id: "c4-ma-4", prompt: "What is the perimeter of a rectangle with sides 8 cm and 5 cm?", answer: "26" },
    ],
  },
};

export function getWorksheetItems(grade: number, subject: AssessmentSubject): WorksheetItem[] {
  return worksheetBank[grade]?.[subject] ?? [];
}

export function normalizeWorksheetAnswer(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[.,!?،؛؟]/g, "")
    .replace(/\s+/g, " ");
}

export function getGladLevel(percentage: number): GladLevel {
  if (percentage >= 70) return "independent";
  if (percentage >= 40) return "instructional";
  return "frustrational";
}

export function scoreWorksheet(
  items: WorksheetItem[],
  answers: Record<string, string>,
): Omit<WorksheetResult, "id" | "grade" | "subject" | "completedAt"> {
  const correct = items.reduce((count, item) => (
    normalizeWorksheetAnswer(answers[item.id] ?? "") === normalizeWorksheetAnswer(item.answer)
      ? count + 1
      : count
  ), 0);
  const total = items.length;
  const percentage = total ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percentage, level: getGladLevel(percentage) };
}

export const ISAA_DOMAINS = [
  { id: "social", label: "Social relationship and reciprocity", firstItem: 1, itemCount: 9 },
  { id: "emotional", label: "Emotional responsiveness", firstItem: 10, itemCount: 5 },
  { id: "communication", label: "Speech, language, and communication", firstItem: 15, itemCount: 9 },
  { id: "behaviour", label: "Behaviour patterns", firstItem: 24, itemCount: 7 },
  { id: "sensory", label: "Sensory aspects", firstItem: 31, itemCount: 6 },
  { id: "cognitive", label: "Cognitive component", firstItem: 37, itemCount: 4 },
] as const;

export const ISAA_ITEMS = [
  "Shares attention between a person and something of interest.",
  "Responds to familiar attempts to start an interaction.",
  "Invites another person to join a preferred activity.",
  "Notices and responds to another person's facial expression.",
  "Takes turns during an age-appropriate interaction.",
  "Shows interest in spending time with peers.",
  "Coordinates gaze, gesture, or expression while communicating.",
  "Seeks reassurance or shared enjoyment from a familiar person.",
  "Adjusts an interaction when another person signals a change in interest.",
  "Shows an emotional response that fits the situation.",
  "Has a strong reaction to a small or unexpected change.",
  "Shows agitation or distress without a clear situational trigger.",
  "Responds to common safety reminders in familiar settings.",
  "Returns to a settled state after everyday frustration.",
  "Uses speech, signs, or gestures to express a need.",
  "Understands a familiar spoken direction.",
  "Keeps a short back-and-forth exchange going.",
  "Uses words or gestures that are understood by familiar people.",
  "Repeats a phrase when a different response may be expected.",
  "Uses words such as “I” and “you” to identify people.",
  "Understands the intended meaning of a simple social hint.",
  "Adds a gesture or another clue when a message is not understood.",
  "Explains a familiar idea to someone who does not share the same context.",
  "Repeats a movement or action during daily activities.",
  "Uses objects in a repeated sequence or arrangement.",
  "Prefers familiar routines for everyday tasks.",
  "Finds it hard to move from a preferred activity to another task.",
  "Moves or acts at a pace that interrupts a usual activity.",
  "Becomes upset when a familiar activity is interrupted.",
  "Returns repeatedly to a narrow set of preferred topics or activities.",
  "Shows a strong response to everyday sounds.",
  "Shows a strong response to ordinary light or visual settings.",
  "Avoids or seeks particular textures during everyday activities.",
  "Explores objects by smelling, tasting, or touching them.",
  "Tracks a moving person or object during a familiar activity.",
  "Responds differently than expected to minor bumps or discomfort.",
  "Stays focused on a familiar task for an age-appropriate interval.",
  "Needs extra time to respond to a familiar question or direction.",
  "Remembers a familiar routine after a gap in time.",
  "Shows an unusually strong skill or knowledge in a particular area.",
] as const;

export type IsaaRatings = Record<number, number>;

export function scoreIsaaDomains(ratings: IsaaRatings) {
  return ISAA_DOMAINS.map((domain) => {
    const values = Array.from({ length: domain.itemCount }, (_, index) => ratings[domain.firstItem + index]);
    const completed = values.filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5).length;
    return {
      id: domain.id,
      label: domain.label,
      completed,
      total: domain.itemCount,
      score: completed === domain.itemCount ? values.reduce((sum, rating) => sum + rating, 0) : null,
    };
  });
}

export function scoreIsaa(ratings: IsaaRatings): { completed: number; total: number; score: number | null } {
  const completed = ISAA_ITEMS.reduce((count, _item, index) => {
    const rating = ratings[index + 1];
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? count + 1 : count;
  }, 0);
  const score = completed === ISAA_ITEMS.length
    ? ISAA_ITEMS.reduce((sum, _item, index) => sum + ratings[index + 1], 0)
    : null;
  return { completed, total: ISAA_ITEMS.length, score };
}

export interface IsaaReferenceBand {
  label: string;
  range: string;
  note: string;
}

export function getIsaaReferenceBand(score: number): IsaaReferenceBand {
  if (score < 70) return { label: "Below reference threshold", range: "40–69", note: "Below the manual's first reference band; this does not rule out a diagnosis." };
  if (score <= 106) return { label: "Mild reference band", range: "70–106", note: "The manual associates this band with 40–70% disability; a qualified examiner must interpret it." };
  if (score <= 153) return { label: "Moderate reference band", range: "107–153", note: "The manual associates this band with 70–90% disability; a qualified examiner must interpret it." };
  return { label: "Severe reference band", range: "154–200", note: "The manual associates this band with 90–100% disability; a qualified examiner must interpret it." };
}
