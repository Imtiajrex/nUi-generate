import { GoogleGenAI } from "@google/genai";
import { ReferenceImage } from '../types';

export const SYSTEM_INSTRUCTION = `You are an expert UI/UX developer. Generate complete, working HTML code with embedded CSS and JS based on the user's request. 
Output ONLY valid HTML code. 
Do NOT wrap it in markdown blockquotes, do NOT add explanations, do NOT output \`\`\`html. 
Start exactly with <!DOCTYPE html>.
The <html> tag MUST have id="container".
Use modern, responsive design principles. 
If Tailwind CSS is requested or useful, you can include it via CDN: <script src="https://cdn.tailwindcss.com"></script>.

IMPORTANT UI GUIDELINES:
1. Do NOT generate bottom tabs or navigation bars unless strictly specified in the prompt.
2. For complex charts or graphs, use the Chart.js library. Include it via CDN: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>.
3. ICONS: Use Iconify for all icons. Include the Iconify script via CDN: <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>. Use the <iconify-icon icon="..."></iconify-icon> element. Choose appropriate icons from popular sets like "lucide", "mdi", "ph", etc.

IMPORTANT REGARDING IMAGES AND CONTENT:
1. Any images provided in the "referenceImages" collection or "PREVIOUS ITERATIONS CONTEXT" are guidelines for CONTENT, STRUCTURE, and SECTIONS. Use them to understand what information and layout components should be included, but do NOT replicate them exactly. Adapt the content and structure to fit the current request naturally while maintaining the overall intent.
2. Use the design system (colors, spacing, fonts) from the reference images to inform the new UI.
3. If the user provides a description of a screen to redesign, focus on the structure and functionality described while applying the design system from the reference images.
4. CONTENT CONSISTENCY: When iterating on a screen (provided in PREVIOUS ITERATIONS CONTEXT), use the existing content, purpose, and information architecture as a strong guideline. Maintain the core intent of the screen unless the current request explicitly asks to change it, but feel free to improve or adapt the presentation.
5. VARIATIONS: If the user asks for a "variation" or "different version" of a previous iteration, you should significantly change the visual layout, color scheme, or design patterns while keeping the core content and functionality intact. Use the provided LATEST HTML CODE and its visual screenshot as your starting point for these changes.
6. Ensure all components are functional and interactive where possible (e.g., buttons have hover states, inputs are focusable).
7. Use high-quality placeholder images from Unsplash or similar if needed.
8. The output must be a single, self-contained HTML file.
9. BE CONCISE: Generate only the necessary code. Avoid extremely long comments or redundant CSS/JS. Focus on the core functionality and design requested.`;

function getAI(apiKey: string) {
  // Prioritize user-provided API key, then environment variables
  const key = apiKey || process.env.API_KEY || process.env.GEMINI_API_KEY || 'dummy-key';
  return new GoogleGenAI({ apiKey: key });
}

