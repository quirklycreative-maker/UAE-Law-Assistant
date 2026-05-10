<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/10b0c7d7-f9fb-4db2-9519-332f0b5ef577

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_OPENROUTER_API_KEY` in [.env.local](.env.local) to your OpenRouter API key
3. Set `VITE_CLERK_PUBLISHABLE_KEY` in [.env.local](.env.local) to your Clerk publishable key
4. Optional: override `VITE_OPENROUTER_FREE_MODEL`, `VITE_OPENROUTER_FLASH_MODEL`, `VITE_OPENROUTER_PRO_MODEL`, or `VITE_OPENROUTER_VISION_MODEL` if you want to pin a different model
5. Run the app:
   `npm run dev`

## Auth Setup

For real email sign-in, use Clerk's free plan and enable either:
- email verification code
- email verification link

Then render Clerk's prebuilt sign-in modal from the app's Login button. The app already falls back to a local demo session when Clerk is not configured, so you can keep testing immediately while you finish dashboard setup.
