const SUPABASE_URL = "https://ksalsojmvyqwhbcggejy.supabase.co";
const SUPABASE_KEY = "sb_publishable_BAk8-o_novmk_D73RnX26Q_cju3IBO6";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendToActivation(req, res, statusCode = 307) {
  const params = new URLSearchParams();
  if (typeof req.query.card === "string") {
    params.set("card", req.query.card);
  }
  if (typeof req.query.token === "string") {
    params.set("token", req.query.token);
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(statusCode).setHeader(
    "Location",
    `/index.html?${params.toString()}`
  );
  return res.end();
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const cardCode =
    typeof req.query.card === "string" ? req.query.card.trim() : "";
  const token =
    typeof req.query.token === "string" ? req.query.token.trim() : "";

  if (!/^[A-Z0-9_-]{3,40}$/i.test(cardCode) || !UUID_PATTERN.test(token)) {
    return sendToActivation(req, res);
  }

  try {
    const query = new URLSearchParams({
      card_code: `eq.${cardCode}`,
      select: "card_code,status,target_url",
      limit: "1"
    });

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/cards?${query.toString()}`,
      {
        headers: {
          apikey: SUPABASE_KEY
        }
      }
    );

    if (!response.ok) {
      return sendToActivation(req, res);
    }

    const rows = await response.json();
    const card = Array.isArray(rows) ? rows[0] : null;
    const status = String(card?.status || "").trim().toLowerCase();
    const targetUrl = typeof card?.target_url === "string"
      ? card.target_url.trim()
      : "";

    if (status === "active" && targetUrl) {
      let destination;
      try {
        destination = new URL(targetUrl);
      } catch {
        return sendToActivation(req, res);
      }

      if (destination.protocol !== "https:") {
        return sendToActivation(req, res);
      }

      res.status(302).setHeader("Location", destination.toString());
      return res.end();
    }

    return sendToActivation(req, res);
  } catch (error) {
    console.error("NEXA redirect lookup failed:", error);
    return sendToActivation(req, res);
  }
};