export async function describeImage(
  base64Image: string,
  model: string,
  apiKey: string,
  targetDevice: 'desktop' | 'mobile' = 'desktop',
  openRouterConfig?: { apiKey: string; model: string }
): Promise<{ description: string; cost: number }> {
  if (model === 'openrouter' && openRouterConfig?.apiKey) {
    return describeImageOpenRouter(base64Image, openRouterConfig.model, openRouterConfig.apiKey, targetDevice);
  }
  const ai = getAI(apiKey);
  const [mime, data] = base64Image.split(';base64,');

  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      parts: [
        { text: `Analyze this UI screen and describe its structural layout, functional components, and the nature of its content. The target device is ${targetDevice}. Focus on:
1. The overall layout structure (e.g., header, sidebar, main content area, grid columns).
2. The specific components present and their relative order (e.g., hero section, feature cards, pricing table, footer).
3. The key features and content sections included in the screen.
4. The specific type and nature of the content within those sections (e.g., "A list of recent blog posts with titles and dates", "A user profile section with an avatar, name, and bio", "A data table showing sales metrics").
5. Functional elements like buttons, inputs, and navigation links.

DO NOT mention specific colors, font sizes, weights, or visual styling details. 
DO NOT describe micro-interactions, animations, or transitions.
Provide a clear, structural and content-focused description of what the screen looks like and what it contains.` },
        { inlineData: { mimeType: mime.split(':')[1], data: data } }
      ]
    }],
    config: {
      temperature: 0.2,
      maxOutputTokens: 4096
    }
  }).catch(async (err) => {
    const isForbidden = err.message?.includes('403') || err.message?.includes('404') || err.message?.includes('PERMISSION_DENIED');
    
    // Fallback between gemini-3 models if one fails with permission issues
    const fallbackModel = model === 'gemini-3.1-flash-lite-preview' ? 'gemini-3-flash-preview' : 'gemini-3.1-flash-lite-preview';
    
    if (isForbidden && model.startsWith('gemini-3')) {
      console.warn(`Falling back to ${fallbackModel} for image description due to error:`, err.message);
      return ai.models.generateContent({
        model: fallbackModel,
        contents: [{
          parts: [
            { text: `Analyze this UI screen and describe its structural layout, functional components, and the nature of its content. The target device is ${targetDevice}. Focus on:
1. The overall layout structure (e.g., header, sidebar, main content area, grid columns).
2. The specific components present and their relative order (e.g., hero section, feature cards, pricing table, footer).
3. The key features and content sections included in the screen.
4. The specific type and nature of the content within those sections (e.g., "A list of recent blog posts with titles and dates", "A user profile section with an avatar, name, and bio", "A data table showing sales metrics").
5. Functional elements like buttons, inputs, and navigation links.

DO NOT mention specific colors, font sizes, weights, or visual styling details. 
DO NOT describe micro-interactions, animations, or transitions.
Provide a clear, structural and content-focused description of what the screen looks like and what it contains.` },
            { inlineData: { mimeType: mime.split(':')[1], data: data } }
          ]
        }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 4096
        }
      });
    }
    throw err;
  });

  const description = response.text || '';
  
  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

  return { description, cost };
}

export interface IterationContext {
  prompt: string;
  description: string;
  htmlContent?: string;
  screenshot?: string;
}

