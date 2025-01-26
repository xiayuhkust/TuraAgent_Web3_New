import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Wallet } from "lucide-react";

export default function WalletPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>Wallet functionality coming soon...</p>
      </CardContent>
    </Card>
  );
}
