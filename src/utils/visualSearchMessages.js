/**
 * User-facing copy for CLIP visual search outcomes.
 */

export function formatProbeLabel(probe) {
  if (!probe?.label) return "";
  return probe.label;
}

export function buildVisualSearchOutcome(result) {
  const {
    matches = [],
    identification = null,
    resultStatus = "unknown",
    nearestMatch = null,
  } = result;

  const probes = identification?.probes ?? [];
  const topProbe = probes[0];
  const probePhrase = topProbe?.label ?? identification?.summary ?? "an item";
  const confidencePct = topProbe?.confidence
    ? Math.round(topProbe.confidence * 100)
    : identification?.confidence
      ? Math.round(identification.confidence * 100)
      : null;

  if (matches.length > 0) {
    return {
      status: "found",
      title: "We found similar products",
      message: `Your photo looks like ${probePhrase}${confidencePct ? ` (${confidencePct}% match)` : ""}. Here are the closest items in our catalog.`,
      tone: "success",
    };
  }

  if (resultStatus === "no_inventory_match" || (probes.length > 0 && nearestMatch)) {
    const nearestTitle = nearestMatch?.title;
    const nearestScore = nearestMatch?.matchScore
      ? Math.round(nearestMatch.matchScore * 100)
      : null;

    let message = `Our AI identified this photo as ${probePhrase}`;
    if (confidencePct) {
      message += ` (${confidencePct}% confident)`;
    }
    message += ", but we don't have a close match in our current inventory.";

    if (nearestTitle && nearestScore && nearestScore < 18) {
      message += ` The nearest listing was "${nearestTitle}" at only ${nearestScore}% similarity — not close enough to recommend.`;
    } else if (nearestTitle && nearestScore) {
      message += ` The closest item was "${nearestTitle}" (${nearestScore}% similar), which is below our match threshold.`;
    }

    message += " Try another angle, a clearer single-product shot, or browse the full catalog.";

    return {
      status: "no_inventory_match",
      title: "Identified, but not in stock",
      message,
      tone: "info",
    };
  }

  if (resultStatus === "unrecognized") {
    return {
      status: "unrecognized",
      title: "Couldn't identify this photo",
      message:
        "We couldn't confidently tell what product is in this image. Use a well-lit photo of one item, fill most of the frame, and avoid busy backgrounds.",
      tone: "warning",
    };
  }

  return {
    status: "no_matches",
    title: "No similar products",
    message:
      "No similar products were found in our catalog. Try another photo or browse all products.",
    tone: "info",
  };
}

export function buildVisualSearchErrorMessage(err) {
  const apiMessage = err.response?.data?.message;
  const apiCode = err.response?.data?.code;
  if (apiMessage) {
    return apiMessage;
  }
  if (apiCode === "too_blurry") {
    return "Photo looks blurry. Hold steady and try again with better lighting.";
  }
  if (apiCode === "too_small") {
    return "Photo is too small. Move closer or use a higher resolution image.";
  }
  if (err.message?.includes("Network Error") || err.code === "ECONNABORTED") {
    return "Could not reach the search service. Check your connection and ensure the API server is running (npm run server).";
  }
  if (err.message?.includes("timeout")) {
    return "Visual search timed out — the AI model may still be loading on the server. Wait a moment and try again.";
  }
  return err.message || "Visual search failed. Please try again.";
}