export async function generateUI(
  prompt: string,
  model: string,
  apiKey: string,
  referenceImages: ReferenceImage[],
  previousIterations: IterationContext[] = [],
  designSystem?: any,
  pastedImage?: string, // base64
  targetDevice: 'desktop' | 'mobile' = 'desktop',
  referenceAssetMode: 'image' | 'description' = 'image',
  openRouterConfig?: { apiKey: string; model: string },
  primaryInfo?: { objective?: string; components?: string; image?: string }
): Promise<{ htmlContent: string; cost: number }> {
  if (model === 'openrouter' && openRouterConfig?.apiKey) {
    return generateUIOpenRouter(prompt, openRouterConfig.model, openRouterConfig.apiKey, referenceImages, previousIterations, designSystem, pastedImage, targetDevice, referenceAssetMode, primaryInfo);
  }

  const ai = getAI(apiKey);

  const parts: any[] = [];

  // Add primary screen info
  if (primaryInfo) {
    let primaryText = "SCREEN PRIMARY OBJECTIVE & COMPONENTS:\n";
    if (primaryInfo.objective) primaryText += `Objective: ${primaryInfo.objective}\n`;
    if (primaryInfo.components) primaryText += `Key Components: ${primaryInfo.components}\n`;
    primaryText += "\n";
    parts.push({ text: primaryText });

    if (primaryInfo.image) {
      const [mime, data] = primaryInfo.image.split(';base64,');
      parts.push({
        inlineData: {
          mimeType: mime.split(':')[1],
          data: data,
        },
      });
      parts.push({ text: "(The image above is the primary reference design for this screen)\n\n" });
    }
  }

  // Add target device context
  parts.push({ text: `TARGET DEVICE: ${targetDevice.toUpperCase()}\nEnsure the layout is optimized specifically for ${targetDevice} screens.\n\n` });

  // Add design system context
  if (designSystem) {
    let dsText = "DESIGN SYSTEM CONSTRAINTS:\n";
    dsText += `- Typography: ${designSystem.typography}\n`;
    dsText += `- Primary Color: ${designSystem.primaryColor}\n`;
    dsText += `- Secondary Color: ${designSystem.secondaryColor}\n`;
    dsText += `- Accent Color: ${designSystem.accentColor}\n`;
    dsText += `- Background Color: ${designSystem.backgroundColor}\n`;
    dsText += `- Text Color: ${designSystem.textColor}\n`;
    dsText += `- Theme: ${designSystem.theme}\n`;
    if (designSystem.customInstructions) {
      dsText += `- Additional Instructions: ${designSystem.customInstructions}\n`;
    }
    dsText += `\n`;
    parts.push({ text: dsText });
  }

  // Add previous iterations as context
  if (previousIterations.length > 0) {
    parts.push({ text: "PREVIOUS ITERATIONS CONTEXT (Maintain the content and purpose of these screens unless asked to change it):\n" });
    previousIterations.forEach((it, idx) => {
      parts.push({ text: `--- Iteration ${idx + 1} ---\nPrompt: ${it.prompt}\n` });
      
      if (it.screenshot) {
        const [mime, data] = it.screenshot.split(';base64,');
        parts.push({
          inlineData: {
            mimeType: mime.split(':')[1],
            data: data,
          },
        });
        parts.push({ text: `(The image above is a render of this iteration)\n` });
      } else {
        parts.push({ text: `Structure and Content Description: ${it.description}\n` });
      }

      if (it.htmlContent && idx === previousIterations.length - 1) {
        parts.push({ text: `LATEST HTML CODE (Use this as the base for modifications or variations):\n${it.htmlContent}\n` });
      }
      parts.push({ text: `\n` });
    });
  }

  parts.push({ text: `CURRENT REQUEST: ${prompt}` });

  // Add reference images/descriptions
  if (referenceAssetMode === 'description') {
    let refDescText = "\nREFERENCE ASSET DESCRIPTIONS (Use these for design inspiration - colors, spacing, patterns, typography, layout):\n";
    referenceImages.forEach((img, idx) => {
      if (img.description) {
        refDescText += `--- Reference Asset ${idx + 1} (${img.filename}) ---\n${img.description}\n\n`;
      } else {
        // Fallback to image if description is missing even in description mode
        const [mime, data] = img.base64Data.split(';base64,');
        parts.push({
          inlineData: {
            mimeType: mime.split(':')[1],
            data: data,
          },
        });
      }
    });
    if (refDescText.length > 100) {
      parts.push({ text: refDescText });
    }
  } else {
    referenceImages.forEach((img) => {
      const [mime, data] = img.base64Data.split(';base64,');
      parts.push({
        inlineData: {
          mimeType: mime.split(':')[1],
          data: data,
        },
      });
    });
  }

  // Add pasted image
  if (pastedImage) {
    const [mime, data] = pastedImage.split(';base64,');
    parts.push({
      inlineData: {
        mimeType: mime.split(':')[1],
        data: data,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        role: 'user',
        parts: parts,
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    },
  });

  let htmlContent = response.text || '';

  // Post-processing: Strip markdown if the model ignored instructions
  htmlContent = htmlContent.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

  // Calculate cost
  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

  return { htmlContent, cost };
}

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Pricing per 1M tokens (USD)
  // Pro: $1.25 / 1M input, $5.00 / 1M output
  // Flash: $0.10 / 1M input, $0.40 / 1M output
  // Flash Lite: $0.075 / 1M input, $0.30 / 1M output
  
  let inputRate = 0.10;
  let outputRate = 0.40;

  if (model.includes('pro')) {
    inputRate = 1.25;
    outputRate = 5.00;
  } else if (model.includes('flash-lite')) {
    inputRate = 0.075;
    outputRate = 0.30;
  }

  const inputCost = (inputTokens / 1_000_000) * inputRate;
  const outputCost = (outputTokens / 1_000_000) * outputRate;

  return inputCost + outputCost;
}

