import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const owner = process.env.GITHUB_OWNER || "zioForas";
const repo = process.env.GITHUB_REPO || "greencorner-timetable";
const path = process.env.TIMETABLE_PATH || "data/timetable.json";
const branch = process.env.GITHUB_BRANCH || "main";

const fallback = {
  updatedAt: "",
  days: {
    Monday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" },
    Tuesday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" },
    Wednesday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" },
    Thursday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" },
    Friday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" },
    Saturday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" },
    Sunday: { Antonio: "", Lizzy: "", Sarih: "", Cole: "", Luis: "" }
  }
};

type GitHubFile = {
  content: string;
  sha: string;
};

function token() {
  const value = process.env.GITHUB_TOKEN;
  if (!value) throw new Error("Missing GITHUB_TOKEN");
  return value;
}

function githubHeaders() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

async function readFile(): Promise<GitHubFile | null> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: githubHeaders(), cache: "no-store" }
  );

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not read timetable");
  return response.json();
}

function decodeContent(content: string) {
  return JSON.parse(Buffer.from(content, "base64").toString("utf8"));
}

export async function GET() {
  try {
    const file = await readFile();
    return NextResponse.json(file ? decodeContent(file.content) : fallback);
  } catch {
    return NextResponse.json(fallback);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await readFile();
    const updated = {
      updatedAt: new Date().toISOString(),
      days: body.days || fallback.days
    };

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: githubHeaders(),
      body: JSON.stringify({
        message: "Update GreenCorner timetable",
        content: Buffer.from(JSON.stringify(updated, null, 2)).toString("base64"),
        branch,
        sha: current?.sha
      })
    });

    if (!response.ok) throw new Error("Could not save timetable");
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Could not save timetable" }, { status: 500 });
  }
}
