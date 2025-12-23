"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

function ErrorPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const message = searchParams.get("message") || "An unexpected error occurred";

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full">
                <CardContent className="pt-8 pb-6 text-center">
                    <div className="p-3 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
                        <AlertTriangle className="h-10 w-10 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
                    <p className="text-muted-foreground mb-6">{message}</p>
                    <div className="flex gap-3 justify-center">
                        <Button
                            variant="outline"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                        <Button
                            onClick={() => router.push("/")}
                        >
                            <Home className="h-4 w-4 mr-2" />
                            Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        }>
            <ErrorPageContent />
        </Suspense>
    );
}
