"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="pl-0 hover:pl-2 transition-all duration-300 text-muted-foreground hover:text-foreground mb-4"
        >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
        </Button>
    );
}