export async function enhancePrompt(
  prompt: string,
  apiKey: string,
  model: string,
  imageDescription?: string,
  targetDevice: 'desktop' | 'mobile' = 'desktop',
  openRouterConfig?: { apiKey: string; model: string }
): Promise<{ enhancedPrompt: string; cost: number }> {
  if (model === 'openrouter' && openRouterConfig?.apiKey) {
    return enhancePromptOpenRouter(prompt, openRouterConfig.model, openRouterConfig.apiKey, imageDescription, targetDevice);
  }
  const ai = getAI(apiKey);

  let systemPrompt = `You are a master UI/UX prompt engineer. Your goal is to transform a simple user request into a comprehensive structural and functional design specification.
The target device is ${targetDevice.toUpperCase()}.
Focus on:
- Detailed Layout and Grid System (e.g., 12-column grid, bento box layout, masonry).
- Specific Components and their logical order (e.g., navigation, hero, features, testimonials, footer).
- Content Sections and Features to be included.
- Functional elements and their placement.

If the user asks for a "variation" or "different version", ensure the enhanced prompt specifies a significantly different layout or visual structure while maintaining the core content.

DO NOT mention specific colors, font sizes, weights, or visual styling details.
DO NOT include micro-interactions, animations, or transitions.
The output should describe exactly what the screen looks like in terms of structure and what content/sections it contains.`;
  
  let userContent = `Original Request: ${prompt}`;
  if (imageDescription) {
    userContent += `\n\nContext from Reference Image:\n${imageDescription}\n\nInstructions: The user provided a reference image. Use the structural and functional patterns from this description to enhance the prompt, but make it a detailed text specification for a professional UI.`;
  }
  
  userContent += "\n\nOutput ONLY the enhanced prompt text. No preamble, no explanations, no markdown formatting.";

  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      role: 'user',
      parts: [{ text: userContent }]
    }],
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  });

  const enhancedPrompt = (response.text || '').trim();
  
  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

  return { enhancedPrompt, cost };
}

export async function describeHTML(
  html: string,
  model: string,
  apiKey: string,
  targetDevice: 'desktop' | 'mobile' = 'desktop',
  openRouterConfig?: { apiKey: string; model: string }
): Promise<{ description: string; cost: number }> {
  if (model === 'openrouter' && openRouterConfig?.apiKey) {
    return describeHTMLOpenRouter(html, openRouterConfig.model, openRouterConfig.apiKey, targetDevice);
  }
  const ai = getAI(apiKey);
  
  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      parts: [
        { text: `Analyze this HTML code and describe its structural layout, functional components, and the nature of its content. The target device is ${targetDevice}. Focus on:
1. The overall layout structure (e.g., header, sidebar, main content area, grid columns).
2. The specific components present and their relative order (e.g., hero section, feature cards, pricing table, footer).
3. The key features and content sections included in the screen.
4. The specific type and nature of the content within those sections (e.g., "A list of recent blog posts with titles and dates", "A user profile section with an avatar, name, and bio", "A data table showing sales metrics").
5. Functional elements like buttons, inputs, and navigation links.

DO NOT mention specific colors, font sizes, weights, or visual styling details. 
DO NOT describe micro-interactions, animations, or transitions.
Provide a clear, structural and content-focused description of what the screen looks like and what it contains.

HTML Code:
${html}` }
      ]
    }],
    config: {
      temperature: 0.2,
      maxOutputTokens: 4096
    }
  });

  const description = response.text || '';
  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

  return { description, cost };
}

