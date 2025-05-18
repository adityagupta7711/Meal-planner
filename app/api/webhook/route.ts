import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature || "",
      webhookSecret
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.payment_failed": {
        //type assertion to any to bypass TypeScript's type checking
        const invoice = event.data.object as any; //Stripe.Invoice
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleCustomerSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log("Unhandled event type" + event.type);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({});
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.clerkUserId;

  if (!userId) {
    console.log("No user ID");
    return;
  }
  const subscriptionId = session.subscription as string;
  if (!userId) {
    console.log("No sub ID");
    return;
  }

  try {
    await prisma.profile.update({
      where: { userId },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionActive: true,
        subscriptionTier: session.metadata?.planType || null,
      },
    });
  } catch (error: any) {
    console.log(error.message);
  }
}

type InvoiceWithSubscription = {
  id: string;
  subscription: string;
  customer: string;
  [key: string]: any;
};

async function handleInvoicePaymentFailed(invoice: InvoiceWithSubscription) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) {
    console.log("Subscription ID not found in invoice.");
    return;
  }

  let userId: string | undefined;
  try {
    const profile = await prisma.profile.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true },
    });
    if (!profile?.userId) {
      console.log("No profile found for this subscription ID.");
      return;
    }

    userId = profile.userId;
  } catch (error: any) {
    console.log("Prisma Query Error:", error.message);
    return;
  }
  try {
    await prisma.profile.update({
      where: { userId: userId },
      data: {
        subscriptionActive: false,
      },
    });
  } catch (error: any) {
    console.log(error.message);
  }
}

async function handleCustomerSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  const subscriptionId = subscription.id;

  let userId: string | undefined;
  try {
    const profile = await prisma.profile.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true },
    });
    if (!profile?.userId) {
      console.log("No profile found for this subscription ID.");
      return;
    }

    userId = profile.userId;
  } catch (error: any) {
    console.log("Prisma Query Error:", error.message);
    return;
  }
  try {
    await prisma.profile.update({
      where: { userId: userId },
      data: {
        subscriptionActive: false,
        stripeSubscriptionId: null,
        subscriptionTier: null,
      },
    });
  } catch (error: any) {
    console.log(error.message);
  }
}
