# LLM Integration Setup

This blog uses AI to dynamically generate engaging titles for the header and intro sections.

## Supported LLM Providers

The blog supports three LLM providers:

1. **Gemini** (Gemini 2.0 Flash) - **Recommended**
2. **OpenAI** (GPT-4o-mini or GPT-3.5-turbo)
3. **Anthropic** (Claude 3 Haiku or Claude 3.5 Sonnet)

## Setup Instructions

### Option 1: Gemini (Recommended)

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to your `.env.local` file:
   ```env
   GEMINI_API_KEY=your-api-key-here
   ```

### Option 2: OpenAI

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to your `.env.local` file:
   ```env
   OPENAI_API_KEY=sk-your-api-key-here
   ```

### Option 2: Anthropic

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Add to your `.env.local` file:
   ```env
   ANTHROPIC_API_KEY=sk-ant-your-api-key-here
   ```

## How It Works

1. **API Route**: `/api/generate-title` handles LLM requests
2. **Caching**: Titles are cached for 1 hour to reduce API calls
3. **Fallback**: If API fails or no key is set, default titles are used
4. **Dynamic Loading**: Titles are fetched client-side for better performance

## Features

- ✅ Automatic title generation for header and intro
- ✅ 1-hour caching to minimize API costs
- ✅ Graceful fallback to default titles
- ✅ Loading states while fetching
- ✅ Support for multiple LLM providers

## Cost Considerations

- **Gemini 2.0 Flash**: Free tier available (up to 15 RPM), or ~$0.10 per 1M input tokens.
- **OpenAI GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **OpenAI GPT-3.5-turbo**: ~$0.50 per 1M input tokens, ~$1.50 per 1M output tokens
- **Anthropic Claude 3 Haiku**: ~$0.25 per 1M input tokens, ~$1.25 per 1M output tokens

With 25-hour caching (recently updated), you'll typically make:
- <1 API call per day on average
- Negligible cost

## Customization

You can customize the prompts in `/src/app/api/generate-title/route.ts`:

- `generateWithGemini()` - Gemini prompt
- `generateWithOpenAI()` - OpenAI prompt
- `generateWithAnthropic()` - Anthropic prompt

## Testing

1. Set up your API key in `.env.local`
2. Restart your development server
3. Visit the homepage - you should see dynamically generated titles
4. Check the browser console for any errors

## Troubleshooting

**No titles appearing?**
- Check that your API key is set correctly
- Verify the API key has sufficient credits
- Check browser console for errors
- Fallback titles will show if API fails

**Titles not updating?**
- Titles are cached for 1 hour
- Clear cache by restarting the server
- Or modify `CACHE_DURATION` in the API route

**API errors?**
- Verify your API key is valid
- Check your API provider's status page
- Ensure you have sufficient credits/quota
