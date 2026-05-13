// Returns the VAPID public key so clients can subscribe.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(() => {
  const key = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  return new Response(JSON.stringify({ publicKey: key }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
