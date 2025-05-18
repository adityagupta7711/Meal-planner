
import { currentUser } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { error } from "console";
import { NextResponse } from "next/server";
import  prisma  from "@/lib/prisma";



export async function POST() {
    try{
    const clerkUser = await currentUser()
    if (!clerkUser) {
        return NextResponse.json(
            {error: "User not found in Clerk"},
            { status: 404 }
        );
    }

    const email= clerkUser.emailAddresses[0].emailAddress ;
    if (!email) {
        return NextResponse.json(
            {error: "User does not have an email address"},
            { status: 400 }
        );
    }
    //Check if profile exits already
    const existingProfile = await prisma.profile.findUnique({
        where: {userId: clerkUser.id},
    });

    if (existingProfile) {
        //profile already exists
        return NextResponse.json(
            { message: "Profile already exists."});
    }

     // Otherwise, create the profile
     await prisma.profile.create({
        data: {
          userId: clerkUser.id,
          email,
          subscriptionActive: false,
          subscriptionTier: null,
          stripeSubscriptionId: null,
        },
      });

      return NextResponse.json({message : "Profile created successfully."},
        {status: 201}
      );
    } catch(error: any){
        return NextResponse.json({error: "internal error."}, {status:500});
    }
}