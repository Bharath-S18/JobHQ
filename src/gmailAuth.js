import { google } from "googleapis";
import fs from "fs";

const TOKEN_PATH = "./data/gmail-token.json";
const PROFILE_PATH = "./data/user-profile.json";

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function exchangeCodeForTokens(code) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  return tokens;
}

export function hasStoredTokens() {
  return fs.existsSync(TOKEN_PATH);
}

function nameFromEmail(email) {
  if (!email) return "Authenticated User";
  const userPart = email.split("@")[0];
  const clean = userPart.replace(/[._\-\d]+/g, " ").trim();
  if (!clean) return email.split("@")[0];
  return clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function fetchGoogleUserProfile(clientOrTokens) {
  let client = clientOrTokens;
  if (clientOrTokens && !clientOrTokens.request) {
    client = getOAuthClient();
    client.setCredentials(clientOrTokens);
  }

  let email = null;
  let name = null;
  let picture = null;

  try {
    const gmail = google.gmail({ version: "v1", auth: client });
    const res = await gmail.users.getProfile({ userId: "me" });
    if (res.data && res.data.emailAddress) {
      email = res.data.emailAddress;
    }
  } catch (err) {
    console.error("Gmail profile fetch err:", err.message);
  }

  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();
    if (data) {
      if (data.email) email = data.email;
      if (data.name) name = data.name;
      if (data.picture) picture = data.picture;
    }
  } catch (err) {
    // ignore missing oauth2 userinfo scope
  }

  if (!email) {
    return null;
  }

  if (!name) {
    name = nameFromEmail(email);
  }

  const profile = { name, email, picture };
  fs.mkdirSync("./data", { recursive: true });
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2));
  return profile;
}

export function getStoredUserProfile() {
  if (fs.existsSync(PROFILE_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(PROFILE_PATH, "utf-8"));
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function getAuthedClient() {
  if (!hasStoredTokens()) return null;
  const client = getOAuthClient();
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  client.setCredentials(tokens);

  client.on("tokens", (newTokens) => {
    const merged = { ...tokens, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  });

  return client;
}