export async function analyzeReferenceImage(
  base64Image: string,
  model: string,
  apiKey: string,
  openRouterConfig?: { apiKey: string; model: string }
): Promise<{ description: string; cost: number }> {
  if (model === 'openrouter' && openRouterConfig?.apiKey) {
    return analyzeReferenceImageOpenRouter(base64Image, openRouterConfig.model, openRouterConfig.apiKey);
  }
  const ai = getAI(apiKey);
  const [mime, data] = base64Image.split(';base64,');

  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      parts: [
        { text: `Understand this competitor screenshot or design reference individually. 
Analyze and describe in detail:
1. Design Principles: What is the overall vibe and design philosophy?
2. Spacing: How is white space used? What are the margins and paddings like?
3. Patterns: What UI patterns are used (e.g., cards, lists, navigation styles)?
4. Color Usage: What is the color palette? How are colors used for hierarchy and action?
5. Typography: What font styles are used? How is typographic hierarchy established?
6. Layout: What is the structural grid or layout system?
7. Anything else worth mentioning (e.g., iconography style, shadow usage, border radius).

Provide a comprehensive, professional design analysis.` },
        { inlineData: { mimeType: mime.split(':')[1], data: data } }
      ]
    }],
    config: {
      temperature: 0.2,
      maxOutputTokens: 4096
    }
  }).catch(async (err) => {
    const isForbidden = err.message?.includes('403') || err.message?.includes('404') || err.message?.includes('PERMISSION_DENIED');
    
    // Fallback between gemini-3 models if one fails with permission issues
    const fallbackModel = model === 'gemini-3.1-flash-lite-preview' ? 'gemini-3-flash-preview' : 'gemini-3.1-flash-lite-preview';

    if (isForbidden && model.startsWith('gemini-3')) {
      console.warn(`Falling back to ${fallbackModel} for reference image analysis due to error:`, err.message);
      return ai.models.generateContent({
        model: fallbackModel,
        contents: [{
          parts: [
            { text: `Understand this competitor screenshot or design reference individually. 
Analyze and describe in detail:
1. Design Principles: What is the overall vibe and design philosophy?
2. Spacing: How is white space used? What are the margins and paddings like?
3. Patterns: What UI patterns are used (e.g., cards, lists, navigation styles)?
4. Color Usage: What is the color palette? How are colors used for hierarchy and action?
5. Typography: What font styles are used? How is typographic hierarchy established?
6. Layout: What is the structural grid or layout system?
7. Anything else worth mentioning (e.g., iconography style, shadow usage, border radius).

Provide a comprehensive, professional design analysis.` },
            { inlineData: { mimeType: mime.split(':')[1], data: data } }
          ]
        }],
        config: {
          temperature: 0.2,
          maxOutputTokens: 4096
        }
      });
    }
    throw err;
  });

  const description = response.text || '';
  const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
  const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);

  return { description, cost };
}

