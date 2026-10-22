"use client";

import { Suspense } from "react";

import SignupForm from "@/components/SignupForm";

const page = () => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
};

export default page;
