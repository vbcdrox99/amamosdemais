import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Poll {
  id: string;
  question: string;
  options: Array<{
    text: string;
    votes: number;
  }>;
  totalVotes: number;
}

const mockPolls: Poll[] = [
  {
    id: "1",
    question: "Onde vamos na sexta?",
    options: [
      { text: "Bar A", votes: 12 },
      { text: "Bar B", votes: 8 },
      { text: "Casa da Ana", votes: 5 },
    ],
    totalVotes: 25,
  },
  {
    id: "2",
    question: "Que horas começamos o churrasco?",
    options: [
      { text: "12:00", votes: 8 },
      { text: "14:00", votes: 15 },
      { text: "16:00", votes: 3 },
    ],
    totalVotes: 26,
  },
];

const Polls = () => {
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());

  const handleVote = (pollId: string, optionIndex: number) => {
    setVotedPolls((prev) => new Set(prev).add(pollId));
  };

  return (
    <div className="pb-20 pt-16 px-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between pt-4">
        <h2 className="text-2xl font-bold text-foreground">Enquetes</h2>
        <Button size="icon" className="rounded-full h-12 w-12">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <div className="space-y-4">
        {mockPolls.map((poll) => {
          const hasVoted = votedPolls.has(poll.id);
          
          return (
            <Card key={poll.id} className="p-4 space-y-4 bg-card border-border">
              <h3 className="font-semibold text-foreground">{poll.question}</h3>
              
              <div className="space-y-2">
                {poll.options.map((option, index) => {
                  const percentage = Math.round((option.votes / poll.totalVotes) * 100);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => !hasVoted && handleVote(poll.id, index)}
                      disabled={hasVoted}
                      className="w-full text-left disabled:cursor-default"
                    >
                      <div className="relative overflow-hidden rounded-lg border-2 border-border hover:border-primary/50 transition-colors p-3">
                        {hasVoted && (
                          <div
                            className="absolute inset-0 bg-primary/20"
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                        <div className="relative flex items-center justify-between">
                          <span className="font-medium text-foreground">
                            {option.text}
                          </span>
                          {hasVoted && (
                            <span className="text-sm font-semibold text-primary">
                              {percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {poll.totalVotes} votos
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Polls;