export async function generateUIOpenRouter(
  prompt: string,
  model: string,
  apiKey: string,
  referenceImages: ReferenceImage[],
  previousIterations: IterationContext[] = [],
  designSystem?: any,
  pastedImage?: string, // base64
  targetDevice: 'desktop' | 'mobile' = 'desktop',
  referenceAssetMode: 'image' | 'description' = 'image',
  primaryInfo?: { objective?: string; components?: string; image?: string }
): Promise<{ htmlContent: string; cost: number }> {
  const messages: any[] = [
    { role: 'system', content: SYSTEM_INSTRUCTION }
  ];

  let fullPrompt = "";

  if (primaryInfo) {
    fullPrompt += "SCREEN PRIMARY OBJECTIVE & COMPONENTS:\n";
    if (primaryInfo.objective) fullPrompt += `Objective: ${primaryInfo.objective}\n`;
    if (primaryInfo.components) fullPrompt += `Key Components: ${primaryInfo.components}\n`;
    fullPrompt += "\n";
  }

  fullPrompt += `TARGET DEVICE: ${targetDevice.toUpperCase()}\nEnsure the layout is optimized specifically for ${targetDevice} screens.\n\n`;

  if (designSystem) {
    fullPrompt += "DESIGN SYSTEM CONSTRAINTS:\n";
    fullPrompt += `- Typography: ${designSystem.typography}\n`;
    fullPrompt += `- Primary Color: ${designSystem.primaryColor}\n`;
    fullPrompt += `- Secondary Color: ${designSystem.secondaryColor}\n`;
    fullPrompt += `- Accent Color: ${designSystem.accentColor}\n`;
    fullPrompt += `- Background Color: ${designSystem.backgroundColor}\n`;
    fullPrompt += `- Text Color: ${designSystem.textColor}\n`;
    fullPrompt += `- Theme: ${designSystem.theme}\n`;
    if (designSystem.customInstructions) {
      fullPrompt += `- Additional Instructions: ${designSystem.customInstructions}\n`;
    }
    fullPrompt += `\n`;
  }

  fullPrompt += `CURRENT REQUEST: ${prompt}`;

  const content: any[] = [{ type: 'text', text: fullPrompt }];

  if (primaryInfo?.image) {
    const [mime, data] = primaryInfo.image.split(';base64,');
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mime.split(':')[1]};base64,${data}` }
    });
    content.push({ type: 'text', text: "(The image above is the primary reference design for this screen)\n\n" });
  }

  // Add previous iterations as context
  if (previousIterations.length > 0) {
    content.push({ type: 'text', text: "\nPREVIOUS ITERATIONS CONTEXT (Maintain the content and purpose of these screens unless asked to change it):\n" });
    previousIterations.forEach((it, idx) => {
      content.push({ type: 'text', text: `--- Iteration ${idx + 1} ---\nPrompt: ${it.prompt}\n` });
      
      if (it.screenshot) {
        const [mime, data] = it.screenshot.split(';base64,');
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mime.split(':')[1]};base64,${data}` }
        });
        content.push({ type: 'text', text: `(The image above is a render of this iteration)\n` });
      } else {
        content.push({ type: 'text', text: `Structure and Content Description: ${it.description}\n` });
      }

      if (it.htmlContent && idx === previousIterations.length - 1) {
        content.push({ type: 'text', text: `LATEST HTML CODE (Use this as the base for modifications or variations):\n${it.htmlContent}\n` });
      }
      content.push({ type: 'text', text: `\n` });
    });
  }

  // Add reference images/descriptions
  if (referenceAssetMode === 'description') {
    let refDescText = "\nREFERENCE ASSET DESCRIPTIONS (Use these for design inspiration - colors, spacing, patterns, typography, layout):\n";
    referenceImages.forEach((img, idx) => {
      if (img.description) {
        refDescText += `--- Reference Asset ${idx + 1} (${img.filename}) ---\n${img.description}\n\n`;
      } else {
        const [mime, data] = img.base64Data.split(';base64,');
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mime.split(':')[1]};base64,${data}` }
        });
      }
    });
    if (refDescText.length > 100) {
      content.push({ type: 'text', text: refDescText });
    }
  } else {
    referenceImages.forEach((img) => {
      const [mime, data] = img.base64Data.split(';base64,');
      content.push({
        type: 'image_url',
        image_url: { url: `data:${mime.split(':')[1]};base64,${data}` }
      });
    });
  }

  if (pastedImage) {
    const [mime, data] = pastedImage.split(';base64,');
    content.push({
      type: 'image_url',
      image_url: { url: `data:${mime.split(':')[1]};base64,${data}` }
    });
  }

  messages.push({ role: 'user', content });

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "nUi Forge",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 8192
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error('OpenRouter Error:', resData);
    const errorMsg = resData.error?.message || resData.message || `OpenRouter API Error: ${response.status}`;
    throw new Error(errorMsg);
  }

  let htmlContent = resData.choices?.[0]?.message?.content || '';
  htmlContent = htmlContent.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

  return { htmlContent, cost: 0 };
}

export async function describeImageOpenRouter(
  base64Image: string,
  model: string,
  apiKey: string,
  targetDevice: 'desktop' | 'mobile' = 'desktop'
): Promise<{ description: string; cost: number }> {
  const [mime, data] = base64Image.split(';base64,');
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "nUi Forge",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Analyze this UI screen and describe its structural layout, functional components, and the nature of its content. The target device is ${targetDevice}. Focus on:
1. The overall layout structure (e.g., header, sidebar, main content area, grid columns).
2. The specific components present and their relative order (e.g., hero section, feature cards, pricing table, footer).
3. The key features and content sections included in the screen.
4. The specific type and nature of the content within those sections (e.g., "A list of recent blog posts with titles and dates", "A user profile section with an avatar, name, and bio", "A data table showing sales metrics").
5. Functional elements like buttons, inputs, and navigation links.

DO NOT mention specific colors, font sizes, weights, or visual styling details. 
DO NOT describe micro-interactions, animations, or transitions.
Provide a clear, structural and content-focused description of what the screen looks like and what it contains.` },
            { type: 'image_url', image_url: { url: `data:${mime.split(':')[1]};base64,${data}` } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 4096
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error('OpenRouter Error:', resData);
    const errorMsg = resData.error?.message || resData.message || `OpenRouter API Error: ${response.status}`;
    throw new Error(errorMsg);
  }
  return { description: resData.choices?.[0]?.message?.content || '', cost: 0 };
}

export async function enhancePromptOpenRouter(
  prompt: string,
  model: string,
  apiKey: string,
  imageDescription?: string,
  targetDevice: 'desktop' | 'mobile' = 'desktop'
): Promise<{ enhancedPrompt: string; cost: number }> {
  let systemPrompt = `You are a master UI/UX prompt engineer. Your goal is to transform a simple user request into a comprehensive structural and functional design specification.
The target device is ${targetDevice.toUpperCase()}.
Focus on:
- Detailed Layout and Grid System (e.g., 12-column grid, bento box layout, masonry).
- Specific Components and their logical order (e.g., navigation, hero, features, testimonials, footer).
- Content Sections and Features to be included.
- Functional elements and their placement.

If the user asks for a "variation" or "different version", ensure the enhanced prompt specifies a significantly different layout or visual structure while maintaining the core content.

DO NOT mention specific colors, font sizes, weights, or visual styling details.
DO NOT include micro-interactions, animations, or transitions.
The output should describe exactly what the screen looks like in terms of structure and what content/sections it contains.`;

  let userContent = `Original Request: ${prompt}`;
  if (imageDescription) {
    userContent += `\n\nContext from Reference Image:\n${imageDescription}\n\nInstructions: The user provided a reference image. Use the structural and functional patterns from this description to enhance the prompt, but make it a detailed text specification for a professional UI.`;
  }
  userContent += "\n\nOutput ONLY the enhanced prompt text. No preamble, no explanations, no markdown formatting.";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "nUi Forge",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 4096
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error('OpenRouter Error:', resData);
    const errorMsg = resData.error?.message || resData.message || `OpenRouter API Error: ${response.status}`;
    throw new Error(errorMsg);
  }
  return { enhancedPrompt: (resData.choices?.[0]?.message?.content || '').trim(), cost: 0 };
}

