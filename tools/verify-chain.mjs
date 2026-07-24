// Resolves every npm script reachable from `npm run verify`.
//
// Several guards assert that they are actually wired into the verify pipeline,
// so that adding a check without gating on it is caught. They used to do this
// by substring-matching `scripts.verify`, which worked while verify was one
// flat 69-step `&&` chain. verify is now a set of stages (verify:fast,
// verify:build, verify:data, verify:contract, verify:visual), so a direct
// substring match on `scripts.verify` no longer sees the individual steps.
//
// expandVerifyChain walks the chain transitively, so a guard is considered
// wired in whether it sits directly in verify or inside any stage.

export function expandVerifyChain(scripts, entry = "verify") {
  const seen = new Set();
  const reachable = new Set();
  const queue = [entry];

  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);

    const body = String(scripts?.[name] ?? "");
    if (!body) continue;

    for (const match of body.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
      const referenced = match[1];
      reachable.add(referenced);
      queue.push(referenced);
    }
  }

  return reachable;
}

export function verifyChainIncludes(scripts, scriptName) {
  return expandVerifyChain(scripts).has(scriptName);
}
