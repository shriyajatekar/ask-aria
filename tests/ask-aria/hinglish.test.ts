import { describe, expect, it } from "vitest";

import { translateHinglish } from "@/components/dashboard/ask-aria/ask-aria-hinglish";
import { GOLDEN_PATH } from "@/components/dashboard/ask-aria/ask-aria-golden-path";

import { ask } from "./helpers";

describe("Hinglish questions", () => {
  it("maps common Hinglish onto questions Aria answers", () => {
    const cases: Array<[string, string]> = [
      ["Amazon ka ROAS kyun gira?", "Why did ROAS drop on Amazon?"],
      ["Flipkart pe orders kyun kam hue?", "Why did Orders drop on Flipkart?"],
      ["Myntra pe sales kyun badhi?", "Why did Gross Sales go up on Myntra?"],
      ["Blinkit pe kya hua?", "What changed in Gross Sales on Blinkit?"],
      ["Kaun sa platform sabse zyada badh raha hai?", "Which platform is growing fastest?"],
      ["Top products dikhao", "Show me top products"],
      ["Kis cheez pe dhyan dena chahiye?", "What needs my attention?"],
      ["Ab kya karna chahiye?", "What should I do?"],
      ["Amazon ROAS ka deep dive karo", "Deep dive into ROAS on Amazon"],
      ["Business kaisa chal raha hai?", "How is the business performing?"],
    ];
    for (const [hinglish, english] of cases) {
      expect(translateHinglish(hinglish), hinglish).toBe(english);
    }
  });

  it("answers with the user's words kept and the reading shown", () => {
    const turn = ask("ANALYST", "Amazon ka ROAS kyun gira?");
    const reply = turn.reply;
    expect(reply[0].kind === "assistant_text" && reply[0].text).toBe(
      "I read this as: “Why did ROAS drop on Amazon?”",
    );
    expect(reply[1].kind).toBe("insight");
  });

  it("leaves English alone, including the golden path", () => {
    for (const steps of Object.values(GOLDEN_PATH)) {
      for (const { prompt } of steps) expect(translateHinglish(prompt), prompt).toBeNull();
    }
    expect(translateHinglish("Why did ROAS drop on Amazon?")).toBeNull();
  });

  it("returns nothing for Hinglish outside its vocabulary", () => {
    expect(translateHinglish("kya aap mujhe ek joke suna sakte ho")).toBeNull();
  });
});
