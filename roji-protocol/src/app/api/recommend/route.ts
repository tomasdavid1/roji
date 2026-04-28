import { NextResponse } from "next/server";
import { generateProtocol, type UserInput } from "@/lib/recommend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidInput(body: unknown): body is UserInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    (b.goal === "healing" || b.goal === "recomp" || b.goal === "comprehensive") &&
    typeof b.weight_lbs === "number" &&
    b.weight_lbs > 0 &&
    typeof b.age === "number" &&
    b.age >= 21 &&
    (b.sex === "male" || b.sex === "female") &&
    (b.training_experience === "beginner" ||
      b.training_experience === "intermediate" ||
      b.training_experience === "advanced") &&
    (b.peptide_experience === "none" ||
      b.peptide_experience === "some" ||
      b.peptide_experience === "experienced")
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!isValidInput(body)) {
    return NextResponse.json(
      {
        error:
          "Invalid input. Required fields: goal, weight_lbs, age (21+), sex, training_experience, peptide_experience.",
      },
      { status: 400 },
    );
  }

  const recommendation = generateProtocol(body);
  return NextResponse.json(recommendation);
}
