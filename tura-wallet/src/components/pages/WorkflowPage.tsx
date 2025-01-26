import { Code2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function WorkflowPage() {
  return (
    <Card className="h-[calc(100vh-8rem)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-6 w-6" />
          Workflow Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="space-y-4">
            <p>Visual workflow editor coming soon. This will allow you to:</p>
            <ul className="list-disc ml-6">
              <li>Create and edit workflows visually</li>
              <li>Connect workflow nodes with drag-and-drop</li>
              <li>Deploy workflows to the Tura network</li>
              <li>Manage workflow permissions and settings</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
