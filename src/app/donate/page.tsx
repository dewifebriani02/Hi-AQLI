import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeartHandshake } from "lucide-react";

export default function DonatePage() {
  const donationAmounts = [10, 25, 50, 100];

  return (
    <div className="flex justify-center items-start pt-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
            <HeartHandshake className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-2xl">Support AQLI Digital</CardTitle>
          <CardDescription>
            Your generous donations help us maintain and improve this platform for learners worldwide.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {donationAmounts.map((amount) => (
              <Button key={amount} variant="outline" className="h-12 text-lg font-semibold">
                ${amount}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t"></div>
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="flex-1 border-t"></div>
          </div>
          <div>
            <Label htmlFor="custom-amount" className="mb-2 block">Enter a custom amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input id="custom-amount" type="number" placeholder="Enter amount" className="pl-7" />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full font-bold text-lg bg-accent text-accent-foreground hover:bg-accent/90">Donate Now</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
