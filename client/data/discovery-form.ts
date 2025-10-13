export interface QuestionGuidance {
  title: string;
  body: string;
}

export interface FormQuestion {
  overallNumber: number;
  prompt: string;
  guidance: QuestionGuidance[];
  example?: string;
  exampleLabel?: string;
}

export interface FormSection {
  id: number;
  label: string;
  title: string;
  description: string;
  emphasis?: string;
  note?: string;
  questions: FormQuestion[];
}

export interface FlattenedQuestion extends FormQuestion {
  sectionId: number;
  sectionLabel: string;
  sectionTitle: string;
  sectionDescription: string;
  sectionEmphasis?: string;
  sectionNote?: string;
  sectionQuestionNumber: number;
  sectionTotalQuestions: number;
}

export const formSections: FormSection[] = [
  {
    id: 1,
    label: "Section 1 of 6",
    title: "Your Story",
    description: "Every business starts somewhere. Let's understand yours.",
    emphasis: "This section has 5 questions",
    note: "Take your time. Write naturally. Your honest answers matter more than perfect prose.",
    questions: [
      {
        overallNumber: 1,
        prompt: "Why did you start this business?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `This isn't about the polished story you tell investors or put on LinkedIn. We want the real reason — the moment something clicked. Maybe you were frustrated with how things worked. Maybe you saw an opportunity no one else did. Maybe something personal happened that changed your perspective. Think back to that moment when you decided, "I'm going to do this."`,
          },
          {
            title: "How to organize your answer:",
            body: `Write it like you're telling a friend over coffee. What was going on in your life? What did you see that others missed? What made you think "I can do this better"? A few sentences are enough — just give us the honest version.`,
          },
        ],
        example: `"My mother has diabetes and couldn't find sugar-free sweets that actually tasted good. Everything was either bland or full of chemicals. I learned to make them at home, friends loved them, and I thought — why isn't anyone doing this right?"`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 2,
        prompt: "What problem do you solve?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `When someone comes to you — or when you imagine them coming — what's actually bothering them? What's not working? What keeps them up at night? Sometimes the problem is obvious (broken, expensive, slow). Sometimes it's emotional (frustrated, overwhelmed, confused). Think about what life looks like before you step in.`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe it simply, as if you're explaining to someone who knows nothing about your industry. What's broken? What hurts? What's the struggle?`,
          },
        ],
        example: `"Working professionals want to stay fit but can't commit to gyms — unpredictable schedules, intimidating environments, trainers who don't pay attention. They need fitness that fits their life, not the other way around."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 3,
        prompt: "What do you actually deliver?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `This isn't about your process or your features. It's about what changes. Think about the person before they work with you, and after. What's different? What can they do now that they couldn't before? What weight is lifted? Sometimes it's tangible (a website, a system, a product). Sometimes it's how they feel (confident, relieved, clear).`,
          },
          {
            title: "How to organize your answer:",
            body: `Try a "Before → After" structure if it helps. Keep it real — what actually changes in their world?`,
          },
        ],
        example: `"Before: They're stressed about their health but don't know where to start. After: They have a personalized nutrition plan, weekly check-ins, and they've lost weight without feeling deprived or overwhelmed."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 4,
        prompt:
          "If you could only keep doing ONE thing in your business and had to stop everything else, what would you keep?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Imagine everything got stripped away — all the services, all the offerings, all the extras. What's the one thing you'd fight to protect? What's so core to what you do that without it, it wouldn't really be your business anymore? This reveals what you actually care about most.`,
          },
          {
            title: "How to organize your answer:",
            body: "One clear sentence. What's the non-negotiable core?",
          },
        ],
        example: `"The initial consultation where I understand their lifestyle, habits, and goals. Without that, I'm just giving generic advice that won't stick."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 5,
        prompt: "What would you never do, even if it meant more money?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Have you ever walked away from money because something felt wrong? Or maybe you haven't faced it yet, but you know there's a line you wouldn't cross. What is it? This isn't about being preachy — it's about knowing yourself. Where's your limit? What would you refuse even if it cost you?`,
          },
          {
            title: "How to organize your answer:",
            body: "Tell us what it is, and if you can, why it matters to you. Even a brief explanation helps us understand what you stand for.",
          },
        ],
        example: `"I'll never use artificial sweeteners or preservatives in my products, even though it would triple shelf life and reduce costs. Quality and health come first — that's the whole point."`,
        exampleLabel: "Example:",
      },
    ],
  },
  {
    id: 2,
    label: "Section 2 of 6",
    title: "The People You Serve",
    description:
      "Let's talk about your customers — the real people, not demographics.",
    emphasis: "This section has 7 questions",
    questions: [
      {
        overallNumber: 6,
        prompt:
          "Think of your last 3 customers. OR if you're starting, think of 3 people you imagine working with. Describe them.",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Not categories or age groups — actual humans. If you've worked with people, bring the last few to mind. What were they like? What did they care about? If you're just starting, imagine the people you want to serve as if you already know them. Give them names if it helps. Make them real in your head.`,
          },
          {
            title: "How to organize your answer:",
            body: `For each person, write 2-3 lines: Who they are, what they were dealing with, what matters to them. Paint a picture.`,
          },
        ],
        example: `"Priya, 34, corporate manager, works 10-hour days. Gained 15kg in 3 years, tried diets but couldn't sustain them. She values convenience — needs something that doesn't require her to cook separate meals or spend hours at the gym."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 7,
        prompt:
          "How did they find you? OR if you're starting, how do you plan to reach people?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The actual journey. Did someone refer them? Did they search online and find you? Did they see your work somewhere? If you're starting, think about the path you imagine — not wishful thinking, but realistic routes. How will the first person discover you exist?`,
          },
          {
            title: "How to organize your answer:",
            body: 'Just trace the path from "didn\'t know you" to "contacted you." Keep it factual.',
          },
        ],
        example: `"Mostly Instagram. They see my posts about healthy recipes, transformation stories from other clients, or tips on managing diabetes through diet. Sometimes referrals from existing clients."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 8,
        prompt:
          "What were they struggling with when they came to you? OR what will they be struggling with?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The thing that finally pushed them to take action. People put up with problems for a while, then something tips them over. What's that tipping point? What problem got loud enough that they couldn't ignore it anymore?`,
          },
          {
            title: "How to organize your answer:",
            body: `Use their words if you've heard them. If you're starting, use the words you imagine hearing. Make it real.`,
          },
        ],
        example: `"They'd say things like 'I've tried everything and nothing works' or 'I don't have time to cook separate meals' or 'Gyms intimidate me and I never go.' They're frustrated and tired of failing."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 9,
        prompt:
          "What questions or worries did they have before deciding to work with you? OR what concerns do you expect?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The hesitations. The "but what if..." thoughts. Maybe they worried about cost, or time, or whether it would actually work. Maybe they'd been burned before. Think about what stopped them from saying yes immediately, or what you imagine might stop someone.`,
          },
          {
            title: "How to organize your answer:",
            body: "List 2-3 real concerns. The ones that come up in conversations or the ones you think are most likely.",
          },
        ],
        example: `"Will I have to give up foods I love? How much time will this take? I've tried trainers before and quit — what makes this different?"`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 10,
        prompt: "When someone is NOT a good fit, how do you know?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Red flags. The signals that tell you "this won't work out well." Maybe it's an attitude, a behavior, an expectation. Sometimes you can just feel it — something's off. What are those signals? What makes you think "I should probably say no to this one"?`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe the warning signs. Be honest — there's no judgment here. Knowing who you DON'T want to serve is as important as knowing who you do.`,
          },
        ],
        example: `"When they want results in 2 weeks with zero effort. Or when they're looking for the cheapest option and will question every recommendation. They're not ready to commit, and I can't help people who won't meet me halfway."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 11,
        prompt:
          "What do happy customers say about you? OR what do you want them to say?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Real words. Not marketing language — actual phrases from reviews, messages, casual conversations, or referrals. If you're starting, think about what you hope to hear someday. What compliment would make you feel like you're doing it right?`,
          },
          {
            title: "How to organize your answer:",
            body: `Quote them if you can. Their exact words matter more than polished sentences. If you're imagining it, make it sound like something a real person would actually say.`,
          },
        ],
        example: `"They say things like 'You actually listened to my lifestyle instead of giving a cookie-cutter plan' or 'I finally found something I can stick to' or 'You explain things without making me feel dumb.'"`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 12,
        prompt:
          "When they refer you to someone, what reason do they give? OR what reason do you hope they'll give?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The moment someone recommends you. "You should work with them because..." What comes after that sentence? What's the one thing that makes them confident enough to put their own reputation on the line by recommending you? That reason reveals what you're actually known for.`,
          },
          {
            title: "How to organize your answer:",
            body: `Complete the sentence: "You should work with them because..." Keep it real and specific.`,
          },
        ],
        example: `"You should work with them because they customize everything to your life — no generic meal plans or workouts. And they actually check in on you, not just take your money and disappear."`,
        exampleLabel: "Example:",
      },
    ],
  },
  {
    id: 3,
    label: "Section 3 of 6",
    title: "How You Work",
    description: "Let's understand your approach and what makes it yours.",
    emphasis: "This section has 6 questions",
    questions: [
      {
        overallNumber: 13,
        prompt: "Walk me through what happens when someone comes to you.",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The journey from "hello" to "here's what you ordered." Not every tiny detail — we don't need to know about invoicing software or file formats. Just the main beats. First contact, then what? How do you move from conversation to delivery?`,
          },
          {
            title: "How to organize your answer:",
            body: `Number the steps if that helps. 3-6 main stages is usually enough. Keep it simple and clear.`,
          },
        ],
        example: `"1) Initial consultation to understand their health, lifestyle, and goals. 2) Custom nutrition plan created for them specifically. 3) Weekly check-ins via call or message to track progress and adjust. 4) Monthly review to measure results and set new goals."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 14,
        prompt:
          "What do you do that takes extra time or costs more, but you do it anyway?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Where do you invest effort that others skip? What step could you cut to be faster or cheaper, but you refuse to? Maybe it's a site visit, an extra review, a follow-up call. Something that feels important to you even though it's not required. This reveals what you truly care about.`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe what you do, and if you can, why it matters enough to keep doing it despite the cost.`,
          },
        ],
        example: `"I create custom recipes for each client based on what they actually eat and what's available in their kitchen. Most coaches give the same 20 recipes to everyone. It takes me 3-4 extra hours per client, but generic plans don't work."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 15,
        prompt:
          "What shortcuts do you see others take that you refuse to take?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The "easier way" that bothers you. Maybe competitors rush through discovery, or skip steps, or use templates when customization is needed. What do you see happening in your industry that makes you think "that's not right"? What's the corner everyone else cuts that you won't?`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe the shortcut, and if possible, why you think it's wrong or why you avoid it.`,
          },
        ],
        example: `"Other trainers sell the same package to everyone — 'this is the program, follow it.' No customization. I think that's lazy. Everyone's body, schedule, and lifestyle are different. One-size-fits-all doesn't work for fitness."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 16,
        prompt:
          "Tell me about a time you said no to money or a customer. OR imagine what would make you walk away.",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `A moment when the money was tempting but something felt off. Maybe the timeline was impossible, or the client wanted you to compromise quality, or they were disrespectful. If it hasn't happened yet, imagine the scenario where you'd choose to walk away rather than take the money. Where's that line?`,
          },
          {
            title: "How to organize your answer:",
            body: `Tell the story if you have one. What happened? What did you do? Why? If you're imagining it, describe the situation that would make you say no.`,
          },
        ],
        example: `"A client wanted me to promise 10kg weight loss in 3 weeks for her wedding. That's not healthy or sustainable. She offered double my fee. I said no — I'm not going to compromise someone's health for money, and that kind of result would damage my reputation."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 17,
        prompt:
          "If something goes wrong or a customer has a problem, what do you do?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Mistakes happen. Things break. People get upset. How do you handle it? Do you respond immediately or take time to investigate first? Do you acknowledge it or go quiet? There's no perfect answer here — we just want to understand your instinct when things don't go as planned.`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe your approach simply. What's your first move? What matters most to you in that moment?`,
          },
        ],
        example: `"I respond the same day. Even if I don't have a solution yet, I let them know I received their message and I'm looking into it. I never ignore or make excuses. If something was my mistake, I own it and fix it."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 18,
        prompt:
          "What's one rule or habit you have that your team (or you) might find annoying, but you insist on?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The thing you're particular about. Maybe it's how files are named, or how meetings are structured, or a quality check that feels excessive to others. Something that makes people roll their eyes a bit, but you won't budge on. These small insistences often reveal deeper standards.`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe the rule and, if you can, explain why you care about it even though it might seem small.`,
          },
        ],
        example: `"I taste-test every batch before it ships. My team thinks it's excessive because we follow the same recipe every time. But consistency matters — one bad batch and trust is gone."`,
        exampleLabel: "Example:",
      },
    ],
  },
  {
    id: 4,
    label: "Section 4 of 6",
    title: "Your Market",
    description: "Let's understand where you fit and who else is out there.",
    emphasis: "This section has 5 questions",
    questions: [
      {
        overallNumber: 19,
        prompt:
          'Before you started (or as you were planning), what did you notice that made you think "there\'s space for this"?',
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The observation that sparked the idea. Maybe you saw a gap — something people needed but couldn't find. Maybe you noticed everyone doing something one way and thought "there's a better way." What did you see that others seemed to miss? What made you believe there was room for you?`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe what you observed and what it told you. Paint the picture of the gap you spotted.`,
          },
        ],
        example: `"I noticed diabetes patients in India struggle to find tasty sugar-free snacks. Everything was imported and expensive, or local but bland. Nobody was making Indian sweets — ladoos, barfis — without sugar in a way that actually tasted good."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 20,
        prompt:
          "Name 2-4 businesses that people might compare you to or consider instead.",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Not necessarily direct competitors — just alternatives. Other options people have when they're trying to solve the problem you solve. Maybe it's bigger companies, cheaper options, DIY solutions, or even doing nothing. Who or what are you competing against in the customer's mind?`,
          },
          {
            title: "How to organize your answer:",
            body: `List them. Names if you know them, or types/categories if you don't. Be realistic about what you're up against.`,
          },
        ],
        example: `"Local gyms (cheaper but crowded and impersonal), celebrity trainer programs online (flashy but generic), YouTube free workouts (no accountability), or just doing nothing and hoping for the best."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 21,
        prompt:
          "What do customers complain about when they come to you from someone else? OR what have you heard people complain about in your industry?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `The frustrations people mention. Stories about past vendors, past solutions, or how things typically work. What have you heard people grumble about? What made them leave someone else and come looking for something better? These complaints reveal where the industry is falling short.`,
          },
          {
            title: "How to organize your answer:",
            body: `List 2-3 common complaints. Use their language if you remember it.`,
          },
        ],
        example: `"They say trainers take payment for 3 months upfront and then disappear — no follow-ups, no adjustments. Or the plans are impossible to follow with a job and family. Or gyms feel intimidating and judgy."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 22,
        prompt:
          "Where do your prices sit compared to others? OR where will they sit?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Be honest. Are you the premium option? The budget-friendly one? Somewhere in the middle? And if you know roughly how much more or less expensive you are, share that. Pricing position says a lot about who you are and who you serve. There's no wrong answer — expensive isn't bad, affordable isn't bad. Just real.`,
          },
          {
            title: "How to organize your answer:",
            body: `State it plainly. Higher, lower, similar? By how much if you know.`,
          },
        ],
        example: `"I'm more expensive than generic gym memberships (₹2-3K/month) but much cheaper than celebrity trainers (₹50K+). I'm around ₹8-12K/month — mid-range, but with personalized attention."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 23,
        prompt:
          "Do people see you as big and established, or small and personal? OR how do you want to be seen?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Perception matters. Some businesses want to feel like the trusted, been-around-forever institution. Others want to feel boutique, personal, agile. Neither is wrong — it depends on who you're serving and what they need. What's the vibe you're giving off now, or the one you're aiming for?`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe it simply. Don't overthink it — just what feels true or what you're aiming for.`,
          },
        ],
        example: `"Right now, small and personal — people know they're working with me, not some assistant. But I want to be seen as credible and established too — not just a side hustle, but a serious practice they can trust."`,
        exampleLabel: "Example:",
      },
    ],
  },
  {
    id: 5,
    label: "Section 5 of 6",
    title: "How You Communicate",
    description: "Let's understand your natural voice.",
    emphasis: "This section has 4 questions",
    questions: [
      {
        overallNumber: 24,
        prompt:
          "Show me the last email or message you sent to a customer. OR write a sample message you might send.",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `We want to see how you naturally communicate. Don't polish it or make it formal if that's not you. Don't make it casual if you're naturally more structured. Just show us real communication — how you actually talk to people. If you don't have a recent message, write one as if you're reaching out to check in on a customer.`,
          },
          {
            title: "How to organize your answer:",
            body: `Copy-paste if you have something recent. If you're writing a sample, make it realistic — like something you'd actually send.`,
          },
        ],
        example: `"Hi Priya! Hope you're doing well. Just checking in — how did this week's meal plan go? Were you able to try the millet khichdi recipe? Let me know if anything felt too difficult or didn't fit your schedule. We'll adjust for next week. You're doing great! 💪"`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 25,
        prompt:
          "When you're explaining your work to someone at a wedding or family gathering, how do you describe it?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Not the elevator pitch. Not the business card version. The words you actually use when your uncle asks "so what do you do?" or when someone at a party is curious. That casual, real explanation — without industry terms, without trying to impress. Just honest, simple words.`,
          },
          {
            title: "How to organize your answer:",
            body: `Write it like you're speaking. Keep it conversational.`,
          },
        ],
        example: `"I help working professionals lose weight and get fit without having to go to a gym or follow crazy diets. Custom plans that fit their actual life — what they like to eat, how much time they have. Mostly online, weekly check-ins."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 26,
        prompt:
          "If I called 3 of your customers and asked them to describe you in 3 words, what would they say? OR what 3 words do you hope they'd say?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Not aspirational marketing words like "innovative" or "cutting-edge." Real words real people would use. Simple, human words. Words that feel true to how you actually show up. What quality do people notice about you? What do they appreciate? What sticks in their mind?`,
          },
          {
            title: "How to organize your answer:",
            body: "Just list 3 words. Nothing fancy.",
          },
        ],
        example: `"Supportive. Realistic. Consistent."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 27,
        prompt:
          "If your business was compared to another well-known business (any industry), who would you be happy being compared to? And who would feel wrong?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Comparisons reveal a lot. "Oh, you're like the [X] of [your industry]" — what X would make you smile? What X would make you uncomfortable? It doesn't have to be in your industry. Could be a bank, a car brand, a restaurant chain. Think about who you'd be proud to be mentioned alongside, and who you'd want to distance yourself from.`,
          },
          {
            title: "How to organize your answer:",
            body: `Name one you'd like, one you wouldn't. Explain briefly why if you can.`,
          },
        ],
        example: `"I'd be happy being compared to Fabindia — authentic, rooted in Indian culture, quality-first, not trying to be Western. I'd hate being compared to a fast-fashion brand — cheap, mass-produced, no soul."`,
        exampleLabel: "Example:",
      },
    ],
  },
  {
    id: 6,
    label: "Section 6 of 6",
    title: "Visual & Symbolic",
    description: "Let's understand what resonates with you visually.",
    emphasis: "This section has 3 questions",
    questions: [
      {
        overallNumber: 28,
        prompt:
          "Do you have any current branding — logo, colors, website, materials? OR any visual ideas in your mind?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `What exists right now, if anything. Maybe you have a logo someone made, or a website you threw together. Maybe it's just ideas in your head. Either way, tell us. If you have something, share it — we want to see it. If you don't, describe what you've been imagining, even if it's rough or incomplete.`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe what you have, share links or files if available, or paint the picture of what's in your mind.`,
          },
        ],
        example: `"I have an Instagram page with a Canva logo — very basic, green and white colors. No website yet. I've been thinking earthy, natural tones since my food is all organic and homemade."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 29,
        prompt: "Are there any colors you personally love or strongly dislike?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Forget branding for a moment. Just personal taste. What colors make you feel something? Maybe you love deep blues because they feel calm. Maybe you can't stand bright orange because it feels aggressive. These instincts matter — they often point to what will feel right for your brand even if you don't know why yet.`,
          },
          {
            title: "How to organize your answer:",
            body: `List any strong preferences or dislikes. If nothing comes to mind, that's fine too.`,
          },
        ],
        example: `"I love earthy greens and browns — natural, warm, healthy. I dislike bright reds or neon colors — they feel too aggressive or artificial for what I'm doing."`,
        exampleLabel: "Example:",
      },
      {
        overallNumber: 30,
        prompt:
          "Are there any symbols, tools, landmarks, or elements connected to your work or location that have meaning?",
        guidance: [
          {
            title: "Before you answer, think about:",
            body: `Sometimes there's an object, a shape, or a local reference that carries weight. Maybe it's a tool you use, a machine, a building, a regional symbol. Something that connects to what you do or where you are. If something comes to mind, share it. If nothing does, that's completely okay — most businesses don't have an obvious symbol, and that's fine.`,
          },
          {
            title: "How to organize your answer:",
            body: `Describe it if something resonates. If not, just say so.`,
          },
        ],
        example: `"Leaves or grains — they represent natural, whole foods. That connects to what I do — helping people eat real food, not processed or chemical-heavy stuff."`,
        exampleLabel: "Example:",
      },
    ],
  },
];

export const formQuestions: FlattenedQuestion[] = formSections.flatMap(
  (section) =>
    section.questions.map((question, index) => ({
      ...question,
      sectionId: section.id,
      sectionLabel: section.label,
      sectionTitle: section.title,
      sectionDescription: section.description,
      sectionEmphasis: section.emphasis,
      sectionNote: section.note,
      sectionQuestionNumber: index + 1,
      sectionTotalQuestions: section.questions.length,
    })),
);

export const totalQuestions = formQuestions.length;
