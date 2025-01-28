"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WorkflowPage;
const lucide_react_1 = require("lucide-react");
const card_1 = require("../ui/card");
function WorkflowPage() {
    return (<card_1.Card className="h-[calc(100vh-8rem)]">
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.Code2 className="h-6 w-6"/>
          Workflow Editor
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent>
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
      </card_1.CardContent>
    </card_1.Card>);
}
