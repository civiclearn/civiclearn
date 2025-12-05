// File: functions/api/create-checkout-session.js

export async function onRequestPost(context) {
  try {
    // Read environment variables (Stripe secret key)
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Stripe secret key missing" }),
        { status: 500 }
      );
    }

    const stripe = Stripe(STRIPE_SECRET_KEY);

    // Parse incoming JSON (email, product, country)
    const body = await context.request.json();
    const { email, product, country } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Missing email" }),
        { status: 400 }
      );
    }

    // ⚠️ Recommended: map product IDs here
    // For now, using a placeholder price ID—replace with your Stripe price ID
    const PRICE_ID = {
        "romania-premium": "price_1SY5lLLKpD57DT3qXqBa1kDQ",
        "denmark-pr-premium": "price_1SVc0KLKpD57DT3qnFFcmBJ8",
        "canadafr-premium": "price_1SVbx5LKpD57DT3qNjgpJA5B"
    }[product];

    if (!PRICE_ID) {
      return new Response(
        JSON.stringify({ error: "Invalid product" }),
        { status: 400 }
      );
    }

    // Success redirect URL
    const successUrl = `https://civiclearn.com/${country}/login.html?first=1`;

    // Cancel URL (back to checkout)
    const cancelUrl = `https://civiclearn.com/${country}/checkout.html`;

    // CREATE STRIPE CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,        // Email prefilling
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price: PRICE_ID,
          quantity: 1
        }
      ],
      metadata: {
        purchase_country: country,
        product: product,
        access_path: country  // n8n currently uses this
      }
    });

    // Return the checkout URL to frontend
    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}
