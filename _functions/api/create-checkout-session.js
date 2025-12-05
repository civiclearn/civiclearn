export async function onRequestPost(context) {
  try {
    const key = context.env.STRIPE_SECRET_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing Stripe key" }), { status: 500 });
    }

    const body = await context.request.json();
    const { email, product, country } = body;

    const PRICE_ID = {
      "romania-premium": "price_1SY5lLLKpD57DT3qXqBa1kDQ",
      "denmark-pr-premium": "price_1SVc0KLKpD57DT3qnFFcmBJ8",
      "canadafr-premium": "price_1SVbx5LKpD57DT3qNjgpJA5B"
    }[product];

    if (!PRICE_ID) {
      return new Response(JSON.stringify({ error: "Invalid product" }), { status: 400 });
    }

    const successUrl = `https://civiclearn.com/${country}/login.html?first=1`;
    const cancelUrl  = `https://civiclearn.com/${country}/checkout.html`;

    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("customer_email", email);
    params.append("line_items[0][price]", PRICE_ID);
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[purchase_country]", country);
    params.append("metadata[product]", product);
    params.append("metadata[access_path]", country);

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      return new Response(JSON.stringify({ error: session.error?.message || "Stripe failed" }), { status: 500 });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
