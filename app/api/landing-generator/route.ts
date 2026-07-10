import { NextResponse } from 'next/server';

type GenerateBody = {
  name?: string;
  vertical?: string;
  geo?: string;
  language?: string;
  offerUrl?: string;
  style?: string;
  prompt?: string;
};

function cleanHtml(value: string) {
  return value
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractOutputText(data: any) {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  const parts: string[] = [];

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const content of item.content) {
          if (typeof content.text === 'string') {
            parts.push(content.text);
          }
        }
      }
    }
  }

  return parts.join('\n').trim();
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-5.4';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is missing in .env.local / Vercel env.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerateBody;

    const name = body.name?.trim() || 'Generated Landing Page';
    const vertical = body.vertical?.trim() || 'Sweepstakes';
    const geo = body.geo?.trim() || 'Philippines';
    const language = body.language?.trim() || 'Filipino';
    const offerUrl = body.offerUrl?.trim() || '{offer}';
    const style = body.style?.trim() || 'modern mobile-first, clean, premium';
    const userPrompt = body.prompt?.trim() || '';

    const prompt = `
You are an expert direct-response landing page builder.

Create one complete mobile-first HTML landing page.

Page requirements:
- Return ONLY the complete HTML code.
- Start with <!DOCTYPE html>.
- Include all CSS and JavaScript inside the same file.
- No markdown.
- No explanations.
- No external JS.
- Google Fonts and Material Symbols are allowed.
- Must be mobile-first and look premium.
- Must work as a Keitaro lander.
- All final CTA buttons must use this URL exactly: ${offerUrl}
- Use the offer URL as href="${offerUrl}" and redirect destination when needed.
- Language: ${language}
- GEO: ${geo}
- Vertical: ${vertical}
- Style: ${style}

Compliance:
- Do not claim the user definitely won.
- Do not show fake brand logos.
- Avoid guaranteed money/winning claims.
- You can use urgency, limited-time framing, progress steps, interactive mechanics, and claim-step wording.
- Use clear disclaimers where needed.

Conversion elements:
- Strong headline.
- Short explanation.
- Interactive section if relevant.
- Urgency.
- Social proof phrased safely.
- Sticky CTA.
- Countdown timer.
- Mobile smooth animations.
- Clear next step CTA.
- Fast loading.

User extra prompt:
${userPrompt}

Landing page name:
${name}
`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: prompt
      })
    });

    const data = await response.json();

if (!response.ok) {
  console.error('OpenAI API error:', JSON.stringify(data, null, 2));

  return NextResponse.json(
    {
      error: data?.error?.message || 'Landing page generation failed.',
      details: data
    },
    { status: response.status }
  );
}

    const html = cleanHtml(extractOutputText(data));

    if (!html || !html.toLowerCase().includes('<!doctype html')) {
      return NextResponse.json(
        { error: 'The AI response did not return a complete HTML file.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      html
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown generator error.'
      },
      { status: 500 }
    );
  }
}