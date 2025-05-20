import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { error } from "console";

export async function GET() {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    const profile = await prisma.profile.findUnique({
      where: { userId: clerkUser.id },
        select: {subscriptionTier: true},
    });

    
    if (!profile) {
      return NextResponse.json({ error: "No profile found"});
    }

    return NextResponse.json({ subscription: profile });

  } catch (error: any) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details." },
      { status: 500 }
    );
  }
}