export async function describeHTMLOpenRouter(
  html: string,
  model: string,
  apiKey: string,
  targetDevice: 'desktop' | 'mobile' = 'desktop'
): Promise<{ description: string; cost: number }> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "nUi Forge",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: `Analyze this HTML code and describe its structural layout, functional components, and the nature of its content. The target device is ${targetDevice}. Focus on:
1. The overall layout structure (e.g., header, sidebar, main content area, grid columns).
2. The specific components present and their relative order (e.g., hero section, feature cards, pricing table, footer).
3. The key features and content sections included in the screen.
4. The specific type and nature of the content within those sections (e.g., "A list of recent blog posts with titles and dates", "A user profile section with an avatar, name, and bio", "A data table showing sales metrics").
5. Functional elements like buttons, inputs, and navigation links.

DO NOT mention specific colors, font sizes, weights, or visual styling details. 
DO NOT describe micro-interactions, animations, or transitions.
Provide a clear, structural and content-focused description of what the screen looks like and what it contains.

HTML Code:
${html}`
        }
      ],
      temperature: 0.2,
      max_tokens: 4096
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error('OpenRouter Error:', resData);
    const errorMsg = resData.error?.message || resData.message || `OpenRouter API Error: ${response.status}`;
    throw new Error(errorMsg);
  }
  return { description: resData.choices?.[0]?.message?.content || '', cost: 0 };
}

