/**
 * Default editable site content.
 * These are the initial values that get seeded into the `site_content` table.
 * The admin can change any of these from the browser; changes persist in the
 * database and survive every deployment.
 */

export interface ContentField {
  key: string;
  label: string;
  bengali: string;
  defaultValue: string;
  type: "text" | "textarea";
}

export const DEFAULT_CONTENT: ContentField[] = [
  {
    key: "notice_visible",
    label: "Notice Bar Visible (true/false)",
    bengali: "নোটিশ বার দৃশ্যমান",
    defaultValue: "true",
    type: "text",
  },
  {
    key: "notice_text",
    label: "Notice / Marquee Text",
    bengali: "নোটিশ / মার্কি টেক্সট",
    defaultValue:
      "✦ সরকার অনুমোদিত রিবাট রেট ডাটাবেজ অনুযায়ী হিসাব করা হচ্ছে ✦ অগ্রিম কিস্তি পরিশোধে বিশেষ ছাড় ✦ সঠিক তথ্যের জন্য শাখা অফিসে যোগাযোগ করুন ✦",
    type: "textarea",
  },
  {
    key: "header_subtitle",
    label: "Header Subtitle",
    bengali: "হেডার সাবটাইটেল",
    defaultValue: "Microfinance · রিবাট ক্যালকুলেটার",
    type: "text",
  },
  {
    key: "hero_badge",
    label: "Hero Badge",
    bengali: "হিরো ব্যাজ",
    defaultValue: "Microfinance Toolkit",
    type: "text",
  },
  {
    key: "hero_title",
    label: "Hero Title",
    bengali: "হিরো শিরোনাম",
    defaultValue: "Calculate advance-kisti rebate instantly.",
    type: "text",
  },
  {
    key: "hero_description",
    label: "Hero Description",
    bengali: "হিরো বিবরণ",
    defaultValue:
      "Pick a product, duration and advance kisti, then enter the disbursed amount. The rebate — (Disburse ÷ 1000) × Rate — updates in real time, straight from the official rate database.",
    type: "textarea",
  },
  {
    key: "formula_note",
    label: "Formula Note",
    bengali: "সূত্র নোট",
    defaultValue:
      "Rebate = (Disburse ÷ 1000) × Rate · rounded to the nearest Taka",
    type: "text",
  },
  {
    key: "chart_title",
    label: "Rate Chart Section Title",
    bengali: "রেট চার্ট টাইটেল",
    defaultValue: "Full Kisti Rate Chart",
    type: "text",
  },
  {
    key: "footer_text",
    label: "Footer Text",
    bengali: "ফুটার টেক্সট",
    defaultValue:
      "Rebate Calculator · Microfinance — Jagoron, Agrossor, Buniyed & MFCE",
    type: "text",
  },
];

export type ContentMap = Record<string, string>;

/** Build a key→value map from the defaults (used for seeding + fallback). */
export function defaultContentMap(): ContentMap {
  return Object.fromEntries(DEFAULT_CONTENT.map((f) => [f.key, f.defaultValue]));
}
