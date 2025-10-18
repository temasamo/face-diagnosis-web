import { NextResponse } from "next/server";

export async function GET() {
  try {
    const healthCheck = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasGoogleClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
        hasGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasOpenAIApiKey: !!process.env.OPENAI_API_KEY,
        googleClientEmailLength: process.env.GOOGLE_CLIENT_EMAIL?.length || 0,
        googlePrivateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
        openAIApiKeyLength: process.env.OPENAI_API_KEY?.length || 0,
      }
    };

    return NextResponse.json(healthCheck);
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