export async function analyzeReferenceImageOpenRouter(
  base64Image: string,
  model: string,
  apiKey: string
): Promise<{ description: string; cost: number }> {
  const [mime, data] = base64Image.split(';base64,');
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "nUi Forge",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Understand this competitor screenshot or design reference individually. 
Analyze and describe in detail:
1. Design Principles: What is the overall vibe and design philosophy?
2. Spacing: How is white space used? What are the margins and paddings like?
3. Patterns: What UI patterns are used (e.g., cards, lists, navigation styles)?
4. Color Usage: What is the color palette? How are colors used for hierarchy and action?
5. Typography: What font styles are used? How is typographic hierarchy established?
6. Layout: What is the structural grid or layout system?
7. Anything else worth mentioning (e.g., iconography style, shadow usage, border radius).

Provide a comprehensive, professional design analysis.` },
            { type: 'image_url', image_url: { url: `data:${mime.split(':')[1]};base64,${data}` } }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 4096
    })
  });

  const resData = await response.json();
  if (!response.ok) {
    console.error('OpenRouter Error:', resData);
    const errorMsg = resData.error?.message || resData.message || `OpenRouter API Error: ${response.status}`;
    throw new Error(errorMsg);
  }
  return { description: resData.choices?.[0]?.message?.content || '', cost: 0 };
}

export async function extractScreenBlueprint(
  base64Image: string,
  model: string,
  apiKey: string,
  openRouterConfig?: { apiKey: string; model: string }
): Promise<{ objective: string; components: string; cost: number }> {
  if (model === 'openrouter' && openRouterConfig?.apiKey) {
    return extractScreenBlueprintOpenRouter(base64Image, openRouterConfig.model, openRouterConfig.apiKey);
  }
  const ai = getAI(apiKey);
  const [mime, data] = base64Image.split(';base64,');

  const response = await ai.models.generateContent({
    model: model,
    contents: [{
      parts: [
        { text: `Analyze this UI screen and extract its primary objective and key components.
Return the result in JSON format with two fields: "objective" and "components".
"objective" should be a concise one-sentence description of the screen's main goal.
"components" should be a bulleted list of the main functional sections and elements present in the screen.

Example:
{
  "objective": "A dashboard for tracking personal fitness goals and daily activity metrics.",
  "components": "- Daily step counter card\n- Weekly activity graph\n- Recent workouts list\n- Goal progress circular charts\n- Navigation sidebar with Home, Workouts, and Settings"
}` },
        { inlineData: { mimeType: mime.split(':')[1], data: data } }
      ]
    }],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  });

  try {
    const result = JSON.parse(response.text || '{}');
    const usage = response.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
    const cost = calculateCost(model, usage.promptTokenCount, usage.candidatesTokenCount);
    return { 
      objective: result.objective || '', 
      components: result.components || '',
      cost 
    };
  } catch (err) {
    console.error('Failed to parse blueprint extraction:', err);
    return { objective: '', components: '', cost: 0 };
  }
}

export async function extractScreenBlueprintOpenRouter(
  base64Image: string,
  model: string,
  apiKey: string
): Promise<{ objective: string; components: string; cost: number }> {
  const [mime, data] = base64Image.split(';base64,');
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "nUi Forge",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { text: `Analyze this UI screen and extract its primary objective and key components.
Return the result in JSON format with two fields: "objective" and "components".
"objective" should be a concise one-sentence description of the screen's main goal.
"components" should be a bulleted list of the main functional sections and elements present in the screen.

Example:
{
  "objective": "A dashboard for tracking personal fitness goals and daily activity metrics.",
  "components": "- Daily step counter card\n- Weekly activity graph\n- Recent workouts list\n- Goal progress circular charts\n- Navigation sidebar with Home, Workouts, and Settings"
}` },
            { type: 'image_url', image_url: { url: `data:${mime.split(':')[1]};base64,${data}` } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    })
  });

  const resData = await response.json();
  try {
    const result = JSON.parse(resData.choices?.[0]?.message?.content || '{}');
    return { objective: result.objective || '', components: result.components || '', cost: 0 };
  } catch (err) {
    return { objective: '', components: '', cost: 0 };
  }
}

export async function compressImage(base64: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
  });
}
