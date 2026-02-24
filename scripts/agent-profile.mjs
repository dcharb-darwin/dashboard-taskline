#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, "../.codex/agent-router.config.json");

function parseArgs(argv) {
  const args = argv.slice(2);
  const json = args.includes("--json");
  const cwdArg = args.find((arg) => arg.startsWith("--cwd="));
  const cwd = cwdArg ? cwdArg.slice("--cwd=".length) : process.cwd();
  return { json, cwd: path.resolve(cwd) };
}

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(current, ".git"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return startDir;
    current = parent;
  }
}

function getGitBranch(repoRoot) {
  try {
    const branch = execSync("git branch --show-current", {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    return branch || "detached";
  } catch {
    return "unknown";
  }
}

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`Missing config file: ${CONFIG_PATH}`);
  }
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.profiles)) {
    throw new Error("Invalid config: expected `profiles` array.");
  }
  return parsed;
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function scoreProfile(profile, context) {
  const match = profile.match || {};
  let score = 0;

  if (Array.isArray(match.repos)) {
    for (const repo of match.repos) {
      if (normalize(repo) === context.repoNameLower) {
        score += 100;
      }
    }
  }

  if (Array.isArray(match.pathContains)) {
    const fullPath = context.cwdLower;
    for (const token of match.pathContains) {
      if (fullPath.includes(normalize(token))) {
        score += 20;
      }
    }
  }

  if (Array.isArray(match.filesExist)) {
    for (const relativePath of match.filesExist) {
      if (existsSync(path.join(context.repoRoot, relativePath))) {
        score += 5;
      }
    }
  }

  return score;
}

function resolveProfile(config, context) {
  const profiles = config.profiles || [];
  const defaultProfile = profiles.find((profile) => profile.id === config.defaultProfile);

  let winner = defaultProfile || null;
  let winnerScore = winner ? scoreProfile(winner, context) : -1;

  for (const profile of profiles) {
    const score = scoreProfile(profile, context);
    if (score > winnerScore) {
      winner = profile;
      winnerScore = score;
    }
  }

  if (!winner) {
    throw new Error("No profile could be resolved from config.");
  }

  return { profile: winner, score: winnerScore };
}

function printList(title, items) {
  if (!Array.isArray(items) || items.length === 0) return;
  console.log(`${title}:`);
  for (const item of items) {
    console.log(`- ${item}`);
  }
  console.log("");
}

function main() {
  const args = parseArgs(process.argv);
  const config = loadConfig();
  const repoRoot = findRepoRoot(args.cwd);
  const repoName = path.basename(repoRoot);
  const branch = getGitBranch(repoRoot);

  const context = {
    cwd: args.cwd,
    cwdLower: normalize(args.cwd),
    repoRoot,
    repoName,
    repoNameLower: normalize(repoName),
    branch,
  };

  const resolved = resolveProfile(config, context);
  const output = {
    profileId: resolved.profile.id,
    score: resolved.score,
    context: {
      cwd: context.cwd,
      repoRoot: context.repoRoot,
      repoName: context.repoName,
      branch: context.branch,
    },
    profile: resolved.profile,
  };

  if (args.json) {
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  console.log(`Agent profile: ${output.profileId}`);
  console.log(`Description: ${resolved.profile.description}`);
  console.log(`Repo: ${context.repoName}`);
  console.log(`Root: ${context.repoRoot}`);
  console.log(`Branch: ${context.branch}`);
  console.log(`Match score: ${resolved.score}`);
  console.log("");

  const agentConfig = resolved.profile.agentConfig || {};
  console.log("Agent config:");
  console.log(`- planningMode: ${agentConfig.planningMode || "n/a"}`);
  console.log(`- branchPrefix: ${agentConfig.branchPrefix || "n/a"}`);
  console.log(`- memoryProjectTag: ${agentConfig.memoryProjectTag || "n/a"}`);
  console.log(`- memoryGlobalTag: ${agentConfig.memoryGlobalTag || "n/a"}`);
  console.log(`- readStrategy: ${agentConfig.readStrategy || "n/a"}`);
  console.log(`- editStrategy: ${agentConfig.editStrategy || "n/a"}`);
  console.log("");

  const workflow = resolved.profile.workflow || {};
  printList("Tracks", workflow.tracks);
  printList("Startup checklist", workflow.startupChecklist);
  printList("Implementation checklist", workflow.implementationChecklist);
  printList("Delivery checklist", workflow.deliveryChecklist);
  printList("Quality gates", workflow.qualityGates);
  printList("Primary docs", workflow.primaryDocs);
}

main();
